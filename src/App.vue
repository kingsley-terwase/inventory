<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import AppMenu from '@/layouts/AppMenu.vue'
import { useAuth } from '@/stores/auth'
import { useNotifications } from '@/stores/notifications'

const auth = useAuth(); const notes = useNotifications()
let timer: number | undefined

// While someone is signed in, refresh the owner-alert badge every 5 minutes.
watch(() => auth.user?.id, id => {
  window.clearInterval(timer)
  if (!id) return
  timer = window.setInterval(() => { if (auth.isAdmin && !auth.user?.mustChangePassword) notes.load().catch(() => {}) }, 5 * 60 * 1000)
}, { immediate: true })
onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <IonApp>
    <IonSplitPane content-id="main" :disabled="!auth.user || auth.user.mustChangePassword">
      <AppMenu />
      <IonRouterOutlet id="main" />
    </IonSplitPane>
  </IonApp>
</template>
