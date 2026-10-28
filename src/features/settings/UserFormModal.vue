<script setup lang="ts">
import { reactive, ref } from 'vue'
import ModalShell from '@/components/ModalShell.vue'
import { useAuth } from '@/stores/auth'
import { useStaff } from '@/stores/staff'
import { closeModal, errorText, toast } from '@/composables/useUi'
import type { Role, User } from '@/types'

const props = defineProps<{ user?: User }>()
const auth = useAuth(); const staff = useStaff()
const saving = ref(false)
const f = reactive({
  name: props.user?.name ?? '', email: props.user?.email ?? '', isActive: props.user?.isActive ?? true,
  roles: [...(props.user?.roles ?? ['staff'])] as Role[],
  branchId: props.user?.branchId ?? auth.branchId
})
const roleOptions: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Administrator (everything)' }, { value: 'manager', label: 'Branch manager' },
  { value: 'cashier', label: 'Cashier (sales)' }, { value: 'staff', label: 'Staff (stock)' }
]

async function save() {
  if (!f.name.trim()) return toast('Enter a name', 'danger')
  saving.value = true
  try {
    if (props.user) {
      await staff.update(props.user.id, { name: f.name, isActive: f.isActive })
      toast('User saved', 'success')
    } else {
      if (!f.email.trim()) { saving.value = false; return toast('Enter an email', 'danger') }
      if (!f.roles.length) { saving.value = false; return toast('Choose at least one role', 'danger') }
      const status = await staff.create({ name: f.name, email: f.email, branchId: f.branchId, roles: f.roles })
      // The API only reports that the email was handed to its mail queue. It never returns the password.
      toast(`Account created. The server reports the email to ${f.email.trim()} as "${status || 'unknown'}". If it does not arrive, the server's mail setup needs checking.`, 'warning')
    }
    closeModal(true)
  } catch (e) { toast(errorText(e), 'danger') }
  finally { saving.value = false }
}
</script>

<template>
  <ModalShell :title="user ? 'Edit user' : 'New user'">
    <IonInput class="field" label="Full name" label-placement="stacked" fill="outline" v-model="f.name" />
    <IonInput class="field" type="email" label="Email (used to log in)" label-placement="stacked" fill="outline" :disabled="!!user" v-model="f.email" />
    <IonSelect v-if="!user" class="field" label="Roles" label-placement="stacked" fill="outline" interface="popover" :multiple="true" v-model="f.roles">
      <IonSelectOption v-for="r in roleOptions" :key="r.value" :value="r.value">{{ r.label }}</IonSelectOption>
    </IonSelect>
    <IonSelect v-if="!user && auth.branches.length > 1" class="field" label="Branch" label-placement="stacked" fill="outline" interface="popover" v-model="f.branchId">
      <IonSelectOption v-for="b in auth.branches" :key="b.id" :value="b.id">{{ b.name }}</IonSelectOption>
    </IonSelect>
    <IonItem v-if="user" lines="none" style="--background: transparent">
      <IonToggle v-model="f.isActive">Account is active</IonToggle>
    </IonItem>
    <p class="muted" v-if="!user">The server creates a temporary password and emails it (the app never sees it). The person must change it the first time they sign in. If the email does not arrive, the mail settings on the server need checking.</p>
    <p class="muted" v-else>Email and roles cannot be changed here. Turn the account off to stop someone signing in.</p>
    <template #footer><IonButton :disabled="saving" @click="save">{{ user ? 'Save user' : 'Create user' }}</IonButton></template>
  </ModalShell>
</template>
