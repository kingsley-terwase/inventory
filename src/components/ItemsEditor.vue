<script setup lang="ts">
import { addOutline, trashOutline } from 'ionicons/icons'
import { useSettings } from '@/stores/settings'
import { openModal } from '@/composables/useUi'
import ProductPickerModal from '@/features/products/ProductPickerModal.vue'
import NumInput from '@/components/NumInput.vue'
import type { Line, Product } from '@/types'

const props = defineProps<{ mode: 'sale' | 'purchase' }>()
const lines = defineModel<Line[]>({ required: true })
const { money } = useSettings()

async function add() {
  const p = await openModal<Product>(ProductPickerModal, { mode: props.mode })
  if (!p) return
  const existing = lines.value.find(l => l.productId === p.id)
  if (existing) { existing.qty += 1; return }
  lines.value = [...lines.value, {
    productId: p.id, name: p.name, qty: 1, stock: p.stock, surcharge: 0,
    price: props.mode === 'sale' ? p.sellPrice : p.costPrice
  }]
}
const remove = (i: number) => { lines.value = lines.value.filter((_, idx) => idx !== i) }
const lineTotal = (l: Line) => l.qty * (props.mode === 'sale' ? l.price + l.surcharge : l.price)
</script>

<template>
  <div>
    <div v-for="(l, i) in lines" :key="l.productId" class="line">
      <div class="line-head">
        <div>
          <strong>{{ l.name }}</strong>
          <!-- The sale price comes from the product and cannot be edited at the till; a per-unit surcharge can. -->
          <div v-if="mode === 'sale'" class="row-sub">{{ money(l.price) }} each</div>
        </div>
        <IonButton fill="clear" color="danger" size="small" aria-label="Remove item" @click="remove(i)">
          <IonIcon slot="icon-only" :icon="trashOutline" />
        </IonButton>
      </div>
      <div class="line-fields">
        <NumInput v-model="l.qty" label="Qty" />
        <NumInput v-if="mode === 'sale'" v-model="l.surcharge" label="Surcharge per unit" />
        <NumInput v-else v-model="l.price" label="Cost" />
        <div class="line-total num">{{ money(lineTotal(l)) }}</div>
      </div>
      <small v-if="mode === 'sale' && l.qty > l.stock" class="text-danger">Only {{ l.stock }} in stock</small>
    </div>
    <IonButton expand="block" fill="outline" @click="add"><IonIcon slot="start" :icon="addOutline" />Add product</IonButton>
  </div>
</template>
