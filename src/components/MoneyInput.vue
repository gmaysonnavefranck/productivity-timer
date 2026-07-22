<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({ modelValue: { type: Number, default: null } });
const emit = defineEmits(['update:modelValue']);

function toDigits(n) {
  if (n === null || n === undefined || isNaN(n)) return '';
  return Math.round(Math.abs(n) * 100).toString();
}

const rawDigits = ref(toDigits(props.modelValue));

watch(() => props.modelValue, (v) => {
  const next = toDigits(v);
  if (next !== rawDigits.value) rawDigits.value = next;
});

const display = computed(() => {
  if (!rawDigits.value) return '';
  const cents = Number(rawDigits.value);
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
});

function onInput(event) {
  rawDigits.value = event.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 15);
  emit('update:modelValue', rawDigits.value ? Number(rawDigits.value) / 100 : null);
}

const inputEl = ref(null);
defineExpose({ focus: () => inputEl.value?.focus() });
</script>

<template>
  <input ref="inputEl" type="text" inputmode="numeric" :value="display" placeholder="0,00" @input="onInput" />
</template>
