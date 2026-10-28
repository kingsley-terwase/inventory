<script setup lang="ts">
import { ref } from 'vue'
import PageLayout from '@/components/PageLayout.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useNotifications } from '@/stores/notifications'
import { errorText, toast } from '@/composables/useUi'
import { fmtDateTime } from '@/utils/date'

const notes = useNotifications()
const tab = ref<'alerts' | 'sms'>('alerts')

const run = async (fn: () => Promise<unknown>, ok?: string) => {
  try { await fn(); if (ok) toast(ok, 'success') } catch (e) { toast(errorText(e), 'danger') }
}
const smsColor = (s: string) => /deliver|sent|success/i.test(s) ? 'primary' : /fail|reject|error|undeliver/i.test(s) ? 'danger' : 'medium'
</script>

<template>
  <PageLayout title="Notifications">
    <template #actions>
      <IonButton v-if="tab === 'alerts' && notes.unread" @click="run(() => notes.markAllRead())">Mark all read</IonButton>
    </template>
    <IonSegment v-model="tab" class="field">
      <IonSegmentButton value="alerts"><IonLabel>Owner alerts</IonLabel></IonSegmentButton>
      <IonSegmentButton value="sms"><IonLabel>Customer SMS log</IonLabel></IonSegmentButton>
    </IonSegment>

    <template v-if="tab === 'alerts'">
      <EmptyState v-if="!notes.items.length" text="No alerts. You will be told here when a customer's debt is due." />
      <IonList v-else class="sheet" lines="full">
        <IonItem v-for="n in notes.items" :key="n.id" button @click="run(() => notes.markRead(n.id))">
          <div class="row-main">
            <div>
              <div class="row-title">
                <IonBadge v-if="!n.read" color="danger" style="margin-right: 6px">New</IonBadge>{{ n.title }}
              </div>
              <div class="row-sub" style="white-space: normal">{{ n.message }}</div>
            </div>
            <div class="row-sub">{{ n.date ? fmtDateTime(n.date) : '' }}</div>
          </div>
        </IonItem>
      </IonList>
    </template>

    <template v-else>
      <p class="muted" style="margin-top: 0">The server sends these automatically using your reminder rules (Settings).</p>
      <EmptyState v-if="!notes.smsLog.length" text="No SMS reminders have been sent yet." />
      <IonList v-else class="sheet" lines="full">
        <IonItem v-for="l in notes.smsLog.slice(0, 200)" :key="l.id">
          <div class="row-main">
            <div>
              <div class="row-title">{{ l.customerName || l.to }}{{ l.customerName && l.to ? ' · ' + l.to : '' }}</div>
              <div class="row-sub" style="white-space: normal">{{ l.message }}</div>
            </div>
            <div>
              <IonBadge :color="smsColor(l.status)">{{ l.status }}</IonBadge>
              <div class="row-sub">{{ l.date ? fmtDateTime(l.date) : '' }}</div>
              <IonButton size="small" fill="clear" @click="run(() => notes.refreshSms(l.id), 'Status updated')">Refresh</IonButton>
            </div>
          </div>
        </IonItem>
      </IonList>
    </template>
  </PageLayout>
</template>
