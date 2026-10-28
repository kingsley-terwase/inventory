<script setup lang="ts">
import { computed } from 'vue'
import PageLayout from '@/components/PageLayout.vue'
import StatCard from '@/components/StatCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useSales } from '@/stores/sales'
import { useInventory } from '@/stores/inventory'
import { useDashboard } from '@/stores/dashboard'
import { useAuth } from '@/stores/auth'
import { useSettings } from '@/stores/settings'
import { humanize, isMoney, viewSections } from '@/features/dashboard/sections'
import { errorText, toast } from '@/composables/useUi'
import { dueColor, dueLabel, dueState, fmtDate } from '@/utils/date'

const sales = useSales(); const inv = useInventory(); const dash = useDashboard(); const auth = useAuth(); const settings = useSettings()
const { money } = settings

// The server's numbers are the single source. We only replace its "low stock" block with our own, which
// ignores products this branch has never stocked (the server counts those as 0 left).
const views = computed(() => viewSections(dash.sections, { scope: dash.scope, skip: inv.products.length ? ['low_stock'] : [] }))
const show = (k: string, v: unknown) => (v === null || v === '' ? '-' : isMoney(k, v) ? money(Number(v)) : String(v))

const scopeLabel = computed(() => (dash.scope === 'all' ? 'All branches' : settings.branch?.name || 'This branch'))

// A branch with products but no stock and no sales is new: say what to do instead of showing a wall of zeros.
const noProducts = computed(() => !inv.products.length)
const isNew = computed(() => dash.scope === 'branch' && inv.products.length > 0 && inv.stockedCount === 0 && !sales.sales.length)

async function setScope(e: CustomEvent) {
  dash.scope = e.detail.value
  try { await dash.load() } catch (err) { toast(errorText(err), 'danger') }
}
</script>

<template>
  <PageLayout title="Dashboard">
    <div class="row-main" style="padding: 0 0 8px">
      <div><div class="row-sub">Showing</div><strong>{{ scopeLabel }}</strong></div>
    </div>
    <IonSegment v-if="auth.isAdmin && auth.branches.length > 1" class="field" :value="dash.scope" @ion-change="setScope">
      <IonSegmentButton value="branch"><IonLabel>This branch</IonLabel></IonSegmentButton>
      <IonSegmentButton value="all"><IonLabel>All branches</IonLabel></IonSegmentButton>
    </IonSegment>

    <!-- New branch: guide the first steps -->
    <div v-if="isNew" class="credit-box">
      <h3 style="margin: 0 0 6px">{{ scopeLabel }} is ready to set up</h3>
      <p class="muted" style="margin: 0 0 10px">
        Your products are shared by every branch, but each branch keeps its own stock. This branch has none yet, so nothing can be sold here.
      </p>
      <ol style="margin: 0 0 10px; padding-left: 18px">
        <li>Receive stock for the products this branch will sell.</li>
        <li>Make a sale.</li>
      </ol>
      <IonButton v-if="auth.canDo('inventory', 'create')" router-link="/purchases">Receive stock</IonButton>
      <IonButton v-if="auth.canDo('inventory', 'view')" fill="outline" router-link="/stock">See products and stock</IonButton>
    </div>
    <div v-else-if="noProducts && auth.canDo('products', 'create')" class="credit-box">
      <h3 style="margin: 0 0 6px">Add your first product</h3>
      <p class="muted" style="margin: 0 0 10px">Products are shared by all branches. Add them once, then receive stock in each branch.</p>
      <IonButton router-link="/products">Add a product</IonButton>
    </div>

    <!-- The server decides which sections this role may see (a cashier gets no "money" section). -->
    <template v-for="v in views" :key="v.key">
      <h2 class="section">{{ v.title }}</h2>
      <div v-if="v.stats.length" class="stats">
        <StatCard v-for="s in v.stats" :key="s.label" :label="s.label" :value="s.money ? money(Number(s.raw)) : String(s.raw ?? '-')" />
      </div>
      <p v-for="(n, i) in v.notes" :key="i" class="muted" style="font-size: 0.85rem">{{ n }}</p>
      <div v-for="l in v.lists" :key="l.title" class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th v-for="c in l.columns" :key="c">{{ humanize(c) }}</th></tr></thead>
          <tbody><tr v-for="(r, i) in l.rows" :key="i"><td v-for="c in l.columns" :key="c">{{ show(c, r[c]) }}</td></tr></tbody>
        </table>
      </div>
    </template>

    <template v-if="dash.scope === 'branch' && !isNew">
      <h2 class="section">Debts to collect</h2>
      <EmptyState v-if="!sales.outstanding.length" text="No customer owes you anything right now." />
      <IonList v-else class="sheet" lines="full">
        <IonItem v-for="d in sales.outstanding.slice(0, 5)" :key="d.id" button router-link="/debts">
          <div class="row-main">
            <div><div class="row-title">{{ d.customerName }}</div><div class="row-sub">{{ d.receiptId }} · due {{ fmtDate(d.dueDate) }}</div></div>
            <div>
              <div class="row-amount num">{{ money(d.balance) }}</div>
              <IonBadge :color="dueColor(dueState(d))">{{ dueLabel(dueState(d)) }}</IonBadge>
            </div>
          </div>
        </IonItem>
      </IonList>

      <h2 class="section">Running low</h2>
      <EmptyState v-if="!inv.lowStock.length" text="Nothing is running low in this branch." />
      <IonList v-else class="sheet" lines="full">
        <IonItem v-for="p in inv.lowStock.slice(0, 5)" :key="p.id" button router-link="/stock">
          <div class="row-main"><div class="row-title">{{ p.name }}</div><div class="text-danger num">{{ p.stock }} left</div></div>
        </IonItem>
      </IonList>

      <h2 class="section">Recent sales</h2>
      <EmptyState v-if="!sales.sales.length" text="No sales yet. Use New sale to make the first one." />
      <IonList v-else class="sheet" lines="full">
        <IonItem v-for="s in sales.sales.slice(0, 5)" :key="s.id" button router-link="/sales">
          <div class="row-main">
            <div><div class="row-title">{{ s.number }} · {{ s.customerName }}</div><div class="row-sub">{{ fmtDate(s.date) }}</div></div>
            <div class="row-amount num">{{ money(s.total) }}</div>
          </div>
        </IonItem>
      </IonList>
    </template>
  </PageLayout>
</template>
