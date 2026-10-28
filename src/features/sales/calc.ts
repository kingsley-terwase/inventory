import type { Adjust } from '@/types'
import { round2 } from '@/services/storage'

export interface CalcLine { qty: number; price: number; surcharge: number }

/**
 * Same order the backend uses: each line carries a per-unit surcharge, then the discount is taken off
 * the surcharged subtotal. Everything is already included in `total`, so total is what the customer pays.
 */
export function calcTotals(lines: CalcLine[], discount: Adjust) {
  const base = round2(lines.reduce((a, l) => a + l.qty * l.price, 0))
  const surcharge = round2(lines.reduce((a, l) => a + l.qty * l.surcharge, 0))
  const gross = round2(base + surcharge)
  const raw = discount.type === 'percent' ? (gross * discount.value) / 100 : discount.value
  const d = round2(Math.min(Math.max(raw, 0), gross))
  return { subtotal: base, surcharge, discount: d, total: round2(gross - d) }
}

/** The largest discount the business allows on a sale of this size (undefined = no cap configured). */
export function discountCap(gross: number, type: 'percentage' | 'fixed', value: number): number | undefined {
  if (!(value > 0)) return undefined
  return round2(type === 'percentage' ? (gross * value) / 100 : value)
}
