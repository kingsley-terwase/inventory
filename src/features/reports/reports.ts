import { api, download, listOf } from '@/services/api'
import { fmtDate } from '@/utils/date'
import { useAuth } from '@/stores/auth'
import { useSettings } from '@/stores/settings'

export type ReportKey = 'sales' | 'payments' | 'debts' | 'stock' | 'purchases' | 'movements' | 'expenses' | 'money'

/** The reports the server can produce. `ranged` ones take a from/to date; stock is always a current snapshot. */
export const reportList: { key: ReportKey; label: string; ranged: boolean }[] = [
  { key: 'sales', label: 'Sales', ranged: true },
  { key: 'payments', label: 'Payments received', ranged: true },
  { key: 'debts', label: 'Debts (by due date)', ranged: true },
  { key: 'stock', label: 'Stock (current)', ranged: false },
  { key: 'purchases', label: 'Purchases', ranged: true },
  { key: 'movements', label: 'Stock movements', ranged: true },
  { key: 'expenses', label: 'Expenses', ranged: true },
  { key: 'money', label: 'Money summary', ranged: true }
]

export interface Preview {
  summary: { label: string; value: string }[]
  columns: string[]
  rows: string[][]
}

const query = (key: ReportKey, from: string, to: string, format: 'json' | 'pdf') => ({
  branch_id: useAuth().branchId, format,
  ...(reportList.find(r => r.key === key)?.ranged ? { from, to } : {})
})

export const downloadPdf = (key: ReportKey, from: string, to: string) =>
  download(`/reports/${key}`, query(key, from, to, 'pdf'), `${key}-report${reportList.find(r => r.key === key)?.ranged ? `-${from}-to-${to}` : ''}.pdf`)

const humanize = (k: string) => k.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())
const NOISE = new Set(['updated_at', 'business_id', 'branch_id', 'user_id', 'bank_account_id'])
const MONEYISH = /(amount|total|price|cost|paid|balance|due|value|remaining|surcharge|discount|received|expenses|purchases|net)/i
const isScalar = (v: unknown) => v === null || ['string', 'number', 'boolean'].includes(typeof v)

/**
 * The JSON shape of the report endpoints is not documented in the Postman collection, so the preview is built
 * generically: any object of totals becomes summary cards, and the first list of records becomes a table.
 * The PDF is the authoritative output.
 */
export async function fetchPreview(key: ReportKey, from: string, to: string): Promise<Preview> {
  const { money } = useSettings()
  const res = await api.get(`/reports/${key}`, query(key, from, to, 'json'))

  const fmt = (k: string, v: unknown): string => {
    if (v === null || v === undefined || v === '') return ''
    if (typeof v === 'boolean') return v ? 'Yes' : 'No'
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return fmtDate(v)
    const n = Number(v)
    if (MONEYISH.test(k) && v !== '' && Number.isFinite(n) && !/_id$|^id$/.test(k)) return money(n)
    return String(v)
  }

  const summary: Preview['summary'] = []
  for (const k of ['totals', 'summary']) {
    const o = res?.[k] ?? res?.data?.[k]
    if (o && typeof o === 'object' && !Array.isArray(o))
      Object.entries(o).filter(([, v]) => isScalar(v)).forEach(([name, v]) => summary.push({ label: humanize(name), value: fmt(name, v) }))
  }

  const records = listOf<Record<string, unknown>>(res, 'rows', 'items', key).filter(r => r && typeof r === 'object')
  const columns = [...new Set(records.slice(0, 25).flatMap(r => Object.keys(r).filter(k => isScalar(r[k]) && !NOISE.has(k) && !/(^|_)id$/.test(k))))].slice(0, 9)
  return {
    summary, columns: columns.map(humanize),
    rows: records.map(r => columns.map(c => fmt(c, r[c])))
  }
}
