<script setup lang="ts">
import { reactive, ref } from 'vue'
import ModalShell from '@/components/ModalShell.vue'
import { useAuth } from '@/stores/auth'
import { closeModal, errorText, toast } from '@/composables/useUi'

const auth = useAuth()
const saving = ref(false)
const f = reactive({ name: '', address: '', phone: '' })

async function save() {
  if (!f.name.trim()) return toast('Enter the branch name', 'danger')
  saving.value = true
  try { const b = await auth.createBranch(f); toast(`${b.name || 'Branch'} created`, 'success'); closeModal(true) }
  catch (e) { toast(errorText(e), 'danger') }
  finally { saving.value = false }
}
</script>

<template>
  <ModalShell title="New branch">
    <IonInput class="field" label="Branch name" label-placement="stacked" fill="outline" v-model="f.name" />
    <IonInput class="field" label="Address" label-placement="stacked" fill="outline" v-model="f.address" />
    <IonInput class="field" type="tel" label="Phone" label-placement="stacked" fill="outline" v-model="f.phone" />
    <p class="muted">Each branch has its own stock, sales and debts. Assign staff to it when you create their account. You can switch branch from the menu.</p>
    <template #footer><IonButton :disabled="saving" @click="save">Create branch</IonButton></template>
  </ModalShell>
</template>
