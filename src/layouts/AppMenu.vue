<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { logOutOutline } from 'ionicons/icons'
import { menuItems } from './menu'
import { useAuth } from '@/stores/auth'
import { useSettings } from '@/stores/settings'
import { useNotifications } from '@/stores/notifications'
import { clearAll, switchBranch } from '@/services/session'
import { toast } from '@/composables/useUi'

const route = useRoute(); const router = useRouter()
const auth = useAuth(); const settings = useSettings(); const notes = useNotifications()
const items = computed(() => menuItems.filter(i => auth.allowsPath(i.path)))
// "/sales" must not be highlighted while on "/sales/new"
const active = (p: string) => route.path === p || (p !== '/sales' && p !== '/sales/new' && route.path.startsWith(p + '/'))

async function logout() {
  await auth.logout(); clearAll()
  router.replace('/login')
}
async function pickBranch(e: CustomEvent) {
  const id = String(e.detail.value)
  if (!id || id === auth.branchId) return
  const msg = await switchBranch(id, route.path)
  if (msg) toast(msg, 'danger')
}
</script>

<template>
  <IonMenu content-id="main" :disabled="!auth.user || auth.user.mustChangePassword" type="overlay">
    <IonContent>
      <div class="brand">{{ settings.businessName }}<small>{{ auth.user?.name }} · {{ auth.user?.roles.join(', ') }}</small></div>
      <div v-if="auth.isAdmin && auth.branches.length > 1" style="padding: 0 12px 8px">
        <IonSelect label="Branch" label-placement="stacked" fill="outline" interface="popover" :value="auth.branchId" @ion-change="pickBranch">
          <IonSelectOption v-for="b in auth.branches" :key="b.id" :value="b.id">{{ b.name }}</IonSelectOption>
        </IonSelect>
      </div>
      <IonList lines="none">
        <IonMenuToggle v-for="i in items" :key="i.path" :auto-hide="false">
          <IonItem button router-direction="root" :router-link="i.path" :class="{ active: active(i.path) }" detail="false">
            <IonIcon slot="start" :icon="i.icon" />
            <IonLabel>{{ i.title }}</IonLabel>
            <IonBadge v-if="i.path === '/notifications' && notes.unread" slot="end" color="danger">{{ notes.unread }}</IonBadge>
          </IonItem>
        </IonMenuToggle>
      </IonList>
    </IonContent>
    <IonFooter>
      <IonItem button lines="none" detail="false" @click="logout">
        <IonIcon slot="start" :icon="logOutOutline" /><IonLabel>Log out</IonLabel>
      </IonItem>
    </IonFooter>
  </IonMenu>
</template>
