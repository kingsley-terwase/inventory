/**
 * Which backend permission each screen needs. One table, used by both the menu and the router,
 * so a screen is hidden everywhere or nowhere. `admin: true` means the owner only.
 * Permissions are `resource.action` pairs exactly as the backend names them (GET /roles/{slug}/permissions).
 */
export type Need = { admin: true } | { any: [resource: string, action: string][] }

const view = (resource: string): Need => ({ any: [[resource, 'view']] })

/** Order matters: the first screen a user may open is their home page. */
export const access: Record<string, Need> = {
  '/dashboard': view('dashboard'),
  '/sales/new': { any: [['sales', 'create']] },
  '/sales': view('sales'),
  '/products': view('products'),
  '/stock': view('inventory'),
  '/purchases': { any: [['inventory', 'create']] },
  '/contacts': { any: [['sales', 'view'], ['debts', 'view']] },
  '/debts': view('debts'),
  '/expenses': view('expenses'),
  '/accounts': { admin: true },
  '/reports': { admin: true },
  '/notifications': { admin: true },
  '/settings': { admin: true }
}
export const accessOrder = Object.keys(access)
