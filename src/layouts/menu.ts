import {
  gridOutline, cubeOutline, layersOutline, receiptOutline, cartOutline, peopleOutline,
  alertCircleOutline, cashOutline, walletOutline, barChartOutline, notificationsOutline, settingsOutline
} from 'ionicons/icons'
/** Who may see each item is decided in ./access.ts. */
export interface MenuItem { path: string; title: string; icon: string }

export const menuItems: MenuItem[] = [
  { path: '/dashboard', title: 'Dashboard', icon: gridOutline },
  { path: '/sales/new', title: 'New sale', icon: receiptOutline },
  { path: '/sales', title: 'Sales', icon: receiptOutline },
  { path: '/products', title: 'Products', icon: cubeOutline },
  { path: '/stock', title: 'Stock', icon: layersOutline },
  { path: '/purchases', title: 'Purchases', icon: cartOutline },
  { path: '/contacts', title: 'Customers & suppliers', icon: peopleOutline },
  { path: '/debts', title: 'Debts', icon: alertCircleOutline },
  { path: '/expenses', title: 'Expenses', icon: cashOutline },
  { path: '/accounts', title: 'Accounts', icon: walletOutline },
  { path: '/reports', title: 'Reports', icon: barChartOutline },
  { path: '/notifications', title: 'Notifications', icon: notificationsOutline },
  { path: '/settings', title: 'Settings', icon: settingsOutline }
]
