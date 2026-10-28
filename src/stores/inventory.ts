import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api, ApiError, getAll } from '@/services/api'
import { amt, toCategory, toMovement, toProduct } from '@/services/mappers'
import { uid } from '@/services/storage'
import { useAuth } from './auth'
import type { Category, Product, StockMovement } from '@/types'

export interface ProductInput {
  id?: string; name: string; sku: string; category: string; unit: string
  costPrice: number; sellPrice: number; stock: number; reorderLevel: number; maxStock: number
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'category'

export const useInventory = defineStore('inventory', () => {
  const auth = useAuth()
  const products = ref<Product[]>([])
  const categoryList = ref<Category[]>([])
  const movements = ref<StockMovement[]>([])
  /** The branch's stock rows keyed by product id (quantity, average cost). Needed to show stock on search results. */
  const stockByProduct = ref<Record<string, any>>({})
  const movementProduct = ref('')
  const stockKnown = ref(true)

  const categories = computed(() => categoryList.value.map(c => c.name).sort((a, b) => a.localeCompare(b)))
  // A product this branch has never stocked is not "running low": it is simply not here yet.
  const lowStock = computed(() => products.value.filter(p => p.stocked && p.stock <= p.reorderLevel))
  const stockedCount = computed(() => products.value.filter(p => p.stocked).length)
  const stockValue = computed(() => products.value.reduce((a, p) => a + p.stock * p.costPrice, 0))
  const byId = (id: string) => products.value.find(p => p.id === id)
  const catName = (id: unknown) => categoryList.value.find(c => c.id === String(id))?.name ?? ''
  const mapProduct = (p: any) => toProduct(p, stockByProduct.value[String(p.id)], catName(p.category_id), stockKnown.value)

  /** Catalogue (products + categories) merged with this branch's stock levels. */
  async function loadProducts() {
    const branch = auth.branchId
    const [prods, stocks, cats] = await Promise.allSettled([
      getAll('/products'),
      branch ? getAll(`/branches/${branch}/stock`) : Promise.resolve([] as any[]),
      getAll('/categories')
    ])
    if (prods.status === 'rejected' && stocks.status === 'rejected') throw prods.reason

    stockKnown.value = stocks.status === 'fulfilled' && !!branch
    const rowsOfStock: any[] = stocks.status === 'fulfilled' ? stocks.value : []
    stockByProduct.value = Object.fromEntries(rowsOfStock.map(r => [String(r.product_id), r]))
    categoryList.value = (cats.status === 'fulfilled' ? cats.value : []).map(toCategory)

    // A role that may not list products can still see them through the stock rows, which embed the product.
    const rows = new Map<string, any>()
    rowsOfStock.forEach(r => { if (r.product) rows.set(String(r.product.id), r.product) })
    if (prods.status === 'fulfilled') prods.value.forEach((p: any) => rows.set(String(p.id), p))

    products.value = [...rows.values()]
      .filter(p => p.is_active !== false)
      .map(mapProduct)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  /** Server-side search (GET /products?search=&category_id=). */
  async function searchProducts(search: string, categoryId?: string): Promise<Product[]> {
    const rows = await getAll('/products', { search: search.trim() || undefined, category_id: categoryId || undefined })
    return rows.filter((p: any) => p.is_active !== false).map(mapProduct).sort((a, b) => a.name.localeCompare(b.name))
  }

  /** Reads one product fresh from the server (GET /products/{id}). */
  async function fetchProduct(id: string): Promise<Product> {
    const res = await api.get(`/products/${id}`)
    return mapProduct(res?.product ?? res)
  }

  /** Movement history for the branch, optionally for one product (GET .../stock/movements?product_id=). */
  async function loadMovements(productId = movementProduct.value) {
    const branch = auth.branchId
    if (!branch) return
    movementProduct.value = productId
    const rows = await getAll(`/branches/${branch}/stock/movements`, { product_id: productId || undefined }, 4)
    movements.value = rows.map((m: any) => toMovement(m, byId(String(m.product_id))?.name ?? m.product?.name ?? `Product ${m.product_id}`))
  }

  /* ---------- categories ---------- */
  async function createCategory(name: string, description = ''): Promise<Category> {
    const n = name.trim()
    const create = (slug: string) => api.post('/categories', { name: n, slug, ...(description.trim() ? { description: description.trim() } : {}) })
    let res
    try { res = await create(slugify(n)) }
    catch (e) {
      // slugs are unique per business, so a clash gets a suffix
      if (e instanceof ApiError && e.status === 422) res = await create(`${slugify(n)}-${uid().slice(-5)}`)
      else throw e
    }
    const c = toCategory(res?.category ?? res)
    categoryList.value.push({ ...c, name: c.name || n })
    return c
  }
  async function fetchCategory(id: string): Promise<Category> {
    const res = await api.get(`/categories/${id}`)
    return toCategory(res?.category ?? res)
  }
  async function updateCategory(id: string, patch: { name?: string; description?: string }) {
    const res = await api.patch(`/categories/${id}`, patch)
    const c = toCategory(res?.category ?? res)
    const i = categoryList.value.findIndex(x => x.id === id)
    if (i >= 0) categoryList.value[i] = c
    products.value = products.value.map(p => (p.categoryId === id ? { ...p, category: c.name } : p))
  }

  /** Finds a category by name, or creates it. Returns its id (undefined when no category was given). */
  async function ensureCategory(name: string): Promise<string | undefined> {
    const n = name.trim()
    if (!n) return undefined
    const found = categoryList.value.find(c => c.name.toLowerCase() === n.toLowerCase())
    return found ? found.id : (await createCategory(n)).id
  }

  /* ---------- stock ---------- */
  async function receive(productId: string, qty: number, unitCost: number, reference: string, reason: string) {
    return api.post(`/branches/${auth.branchId}/stock/${productId}/receive`, {
      quantity: qty, unit_cost: amt(unitCost), reference, reason
    })
  }

  async function adjust(productId: string, delta: number, reason: string) {
    await api.post(`/branches/${auth.branchId}/stock/${productId}/adjust`, {
      quantity_change: delta, reason, reference: 'adj-' + uid()
    })
    await loadProducts()
  }

  async function saveProduct(p: ProductInput) {
    const categoryId = await ensureCategory(p.category)
    const body: Record<string, unknown> = {
      name: p.name.trim(), selling_price: amt(p.sellPrice), unit: p.unit.trim() || 'pcs', min_stock: p.reorderLevel
    }
    if (p.sku.trim()) body.sku = p.sku.trim()
    if (categoryId) body.category_id = Number(categoryId)
    if (p.costPrice > 0) body.purchase_price = amt(p.costPrice)
    if (p.maxStock > 0) body.max_stock = p.maxStock

    if (p.id) await api.patch(`/products/${p.id}`, body)
    else {
      const res = await api.post('/products', body)
      // Stock is per branch and is only ever changed through stock movements, so opening stock is a "receive".
      if (p.stock > 0) await receive(String(res.product.id), p.stock, p.costPrice, 'opening-' + uid(), 'Opening stock')
    }
    await loadProducts()
  }

  async function removeProduct(id: string) {
    await api.del(`/products/${id}`) // archives the product; history stays
    await loadProducts()
  }

  function clear() { products.value = []; categoryList.value = []; movements.value = []; stockByProduct.value = {}; movementProduct.value = ''; stockKnown.value = true }

  return {
    products, movements, movementProduct, categories, categoryList, lowStock, stockedCount, stockValue, byId,
    loadProducts, searchProducts, fetchProduct, loadMovements,
    createCategory, fetchCategory, updateCategory, receive, adjust, saveProduct, removeProduct, clear
  }
})
