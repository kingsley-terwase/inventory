<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'
import { clearAll } from '@/services/session'
import { errorText, toast } from '@/composables/useUi'

const auth = useAuth(); const router = useRouter()
const current = ref(''); const next = ref(''); const again = ref(''); const busy = ref(false)

async function submit() {
  if (!current.value) return toast('Enter the temporary password from your email', 'danger')
  if (next.value.length < 8) return toast('The new password must be at least 8 characters', 'danger')
  if (next.value !== again.value) return toast('The two new passwords do not match', 'danger')
  busy.value = true
  try {
    await auth.changePassword(current.value, next.value)
    toast('Password changed', 'success')
    router.replace('/dashboard')
  } catch (e) { toast(errorText(e), 'danger') }
  finally { busy.value = false }
}
async function logout() { await auth.logout(); clearAll(); router.replace('/login') }
</script>

<template>
  <IonPage>
    <IonContent>
      <div class="page" style="max-width: 400px; padding-top: 10vh">
        <h1 style="margin: 0 0 4px; color: var(--ion-color-primary); letter-spacing: -0.03em">Choose a new password</h1>
        <p class="muted" style="margin-top: 0">Your account was created with a temporary password. Replace it to continue.</p>
        <IonInput class="field" type="password" label="Temporary password (from your email)" label-placement="stacked" fill="outline" v-model="current" />
        <IonInput class="field" type="password" label="New password" label-placement="stacked" fill="outline" v-model="next" />
        <IonInput class="field" type="password" label="Repeat new password" label-placement="stacked" fill="outline" v-model="again" @keyup.enter="submit" />
        <IonButton expand="block" :disabled="busy" @click="submit">Change password</IonButton>
        <IonButton expand="block" fill="clear" color="medium" @click="logout">Sign out</IonButton>
      </div>
    </IonContent>
  </IonPage>
</template>
