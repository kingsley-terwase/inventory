/**
 * The dashboard's section shapes are not in the Postman collection (only that `sections` exists and that the
 * `money` section is hidden from cashiers), so sections are rendered generically and tidied for people:
 * numbers become stat cards, long text becomes a note, and lists of records become small tables.
 */
export interface SectionStat { label: string; raw: unknown; money: boolean }
export interface SectionList { title: string; columns: string[]; rows: Record<string, unknown>[] }
export interface SectionView { key: string; title: string; stats: SectionStat[]; lists: SectionList[]; notes: string[] }
export interface ViewOptions {
  /** 'branch' hides per-branch comparison tables: they only make sense when looking at all branches. */
  scope?: 'branch' | 'all'
  /** Section names to leave out (we show our own, better version). */
  skip?: string[]
}

const MONEYISH = /(amount|total|price|cost|paid|balance|due|value|remaining|received|expenses|purchases|net|revenue|sales|owed|debt|payments|repayments|spent|money)/i
const NOT_MONEY = /(count|number|qty|quantity|items|customers|products|orders|low_stock|limit|minimum)/i
const HIDDEN = /(^|_)limit$|preview/i
/** Money from this API is a string with exactly two decimals ("2500.00"). Counts are plain numbers. */
const TWO_DECIMALS = /^-?\d+\.\d{2}$/

export const humanize = (k: string) => k.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())
const scalar = (v: unknown) => v === null || ['string', 'number', 'boolean'].includes(typeof v)
const numeric = (v: unknown) => (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))))

export function isMoney(k: string, v: unknown): boolean {
  if (!numeric(v) || NOT_MONEY.test(k)) return false
  return (typeof v === 'string' && TWO_DECIMALS.test(v)) || MONEYISH.test(k)
}

const isNote = (k: string, v: unknown) => typeof v === 'string' && (/note|description|message/i.test(k) || v.length > 40) && !numeric(v)

function addScalar(view: SectionView, key: string, label: string, v: unknown) {
  if (HIDDEN.test(key) || v === null) return
  if (isNote(key, v)) view.notes.push(String(v))
  else view.stats.push({ label, raw: v, money: isMoney(key, v) })
}

export function viewSections(sections: Record<string, unknown>, opts: ViewOptions = {}): SectionView[] {
  return Object.entries(sections).filter(([key]) => !opts.skip?.includes(key)).map(([key, v]) => {
    const view: SectionView = { key, title: humanize(key), stats: [], lists: [], notes: [] }
    if (scalar(v)) addScalar(view, key, humanize(key), v)
    else if (Array.isArray(v)) addList(view, key, v, opts)
    else for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (scalar(val)) addScalar(view, k, humanize(k), val)
      else if (Array.isArray(val)) addList(view, k, val, opts)
      else if (val && typeof val === 'object')
        // A wrapper like "totals" adds nothing for a reader, so its children are shown on their own.
        for (const [k2, v2] of Object.entries(val as Record<string, unknown>))
          if (scalar(v2)) addScalar(view, k2, /^(totals?|summary)$/i.test(k) ? humanize(k2) : `${humanize(k)} · ${humanize(k2)}`, v2)
    }
    return view
  }).filter(s => s.stats.length || s.lists.length || s.notes.length)
}

function addList(view: SectionView, key: string, arr: unknown[], opts: ViewOptions) {
  const rows = arr.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object' && !Array.isArray(r)).slice(0, 8)
  if (!rows.length) return
  const columns = [...new Set(rows.flatMap(r => Object.keys(r).filter(k => scalar(r[k]) && !/(^|_)id$|_at$/.test(k) && !HIDDEN.test(k))))].slice(0, 5)
  if (opts.scope === 'branch' && columns.includes('branch_name')) return // a comparison of branches: not useful for one branch
  view.lists.push({ title: humanize(key), columns, rows })
}
