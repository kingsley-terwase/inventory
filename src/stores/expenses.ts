import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api, getAll } from '@/services/api'
import { amt, expenseCategories, purposeOf, toExpense } from '@/services/mappers'
import { useAuth } from './auth'
import type { Expense, SettleMethod } from '@/types'

export { expenseCategories }

export interface NewExpenseInput {
  date: string; category: string; description: string; amount: number; method: SettleMethod
  /** Created once per form, so double-submitting the same form is rejected as a duplicate. */
  clientReference: string
}

export const useExpenses = defineStore('expenses', () => {
  const auth = useAuth()
  const expenses = ref<Expense[]>([])

  async function load() {
    // Admins pick a branch. Everyone else only ever sees their own, and must not send branch_id.
    const rows = await getAll('/expenses', auth.isAdmin ? { branch_id: auth.branchId } : {})
    expenses.value = rows.map(toExpense)
  }

  /** The API only creates expenses: there is no edit or delete. */
  async function create(e: NewExpenseInput) {
    if (e.amount <= 0) throw new Error('Enter an amount')
    await api.post('/expenses', {
      amount: amt(e.amount), purpose: purposeOf(e.category, e.description), expense_date: e.date,
      method: e.method, client_reference: e.clientReference,
      ...(auth.isAdmin ? { branch_id: Number(auth.branchId) } : {})
    })
    await load()
  }

  function clear() { expenses.value = [] }
  return { expenses, load, create, clear }
})
