<script setup lang="ts">
import { computed, ref } from 'vue'
import ModalShell from '@/components/ModalShell.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useInventory } from '@/stores/inventory'
import { useSettings } from '@/stores/settings'
import { closeModal } from '@/composables/useUi'

const props = defineProps<{ mode: 'sale' | 'purchase' }>()
const inv = useInventory(); const { money } = useSettings()
const q = ref('')
const list = computed(() => inv.products.filter(p =>
  (p.name + p.sku + p.category).toLowerCase().includes(q.value.toLowerCase()) && (props.mode === 'purchase' || (p.stocked && p.stock > 0))))
</script>

<template>
  <ModalShell title="Choose product">
    <IonSearchbar v-model="q" placeholder="Search products" />
    <EmptyState v-if="!list.length" :text="mode === 'sale' ? 'No products in stock match your search.' : 'No products match. Add the product on the Products page first.'" />
    <IonList v-else class="sheet" lines="full">
      <IonItem v-for="p in list" :key="p.id" button @click="closeModal(p)">
        <div class="row-main">
          <div><div class="row-title">{{ p.name }}</div><div class="row-sub">{{ p.category }} · {{ p.stocked ? p.stock + ' in stock' : 'Not stocked here yet' }}</div></div>
          <div class="row-amount num">{{ money(mode === 'sale' ? p.sellPrice : p.costPrice) }}</div>
        </div>
      </IonItem>
    </IonList>
  </ModalShell>
</template>
