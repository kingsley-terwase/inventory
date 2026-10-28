<script setup lang="ts">
import { ref } from 'vue'
import PageLayout from '@/components/PageLayout.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatCard from '@/components/StatCard.vue'
import PaymentModal from '@/features/accounting/PaymentModal.vue'
import InvoiceModal from '@/features/sales/InvoiceModal.vue'
import { useAuth } from '@/stores/auth'
import { useSales } from '@/stores/sales'
import { useSettings } from '@/stores/settings'
import { errorText, openModal, toast } from '@/composables/useUi'
import { dueColor, dueLabel, dueState, fmtDate } from '@/utils/date'

const sales = useSales(); const auth = useAuth(); const { money } = useSettings()
const tab = ref<'owing' | 'paid'>('owing')

async function pay(receiptId: string) {
  await openModal(PaymentModal, { receiptId })
  sales.loadPaidDebts().catch(() => {}) // a settled debt moves to the Paid tab
}
async function receipt(receiptId: string) {
  try { await openModal(InvoiceModal, { sale: await sales.fetchSale(receiptId) }) } catch (e) { toast(errorText(e), 'danger') }
}
</script>

<template>
  <PageLayout title="Debts">
    <div class="stats">
      <StatCard label="Customers owe you" :value="money(sales.receivables)" tone="warn" />
      <StatCard label="Overdue invoices" :value="sales.overdue.length" :tone="sales.overdue.length ? 'bad' : undefined" />
    </div>
    <IonSegment v-model="tab" class="field">
      <IonSegmentButton value="owing"><IonLabel>Owing</IonLabel></IonSegmentButton>
      <IonSegmentButton value="paid"><IonLabel>Fully paid</IonLabel></IonSegmentButton>
    </IonSegment>

    <template v-if="tab === 'owing'">
      <p class="muted" style="margin-top: 0">Reminder SMS go out automatically from the server using your reminder rules (Settings).</p>
      <EmptyState v-if="!sales.outstanding.length" text="Nobody owes you anything. Credit sales will show up here." />
      <IonList v-else class="sheet" lines="full">
        <IonItem v-for="d in sales.outstanding" :key="d.id">
          <div class="row-main">
            <div>
              <div class="row-title">{{ d.customerName }}</div>
              <div class="row-sub">{{ d.receiptId }} · due {{ fmtDate(d.dueDate) }}{{ d.customerPhone ? ' · ' + d.customerPhone : '' }}</div>
              <IonBadge :color="dueColor(dueState(d))">{{ dueLabel(dueState(d)) }}</IonBadge>
            </div>
            <div>
              <div class="row-amount num">{{ money(d.balance) }}</div>
              <IonButton v-if="auth.canDo('payments', 'create')" size="small" @click="pay(d.receiptId)">Record payment</IonButton>
              <IonButton v-if="auth.canDo('sales', 'view')" size="small" fill="clear" @click="receipt(d.receiptId)">Receipt</IonButton>
            </div>
          </div>
        </IonItem>
      </IonList>
    </template>

    <template v-else>
      <EmptyState v-if="!sales.paidDebts.length" text="No fully paid debts yet." />
      <IonList v-else class="sheet" lines="full">
        <IonItem v-for="d in sales.paidDebts" :key="d.id" :button="auth.canDo('sales', 'view')" @click="auth.canDo('sales', 'view') && receipt(d.receiptId)">
          <div class="row-main">
            <div><div class="row-title">{{ d.customerName }}</div><div class="row-sub">{{ d.receiptId }} · due {{ fmtDate(d.dueDate) }}</div></div>
            <div><div class="row-amount num">{{ money(d.paid) }}</div><IonBadge color="primary">Paid</IonBadge></div>
          </div>
        </IonItem>
      </IonList>
    </template>
  </PageLayout>
</template>
