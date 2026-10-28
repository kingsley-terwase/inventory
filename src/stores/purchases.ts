import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getAll } from '@/services/api'
import { num } from '@/services/mappers'
import { round2, uid } from '@/services/storage'
import { useAuth } from './auth'
import { useInventory } from './inventory'
import type { Purchase } from '@/types'

export interface NewPurchaseInput {
  supplierName: string
  items: { productId: string; qty: number; cost: number }[]
}

const SUPPLIER_PREFIX = 'Purchase from '

/**
 * The backend has no purchase document. Buying stock is "receive stock" (quantity + unit cost) on a branch.
 * A purchase here is every receive movement that shares a reference, with the supplier kept in the reason text.
 * Supplier balances / part-payments are not available from the API.
 */
export const usePurchases = defineStore('purchases', () => {
  const auth = useAuth()
  const purchases = ref<Purchase[]>([])
  const total = computed(() => round2(purchases.value.reduce((a, p) => a + p.total, 0)))

  async function load() {
    const branch = auth.branchId
    if (!branch) return
    const rows = (await getAll(`/branches/${branch}/stock/movements`, {}, 6)).filter((m: any) => /receiv|purchase/i.test(String(m.type)))
    const inv = useInventory()
    const groups = new Map<string, Purchase>()
    for (const m of rows) {
      const ref = String(m.reference ?? `MOV-${m.id}`)
      const qty = num(m.quantity_change); const cost = num(m.unit_cost)
      const reason = String(m.reason ?? '')
      let g = groups.get(ref)
      if (!g) {
        g = { id: ref, number: ref, date: m.created_at ?? '', supplierName: reason.startsWith(SUPPLIER_PREFIX) ? reason.slice(SUPPLIER_PREFIX.length) : '', items: [], total: 0 }
        groups.set(ref, g)
      }
      g.items.push({ productId: String(m.product_id), name: inv.byId(String(m.product_id))?.name ?? `Product ${m.product_id}`, qty, cost })
      g.total = round2(g.total + (m.total_cost != null ? num(m.total_cost) : qty * cost))
    }
    purchases.value = [...groups.values()].sort((a, b) => b.date.localeCompare(a.date))
  }

  async function createPurchase(input: NewPurchaseInput) {
    const inv = useInventory()
    if (!input.items.length) throw new Error('Add at least one item')
    input.items.forEach(i => {
      const p = inv.byId(i.productId)
      if (!p) throw new Error('A product no longer exists')
      if (i.qty <= 0) throw new Error(`Enter a quantity for ${p.name}`)
    })
    const reference = 'PO-' + uid().slice(-8).toUpperCase()
    const reason = input.supplierName ? SUPPLIER_PREFIX + input.supplierName : 'Stock purchase'
    // One request per product. They share the reference so they read back as one purchase.
    for (const i of input.items) await inv.receive(i.productId, i.qty, i.cost, reference, reason)
    await Promise.allSettled([inv.loadProducts(), load()])
    return reference
  }

  function clear() { purchases.value = [] }
  return { purchases, total, load, createPurchase, clear }
})
