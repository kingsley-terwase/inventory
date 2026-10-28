<script setup lang="ts">
import { computed, ref } from 'vue'
import PageLayout from '@/components/PageLayout.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatCard from '@/components/StatCard.vue'
import StockAdjustModal from '@/features/products/StockAdjustModal.vue'
import PurchaseFormModal from '@/features/purchases/PurchaseFormModal.vue'
import { useAuth } from '@/stores/auth'
import { useInventory } from '@/stores/inventory'
import { useSettings } from '@/stores/settings'
import { errorText, openModal, toast } from '@/composables/useUi'
import { fmtDateTime } from '@/utils/date'
import type { Product } from '@/types'

const inv = useInventory(); const auth = useAuth(); const { money } = useSettings()
const tab = ref<'levels' | 'history'>('levels')
const adjust = (p: Product) => openModal(StockAdjustModal, { product: p })
const receive = (p: Product) => openModal(PurchaseFormModal, { product: p })
// products this branch actually holds first, the ones it has never stocked after them
const rows = computed(() => [...inv.products].sort((a, b) => Number(b.stocked) - Number(a.stocked) || a.name.localeCompare(b.name)))
// history for one product uses GET .../stock/movements?product_id=
async function filterHistory(e: CustomEvent) {
  try { await inv.loadMovements(String(e.detail.value ?? '')) } catch (err) { toast(errorText(err), 'danger') }
}
</script>

<template>
  <PageLayout title="Stock">
    <div class="stats">
      <StatCard label="Stock value at cost" :value="money(inv.stockValue)" tone="good" />
      <StatCard label="Low-stock items" :value="inv.lowStock.length" :tone="inv.lowStock.length ? 'warn' : undefined" />
    </div>
    <IonSegment v-model="tab" class="field">
      <IonSegmentButton value="levels"><IonLabel>Stock levels</IonLabel></IonSegmentButton>
      <IonSegmentButton value="history"><IonLabel>Movement history</IonLabel></IonSegmentButton>
    </IonSegment>

    <template v-if="tab === 'levels'">
      <EmptyState v-if="!inv.products.length" text="No products yet. Add them on the Products page." />
      <IonList v-else class="sheet" lines="full">
        <IonItem v-for="p in rows" :key="p.id">
          <div class="row-main">
            <div><div class="row-title">{{ p.name }}</div><div class="row-sub">{{ p.stocked ? `Alert at ${p.reorderLevel}` : 'Not stocked in this branch yet' }}</div></div>
            <div style="display: flex; align-items: center; gap: 12px">
              <template v-if="p.stocked">
                <span class="row-amount num" :class="{ 'text-danger': p.stock <= p.reorderLevel }">{{ p.stock }}</span>
                <IonButton v-if="auth.canDo('inventory', 'update')" size="small" fill="outline" @click="adjust(p)">Adjust</IonButton>
              </template>
              <IonButton v-else-if="auth.canDo('inventory', 'create')" size="small" @click="receive(p)">Receive stock</IonButton>
            </div>
          </div>
        </IonItem>
      </IonList>
    </template>

    <template v-else>
      <IonSelect class="field" label="Product" label-placement="stacked" fill="outline" interface="popover" :value="inv.movementProduct" @ion-change="filterHistory">
        <IonSelectOption value="">All products</IonSelectOption>
        <IonSelectOption v-for="p in inv.products" :key="p.id" :value="p.id">{{ p.name }}</IonSelectOption>
      </IonSelect>
      <EmptyState v-if="!inv.movements.length" text="No stock movements yet." />
      <IonList v-else class="sheet" lines="full">
        <IonItem v-for="m in inv.movements.slice(0, 200)" :key="m.id">
          <div class="row-main">
            <div><div class="row-title">{{ m.productName }}</div><div class="row-sub">{{ m.type }} · {{ m.note }} · {{ fmtDateTime(m.date) }}</div></div>
            <div class="row-amount num" :class="m.qty < 0 ? 'text-danger' : 'text-good'">{{ m.qty > 0 ? '+' : '' }}{{ m.qty }}</div>
          </div>
        </IonItem>
      </IonList>
    </template>
  </PageLayout>
</template>
