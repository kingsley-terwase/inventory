import { alertController, modalController, toastController } from '@ionic/vue'

export async function toast(message: string, color: 'success' | 'danger' | 'warning' | 'dark' = 'dark') {
  const t = await toastController.create({ message, duration: 2800, color, position: 'top' })
  await t.present()
}

export async function confirmAction(header: string, message: string, okText = 'Delete') {
  const a = await alertController.create({
    header, message,
    buttons: [{ text: 'Cancel', role: 'cancel' }, { text: okText, role: 'confirm', cssClass: 'alert-danger' }]
  })
  await a.present()
  const { role } = await a.onDidDismiss()
  return role === 'confirm'
}

/** Opens a modal component and resolves with whatever it passes to closeModal(). */
export async function openModal<T = any>(component: any, props: Record<string, any> = {}): Promise<T | undefined> {
  const m = await modalController.create({ component, componentProps: props })
  await m.present()
  const { data } = await m.onWillDismiss()
  return data as T | undefined
}
export const closeModal = (data?: any) => modalController.dismiss(data)

/** ApiError and plain Error both carry a message that is already fit to show the user. */
export const errorText = (e: unknown) => (e instanceof Error && e.message ? e.message : 'Something went wrong')
