<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ModalShell from '@/components/ModalShell.vue'
import { useStaff, type RoleInfo } from '@/stores/staff'
import { closeModal, errorText, toast } from '@/composables/useUi'
import type { Permission } from '@/types'

const props = defineProps<{ role: RoleInfo }>()
const staff = useStaff()
const perms = ref<Permission[]>([])
let original: Permission[] = []
const loading = ref(true); const saving = ref(false)

onMounted(async () => {
  try { perms.value = await staff.permissionsOf(props.role.slug); original = perms.value.map(p => ({ ...p })) }
  catch (e) { toast(errorText(e), 'danger') }
  finally { loading.value = false }
})

// one row per resource, one switch per action
const groups = computed(() => {
  const map = new Map<string, Permission[]>()
  perms.value.forEach(p => map.set(p.resource, [...(map.get(p.resource) ?? []), p]))
  return [...map.entries()]
})
const label = (s: string) => s.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())

async function save() {
  saving.value = true
  try {
    const n = await staff.savePermissions(props.role.slug, perms.value, original)
    toast(n ? 'Permissions saved' : 'No changes to save', n ? 'success' : 'dark'); closeModal(true)
  }
  catch (e) { toast(errorText(e), 'danger') }
  finally { saving.value = false }
}
</script>

<template>
  <ModalShell :title="`${role.name} permissions`">
    <p v-if="loading" class="muted">Loading...</p>
    <template v-else>
      <p class="muted" style="margin-top: 0">These apply to everyone with this role in your business.</p>
      <div v-for="[resource, list] in groups" :key="resource" class="summary" style="margin: 0 0 10px">
        <strong>{{ label(resource) }}</strong>
        <IonItem v-for="p in list" :key="p.action" lines="none" style="--background: transparent; --min-height: 36px">
          <IonToggle v-model="p.allowed">{{ label(p.action) }}</IonToggle>
        </IonItem>
      </div>
    </template>
    <template #footer><IonButton :disabled="saving || loading" @click="save">Save permissions</IonButton></template>
  </ModalShell>
</template>
