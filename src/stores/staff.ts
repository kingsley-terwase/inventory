import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api, getAll, listOf } from '@/services/api'
import { toUser } from '@/services/mappers'
import type { Permission, Role, User } from '@/types'

export interface RoleInfo { id: string; name: string; slug: Role }
export interface NewStaffInput { name: string; email: string; branchId: string; roles: Role[] }

export const useStaff = defineStore('staff', () => {
  const users = ref<User[]>([])
  const roles = ref<RoleInfo[]>([])

  async function load() { users.value = (await getAll('/staff')).map(toUser) }
  async function loadRoles() {
    roles.value = listOf(await api.get('/roles'), 'roles').map((r: any) => ({ id: String(r.id), name: r.name, slug: r.slug }))
  }

  /** The server generates a temporary password and emails it. We never see or choose it. */
  async function create(i: NewStaffInput): Promise<string> {
    const res = await api.post('/staff', { name: i.name.trim(), email: i.email.trim(), branch_id: Number(i.branchId), roles: i.roles })
    await load()
    return String(res?.email_notification?.status ?? '')
  }
  async function update(id: string, patch: { name?: string; isActive?: boolean }) {
    await api.patch(`/staff/${id}`, {
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.isActive !== undefined ? { is_active: patch.isActive } : {})
    })
    await load()
  }

  async function permissionsOf(slug: Role): Promise<Permission[]> {
    return listOf<Permission>(await api.get(`/roles/${slug}/permissions`), 'permissions')
      .map(p => ({ resource: p.resource, action: p.action, allowed: !!p.allowed }))
  }
  /** The server accepts at most this many permissions in one PATCH (a role has 19 in total). */
  const MAX_PER_REQUEST = 16

  /**
   * Sends only what changed (the API leaves everything else as it is), in batches of at most 16.
   * Returns how many permissions were changed.
   */
  async function savePermissions(slug: Role, current: Permission[], original: Permission[]): Promise<number> {
    const before = new Map(original.map(p => [`${p.resource}.${p.action}`, p.allowed]))
    const changed = current.filter(p => before.get(`${p.resource}.${p.action}`) !== p.allowed)
    for (let i = 0; i < changed.length; i += MAX_PER_REQUEST) {
      try { await api.patch(`/roles/${slug}/permissions`, { permissions: changed.slice(i, i + MAX_PER_REQUEST) }) }
      catch (e) {
        if (i > 0 && e instanceof Error) e.message = `Only the first ${i} changes were saved. ${e.message}`
        throw e
      }
    }
    return changed.length
  }

  function clear() { users.value = []; roles.value = [] }
  return { users, roles, load, loadRoles, create, update, permissionsOf, savePermissions, clear }
})
