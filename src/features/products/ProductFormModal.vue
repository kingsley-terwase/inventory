<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import ModalShell from '@/components/ModalShell.vue'
import NumInput from '@/components/NumInput.vue'
import { useAuth } from '@/stores/auth'
import { useInventory } from '@/stores/inventory'
import { closeModal, confirmAction, errorText, toast } from '@/composables/useUi'
import type { Product } from '@/types'

const props = defineProps<{ product?: Product }>()
const inv = useInventory(); const auth = useAuth()
const saving = ref(false)
const f = reactive({
  id: props.product?.id, name: props.product?.name ?? '', sku: props.product?.sku ?? '',
  category: props.product?.category ?? '', unit: props.product?.unit ?? 'pcs',
  costPrice: props.product?.costPrice ?? 0, sellPrice: props.product?.sellPrice ?? 0,
  stock: props.product?.stock ?? 0, reorderLevel: props.product?.reorderLevel ?? 0, maxStock: props.product?.maxStock ?? 0
})

// Editing: read the product fresh from the server (GET /products/{id}) so we never edit stale numbers.
onMounted(async () => {
  if (!props.product) return
  try {
    const p = await inv.fetchProduct(props.product.id)
    Object.assign(f, { name: p.name, sku: p.sku, category: p.category || f.category, unit: p.unit, costPrice: p.costPrice || f.costPrice, sellPrice: p.sellPrice, reorderLevel: p.reorderLevel, maxStock: p.maxStock })
  } catch { /* keep the values we already have */ }
})

async function save() {
  if (!f.name.trim()) return toast('Enter the product name', 'danger')
  if (f.sellPrice <= 0) return toast('Enter a selling price', 'danger')
  saving.value = true
  try { await inv.saveProduct({ ...f, name: f.name.trim() }); toast('Product saved', 'success'); closeModal(true) }
  catch (e) { toast(errorText(e), 'danger') }
  finally { saving.value = false }
}
async function remove() {
  if (!await confirmAction('Archive product', `Archive ${f.name}? It is hidden from the product list. Past sales keep their records.`, 'Archive')) return
  try { await inv.removeProduct(f.id!); toast('Product archived'); closeModal(true) }
  catch (e) { toast(errorText(e), 'danger') }
}
</script>

<template>
  <ModalShell :title="product ? 'Edit product' : 'New product'">
    <IonInput class="field" label="Product name" label-placement="stacked" fill="outline" v-model="f.name" />
    <div class="two field">
      <IonInput label="SKU / code" label-placement="stacked" fill="outline" v-model="f.sku" />
      <IonInput label="Category" label-placement="stacked" fill="outline" v-model="f.category" />
    </div>
    <div class="chips">
      <IonChip v-for="c in inv.categories" :key="c" @click="f.category = c">{{ c }}</IonChip>
    </div>
    <div class="two field">
      <NumInput v-model="f.costPrice" label="Cost price" />
      <NumInput v-model="f.sellPrice" label="Selling price" />
    </div>
    <div class="two field">
      <IonInput label="Unit (bag, pcs, kg...)" label-placement="stacked" fill="outline" v-model="f.unit" />
      <NumInput v-model="f.reorderLevel" label="Low-stock alert at" />
    </div>
    <div class="two field">
      <NumInput v-if="!product" v-model="f.stock" label="Opening stock" />
      <NumInput v-model="f.maxStock" label="Maximum stock (optional)" />
    </div>
    <small v-if="product" class="muted">To change the quantity in stock, use the Stock page.</small>
    <template #footer>
      <IonButton v-if="product && auth.canDo('products', 'delete')" color="danger" fill="outline" @click="remove">Archive</IonButton>
      <IonButton :disabled="saving" @click="save">Save product</IonButton>
    </template>
  </ModalShell>
</template>
