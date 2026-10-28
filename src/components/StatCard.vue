<script setup lang="ts">
defineProps<{ label: string; value: string | number; tone?: 'good' | 'warn' | 'bad' }>()
</script>

<template>
  <div class="stat" :class="tone">
    <div class="stat-label">{{ label }}</div>
    <div class="stat-value num">{{ value }}</div>
  </div>
</template>
