<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'
import { clearAll } from '@/services/session'

const auth = useAuth(); const router = useRouter()
async function logout() { await auth.logout(); clearAll(); router.replace('/login') }
</script>

<template>
  <IonPage>
    <IonContent>
      <div class="page" style="max-width: 420px; padding-top: 14vh; text-align: center">
        <h1 style="margin: 0 0 8px; letter-spacing: -0.03em">Nothing to show yet</h1>
        <p class="muted">
          Your role ({{ auth.user?.roles.join(', ') }}) has no permissions assigned. Ask the business owner to give it some in
          Settings, then sign in again.
        </p>
        <IonButton fill="outline" @click="logout">Sign out</IonButton>
      </div>
    </IonContent>
  </IonPage>
</template>
