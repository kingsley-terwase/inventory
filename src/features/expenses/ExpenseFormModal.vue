<script setup lang="ts">
import { reactive, ref } from 'vue'
import ModalShell from '@/components/ModalShell.vue'
import NumInput from '@/components/NumInput.vue'
import { expenseCategories, useExpenses } from '@/stores/expenses'
import { closeModal, errorText, toast } from '@/composables/useUi'
import { uid } from '@/services/storage'
import { today } from '@/utils/date'

const store = useExpenses()
const saving = ref(false)
const clientReference = 'exp-' + uid() + uid() // fixed for this form, so a double tap cannot record the expense twice
const f = reactive({ date: today(), category: 'Other', description: '', amount: 0, method: 'cash' as 'cash' | 'transfer' })

async function save() {
  saving.value = true
  try { await store.create({ ...f, clientReference }); toast('Expense saved', 'success'); closeModal(true) }
  catch (e) { toast(errorText(e), 'danger') }
  finally { saving.value = false }
}
</script>

<template>
  <ModalShell title="New expense">
    <IonInput class="field" type="date" label="Date" label-placement="stacked" fill="outline" v-model="f.date" />
    <IonSelect class="field" label="Category" label-placement="stacked" fill="outline" interface="popover" v-model="f.category">
      <IonSelectOption v-for="c in expenseCategories" :key="c" :value="c">{{ c }}</IonSelectOption>
    </IonSelect>
    <IonInput class="field" label="Description" label-placement="stacked" fill="outline" v-model="f.description" />
    <div class="field"><NumInput v-model="f.amount" label="Amount" /></div>
    <IonSegment v-model="f.method" class="field">
      <IonSegmentButton value="cash"><IonLabel>Paid cash</IonLabel></IonSegmentButton>
      <IonSegmentButton value="transfer"><IonLabel>Paid by transfer</IonLabel></IonSegmentButton>
    </IonSegment>
    <small class="muted">Expenses cannot be edited or deleted once saved.</small>
    <template #footer><IonButton :disabled="saving" @click="save">Save expense</IonButton></template>
  </ModalShell>
</template>
