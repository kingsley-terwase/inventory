import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '@/services/api'
import { useAuth } from './auth'

/**
 * GET /dashboard returns { sections: { ... } }, and only the sections the role may see
 * (for example a cashier gets no "money" section). Admins can ask for one branch or all branches.
 */
export const useDashboard = defineStore('dashboard', () => {
  const auth = useAuth()
  const sections = ref<Record<string, unknown>>({})
  const scope = ref<'branch' | 'all'>('branch')

  async function load() {
    const res = await api.get('/dashboard', scope.value === 'branch' && auth.branchId ? { branch_id: auth.branchId } : {})
    sections.value = (res?.sections ?? {}) as Record<string, unknown>
  }
  function clear() { sections.value = {}; scope.value = 'branch' }
  return { sections, scope, load, clear }
})
