/**
 * Converts backend JSON (snake_case, money as strings, numeric ids) into the shapes the UI uses
 * (camelCase, numbers, string ids). Keeping this in one file means a backend change is a one-file fix.
 */
import { round2 } from './storage'
import type {
  AppNotification, Branch, Debt, Expense, PayMethod, Payment, Product, ReminderRule, Role, Sale, SaleItem,
  Settings, SettleMethod, SmsLog, StockMovement, User
} from '@/types'

export const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : 0
}
/** Money as the 2-decimal string the API expects. */
export const amt = (n: number) => round2(n).toFixed(2)
const id = (v: unknown) => String(v ?? '')
const day = (s?: string | null) => (s ? String(s).slice(0, 10) : '')

export const expenseCategories = ['Rent', 'Salaries', 'Transport', 'Utilities', 'Supplies', 'Marketing', 'Other']

export function toUser(u: any): User {
  const roles = (Array.isArray(u?.roles) ? u.roles : []).map((r: any) => (typeof r === 'string' ? r : r?.slug)).filter(Boolean) as Role[]
  return {
    id: id(u.id), name: u.name ?? '', email: u.email ?? '', roles,
    branchId: u.branch_id != null ? id(u.branch_id) : undefined,
    isActive: u.is_active !== false, mustChangePassword: !!u.must_change_password
  }
}

export const toBranch = (b: any): Branch => ({ id: id(b.id), name: b.name ?? '', address: b.address ?? '', phone: b.phone ?? '' })

export function toSettings(s: any, base: Settings): Settings {
  return {
    currency: s?.currency ?? base.currency,
    creditLimit: num(s?.credit_limit ?? base.creditLimit),
    maxDiscountType: s?.max_discount_type === 'fixed' ? 'fixed' : 'percentage',
    maxDiscountValue: num(s?.max_discount_value ?? base.maxDiscountValue),
    repaymentDays: Math.round(num(s?.repayment_period_days ?? base.repaymentDays))
  }
}

/** Product + the branch's stock row (quantity, alert level and average cost live on the stock row). */
export function toProduct(p: any, stock?: any, categoryName = '', stockKnown = true): Product {
  return {
    id: id(p.id), name: p.name ?? '', sku: p.sku ?? '', unit: p.unit ?? 'pcs',
    category: categoryName, categoryId: p.category_id != null ? id(p.category_id) : undefined,
    costPrice: num(stock?.average_price ?? p.purchase_price), sellPrice: num(p.selling_price),
    // When we could not read this branch's stock at all, do not claim products are unstocked.
    stocked: stockKnown ? !!stock : true,
    stock: num(stock?.quantity), reorderLevel: num(p.min_stock ?? stock?.min_stock), maxStock: num(p.max_stock ?? stock?.max_stock)
  }
}

export function toMovement(m: any, productName: string): StockMovement {
  const t = String(m.type ?? '').toLowerCase()
  return {
    id: id(m.id), date: m.created_at ?? '', productId: id(m.product_id), productName,
    type: /receiv|purchase/.test(t) ? 'purchase' : /sale|sold/.test(t) ? 'sale' : /adjust/.test(t) ? 'adjustment' : 'other',
    qty: num(m.quantity_change), note: m.reason ?? '', reference: m.reference ?? undefined,
    unitCost: m.unit_cost != null ? num(m.unit_cost) : undefined,
    totalCost: m.total_cost != null ? num(m.total_cost) : undefined
  }
}

export function toPayment(p: any): Payment {
  return {
    id: id(p.id), date: p.paid_at ?? p.created_at ?? '', amount: num(p.amount),
    method: (p.method === 'transfer' ? 'transfer' : 'cash') as SettleMethod,
    kind: p.payment_kind === 'repayment' ? 'repayment' : p.payment_kind === 'initial' ? 'initial' : undefined,
    note: p.notes ?? undefined, reference: p.reference ?? undefined
  }
}

export function toSaleItem(i: any): SaleItem {
  return {
    productId: id(i.product_id), name: i.product_name ?? `Product ${i.product_id}`, sku: i.product_sku ?? undefined,
    qty: num(i.quantity), basePrice: num(i.original_price ?? i.price), surcharge: num(i.surcharge_value), price: num(i.price)
  }
}

