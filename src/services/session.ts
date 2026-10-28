import { ApiError } from '@/services/api'
import { today, monthStart } from '@/utils/date'
import { useAuth } from '@/stores/auth'
import { useSettings } from '@/stores/settings'
import { useInventory } from '@/stores/inventory'
import { useSales } from '@/stores/sales'
import { usePurchases } from '@/stores/purchases'
import { useExpenses } from '@/stores/expenses'
import { useNotifications } from '@/stores/notifications'
import { useAccounts } from '@/stores/accounts'
import { useStaff } from '@/stores/staff'
import { useDashboard } from '@/stores/dashboard'

/** What every signed-in screen needs. Failures here are not fatal: a role may simply lack permission. */
async function bootstrap() {
  const auth = useAuth(); const settings = useSettings(); const notes = useNotifications()
  await Promise.allSettled([auth.loadBranches()])
  await Promise.allSettled([settings.load(), settings.loadBranch(), ...(auth.isAdmin ? [notes.load()] : [])])
}
let booted: Promise<void> | null = null
/** Runs bootstrap once per sign-in. */
export const ensureBootstrapped = () => (booted ??= bootstrap())

/** The data each page needs, fetched whenever the user navigates to it, so screens are never stale. */
function loadersFor(path: string): Promise<unknown>[] {
  const auth = useAuth(); const settings = useSettings(); const inv = useInventory(); const sales = useSales()
  switch (path) {
    case '/dashboard': return [sales.loadSalesSince(today()), sales.loadDebts(), inv.loadProducts(), useDashboard().load()]
    case '/products': return [inv.loadProducts()]
    case '/stock': return [inv.loadProducts(), inv.loadMovements('')]
    case '/sales': return [sales.loadSales()]
    case '/sales/new': return [inv.loadProducts(), sales.loadDebts(), sales.loadSales(), settings.load()]
    case '/purchases': return [inv.loadProducts().then(() => usePurchases().load())]
    case '/contacts': return [sales.loadSales(), sales.loadDebts()]
    case '/debts': return [sales.loadDebts(), sales.loadPaidDebts(), settings.load()]
    case '/expenses': return [useExpenses().load()]
    case '/accounts': return [useAccounts().loadSummary(monthStart(), today())]
    case '/notifications': return [useNotifications().load()]
    case '/settings': return [settings.load(), settings.loadRules(), useStaff().load(), useStaff().loadRoles(), auth.loadBranches()]
    default: return []
  }
}

/**
 * Loads everything a page needs. Resolves to a message to show the user, or null.
 * 403s are expected for roles without access, so they are not reported.
 */
export async function loadForRoute(path: string): Promise<string | null> {
  if (!useAuth().user) return null
  const results = await Promise.allSettled(loadersFor(path))
  const failure = results.find((r): r is PromiseRejectedResult => r.status === 'rejected' && !(r.reason instanceof ApiError && (r.reason.status === 403 || r.reason.status === 401)))
  if (!failure) return null
  return failure.reason instanceof Error ? failure.reason.message : 'Could not load the latest data'
}

/** Wipes every cache. Used on logout so the next person never sees the previous person's data. */
export function clearAll() {
  booted = null
  useSettings().clear(); useInventory().clear(); useSales().clear(); usePurchases().clear()
  useExpenses().clear(); useNotifications().clear(); useAccounts().clear(); useStaff().clear(); useDashboard().clear()
}

/** Admin picks another branch: forget everything about the old one and load the new one. */
export async function switchBranch(id: string, path: string) {
  useAuth().chooseBranch(id)
  clearAll()
  await ensureBootstrapped()
  return loadForRoute(path)
}
