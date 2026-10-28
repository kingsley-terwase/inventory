import { alertController } from '@ionic/vue'
import { useAuth } from '@/stores/auth'
import { useSettings } from '@/stores/settings'
import router from '@/router'
import type { CreditLimitError } from '@/stores/sales'

/** The pop-up shown when a credit sale would take a customer over their limit. */
export async function showCreditExhausted(err: CreditLimitError) {
  const { money } = useSettings()
  const canRaise = useAuth().isAdmin
  const known = err.info.known
  const alert = await alertController.create({
    header: 'Credit limit exhausted',
    message: known
      ? `${err.customerName} has a credit limit of ${money(err.info.limit)} and already owes ${money(err.info.owed)}. ` +
        `Available credit: ${money(err.info.available)}. This sale needs ${money(err.needed)} on credit.`
      : `${err.customerName} cannot take this sale on credit. ${err.serverMessage ?? ''}`.trim(),
    buttons: [
      { text: 'OK', role: 'cancel' },
      ...(canRaise ? [{ text: 'Raise limit', handler: () => { router.push('/settings') } }] : [])
    ]
  })
  await alert.present()
}
