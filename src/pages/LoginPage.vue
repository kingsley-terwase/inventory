<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'
import { useSettings } from '@/stores/settings'
import { errorText, toast } from '@/composables/useUi'

const auth = useAuth(); const settings = useSettings(); const router = useRouter()
const email = ref(''); const password = ref(''); const busy = ref(false)

async function submit() {
  if (!email.value.trim() || !password.value) return toast('Enter your email and password', 'danger')
  busy.value = true
  try {
    const u = await auth.login(email.value, password.value)
    router.replace(u.mustChangePassword ? '/change-password' : '/dashboard')
  } catch (e) { toast(errorText(e), 'danger') }
  finally { busy.value = false }
}
</script>

<template>
  <IonPage>
    <IonContent>
      <div class="page" style="max-width: 400px; padding-top: 12vh">
        <h1 style="margin: 0 0 4px; color: var(--ion-color-primary); letter-spacing: -0.03em">{{ settings.businessName }}</h1>
        <p class="muted" style="margin-top: 0">Sign in to manage stock, sales and accounts.</p>
        <IonInput class="field" type="email" label="Email" label-placement="stacked" fill="outline" autocomplete="username" v-model="email" />
        <IonInput class="field" type="password" label="Password" label-placement="stacked" fill="outline" autocomplete="current-password" v-model="password" @keyup.enter="submit" />
        <IonButton expand="block" :disabled="busy" @click="submit">{{ busy ? 'Signing in...' : 'Sign in' }}</IonButton>
        <IonButton expand="block" fill="clear" router-link="/register">Create a new business account</IonButton>
        <p class="muted" style="font-size: 0.82rem">The first sign-in can take a few seconds while the server wakes up.</p>
      </div>
    </IonContent>
  </IonPage>
</template>
