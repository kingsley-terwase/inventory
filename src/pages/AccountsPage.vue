<script setup lang="ts">
import { ref } from 'vue'
import PageLayout from '@/components/PageLayout.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatCard from '@/components/StatCard.vue'
import { useAccounts } from '@/stores/accounts'
import { useSettings } from '@/stores/settings'
import { errorText, toast } from '@/composables/useUi'
import { monthStart, today } from '@/utils/date'

const acc = useAccounts(); const { money } = useSettings()
const from = ref(monthStart()); const to = ref(today())

async function apply() {
  if (from.value > to.value) return toast('The start date is after the end date', 'danger')
  try { await acc.loadSummary(from.value, to.value) } catch (e) { toast(errorText(e), 'danger') }
}
const tone = (key: string) => (key === 'money_received' ? 'good' : key === 'expenses' ? 'warn' : key === 'net_money_movement' ? (acc.get(key) >= 0 ? 'good' : 'bad') : undefined)
</script>

<template>
  <PageLayout title="Accounts">
    <p class="muted" style="margin-top: 0">Money in and out for the chosen dates. A cash and bank ledger is not available from the server yet.</p>
    <div class="two field">
      <IonInput type="date" label="From" label-placement="stacked" fill="outline" v-model="from" @ion-change="apply" />
      <IonInput type="date" label="To" label-placement="stacked" fill="outline" v-model="to" @ion-change="apply" />
    </div>
    <EmptyState v-if="!acc.lines.length" text="No figures for this period." />
    <div v-else class="stats">
      <StatCard v-for="l in acc.lines" :key="l.key" :label="l.label" :value="money(l.value)" :tone="tone(l.key)" />
    </div>
  </PageLayout>
</template>
