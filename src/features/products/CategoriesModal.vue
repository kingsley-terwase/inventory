<script setup lang="ts">
import { reactive, ref } from 'vue'
import ModalShell from '@/components/ModalShell.vue'
import { useAuth } from '@/stores/auth'
import { useInventory } from '@/stores/inventory'
import { errorText, toast } from '@/composables/useUi'

const inv = useInventory(); const auth = useAuth()
const canEdit = auth.canDo('categories', 'update'); const canAdd = auth.canDo('categories', 'create')
const editing = ref<string | null>(null)   // category id being edited, or null when adding
const f = reactive({ name: '', description: '' })
const saving = ref(false)

// Reads the category fresh from the server (GET /categories/{id}) so the description is current.
async function edit(id: string) {
  editing.value = id
  try { const c = await inv.fetchCategory(id); f.name = c.name; f.description = c.description }
  catch (e) { toast(errorText(e), 'danger') }
}
function reset() { editing.value = null; f.name = ''; f.description = '' }

async function save() {
  if (!f.name.trim()) return toast('Enter a category name', 'danger')
  saving.value = true
  try {
    if (editing.value) await inv.updateCategory(editing.value, { name: f.name.trim(), description: f.description.trim() })
    else await inv.createCategory(f.name, f.description)
    toast('Category saved', 'success'); reset()
  } catch (e) { toast(errorText(e), 'danger') }
  finally { saving.value = false }
}
</script>

<template>
  <ModalShell title="Categories">
    <IonList class="sheet" lines="full">
      <IonItem v-for="c in inv.categoryList" :key="c.id" :button="canEdit" :class="{ active: editing === c.id }" @click="canEdit && edit(c.id)">
        <div class="row-main"><div><div class="row-title">{{ c.name }}</div><div class="row-sub">{{ c.description || 'No description' }}</div></div></div>
      </IonItem>
      <IonItem v-if="!inv.categoryList.length" lines="none"><span class="muted">No categories yet.</span></IonItem>
    </IonList>

    <template v-if="editing ? canEdit : canAdd">
    <h2 class="section">{{ editing ? 'Edit category' : 'New category' }}</h2>
    <IonInput class="field" label="Name" label-placement="stacked" fill="outline" v-model="f.name" />
    <IonInput class="field" label="Description (optional)" label-placement="stacked" fill="outline" v-model="f.description" />
    </template>
    <template #footer>
      <IonButton v-if="editing" fill="outline" @click="reset">Cancel edit</IonButton>
      <IonButton v-if="editing ? canEdit : canAdd" :disabled="saving" @click="save">{{ editing ? 'Save category' : 'Add category' }}</IonButton>
    </template>
  </ModalShell>
</template>
