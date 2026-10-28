import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api, ApiError, getAll, getPage, listOf } from '@/services/api'
import { amt, toDebt, toPayment, toSale } from '@/services/mappers'
import { round2, uid } from '@/services/storage'
import { calcTotals } from '@/features/sales/calc'
import { today } from '@/utils/date'
import { useAuth } from './auth'
import { useInventory } from './inventory'
import { useSettings } from './settings'
import type { Adjust, Debt, PayMethod, Payment, Sale, SettleMethod } from '@/types'

export interface CreditInfo { limit: number; owed: number; available: number }
export interface CustomerRef { name: string; phone: string }

export class CreditLimitError extends Error {
  /** `known` is false when the server blocked the sale and we could not work the numbers out ourselves. */
  constructor(public customerName: string, public info: CreditInfo & { known: boolean }, public needed: number, public serverMessage?: string) {
    super('Credit limit exhausted')
  }
}

export interface NewSaleInput {
  customer?: CustomerRef
  items: { productId: string; qty: number; surcharge: number }[]
  discount: Adjust
  method: PayMethod; deposit: number; depositMethod: SettleMethod
  /** Stays the same across retries of the same sale, so a double tap cannot sell twice. */
  clientReference: string
}

const phoneKey = (p?: string) => (p ?? '').replace(/[^\d+]/g, '')
export const sameCustomer = (a: CustomerRef, b: CustomerRef) =>
  (!!phoneKey(a.phone) && phoneKey(a.phone) === phoneKey(b.phone)) ||
  ((!phoneKey(a.phone) || !phoneKey(b.phone)) && a.name.trim().toLowerCase() === b.name.trim().toLowerCase())

const looksLikeCreditLimit = (e: unknown) =>
  e instanceof ApiError && e.status === 422 &&
  /credit|limit/i.test([e.message, ...Object.keys(e.errors), ...Object.values(e.errors).flat()].join(' '))

