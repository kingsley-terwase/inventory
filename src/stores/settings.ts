import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api, listOf } from '@/services/api'
import { amt, ruleBody, toBranch, toRule, toSettings } from '@/services/mappers'
import { useAuth } from './auth'
import type { Branch, ReminderRule, Settings } from '@/types'

export const defaultSettings: Settings = {
  currency: 'NGN', creditLimit: 0, maxDiscountType: 'percentage', maxDiscountValue: 0, repaymentDays: 30
}
const LOCALE = 'en-NG'

export const useSettings = defineStore('settings', () => {
  const s = ref<Settings>({ ...defaultSettings })
  /** False until GET /settings succeeds. Until then we must not guess limits on the client. */
  const loaded = ref(false)
  const branch = ref<Branch | null>(null)
  const rules = ref<ReminderRule[]>([])

  const businessName = computed(() => branch.value?.name || 'Stockbook')

  const money = (n: number) => {
    try { return new Intl.NumberFormat(LOCALE, { style: 'currency', currency: s.value.currency, currencyDisplay: 'narrowSymbol' }).format(n) }
    catch { return `${s.value.currency} ${(Math.round(n * 100) / 100).toLocaleString()}` }
  }
  const symbol = computed(() => {
    try {
      return new Intl.NumberFormat(LOCALE, { style: 'currency', currency: s.value.currency, currencyDisplay: 'narrowSymbol' })
        .formatToParts(0).find(p => p.type === 'currency')?.value ?? s.value.currency
    } catch { return s.value.currency }
  })

  async function load() {
    const res = await api.get('/settings')
    s.value = toSettings(res?.settings ?? res, s.value)
    loaded.value = true
  }
  async function loadBranch() {
    const id = useAuth().branchId
    if (!id) return
    const res = await api.get(`/branches/${id}`)
    branch.value = toBranch(res?.branch ?? res)
  }
  async function save(next: Settings) {
    const res = await api.patch('/settings', {
      currency: next.currency.trim().toUpperCase(), credit_limit: amt(next.creditLimit),
      max_discount_type: next.maxDiscountType, max_discount_value: amt(next.maxDiscountValue),
      repayment_period_days: Math.round(next.repaymentDays)
    })
    s.value = toSettings(res?.settings ?? res, next)
    loaded.value = true
  }

  async function loadRules() {
    rules.value = listOf(await api.get('/reminder-rules'), 'rules').map(toRule)
  }
  async function saveRule(r: Omit<ReminderRule, 'id'> & { id?: string }) {
    if (r.id) await api.put(`/reminder-rules/${r.id}`, ruleBody(r))
    else await api.post('/reminder-rules', ruleBody(r))
    await loadRules()
  }

  function clear() { s.value = { ...defaultSettings }; loaded.value = false; branch.value = null; rules.value = [] }

  return { s, loaded, branch, rules, businessName, money, symbol, load, loadBranch, save, loadRules, saveRule, clear }
})
