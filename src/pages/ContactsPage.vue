<script setup lang="ts">
import { computed, ref } from 'vue'
import { addOutline } from 'ionicons/icons'
import PageLayout from '@/components/PageLayout.vue'
import EmptyState from '@/components/EmptyState.vue'
import ContactFormModal from '@/features/contacts/ContactFormModal.vue'
import { useContacts } from '@/stores/contacts'
import { useSettings } from '@/stores/settings'
import { openModal } from '@/composables/useUi'
import type { Customer } from '@/types'

const contacts = useContacts(); const { money } = useSettings()
const tab = ref<'customer' | 'supplier'>('customer')
const q = ref('')
const match = (c: { name: string; phone: string }) => (c.name + c.phone).toLowerCase().includes(q.value.toLowerCase())
const customers = computed(() => contacts.customers.filter(match))
const suppliers = computed(() => contacts.suppliers.filter(match))
const used = (c: Customer) => c.limit > 0 ? Math.min(1, c.owed / c.limit) : c.owed > 0 ? 1 : 0
</script>

<template>
  <PageLayout title="Customers & suppliers">
    <IonSegment v-model="tab" class="field">
      <IonSegmentButton value="customer"><IonLabel>Customers</IonLabel></IonSegmentButton>
      <IonSegmentButton value="supplier"><IonLabel>Suppliers</IonLabel></IonSegmentButton>
    </IonSegment>
    <IonSearchbar v-model="q" placeholder="Search name or phone" style="padding: 0 0 8px" />

    <template v-if="tab === 'customer'">
      <p class="muted" style="margin-top: 0">Customers are added automatically when you enter their name and phone on a sale. The credit limit is one setting for everyone (Settings).</p>
      <EmptyState v-if="!customers.length" text="No customers yet. They appear here after a sale that names one." />
      <IonList v-else class="sheet" lines="full">
        <IonItem v-for="c in customers" :key="c.key">
          <div style="width: 100%; padding: 6px 0">
            <div class="row-main" style="padding: 0">
              <div><div class="row-title">{{ c.name }}</div><div class="row-sub">{{ c.phone || 'No phone' }}</div></div>
              <div>
                <div class="row-amount num">{{ money(c.owed) }} owed</div>
                <div class="row-sub num">limit {{ money(c.limit) }}</div>
              </div>
            </div>
            <IonProgressBar v-if="c.limit > 0" :value="used(c)" :color="used(c) >= 1 ? 'danger' : used(c) > 0.8 ? 'warning' : 'primary'" style="margin-top: 6px" />
          </div>
        </IonItem>
      </IonList>
    </template>

    <template v-else>
      <p class="muted" style="margin-top: 0">Suppliers are saved on this device only. The server does not store suppliers yet.</p>
      <EmptyState v-if="!suppliers.length" text="No suppliers yet. Tap + to add one." />
      <IonList v-else class="sheet" lines="full">
        <IonItem v-for="s in suppliers" :key="s.id" button @click="openModal(ContactFormModal, { supplier: s })">
          <div class="row-main"><div><div class="row-title">{{ s.name }}</div><div class="row-sub">{{ s.phone || 'No phone' }}</div></div></div>
        </IonItem>
      </IonList>
    </template>

    <template #fab>
      <IonFab v-if="tab === 'supplier'" slot="fixed" vertical="bottom" horizontal="end">
        <IonFabButton aria-label="Add supplier" @click="openModal(ContactFormModal)"><IonIcon :icon="addOutline" /></IonFabButton>
      </IonFab>
    </template>
  </PageLayout>
</template>
