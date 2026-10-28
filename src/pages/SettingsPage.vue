<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { addOutline, logOutOutline } from 'ionicons/icons'
import PageLayout from '@/components/PageLayout.vue'
import NumInput from '@/components/NumInput.vue'
import UserFormModal from '@/features/settings/UserFormModal.vue'
import RuleFormModal from '@/features/settings/RuleFormModal.vue'
import PermissionsModal from '@/features/settings/PermissionsModal.vue'
import BranchFormModal from '@/features/settings/BranchFormModal.vue'
import { useAuth } from '@/stores/auth'
import { useSettings } from '@/stores/settings'
import { useStaff } from '@/stores/staff'
import { clearAll, switchBranch } from '@/services/session'
import { errorText, openModal, toast } from '@/composables/useUi'
import type { Role, Settings } from '@/types'

const auth = useAuth(); const settings = useSettings(); const staff = useStaff(); const router = useRouter(); const route = useRoute()
const form = reactive<Settings>({ ...settings.s })
// keep the form in step with what the server last told us
watch(() => settings.s, s => Object.assign(form, s), { deep: true })
const saving = ref(false)

async function saveSettings() {
  if (form.currency.trim().length !== 3) return toast('Currency must be a 3-letter code such as NGN', 'danger')
  saving.value = true
  try { await settings.save({ ...form }); toast('Settings saved', 'success') }
  catch (e) { toast(errorText(e), 'danger') }
  finally { saving.value = false }
}

const cur = ref(''); const next = ref(''); const again = ref('')
async function changePw() {
  if (next.value.length < 8) return toast('The new password must be at least 8 characters', 'danger')
  if (next.value !== again.value) return toast('The two new passwords do not match', 'danger')
  try { await auth.changePassword(cur.value, next.value); cur.value = next.value = again.value = ''; toast('Password changed', 'success') }
  catch (e) { toast(errorText(e), 'danger') }
}
async function pickBranch(id: string) {
  if (id === auth.branchId) return
  const msg = await switchBranch(id, route.path)
  toast(msg ?? 'Switched branch', msg ? 'danger' : 'success')
}
async function logout() { await auth.logout(); clearAll(); router.replace('/login') }

const editableRoles: Role[] = ['manager', 'cashier', 'staff']
const ruleText = (r: { phase: string; offsetDays: number; intervalDays: number; sendTime: string }) =>
  `${r.offsetDays === 0 ? 'On the due date' : `${r.offsetDays} day${r.offsetDays === 1 ? '' : 's'} ${r.phase === 'before' ? 'before' : 'after'} due`}` +
  `${r.phase === 'after' && r.intervalDays ? `, then every ${r.intervalDays} days` : ''} at ${r.sendTime}`
</script>

<template>
  <PageLayout title="Settings">
    <h2 class="section">Branches</h2>
    <IonList class="sheet" lines="full">
      <IonItem v-for="b in auth.branches" :key="b.id" button @click="pickBranch(b.id)">
        <div class="row-main">
          <div><div class="row-title">{{ b.name }}</div><div class="row-sub">{{ [b.address, b.phone].filter(Boolean).join(' · ') || 'No address' }}</div></div>
          <IonBadge v-if="b.id === auth.branchId" color="primary">Current</IonBadge>
        </div>
      </IonItem>
      <IonItem v-if="!auth.branches.length" lines="none"><span class="muted">{{ settings.branch?.name || 'No branches loaded' }}</span></IonItem>
    </IonList>
    <IonButton fill="outline" @click="openModal(BranchFormModal)"><IonIcon slot="start" :icon="addOutline" />Add branch</IonButton>

    <h2 class="section">Credit, discounts and currency</h2>
    <div class="two field">
      <NumInput v-model="form.creditLimit" label="Credit limit per customer" />
      <NumInput v-model="form.repaymentDays" label="Days to repay a credit sale" />
    </div>
    <div class="two field">
      <IonSelect v-model="form.maxDiscountType" label="Maximum discount type" label-placement="stacked" fill="outline" interface="popover">
        <IonSelectOption value="percentage">Percent of the sale</IonSelectOption><IonSelectOption value="fixed">Fixed amount</IonSelectOption>
      </IonSelect>
      <NumInput v-model="form.maxDiscountValue" label="Maximum discount" />
    </div>
    <IonInput class="field" label="Currency code (e.g. NGN)" label-placement="stacked" fill="outline" maxlength="3" v-model="form.currency" />
    <IonButton :disabled="saving" @click="saveSettings">Save settings</IonButton>

    <h2 class="section">SMS reminder rules</h2>
    <p class="muted" style="margin-top: 0">The server texts customers who owe, following these rules. You can use {name}, {receipt_id}, {amount}, {due_date} and {branch}.</p>
    <IonList class="sheet" lines="full">
      <IonItem v-for="r in settings.rules" :key="r.id" button @click="openModal(RuleFormModal, { rule: r })">
        <div class="row-main">
          <div><div class="row-title">{{ r.name }}</div><div class="row-sub">{{ ruleText(r) }}</div></div>
          <IonBadge :color="r.enabled ? 'primary' : 'medium'">{{ r.enabled ? 'On' : 'Off' }}</IonBadge>
        </div>
      </IonItem>
      <IonItem v-if="!settings.rules.length" lines="none"><span class="muted">No reminder rules yet. Customers are not texted until you add one.</span></IonItem>
    </IonList>
    <IonButton fill="outline" @click="openModal(RuleFormModal)"><IonIcon slot="start" :icon="addOutline" />Add rule</IonButton>

    <h2 class="section">Users</h2>
    <IonList class="sheet" lines="full">
      <IonItem v-for="u in staff.users" :key="u.id" button @click="openModal(UserFormModal, { user: u })">
        <div class="row-main">
          <div><div class="row-title">{{ u.name }}</div><div class="row-sub">{{ u.email }}</div></div>
          <div><IonBadge v-for="r in u.roles" :key="r" color="medium" style="margin-left: 4px">{{ r }}</IonBadge>
            <IonBadge v-if="!u.isActive" color="danger" style="margin-left: 4px">inactive</IonBadge></div>
        </div>
      </IonItem>
    </IonList>
    <IonButton fill="outline" @click="openModal(UserFormModal)"><IonIcon slot="start" :icon="addOutline" />Add user</IonButton>

    <h2 class="section">Roles and permissions</h2>
    <IonList class="sheet" lines="full">
      <IonItem v-for="r in staff.roles.filter(x => editableRoles.includes(x.slug))" :key="r.id" button @click="openModal(PermissionsModal, { role: r })">
        <div class="row-main"><div class="row-title">{{ r.name }}</div><div class="row-sub">Choose what this role can do</div></div>
      </IonItem>
    </IonList>

    <h2 class="section">My account</h2>
    <IonInput class="field" type="password" label="Current password" label-placement="stacked" fill="outline" v-model="cur" />
    <div class="two field">
      <IonInput type="password" label="New password" label-placement="stacked" fill="outline" v-model="next" />
      <IonInput type="password" label="Repeat new password" label-placement="stacked" fill="outline" v-model="again" />
    </div>
    <IonButton fill="outline" @click="changePw">Change password</IonButton>
    <IonButton color="danger" fill="clear" @click="logout"><IonIcon slot="start" :icon="logOutOutline" />Log out</IonButton>
  </PageLayout>
</template>
