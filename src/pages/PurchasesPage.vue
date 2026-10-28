<script setup lang="ts">
import { addOutline } from 'ionicons/icons'
import PageLayout from '@/components/PageLayout.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatCard from '@/components/StatCard.vue'
import PurchaseFormModal from '@/features/purchases/PurchaseFormModal.vue'
import { usePurchases } from '@/stores/purchases'
import { useSettings } from '@/stores/settings'
import { openModal } from '@/composables/useUi'
import { fmtDate } from '@/utils/date'

const purchases = usePurchases(); const { money } = useSettings()
</script>

<template>
  <PageLayout title="Purchases">
    <div class="stats"><StatCard label="Stock bought (recent)" :value="money(purchases.total)" /></div>
    <EmptyState v-if="!purchases.purchases.length" text="No purchases yet. Tap + to record stock you bought." />
    <IonList v-else class="sheet" lines="full">
      <IonItem v-for="p in purchases.purchases" :key="p.id">
        <div class="row-main">
          <div><div class="row-title">{{ p.number }} · {{ p.supplierName || 'Stock received' }}</div>
            <div class="row-sub">{{ fmtDate(p.date) }} · {{ p.items.map(i => i.qty + ' × ' + i.name).join(', ') }}</div></div>
          <div class="row-amount num">{{ money(p.total) }}</div>
        </div>
      </IonItem>
    </IonList>
    <template #fab>
      <IonFab slot="fixed" vertical="bottom" horizontal="end">
        <IonFabButton aria-label="New purchase" @click="openModal(PurchaseFormModal)"><IonIcon :icon="addOutline" /></IonFabButton>
      </IonFab>
    </template>
  </PageLayout>
</template>
