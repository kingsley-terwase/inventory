<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ModalShell from '@/components/ModalShell.vue'
import NumInput from '@/components/NumInput.vue'
import { useSales } from '@/stores/sales'
import { useSettings } from '@/stores/settings'
import { closeModal, errorText, toast } from '@/composables/useUi'
import type { SettleMethod } from '@/types'

const props = defineProps<{ receiptId: string }>()
const sales = useSales(); const { money } = useSettings()

const debt = computed(() => sales.debts.find(d => d.receiptId === props.receiptId))
const amount = ref(debt.value?.balance ?? 0)
const method = ref<SettleMethod>('cash')
const note = ref('')
const saving = ref(false)
const clientReference = sales.newRef() // one per form: tapping Save twice cannot record the payment twice

// Always show the server's current balance for this receipt (GET .../debts/{receipt}).
onMounted(async () => {
  try { const d = await sales.fetchDebt(props.receiptId); amount.value = d.balance } catch (e) { toast(errorText(e), 'danger') }
})

async function save() {
  if (debt.value && amount.value > debt.value.balance) return toast('That is more than the balance owed', 'danger')
  saving.value = true
  try {
    await sales.recordPayment(props.receiptId, amount.value, method.value, note.value || undefined, clientReference)
    toast('Payment recorded', 'success'); closeModal(true)
  } catch (e) { toast(errorText(e), 'danger') }
  finally { saving.value = false }
}
</script>

<template>
  <ModalShell title="Record customer payment">
    <div v-if="debt" class="summary">
      <div><span>{{ debt.receiptId }} · {{ debt.customerName }}</span></div>
      <div><span>Credit sale</span><span class="num">{{ money(debt.amount) }}</span></div>
      <div><span>Paid so far</span><span class="num">{{ money(debt.paid) }}</span></div>
      <div class="grand"><span>Balance</span><span class="num">{{ money(debt.balance) }}</span></div>
    </div>
    <div class="field"><NumInput v-model="amount" label="Amount paid now" /></div>
    <IonSegment v-model="method" class="field">
      <IonSegmentButton value="cash"><IonLabel>Cash</IonLabel></IonSegmentButton>
      <IonSegmentButton value="transfer"><IonLabel>Transfer</IonLabel></IonSegmentButton>
    </IonSegment>
    <IonInput class="field" label="Note (optional)" label-placement="stacked" fill="outline" v-model="note" />
    <template #footer><IonButton :disabled="saving" @click="save">Record payment</IonButton></template>
  </ModalShell>
</template>
