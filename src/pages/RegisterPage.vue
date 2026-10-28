<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'
import { errorText, toast } from '@/composables/useUi'

const auth = useAuth(); const router = useRouter()
const busy = ref(false)
const f = reactive({
  name: '', email: '', phone: '', password: '', passwordConfirmation: '',
  businessName: '', branchName: 'Main Branch', branchAddress: ''
})

async function submit() {
  if (!f.name.trim() || !f.email.trim() || !f.businessName.trim() || !f.branchName.trim()) return toast('Fill in your name, email, business name and branch name', 'danger')
  if (f.password.length < 8) return toast('The password must be at least 8 characters', 'danger')
  if (f.password !== f.passwordConfirmation) return toast('The two passwords do not match', 'danger')
  busy.value = true
  try {
    await auth.register({ ...f })
    toast('Your business is ready', 'success')
    router.replace('/dashboard')
  } catch (e) { toast(errorText(e), 'danger') }
  finally { busy.value = false }
}
</script>

<template>
  <IonPage>
    <IonContent>
      <div class="page" style="max-width: 460px; padding-top: 6vh">
        <h1 style="margin: 0 0 4px; color: var(--ion-color-primary); letter-spacing: -0.03em">Create your business</h1>
        <p class="muted" style="margin-top: 0">You become the owner (administrator). Your first branch is set up for you.</p>

        <h2 class="section">About you</h2>
        <IonInput class="field" label="Your full name" label-placement="stacked" fill="outline" autocomplete="name" v-model="f.name" />
        <IonInput class="field" type="email" label="Email (used to sign in)" label-placement="stacked" fill="outline" autocomplete="username" v-model="f.email" />
        <IonInput class="field" type="tel" label="Phone" label-placement="stacked" fill="outline" autocomplete="tel" v-model="f.phone" />
        <div class="two field">
          <IonInput type="password" label="Password" label-placement="stacked" fill="outline" autocomplete="new-password" v-model="f.password" />
          <IonInput type="password" label="Repeat password" label-placement="stacked" fill="outline" autocomplete="new-password" v-model="f.passwordConfirmation" />
        </div>

        <h2 class="section">Your business</h2>
        <IonInput class="field" label="Business name" label-placement="stacked" fill="outline" v-model="f.businessName" />
        <IonInput class="field" label="First branch name" label-placement="stacked" fill="outline" v-model="f.branchName" />
        <IonInput class="field" label="Branch address" label-placement="stacked" fill="outline" v-model="f.branchAddress" @keyup.enter="submit" />

        <IonButton expand="block" :disabled="busy" @click="submit">{{ busy ? 'Creating...' : 'Create business' }}</IonButton>
        <IonButton expand="block" fill="clear" router-link="/login">I already have an account</IonButton>
      </div>
    </IonContent>
  </IonPage>
</template>
