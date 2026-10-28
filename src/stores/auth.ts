import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api, ApiError, getToken, listOf, setToken } from '@/services/api'
import { persisted } from '@/services/storage'
import { toBranch, toUser } from '@/services/mappers'
import { access, accessOrder, type Need } from '@/layouts/access'
import type { Branch, User } from '@/types'

const DEVICE = 'Stockbook web'
export interface RegisterInput {
  name: string; email: string; phone: string; password: string; passwordConfirmation: string
  businessName: string; branchName: string; branchAddress: string
}

export const useAuth = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const branches = ref<Branch[]>([])
  const chosenBranch = persisted<string>('branch', '')
  /** `resource.action` strings this user may do. null = not loaded yet (or admin, who may do everything). */
  const perms = ref<Set<string> | null>(null)
  let permsLoading: Promise<void> | null = null

  const isAdmin = computed(() => !!user.value?.roles.includes('admin'))
  /** Admins can switch branch. Everyone else works in the branch they are assigned to. */
  const branchId = computed(() =>
    (isAdmin.value && branches.value.some(b => b.id === chosenBranch.value) ? chosenBranch.value : '') ||
    user.value?.branchId || branches.value[0]?.id || '')
  const primaryRole = computed(() => user.value?.roles[0] ?? '')

  /** True when the stored token has been checked with the server (or there was none). */
  let restoring: Promise<void> | null = null
  const ensureRestored = () => (restoring ??= restore())

  async function restore() {
    if (!getToken()) return
    try {
      const res = await api.get('/auth/me')
      user.value = toUser(res?.user ?? res)
    } catch (e) {
      // Only a rejected token ends the session. A network blip should not log anyone out.
      if (e instanceof ApiError && e.status === 401) clear()
    }
  }

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email: email.trim(), password, device_name: DEVICE }, { auth: false })
    setToken(res.token)
    const u = toUser(res.user)
    if (res.requires_password_change) u.mustChangePassword = true
    user.value = u
    permsLoading = null; perms.value = null
    restoring = Promise.resolve()
    return u
  }

  /** Creates a new business, its owner (admin) and the first branch, then signs the owner in. */
  async function register(i: RegisterInput) {
    const res = await api.post('/auth/register', {
      name: i.name.trim(), email: i.email.trim(), phone: i.phone.trim(),
      password: i.password, password_confirmation: i.passwordConfirmation,
      business_name: i.businessName.trim(), branch_name: i.branchName.trim(), branch_address: i.branchAddress.trim()
    }, { auth: false })
    setToken(res.token)
    // The register response is { token, business, branch }. /auth/me gives the full user with roles.
    let u: User
    try { const me = await api.get('/auth/me'); u = toUser(me?.user ?? me) }
    catch { u = toUser(res.user ?? { id: '', name: i.name, email: i.email, roles: [{ slug: 'admin' }] }) }
    if (!u.branchId && res.branch?.id != null) u.branchId = String(res.branch.id)
    user.value = u
    permsLoading = null; perms.value = null
    restoring = Promise.resolve()
    return u
  }

  async function createBranch(i: { name: string; address: string; phone: string }): Promise<Branch> {
    const res = await api.post('/branches', { name: i.name.trim(), address: i.address.trim(), phone: i.phone.trim() })
    await loadBranches()
    return toBranch(res?.branch ?? res)
  }

  /** Staff get a temporary password by email and must replace it before they can use the app. */
  async function changePassword(current: string, next: string) {
    const res = await api.post('/auth/change-password', { current_password: current, password: next, password_confirmation: next })
    if (res?.token) setToken(res.token)
    if (res?.user) user.value = toUser(res.user)
    else if (user.value) user.value.mustChangePassword = false
  }

  async function loadBranches() {
    if (!isAdmin.value) return
    const res = await api.get('/branches')
    branches.value = listOf(res, 'branches').map(toBranch)
  }
  const chooseBranch = (id: string) => { chosenBranch.value = id }

  function clear() { setToken(null); user.value = null; branches.value = []; perms.value = null; permsLoading = null; restoring = Promise.resolve() }
  async function logout() {
    try { await api.post('/auth/logout') } catch { /* the token may already be dead */ }
    clear()
  }

  /**
   * Works out what this user may do, from the permissions the owner assigned to their role(s).
   * Reads GET /roles/{slug}/permissions. If the backend does not let a non-admin read that, we fall back to
   * probing the main screens' endpoints once: a 403 means "not allowed". Roles with several slugs are combined.
   */
  const ensurePermissions = () => (permsLoading ??= loadPermissions())
  async function loadPermissions() {
    if (!user.value || isAdmin.value) { perms.value = null; return }
    const set = new Set<string>(); let read = false
    for (const role of user.value.roles) {
      try {
        const res = await api.get(`/roles/${role}/permissions`)
        listOf<any>(res, 'permissions').forEach(p => { if (p.allowed) set.add(`${p.resource}.${p.action}`) })
        read = true
      } catch { /* not readable for this role: try the probe below */ }
    }
    if (!read) await probe(set)
    perms.value = set
  }
  async function probe(set: Set<string>) {
    const b = branchId.value
    const checks: [string, string][] = [
      ['dashboard', '/dashboard'], ['sales', `/branches/${b}/sales`], ['products', '/products'],
      ['inventory', `/branches/${b}/stock`], ['debts', `/branches/${b}/debts`], ['expenses', '/expenses']
    ]
    await Promise.all(checks.map(async ([resource, path]) => {
      try {
        await api.get(path)
        // We can only see "view" this way. Creating/changing is assumed to follow it: the server still has the final say.
        ;['view', 'create', 'update', 'delete'].forEach(a => set.add(`${resource}.${a}`))
        if (resource === 'debts') set.add('payments.create')
      } catch { /* 403 or unreachable: not allowed */ }
    }))
  }

  const has = (resource: string, action = 'view') => isAdmin.value || !!perms.value?.has(`${resource}.${action}`)
  /** Use in templates: `auth.canDo('products', 'create')`. The backend still enforces it (403) if this is wrong. */
  const canDo = has
  const allows = (need?: Need) => {
    if (!user.value) return false
    if (!need || isAdmin.value) return true
    if ('admin' in need) return false
    return need.any.some(([r, a]) => has(r, a))
  }
  const allowsPath = (path: string) => allows(access[path])
  /** The first screen this user may open. Empty when their role has no permissions at all. */
  const homePath = computed(() => accessOrder.find(p => allowsPath(p)) ?? '')

  return { user, branches, branchId, isAdmin, primaryRole, ensureRestored, ensurePermissions, login, register, createBranch, changePassword, loadBranches, chooseBranch, logout, clear, canDo, allows, allowsPath, homePath }
})
