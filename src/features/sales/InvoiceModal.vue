<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { printOutline } from 'ionicons/icons'
import ModalShell from '@/components/ModalShell.vue'
import { useSales } from '@/stores/sales'
import { useSettings } from '@/stores/settings'
import { errorText, toast } from '@/composables/useUi'
import { fmtDate, fmtDateTime } from '@/utils/date'
import type { Sale } from '@/types'

const props = defineProps<{ sale: Sale }>()
const settings = useSettings(); const { money } = settings
const sales = useSales()
const full = ref<Sale>(props.sale)
const loading = ref(!props.sale.detailLoaded)

// A sale in the list has no items yet. Fetch the full receipt when the invoice opens.
onMounted(async () => {
  if (props.sale.detailLoaded) return
  try { full.value = await sales.fetchSale(props.sale.id) }
  catch (e) { toast(errorText(e), 'danger') }
  finally { loading.value = false }
})
// The full payment log (initial payment + every repayment) has its own endpoint.
onMounted(async () => {
  try { full.value = { ...full.value, payments: await sales.fetchPayments(props.sale.id) } } catch { /* some roles cannot read payments */ }
})
const print = () => window.print()
</script>

<template>
  <ModalShell :title="full.number">
    <div class="invoice print-area">
      <h3>{{ settings.businessName }}</h3>
      <div class="muted">{{ settings.branch?.address }} {{ settings.branch?.phone }}</div>
      <div class="meta">
        <div><strong>Receipt {{ full.number }}</strong><br />{{ fmtDate(full.date) }}</div>
        <div class="right"><strong>{{ full.customerName }}</strong><br />{{ full.method === 'credit' ? 'Credit sale' : full.method === 'cash' ? 'Paid cash' : 'Paid by transfer' }}</div>
      </div>
      <p v-if="loading" class="muted">Loading items...</p>
      <div v-else class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>Item</th><th class="n">Qty</th><th class="n">Price</th><th class="n">Amount</th></tr></thead>
          <tbody>
            <tr v-for="i in full.items" :key="i.productId">
              <td>{{ i.name }}</td><td class="n">{{ i.qty }}</td><td class="n">{{ money(i.price) }}</td><td class="n">{{ money(i.qty * i.price) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="summary">
        <div><span>Subtotal</span><span class="num">{{ money(full.subtotal) }}</span></div>
        <div v-if="full.surcharge"><span>Surcharge</span><span class="num">+{{ money(full.surcharge) }}</span></div>
        <div v-if="full.discount"><span>Discount</span><span class="num">-{{ money(full.discount) }}</span></div>
        <div class="grand"><span>Total</span><span class="num">{{ money(full.total) }}</span></div>
        <div><span>Paid</span><span class="num">{{ money(full.paid) }}</span></div>
        <div v-if="full.balance > 0" class="text-danger"><span>Balance due {{ fmtDate(full.dueDate) }}</span><span class="num">{{ money(full.balance) }}</span></div>
      </div>
      <template v-if="full.payments.length">
        <h4 style="margin: 12px 0 4px">Payments</h4>
        <div v-for="p in full.payments" :key="p.id" class="row-main" style="padding: 2px 0">
          <div class="row-sub">{{ fmtDateTime(p.date) }} · {{ p.method }}{{ p.kind === 'initial' ? ' · paid at sale' : '' }}</div>
          <div class="num">{{ money(p.amount) }}</div>
        </div>
      </template>
    </div>
    <template #footer>
      <IonButton @click="print"><IonIcon slot="start" :icon="printOutline" />Print</IonButton>
    </template>
  </ModalShell>
</template>
