<script setup lang="ts">
import { computed, ref } from 'vue'
import { downloadOutline, documentTextOutline, printOutline } from 'ionicons/icons'
import PageLayout from '@/components/PageLayout.vue'
import StatCard from '@/components/StatCard.vue'
import { downloadPdf, fetchPreview, reportList, type Preview, type ReportKey } from '@/features/reports/reports'
import { downloadCsv } from '@/utils/csv'
import { errorText, toast } from '@/composables/useUi'
import { monthStart, today } from '@/utils/date'

const key = ref<ReportKey>('sales')
const from = ref(monthStart()); const to = ref(today())
const current = computed(() => reportList.find(r => r.key === key.value)!)
const preview = ref<Preview | null>(null)
const loading = ref(false)

async function run() {
  if (current.value.ranged && from.value > to.value) return toast('The start date is after the end date', 'danger')
  loading.value = true
  try { preview.value = await fetchPreview(key.value, from.value, to.value) }
  catch (e) { preview.value = null; toast(errorText(e), 'danger') }
  finally { loading.value = false }
}
async function pdf() {
  try { await downloadPdf(key.value, from.value, to.value) } catch (e) { toast(errorText(e), 'danger') }
}
const print = () => window.print()
const exportCsv = () => preview.value && downloadCsv(`${key.value}-${from.value}-to-${to.value}.csv`, preview.value.columns, preview.value.rows)
</script>

<template>
  <PageLayout title="Reports">
    <template #actions>
      <IonButton aria-label="Download PDF" @click="pdf"><IonIcon slot="icon-only" :icon="documentTextOutline" /></IonButton>
      <IonButton aria-label="Export CSV" :disabled="!preview?.rows.length" @click="exportCsv"><IonIcon slot="icon-only" :icon="downloadOutline" /></IonButton>
      <IonButton aria-label="Print" :disabled="!preview" @click="print"><IonIcon slot="icon-only" :icon="printOutline" /></IonButton>
    </template>

    <IonSelect class="field" label="Report" label-placement="stacked" fill="outline" interface="popover" v-model="key" @ion-change="preview = null">
      <IonSelectOption v-for="r in reportList" :key="r.key" :value="r.key">{{ r.label }}</IonSelectOption>
    </IonSelect>
    <div v-if="current.ranged" class="two field">
      <IonInput type="date" label="From" label-placement="stacked" fill="outline" v-model="from" />
      <IonInput type="date" label="To" label-placement="stacked" fill="outline" v-model="to" />
    </div>
    <div class="two field">
      <IonButton :disabled="loading" @click="run">Preview on screen</IonButton>
      <IonButton fill="outline" @click="pdf">Download PDF</IonButton>
    </div>

    <div v-if="preview" class="print-area">
      <h2 class="section">{{ current.label }}<span v-if="current.ranged" class="muted"> · {{ from }} to {{ to }}</span></h2>
      <div v-if="preview.summary.length" class="stats">
        <StatCard v-for="s in preview.summary" :key="s.label" :label="s.label" :value="s.value" />
      </div>
      <div v-if="preview.rows.length" class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th v-for="c in preview.columns" :key="c">{{ c }}</th></tr></thead>
          <tbody><tr v-for="(r, ri) in preview.rows" :key="ri"><td v-for="(v, i) in r" :key="i">{{ v }}</td></tr></tbody>
        </table>
      </div>
      <p v-else-if="!preview.summary.length" class="muted">Nothing to show for this period.</p>
    </div>
    <p v-else class="muted">Choose a report and dates, then preview it here or download the PDF.</p>
  </PageLayout>
</template>
