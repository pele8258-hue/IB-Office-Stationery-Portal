<script setup>
definePageMeta({ middleware: 'auth' })
const { vehicles, fetchVehicles } = useVehicles()
onMounted(fetchVehicles)
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Vehicles</h1>
  </div>
</template>
