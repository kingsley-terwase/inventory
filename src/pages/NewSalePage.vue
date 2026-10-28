<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/components/PageLayout.vue'
import ItemsEditor from '@/components/ItemsEditor.vue'
import NumInput from '@/components/NumInput.vue'
import InvoiceModal from '@/features/sales/InvoiceModal.vue'
import { calcTotals, discountCap } from '@/features/sales/calc'
import { showCreditExhausted } from '@/features/sales/creditAlert'
import { CreditLimitError, useSales } from '@/stores/sales'
import { useAuth } from '@/stores/auth'
import { useInventory } from '@/stores/inventory'
import { useContacts } from '@/stores/contacts'
import { useSettings } from '@/stores/settings'
import { errorText, openModal, toast } from '@/composables/useUi'
import { addDays, fmtDate, today } from '@/utils/date'
import type { Adjust, Line, PayMethod, SettleMethod } from '@/types'

const router = useRouter()
const auth = useAuth(); const inv = useInventory()
const sales = useSales(); const contacts = useContacts(); const settings = useSettings(); const { money } = settings

// The backend has no customer list. Pick someone we already know, or type a new name and phone.
const WALK_IN = ''; const NEW = '__new'
const pick = ref(WALK_IN)
const typed = reactive({ name: '', phone: '' })
const customer = computed(() => {
  if (pick.value === WALK_IN) return undefined
  if (pick.value === NEW) return typed.name.trim() || typed.phone.trim() ? { name: typed.name, phone: typed.phone } : undefined
  const c = contacts.customers.find(x => x.key === pick.value)
  return c ? { name: c.name, phone: c.phone } : undefined
})

const lines = ref<Line[]>([])
const discount = reactive<Adjust>({ type: 'amount', value: 0 })
const method = ref<PayMethod>('cash')
const deposit = ref(0)
const depositMethod = ref<SettleMethod>('cash')
const clientReference = ref(sales.newRef())
const submitting = ref(false)

const totals = computed(() => calcTotals(lines.value, discount))
const info = computed(() => (customer.value?.name && customer.value.phone ? sales.creditInfo(customer.value) : null))
const creditNeeded = computed(() => (method.value === 'credit' ? Math.max(0, totals.value.total - deposit.value) : 0))
const overLimit = computed(() => !!info.value?.known && creditNeeded.value > info.value.available)
const dueDate = computed(() => addDays(today(), settings.s.repaymentDays))
const cap = computed(() => discountCap(totals.value.subtotal + totals.value.surcharge, settings.s.maxDiscountType, settings.s.maxDiscountValue))
const overCap = computed(() => settings.loaded && cap.value !== undefined && totals.value.discount > cap.value)

watch(method, m => { if (m === 'credit' && !customer.value) toast('Choose or enter a customer to sell on credit', 'warning') })

async function submit() {
  if (overCap.value) return toast(`The most discount allowed on this sale is ${money(cap.value!)}`, 'danger')
  submitting.value = true
  try {
    const sale = await sales.createSale({
      customer: customer.value, items: lines.value.map(l => ({ productId: l.productId, qty: l.qty, surcharge: l.surcharge })),
      discount, method: method.value, deposit: deposit.value, depositMethod: depositMethod.value,
      clientReference: clientReference.value
    })
    clientReference.value = sales.newRef()
    toast(`Sale ${sale.number} completed`, 'success')
    router.replace('/sales')
    await openModal(InvoiceModal, { sale })
  } catch (e) {
    if (e instanceof CreditLimitError) await showCreditExhausted(e)
    else toast(errorText(e), 'danger')
  } finally { submitting.value = false }
}
</script>

