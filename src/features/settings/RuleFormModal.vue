<script setup lang="ts">
import { reactive, ref } from 'vue'
import ModalShell from '@/components/ModalShell.vue'
import NumInput from '@/components/NumInput.vue'
import { useSettings } from '@/stores/settings'
import { closeModal, errorText, toast } from '@/composables/useUi'
import type { ReminderRule } from '@/types'

const props = defineProps<{ rule?: ReminderRule }>()
const settings = useSettings()
const saving = ref(false)
const f = reactive({
  id: props.rule?.id, name: props.rule?.name ?? 'Overdue reminder', phase: props.rule?.phase ?? ('after' as 'before' | 'after'),
  offsetDays: props.rule?.offsetDays ?? 1, sendTime: props.rule?.sendTime ?? '09:00', intervalDays: props.rule?.intervalDays ?? 3,
  template: props.rule?.template ?? 'Hi {name}, receipt {receipt_id} has {amount} remaining, due {due_date}. Contact {branch}.',
  enabled: props.rule?.enabled ?? true
})

async function save() {
  if (!f.name.trim()) return toast('Give the rule a name', 'danger')
  if (!f.template.trim()) return toast('Write the message to send', 'danger')
  saving.value = true
  try { await settings.saveRule({ ...f }); toast('Rule saved', 'success'); closeModal(true) }
  catch (e) { toast(errorText(e), 'danger') }
  finally { saving.value = false }
}
</script>

<template>
  <ModalShell :title="rule ? 'Edit reminder rule' : 'New reminder rule'">
    <IonInput class="field" label="Rule name" label-placement="stacked" fill="outline" v-model="f.name" />
    <div class="two field">
      <IonSelect v-model="f.phase" label="Send" label-placement="stacked" fill="outline" interface="popover">
        <IonSelectOption value="before">Before the due date</IonSelectOption><IonSelectOption value="after">After the due date</IonSelectOption>
      </IonSelect>
      <NumInput v-model="f.offsetDays" label="How many days (0 = on the day)" />
    </div>
    <div class="two field">
      <IonInput type="time" label="Send at" label-placement="stacked" fill="outline" v-model="f.sendTime" />
      <NumInput v-model="f.intervalDays" label="Repeat every (days, 0 = once)" />
    </div>
    <IonTextarea class="field" label="Message" label-placement="stacked" fill="outline" :rows="4" v-model="f.template" />
    <small class="muted">You can use {name}, {receipt_id}, {amount}, {due_date} and {branch}.</small>
    <IonItem lines="none" style="--background: transparent"><IonToggle v-model="f.enabled">Rule is on</IonToggle></IonItem>
    <template #footer><IonButton :disabled="saving" @click="save">Save rule</IonButton></template>
  </ModalShell>
</template>
