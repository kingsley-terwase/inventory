<script setup lang="ts">
import { reactive } from 'vue'
import ModalShell from '@/components/ModalShell.vue'
import { useContacts } from '@/stores/contacts'
import { closeModal, confirmAction, toast } from '@/composables/useUi'
import type { Supplier } from '@/types'

/** Supplier form. Suppliers live on this device only: the backend has no supplier endpoint. */
const props = defineProps<{ supplier?: Supplier }>()
const contacts = useContacts()
const f = reactive({
  id: props.supplier?.id, name: props.supplier?.name ?? '', phone: props.supplier?.phone ?? '', address: props.supplier?.address ?? ''
})

function save() {
  if (!f.name.trim()) return toast('Enter a name', 'danger')
  contacts.saveSupplier({ ...f, name: f.name.trim() })
  toast('Saved', 'success'); closeModal(true)
}
async function remove() {
  if (!await confirmAction('Delete supplier', `Delete ${f.name}?`)) return
  contacts.removeSupplier(f.id!); toast('Deleted'); closeModal(true)
}
</script>

<template>
  <ModalShell :title="supplier ? 'Edit supplier' : 'New supplier'">
    <IonInput class="field" label="Name" label-placement="stacked" fill="outline" v-model="f.name" />
    <IonInput class="field" label="Phone" label-placement="stacked" fill="outline" type="tel" v-model="f.phone" />
    <IonInput class="field" label="Address" label-placement="stacked" fill="outline" v-model="f.address" />
    <small class="muted">Saved on this device only.</small>
    <template #footer>
      <IonButton v-if="supplier" color="danger" fill="outline" @click="remove">Delete</IonButton>
      <IonButton @click="save">Save</IonButton>
    </template>
  </ModalShell>
</template>