<template>
  <PageLayout title="New sale" back="/sales">
    <IonSelect class="field" label="Customer" label-placement="stacked" fill="outline" interface="popover" v-model="pick">
      <IonSelectOption :value="WALK_IN">Walk-in customer</IonSelectOption>
      <IonSelectOption v-for="c in contacts.customers" :key="c.key" :value="c.key">{{ c.name }}{{ c.phone ? ' · ' + c.phone : '' }}</IonSelectOption>
      <IonSelectOption :value="NEW">New customer...</IonSelectOption>
    </IonSelect>
    <div v-if="pick === NEW" class="two field">
      <IonInput label="Customer name" label-placement="stacked" fill="outline" v-model="typed.name" />
      <IonInput label="Phone (for SMS reminders)" label-placement="stacked" fill="outline" type="tel" v-model="typed.phone" />
    </div>

    <div v-if="info && info.known" class="credit-box" :class="{ bad: overLimit }">
      <div class="two">
        <div><div class="row-sub">Credit limit</div><strong class="num">{{ money(info.limit) }}</strong></div>
        <div><div class="row-sub">Already owes</div><strong class="num">{{ money(info.owed) }}</strong></div>
      </div>
      <div style="margin-top: 6px">Available credit: <strong class="num" :class="{ 'text-danger': info.available === 0 }">{{ money(info.available) }}</strong></div>
      <div v-if="overLimit" class="text-danger" style="margin-top: 4px">This sale needs {{ money(creditNeeded) }} on credit, which is more than the available credit.</div>
    </div>

    <p v-if="!inv.products.length && !auth.canDo('products', 'view') && !auth.canDo('inventory', 'view')" class="text-danger">
      Your role cannot see the product list, so there is nothing to sell yet. Ask the owner to allow "products: view"
      for this role (Settings, Roles and permissions).
    </p>
    <ItemsEditor v-model="lines" mode="sale" />

    <h2 class="section">Discount</h2>
    <p class="muted" style="margin-top: 0">
      Any surcharge you add on a line is already in that line. The discount comes off the total of all lines.
      <template v-if="cap !== undefined"> You can give up to {{ money(cap) }} on this sale.</template>
    </p>
    <div class="two field">
      <NumInput v-model="discount.value" label="Discount" />
      <IonSelect v-model="discount.type" label="Type" label-placement="stacked" fill="outline" interface="popover">
        <IonSelectOption value="amount">{{ settings.symbol }} amount</IonSelectOption><IonSelectOption value="percent">Percent %</IonSelectOption>
      </IonSelect>
    </div>
    <p v-if="overCap" class="text-danger" style="margin-top: -6px">That is more than the maximum discount allowed.</p>

    <div class="summary">
      <div><span>Subtotal</span><span class="num">{{ money(totals.subtotal) }}</span></div>
      <div v-if="totals.surcharge"><span>Surcharge</span><span class="num">+{{ money(totals.surcharge) }}</span></div>
      <div v-if="totals.discount"><span>Discount</span><span class="num">-{{ money(totals.discount) }}</span></div>
      <div class="grand"><span>Total</span><span class="num">{{ money(totals.total) }}</span></div>
    </div>

    <h2 class="section">Payment</h2>
    <IonSegment v-model="method" class="field">
      <IonSegmentButton value="cash"><IonLabel>Cash</IonLabel></IonSegmentButton>
      <IonSegmentButton value="transfer"><IonLabel>Transfer</IonLabel></IonSegmentButton>
      <IonSegmentButton value="credit"><IonLabel>Credit (debt)</IonLabel></IonSegmentButton>
    </IonSegment>
    <template v-if="method === 'credit'">
      <div class="field"><NumInput v-model="deposit" label="Paid now (optional)" /></div>
      <IonSegment v-if="deposit > 0" v-model="depositMethod" class="field">
        <IonSegmentButton value="cash"><IonLabel>Paid now in cash</IonLabel></IonSegmentButton>
        <IonSegmentButton value="transfer"><IonLabel>Paid now by transfer</IonLabel></IonSegmentButton>
      </IonSegment>
      <p class="muted">
        Balance to be owed: <strong class="num">{{ money(creditNeeded) }}</strong>.
        Due about {{ fmtDate(dueDate) }} ({{ settings.s.repaymentDays }} days, set in Settings).
      </p>
    </template>

    <IonButton expand="block" size="large" :disabled="!lines.length || submitting" @click="submit">
      {{ submitting ? 'Saving...' : `Complete sale · ${money(totals.total)}` }}
    </IonButton>
  </PageLayout>
</template>
