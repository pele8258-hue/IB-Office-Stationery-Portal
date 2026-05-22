<script setup>
definePageMeta({ middleware: 'auth' })
const route = useRoute()
const { vehicle, fetchVehicle } = useVehicles()
onMounted(() => fetchVehicle(route.params.id))
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Vehicle Detail</h1>
  </div>
</template>
