<script setup>
const selected = ref([])
</script>

<template>
  <div>
    <label class="text-sm font-medium text-gray-700">Passengers</label>
    <!-- Staff multi-select — populated from /api/staff -->
    <div class="mt-1 border rounded px-3 py-2 text-sm text-gray-400">
      Select passengers from staff list
    </div>
  </div>
</template>
