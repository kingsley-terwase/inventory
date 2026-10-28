<script setup lang="ts">
import { ref, watch } from 'vue'
import { addOutline, listOutline } from 'ionicons/icons'
import PageLayout from '@/components/PageLayout.vue'
import EmptyState from '@/components/EmptyState.vue'
import ProductFormModal from '@/features/products/ProductFormModal.vue'
import CategoriesModal from '@/features/products/CategoriesModal.vue'
import { useAuth } from '@/stores/auth'
import { useInventory } from '@/stores/inventory'
import { useSettings } from '@/stores/settings'
import { errorText, openModal, toast } from '@/composables/useUi'
import type { Product } from '@/types'

const inv = useInventory(); const auth = useAuth(); const { money } = useSettings()
const q = ref(''); const categoryId = ref('')
const found = ref<Product[] | null>(null) // null = no filter, show everything we have loaded

// Searching and the category filter are done by the server (GET /products?search=&category_id=).
let timer: number | undefined
watch([q, categoryId], () => {
  window.clearTimeout(timer)
  if (!q.value.trim() && !categoryId.value) { found.value = null; return }
  timer = window.setTimeout(async () => {
    try { found.value = await inv.searchProducts(q.value, categoryId.value) }
    catch (e) { toast(errorText(e), 'danger') }
  }, 300)
})
// after a product or category is saved the unfiltered list reloads, so drop stale search results
watch(() => inv.products, () => { if (found.value) inv.searchProducts(q.value, categoryId.value).then(r => (found.value = r)).catch(() => {}) })

const list = () => found.value ?? inv.products
const edit = (p?: Product) => { if (p ? auth.canDo('products', 'update') : auth.canDo('products', 'create')) openModal(ProductFormModal, { product: p }) }
</script>

<template>
  <PageLayout title="Products">
    <template #actions>
      <IonButton v-if="auth.canDo('categories', 'view')" aria-label="Manage categories" @click="openModal(CategoriesModal)"><IonIcon slot="start" :icon="listOutline" />Categories</IonButton>
    </template>
    <div class="two field">
      <IonSearchbar v-model="q" placeholder="Search name or code" style="padding: 0" />
      <IonSelect v-model="categoryId" aria-label="Category" interface="popover" placeholder="All categories" fill="outline">
        <IonSelectOption value="">All categories</IonSelectOption>
        <IonSelectOption v-for="c in inv.categoryList" :key="c.id" :value="c.id">{{ c.name }}</IonSelectOption>
      </IonSelect>
    </div>
    <EmptyState v-if="!list().length" text="No products found. Tap + to add one." />
    <IonList v-else class="sheet" lines="full">
      <IonItem v-for="p in list()" :key="p.id" :button="auth.canDo('products', 'update')" @click="edit(p)">
        <div class="row-main">
          <div><div class="row-title">{{ p.name }}</div><div class="row-sub">{{ p.category || 'No category' }}{{ p.sku ? ' · ' + p.sku : '' }}</div></div>
          <div>
            <div class="row-amount num">{{ money(p.sellPrice) }}</div>
            <div v-if="!p.stocked" class="row-sub">Not stocked here</div>
            <div v-else class="row-sub num" :class="{ 'text-danger': p.stock <= p.reorderLevel }">{{ p.stock }} in stock</div>
          </div>
        </div>
      </IonItem>
    </IonList>
    <template #fab>
      <IonFab v-if="auth.canDo('products', 'create')" slot="fixed" vertical="bottom" horizontal="end">
        <IonFabButton aria-label="Add product" @click="edit()"><IonIcon :icon="addOutline" /></IonFabButton>
      </IonFab>
    </template>
  </PageLayout>
</template>
