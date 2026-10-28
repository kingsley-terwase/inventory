import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api, getAll } from '@/services/api'
import { toNotification, toSmsLog } from '@/services/mappers'
import { useAuth } from './auth'
import type { AppNotification, SmsLog } from '@/types'

/**
 * Owner alerts and the SMS log now come from the backend. Reminder SMS are sent by the server on its own schedule
 * (Settings > Reminder rules), so the browser no longer sends anything.
 */
export const useNotifications = defineStore('notifications', () => {
  const auth = useAuth()
  const items = ref<AppNotification[]>([])
  const smsLog = ref<SmsLog[]>([])
  const unread = computed(() => items.value.filter(n => !n.read).length)

  async function load() {
    const branch_id = auth.branchId
    if (!branch_id) return
    const [alerts, sms] = await Promise.allSettled([
      getAll('/notifications/debts', { branch_id }, 3, 'alerts', 'notifications'),
      getAll('/notifications/sms', { branch_id }, 3, 'logs', 'sms')
    ])
    if (alerts.status === 'rejected' && sms.status === 'rejected') throw alerts.reason
    if (alerts.status === 'fulfilled') items.value = alerts.value.map(toNotification)
    if (sms.status === 'fulfilled') smsLog.value = sms.value.map(toSmsLog)
  }

  async function markRead(id: string) {
    const n = items.value.find(x => x.id === id)
    if (!n || n.read) return
    await api.post(`/notifications/debts/${id}/read`)
    n.read = true
  }
  async function markAllRead() {
    for (const n of items.value.filter(x => !x.read)) await markRead(n.id)
  }
  /** Asks the server to re-check the delivery status of one SMS with the provider. */
  async function refreshSms(id: string) {
    await api.post(`/notifications/sms/${id}/refresh`)
    await load()
  }

  function clear() { items.value = []; smsLog.value = [] }
  return { items, smsLog, unread, load, markRead, markAllRead, refreshSms, clear }
})
