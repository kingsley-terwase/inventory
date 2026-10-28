<script setup lang="ts">
import { closeOutline } from 'ionicons/icons'
import { closeModal } from '@/composables/useUi'
defineProps<{ title: string }>()
</script>

<template>
  <IonHeader>
    <IonToolbar>
      <IonTitle>{{ title }}</IonTitle>
      <IonButtons slot="end">
        <IonButton aria-label="Close" @click="closeModal()"><IonIcon slot="icon-only" :icon="closeOutline" /></IonButton>
      </IonButtons>
    </IonToolbar>
  </IonHeader>
  <IonContent class="ion-padding"><slot /></IonContent>
  <IonFooter v-if="$slots.footer">
    <IonToolbar><div class="modal-footer"><slot name="footer" /></div></IonToolbar>
  </IonFooter>
</template>
