<script setup lang="ts">
import { computed, ref } from 'vue'
import ModalShell from '@/components/ModalShell.vue'
import NumInput from '@/components/NumInput.vue'
import { useInventory } from '@/stores/inventory'
import { closeModal, errorText, toast } from '@/composables/useUi'
import type { Product } from '@/types'

const props = defineProps<{ product: Product }>()
const inv = useInventory()
const mode = ref<'add' | 'remove' | 'set'>('add')
const qty = ref(0)
const note = ref('')
const saving = ref(false)
const delta = computed(() => mode.value === 'add' ? qty.value : mode.value === 'remove' ? -qty.value : qty.value - props.product.stock)

async function save() {
  if (delta.value === 0) return toast('Enter a quantity', 'danger')
  if (props.product.stock + delta.value < 0) return toast('Stock cannot go below zero', 'danger')
  saving.value = true
  try { await inv.adjust(props.product.id, delta.value, note.value || 'Manual adjustment'); toast('Stock updated', 'success'); closeModal(true) }
  catch (e) { toast(errorText(e), 'danger') }
  finally { saving.value = false }
}
</script>

<template>
  <ModalShell title="Adjust stock">
    <p><strong>{{ product.name }}</strong><br /><span class="muted">Currently {{ product.stock }} in stock</span></p>
    <IonSegment v-model="mode" class="field">
      <IonSegmentButton value="add"><IonLabel>Add</IonLabel></IonSegmentButton>
      <IonSegmentButton value="remove"><IonLabel>Remove</IonLabel></IonSegmentButton>
      <IonSegmentButton value="set"><IonLabel>Set to</IonLabel></IonSegmentButton>
    </IonSegment>
    <div class="field"><NumInput v-model="qty" :label="mode === 'set' ? 'New quantity' : 'Quantity'" /></div>
    <IonInput class="field" label="Reason (damaged, recount, ...)" label-placement="stacked" fill="outline" v-model="note" />
    <p class="muted">New stock level: <strong class="num">{{ product.stock + delta }}</strong></p>
    <template #footer><IonButton :disabled="saving" @click="save">Save adjustment</IonButton></template>
  </ModalShell>
</template>
