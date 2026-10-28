/** Role slugs exactly as the backend returns them (GET /roles). `admin` is the business owner. */
export type Role = 'admin' | 'manager' | 'cashier' | 'staff'
export type PayMethod = 'cash' | 'transfer' | 'credit'
export type SettleMethod = 'cash' | 'transfer'

export interface User {
  id: string; name: string; email: string; roles: Role[]
  branchId?: string; isActive: boolean; mustChangePassword: boolean
}

export interface Branch { id: string; name: string; address: string; phone: string }
export interface Category { id: string; name: string; description: string }

export interface Product {
  id: string; name: string; sku: string; category: string; categoryId?: string; unit: string
  costPrice: number; sellPrice: number; stock: number; reorderLevel: number; maxStock: number
  /** Products belong to the business, stock belongs to a branch. False = this branch has never stocked it. */
  stocked: boolean
}

export interface StockMovement {
  id: string; date: string; productId: string; productName: string
  type: 'sale' | 'purchase' | 'adjustment' | 'other'; qty: number; note: string
  reference?: string; unitCost?: number; totalCost?: number
}

/** Customers are created by the backend when a sale names one; there is no customer endpoint. */
export interface Customer { key: string; name: string; phone: string; owed: number; limit: number }
/** The backend has no supplier endpoint, so suppliers are a local address book (this device only). */
export interface Supplier { id: string; name: string; phone: string; address: string }

export interface Payment {
  id: string; date: string; amount: number; method: SettleMethod
  kind?: 'initial' | 'repayment'; note?: string; reference?: string
}

export interface SaleItem {
  productId: string; name: string; sku?: string; qty: number
  basePrice: number     // product price before surcharge
  surcharge: number     // per unit
  price: number         // basePrice + surcharge (what the customer pays per unit)
}

export interface Adjust { type: 'amount' | 'percent'; value: number }

export interface Sale {
  id: string            // the receipt id (REC-...). The backend addresses sales by receipt.
  number: string
  date: string          // created_at (has the time)
  day: string           // sale_date, YYYY-MM-DD
  customerId?: string; customerName: string; customerPhone?: string
  items: SaleItem[]     // empty on list rows; filled by fetchSale()
  subtotal: number      // items at base price, before surcharge and discount
  surcharge: number; discount: number; total: number
  method: PayMethod; paid: number; balance: number; dueDate?: string
  status: string
  payments: Payment[]
  detailLoaded: boolean
}

export interface Debt {
  id: string; receiptId: string; customerName: string; customerPhone: string
  amount: number; paid: number; balance: number; dueDate?: string
  status: string; overdue: boolean; dueToday: boolean
}

export interface PurchaseItem { productId: string; name: string; qty: number; cost: number }
/** A purchase is a set of "stock received" movements sharing one reference. */
export interface Purchase {
  id: string; number: string; date: string; supplierName: string
  items: PurchaseItem[]; total: number
}

export interface Expense {
  id: string; date: string; category: string; description: string; amount: number
  method: SettleMethod; reference?: string
}

export interface AppNotification {
  id: string; date: string; kind: 'debt' | 'info'; title: string; message: string; read: boolean
}

export interface SmsLog {
  id: string; date: string; customerName: string; to: string; message: string; status: string
}

export interface Settings {
  currency: string; creditLimit: number
  maxDiscountType: 'percentage' | 'fixed'; maxDiscountValue: number
  repaymentDays: number
}

export interface ReminderRule {
  id: string; name: string; phase: 'before' | 'after'; offsetDays: number
  sendTime: string; intervalDays: number; template: string; enabled: boolean
}

export interface Permission { resource: string; action: string; allowed: boolean }

/** Line used by the sale / purchase item editor */
export interface Line { productId: string; name: string; qty: number; price: number; stock: number; surcharge: number }
