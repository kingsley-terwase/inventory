<script setup lang="ts">
import { busy } from '@/services/api'
defineProps<{ title: string; back?: string }>()
</script>

<template>
  <IonPage>
    <IonHeader class="ion-no-border">
      <IonToolbar>
        <IonButtons slot="start">
          <IonBackButton v-if="back" :default-href="back" />
          <IonMenuButton v-else />
        </IonButtons>
        <IonTitle>{{ title }}</IonTitle>
        <IonButtons slot="end"><slot name="actions" /></IonButtons>
      </IonToolbar>
      <IonProgressBar v-if="busy" type="indeterminate" />
      <slot name="toolbar" />
    </IonHeader>
    <IonContent>
      <div class="page"><slot /></div>
      <slot name="fab" />
    </IonContent>
  </IonPage>
</template>