export const useSales = defineStore('sales', () => {
  const auth = useAuth()
  const sales = ref<Sale[]>([])
  const hasMore = ref(false)
  let nextPage = 2
  const debts = ref<Debt[]>([])
  const paidDebts = ref<Debt[]>([])

  const branchPath = () => `/branches/${auth.branchId}`

  const outstanding = computed(() =>
    debts.value.filter(d => d.balance > 0).sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')))
  const receivables = computed(() => round2(outstanding.value.reduce((a, d) => a + d.balance, 0)))
  const overdue = computed(() => outstanding.value.filter(d => d.overdue))
  const todayTotal = computed(() => round2(sales.value.filter(s => s.day === today()).reduce((a, s) => a + s.total, 0)))

  const debtOf = (c: CustomerRef) => round2(outstanding.value.filter(d => sameCustomer(c, { name: d.customerName, phone: d.customerPhone })).reduce((a, d) => a + d.balance, 0))

  /** Credit limit is one business-wide setting on this backend (Settings > Credit limit). */
  function creditInfo(c: CustomerRef): CreditInfo & { known: boolean } {
    const settings = useSettings()
    const limit = settings.s.creditLimit
    const owed = debtOf(c)
    return { limit, owed, available: Math.max(0, round2(limit - owed)), known: settings.loaded }
  }

  async function loadSales() {
    const p = await getPage(`${branchPath()}/sales`, {}, 1)
    sales.value = p.items.map(toSale)
    hasMore.value = p.hasMore; nextPage = 2
  }
  async function loadMoreSales() {
    if (!hasMore.value) return
    const p = await getPage(`${branchPath()}/sales`, {}, nextPage)
    sales.value.push(...p.items.map(toSale).filter(s => !sales.value.some(x => x.id === s.id)))
    hasMore.value = p.hasMore; nextPage++
  }
  /** Loads pages (newest first) until we have gone back past `day`. Used by the dashboard. */
  async function loadSalesSince(day: string, maxPages = 8) {
    const out: Sale[] = []
    let page = 1, more = false
    for (; page <= maxPages; page++) {
      const p = await getPage(`${branchPath()}/sales`, {}, page)
      out.push(...p.items.map(toSale)); more = p.hasMore
      if (!more || (out.at(-1)?.day ?? '') < day) break
    }
    sales.value = out; hasMore.value = more; nextPage = page + 1
  }

  async function loadDebts() {
    debts.value = (await getAll(`${branchPath()}/debts`)).map(toDebt)
  }

  /** Fully repaid debts (GET .../debts?status=paid). */
  async function loadPaidDebts() {
    paidDebts.value = (await getAll(`${branchPath()}/debts`, { status: 'paid' })).map(toDebt)
  }

  /** One debt by receipt (GET .../debts/{receipt}). Also refreshes it in the list. */
  async function fetchDebt(receiptId: string): Promise<Debt> {
    const d = toDebt(await api.get(`${branchPath()}/debts/${encodeURIComponent(receiptId)}`))
    const i = debts.value.findIndex(x => x.receiptId === d.receiptId)
    if (i >= 0) debts.value[i] = d; else debts.value.push(d)
    return d
  }

  /** The full payment log of a receipt (GET .../sales/{receipt}/payments). */
  async function fetchPayments(receiptId: string): Promise<Payment[]> {
    const res = await api.get(`${branchPath()}/sales/${encodeURIComponent(receiptId)}/payments`)
    const list = listOf(res, 'payments').map(toPayment)
    const s = sales.value.find(x => x.id === receiptId)
    if (s) s.payments = list
    return list
  }

  /** The list rows have no items or payments. This fetches the full receipt and stores it. */
  async function fetchSale(receiptId: string): Promise<Sale> {
    const res = await api.get(`${branchPath()}/sales/${encodeURIComponent(receiptId)}`)
    const sale = toSale(res?.sale ?? res)
    const i = sales.value.findIndex(s => s.id === sale.id)
    if (i >= 0) sales.value[i] = sale; else sales.value.unshift(sale)
    return sale
  }

  async function createSale(input: NewSaleInput): Promise<Sale> {
    const inv = useInventory()
    if (!input.items.length) throw new Error('Add at least one item')

    const lines = input.items.map(i => {
      const p = inv.byId(i.productId)
      if (!p) throw new Error('A product on this sale no longer exists')
      if (i.qty <= 0) throw new Error(`Enter a quantity for ${p.name}`)
      if (i.qty > p.stock) throw new Error(`Only ${p.stock} of ${p.name} in stock`)
      return { qty: i.qty, price: p.sellPrice, surcharge: i.surcharge }
    })
    const t = calcTotals(lines, input.discount)
    const customer = input.customer && (input.customer.name.trim() || input.customer.phone.trim())
      ? { name: input.customer.name.trim(), phone: input.customer.phone.trim() } : undefined

    let paid = t.total
    if (input.method === 'credit') {
      if (!customer?.name || !customer.phone) throw new Error("Enter the customer's name and phone number for a credit sale")
      paid = Math.min(Math.max(input.deposit, 0), t.total)
      const balance = round2(t.total - paid)
      const info = creditInfo(customer)
      // Only pre-check when the limit is known. Otherwise the server decides.
      if (info.known && balance > info.available) throw new CreditLimitError(customer.name, info, balance)
    }

    const body: Record<string, unknown> = {
      items: input.items.map(i => ({
        product_id: Number(i.productId), quantity: i.qty, ...(i.surcharge > 0 ? { surcharge_amount: amt(i.surcharge) } : {})
      })),
      payment_type: input.method, client_reference: input.clientReference
    }
    if (input.discount.value > 0) {
      body.discount_type = input.discount.type === 'percent' ? 'percentage' : 'fixed'
      body.discount_value = amt(input.discount.value)
    }
    if (customer) { body.customer_name = customer.name; body.customer_phone = customer.phone }
    if (input.method === 'credit') { body.paid_amount = amt(paid); body.initial_payment_method = input.depositMethod }

    let res
    try { res = await api.post(`${branchPath()}/sales`, body) }
    catch (e) {
      if (input.method === 'credit' && customer && looksLikeCreditLimit(e)) {
        const info = creditInfo(customer)
        throw new CreditLimitError(customer.name, info, round2(t.total - paid), e instanceof ApiError ? e.message : undefined)
      }
      throw e
    }
    const sale = toSale(res.sale)
    sales.value.unshift(sale)
    // Stock went down and a debt may have been created, so refresh both.
    await Promise.allSettled([loadDebts(), inv.loadProducts()])
    return sale
  }

  /** Records a repayment against a credit sale (identified by its receipt id). */
  async function recordPayment(receiptId: string, amount: number, method: SettleMethod, note: string | undefined, clientReference: string) {
    if (!(amount > 0)) throw new Error('Enter an amount')
    const res = await api.post(`${branchPath()}/sales/${encodeURIComponent(receiptId)}/repayments`, {
      amount: amt(amount), method, client_reference: clientReference, ...(note ? { notes: note } : {})
    })
    if (res?.debt) {
      const d = toDebt(res.debt)
      const i = debts.value.findIndex(x => x.receiptId === d.receiptId)
      if (i >= 0) debts.value[i] = d
    }
    const s = sales.value.find(x => x.id === receiptId)
    if (s && res?.sale) {
      s.paid = Number(res.sale.paid_amount ?? s.paid); s.balance = Number(res.sale.due_amount ?? s.balance)
      s.status = res.sale.payment_status ?? s.status; s.detailLoaded = false
    }
  }

  const newRef = () => uid() + uid()
  function clear() { sales.value = []; debts.value = []; paidDebts.value = []; hasMore.value = false }

  return {
    sales, hasMore, debts, paidDebts, outstanding, receivables, overdue, todayTotal,
    debtOf, creditInfo, loadSales, loadMoreSales, loadSalesSince, loadDebts, loadPaidDebts, fetchDebt, fetchPayments, fetchSale, createSale, recordPayment, newRef, clear
  }
})
