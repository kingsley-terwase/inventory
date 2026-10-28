<script setup lang="ts">
import { computed } from 'vue'
import { addOutline } from 'ionicons/icons'
import PageLayout from '@/components/PageLayout.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatCard from '@/components/StatCard.vue'
import ExpenseFormModal from '@/features/expenses/ExpenseFormModal.vue'
import { useAuth } from '@/stores/auth'
import { useExpenses } from '@/stores/expenses'
import { useSettings } from '@/stores/settings'
import { openModal } from '@/composables/useUi'
import { fmtDate, monthStart } from '@/utils/date'

const store = useExpenses(); const auth = useAuth(); const { money } = useSettings()
const sorted = computed(() => [...store.expenses].sort((a, b) => b.date.localeCompare(a.date)))
const month = computed(() => store.expenses.filter(e => e.date >= monthStart()).reduce((a, e) => a + e.amount, 0))
</script>

<template>
  <PageLayout title="Expenses">
    <div class="stats"><StatCard label="Spent this month" :value="money(month)" /></div>
    <EmptyState v-if="!sorted.length" text="No expenses recorded. Tap + to add one." />
    <IonList v-else class="sheet" lines="full">
      <IonItem v-for="e in sorted" :key="e.id">
        <div class="row-main">
          <div><div class="row-title">{{ e.category }}</div><div class="row-sub">{{ e.description || 'No description' }} · {{ fmtDate(e.date) }} · {{ e.method }}</div></div>
          <div class="row-amount num">{{ money(e.amount) }}</div>
        </div>
      </IonItem>
    </IonList>
    <template #fab>
      <IonFab v-if="auth.canDo('expenses', 'create')" slot="fixed" vertical="bottom" horizontal="end">
        <IonFabButton aria-label="Add expense" @click="openModal(ExpenseFormModal)"><IonIcon :icon="addOutline" /></IonFabButton>
      </IonFab>
    </template>
  </PageLayout>
</template>
