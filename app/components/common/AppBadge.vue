<script setup>
defineProps({
  label: String,
  color: { type: String, default: 'gray' },
})
</script>

<template>
  <span
    class="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
    :class="{
      'bg-green-100 text-green-700': color === 'green',
      'bg-yellow-100 text-yellow-700': color === 'yellow',
      'bg-red-100 text-red-700': color === 'red',
      'bg-blue-100 text-blue-700': color === 'blue',
      'bg-gray-100 text-gray-700': color === 'gray',
    }"
  >
    {{ label }}
  </span>
</template>
