<script setup lang="ts">
import { computed, ref } from 'vue'
import { addOutline } from 'ionicons/icons'
import PageLayout from '@/components/PageLayout.vue'
import EmptyState from '@/components/EmptyState.vue'
import InvoiceModal from '@/features/sales/InvoiceModal.vue'
import { useAuth } from '@/stores/auth'
import { useSales } from '@/stores/sales'
import { useSettings } from '@/stores/settings'
import { errorText, openModal, toast } from '@/composables/useUi'
import { fmtDate } from '@/utils/date'

const sales = useSales(); const auth = useAuth(); const { money } = useSettings()
const q = ref(''); const filter = ref<'all' | 'paid' | 'owing'>('all'); const loadingMore = ref(false)
const list = computed(() => sales.sales.filter(s =>
  (filter.value === 'all' || (filter.value === 'paid' ? s.balance === 0 : s.balance > 0)) &&
  (s.number + s.customerName).toLowerCase().includes(q.value.toLowerCase())))

async function more() {
  loadingMore.value = true
  try { await sales.loadMoreSales() } catch (e) { toast(errorText(e), 'danger') } finally { loadingMore.value = false }
}
</script>

<template>
  <PageLayout title="Sales">
    <IonSearchbar v-model="q" placeholder="Search invoice or customer" style="padding: 0 0 8px" />
    <IonSegment v-model="filter" class="field">
      <IonSegmentButton value="all"><IonLabel>All</IonLabel></IonSegmentButton>
      <IonSegmentButton value="paid"><IonLabel>Fully paid</IonLabel></IonSegmentButton>
      <IonSegmentButton value="owing"><IonLabel>Owing</IonLabel></IonSegmentButton>
    </IonSegment>
    <EmptyState v-if="!list.length" text="No sales found. Tap + to make a sale." />
    <IonList v-else class="sheet" lines="full">
      <IonItem v-for="s in list" :key="s.id" button @click="openModal(InvoiceModal, { sale: s })">
        <div class="row-main">
          <div><div class="row-title">{{ s.number }} · {{ s.customerName }}</div>
            <div class="row-sub">{{ fmtDate(s.date) }} · {{ s.method === 'credit' ? 'Credit' : s.method === 'cash' ? 'Cash' : 'Transfer' }}</div></div>
          <div><div class="row-amount num">{{ money(s.total) }}</div>
            <IonBadge v-if="s.balance > 0" color="warning">Owes {{ money(s.balance) }}</IonBadge>
            <IonBadge v-else color="primary">Paid</IonBadge></div>
        </div>
      </IonItem>
    </IonList>
    <IonButton v-if="sales.hasMore" fill="outline" expand="block" :disabled="loadingMore" @click="more">Load older sales</IonButton>
    <template #fab>
      <IonFab v-if="auth.canDo('sales', 'create')" slot="fixed" vertical="bottom" horizontal="end">
        <IonFabButton aria-label="New sale" router-link="/sales/new"><IonIcon :icon="addOutline" /></IonFabButton>
      </IonFab>
    </template>
  </PageLayout>
</template>
