import type { SmsLog } from '@/types'

/**
 * Sends one SMS through YOUR backend (the backend holds the SMS provider keys).
 * With no VITE_SMS_API_URL set, the message is only logged as "simulated".
 * Expected backend: POST { to, message } -> 2xx when accepted.
 */
export async function sendSms(to: string, message: string): Promise<SmsLog['status']> {
  const url = import.meta.env.VITE_SMS_API_URL
  if (!url) return 'simulated'
  try {
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, message })
    })
    return res.ok ? 'sent' : 'failed'
  } catch { return 'failed' }
}
