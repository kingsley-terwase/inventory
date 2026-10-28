<script setup lang="ts">
import { computed, ref } from 'vue'
import ModalShell from '@/components/ModalShell.vue'
import ItemsEditor from '@/components/ItemsEditor.vue'
import { useContacts } from '@/stores/contacts'
import { usePurchases } from '@/stores/purchases'
import { useSettings } from '@/stores/settings'
import { closeModal, errorText, toast } from '@/composables/useUi'
import type { Line, Product } from '@/types'

const props = defineProps<{ product?: Product }>()

const contacts = useContacts(); const purchases = usePurchases(); const { money } = useSettings()
const supplierId = ref('')
// opened from a product ("Receive stock"): start with that product already on the list
const lines = ref<Line[]>(props.product ? [{ productId: props.product.id, name: props.product.name, qty: 1, stock: props.product.stock, surcharge: 0, price: props.product.costPrice }] : [])
const saving = ref(false)
const total = computed(() => lines.value.reduce((a, l) => a + l.qty * l.price, 0))

async function save() {
  saving.value = true
  try {
    await purchases.createPurchase({
      supplierName: contacts.suppliers.find(s => s.id === supplierId.value)?.name ?? '',
      items: lines.value.map(l => ({ productId: l.productId, qty: l.qty, cost: l.price }))
    })
    toast('Purchase recorded and stock updated', 'success'); closeModal(true)
  } catch (e) { toast(errorText(e), 'danger') }
  finally { saving.value = false }
}
</script>

<template>
  <ModalShell :title="product ? `Receive ${product.name}` : 'New purchase'">
    <IonSelect class="field" label="Supplier (optional)" label-placement="stacked" fill="outline" interface="popover" placeholder="Not recorded" v-model="supplierId">
      <IonSelectOption value="">Not recorded</IonSelectOption>
      <IonSelectOption v-for="s in contacts.suppliers" :key="s.id" :value="s.id">{{ s.name }}</IonSelectOption>
    </IonSelect>
    <ItemsEditor v-model="lines" mode="purchase" />
    <div class="summary"><div class="grand"><span>Total</span><span class="num">{{ money(total) }}</span></div></div>
    <p class="muted">Stock goes up as soon as you save. Supplier payments are not tracked by the server yet.</p>
    <template #footer><IonButton :disabled="saving || !lines.length" @click="save">Save purchase</IonButton></template>
  </ModalShell>
</template>
