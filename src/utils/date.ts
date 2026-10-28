const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const today = () => iso(new Date())
export const addDays = (date: string, n: number) => {
  const d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d)
}
export const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000)
export const monthStart = () => today().slice(0, 8) + '01'
export const fmtDate = (s?: string) =>
  s ? new Date(s.length === 10 ? s + 'T00:00:00' : s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
export const fmtDateTime = (s: string) =>
  new Date(s).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export type DueState = 'overdue' | 'today' | 'soon' | 'ok'
/** The backend says whether a debt is overdue / due today. "Soon" is our own 3-day heads-up. */
export function dueState(d: { dueDate?: string; overdue: boolean; dueToday: boolean }): DueState {
  if (d.overdue) return 'overdue'
  if (d.dueToday) return 'today'
  return d.dueDate && daysBetween(today(), d.dueDate) <= 3 ? 'soon' : 'ok'
}
export const dueLabel = (s: DueState) => ({ overdue: 'Overdue', today: 'Due today', soon: 'Due soon', ok: 'Not due yet' })[s]
export const dueColor = (s: DueState) => ({ overdue: 'danger', today: 'warning', soon: 'warning', ok: 'medium' })[s]
