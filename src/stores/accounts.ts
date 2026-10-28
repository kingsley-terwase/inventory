import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '@/services/api'
import { num } from '@/services/mappers'
import { useAuth } from './auth'

export interface MoneyLine { key: string; label: string; value: number }

const LABELS: Record<string, string> = {
  money_received: 'Money received', purchases: 'Purchases (stock bought)', expenses: 'Expenses', net_money_movement: 'Net money movement'
}
const humanize = (k: string) => LABELS[k] ?? k.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())

/**
 * The backend has no cash / bank ledger. What it has is a money summary for a date range
 * (GET /money-summary), so the Accounts page shows that instead of a transaction ledger.
 */
export const useAccounts = defineStore('accounts', () => {
  const auth = useAuth()
  const lines = ref<MoneyLine[]>([])
  const range = ref({ from: '', to: '' })

  const get = (key: string) => lines.value.find(l => l.key === key)?.value ?? 0

  async function loadSummary(from: string, to: string) {
    const res = await api.get('/money-summary', { branch_id: auth.branchId, from, to })
    const totals = res?.totals ?? {}
    lines.value = Object.entries(totals)
      .filter(([, v]) => (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)))))
      .map(([key, v]) => ({ key, label: humanize(key), value: num(v) }))
    range.value = { from, to }
  }

  function clear() { lines.value = [] }
  return { lines, range, get, loadSummary, clear }
})
