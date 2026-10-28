<script setup lang="ts">
import { ref, watch } from 'vue'
const props = defineProps<{ modelValue: number; label?: string; placeholder?: string; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const show = (n: number) => (n ? String(n) : '')
const text = ref(show(props.modelValue))
watch(() => props.modelValue, v => { if (Number(text.value) !== v) text.value = show(v) })

function onInput(e: CustomEvent) {
  text.value = String(e.detail.value ?? '')
  emit('update:modelValue', Math.max(0, Number(text.value) || 0))
}
</script>

<template>
  <IonInput
    type="number" inputmode="decimal" min="0" fill="outline" label-placement="stacked"
    :label="label" :placeholder="placeholder ?? '0'" :disabled="disabled" :value="text" @ion-input="onInput"
  />
</template>