/** The API's `subtotal` already includes line surcharges. The UI shows them separately, so we back them out. */
export function toSale(s: any): Sale {
  const surcharge = num(s.surcharge_amount)
  const items = Array.isArray(s.items) ? s.items.map(toSaleItem) : []
  const method = (['cash', 'transfer', 'credit'].includes(s.payment_type) ? s.payment_type : 'cash') as PayMethod
  const number = s.sale_number ?? id(s.id)
  return {
    id: number, number, date: s.created_at ?? s.sale_date ?? '', day: day(s.sale_date ?? s.created_at),
    customerId: s.customer_id != null ? id(s.customer_id) : undefined,
    customerName: s.customer_name || 'Walk-in customer', customerPhone: s.customer_phone ?? undefined,
    items, subtotal: round2(num(s.subtotal) - surcharge), surcharge, discount: num(s.discount_amount), total: num(s.grand_total),
    method, paid: num(s.paid_amount), balance: num(s.due_amount),
    dueDate: s.credit_due_date ? day(s.credit_due_date) : undefined,
    status: s.payment_status ?? '', payments: Array.isArray(s.payments) ? s.payments.map(toPayment) : [],
    detailLoaded: Array.isArray(s.items)
  }
}

export const toDebt = (raw: any): Debt => { const d = raw?.data && !Array.isArray(raw.data) ? raw.data : raw; return {
  id: id(d.id), receiptId: d.receipt_id ?? '', customerName: d.customer_name || 'Customer', customerPhone: d.customer_phone ?? '',
  amount: num(d.amount), paid: num(d.paid_amount), balance: num(d.remaining_amount),
  dueDate: d.due_date ? day(d.due_date) : undefined, status: d.status ?? '', overdue: !!d.is_overdue, dueToday: !!d.is_due_today
} }

/** The API has one free-text `purpose`. We store "Category: description" in it so the UI keeps its categories. */
export const purposeOf = (category: string, description: string) =>
  description.trim() ? `${category}: ${description.trim()}` : category

export function toExpense(e: any): Expense {
  const purpose: string = e.purpose ?? ''
  const cat = expenseCategories.find(c => purpose === c || purpose.startsWith(c + ': '))
  return {
    id: id(e.id), date: day(e.expense_date ?? e.created_at), category: cat ?? 'Other',
    description: cat ? purpose.slice(cat.length + 2) : purpose, amount: num(e.amount),
    method: e.method === 'transfer' ? 'transfer' : 'cash', reference: e.reference ?? undefined
  }
}

/* The alert and SMS-log response shapes are not in the Postman collection, so these read common field names defensively. */
export function toNotification(a: any): AppNotification {
  const fallback = [a.customer_name, a.remaining_amount != null && `owes ${a.remaining_amount}`, a.due_date && `due ${day(a.due_date)}`].filter(Boolean).join(' ')
  return {
    id: id(a.id), date: a.created_at ?? a.date ?? '', kind: 'debt',
    title: a.title ?? (a.is_overdue ? 'Debt overdue' : 'Debt reminder'),
    message: a.message ?? a.body ?? a.description ?? fallback,
    read: Boolean(a.is_read ?? a.read ?? a.read_at)
  }
}

export const toSmsLog = (l: any): SmsLog => ({
  id: id(l.id), date: l.sent_at ?? l.created_at ?? '', customerName: l.customer_name ?? l.recipient_name ?? '',
  to: l.phone ?? l.to ?? l.recipient ?? l.customer_phone ?? '', message: l.message ?? l.body ?? '',
  status: String(l.status ?? l.delivery_status ?? 'queued')
})

export const toRule = (r: any): ReminderRule => ({
  id: id(r.id), name: r.name ?? '', phase: r.phase === 'before' ? 'before' : 'after', offsetDays: num(r.offset_days),
  sendTime: String(r.send_time ?? '09:00').slice(0, 5), intervalDays: num(r.interval_days),
  template: r.template ?? '', enabled: !!r.enabled
})

export const ruleBody = (r: Omit<ReminderRule, 'id'>) => ({
  name: r.name, phase: r.phase, offset_days: r.offsetDays, send_time: r.sendTime,
  interval_days: r.intervalDays, template: r.template, enabled: r.enabled
})

export const toCategory = (c: any) => ({ id: id(c.id), name: c.name ?? '', description: c.description ?? '' })
