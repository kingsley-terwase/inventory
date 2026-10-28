import { createRouter, createWebHistory } from '@ionic/vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuth } from '../stores/auth'
import { ensureBootstrapped, loadForRoute } from '@/services/session'
import { toast } from '@/composables/useUi'

declare module 'vue-router' {
  interface RouteMeta { public?: boolean }
}
// Which role may open which screen comes from the role's real permissions, see layouts/access.ts.

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/dashboard' },
  { path: '/login', component: () => import('@/pages/LoginPage.vue'), meta: { public: true } },
  { path: '/register', component: () => import('@/pages/RegisterPage.vue'), meta: { public: true } },
  { path: '/no-access', component: () => import('@/pages/NoAccessPage.vue') },
  { path: '/change-password', component: () => import('@/pages/ChangePasswordPage.vue') },
  { path: '/dashboard', component: () => import('@/pages/DashboardPage.vue') },
  { path: '/products', component: () => import('@/pages/ProductsPage.vue') },
  { path: '/stock', component: () => import('@/pages/StockPage.vue') },
  { path: '/sales', component: () => import('@/pages/SalesPage.vue') },
  { path: '/sales/new', component: () => import('@/pages/NewSalePage.vue') },
  { path: '/purchases', component: () => import('@/pages/PurchasesPage.vue') },
  { path: '/contacts', component: () => import('@/pages/ContactsPage.vue') },
  { path: '/debts', component: () => import('@/pages/DebtsPage.vue') },
  { path: '/expenses', component: () => import('@/pages/ExpensesPage.vue') },
  { path: '/accounts', component: () => import('@/pages/AccountsPage.vue') },
  { path: '/reports', component: () => import('@/pages/ReportsPage.vue') },
  { path: '/notifications', component: () => import('@/pages/NotificationsPage.vue') },
  { path: '/settings', component: () => import('@/pages/SettingsPage.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
]

const router = createRouter({ history: createWebHistory(import.meta.env.BASE_URL), routes })

router.beforeEach(async to => {
  const auth = useAuth()
  await auth.ensureRestored() // checks a saved token with the server before the first page shows
  const u = auth.user
  if (!u) return to.meta.public ? true : '/login'
  if (to.meta.public) { if (u.mustChangePassword) return '/change-password'; await auth.ensurePermissions(); return auth.homePath || '/no-access' }
  // Staff start with a temporary password and cannot use anything until they replace it.
  if (u.mustChangePassword) return to.path === '/change-password' ? true : '/change-password'
  if (to.path === '/login' || to.path === '/change-password') { await auth.ensurePermissions(); return auth.homePath || '/no-access' }
  await auth.ensurePermissions()
  if (!auth.allowsPath(to.path)) {
    // Not allowed here: send them to the first screen their role can open (or the "no access" page).
    const home = auth.homePath || '/no-access'
    return to.path === home ? true : home
  }
})

router.afterEach(to => {
  const auth = useAuth()
  if (!auth.user || auth.user.mustChangePassword) return
  ensureBootstrapped()
    .then(() => loadForRoute(to.path))
    .then(msg => { if (msg) toast(msg, 'danger') })
})

export default router
