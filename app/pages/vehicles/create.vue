<script setup>
definePageMeta({ middleware: 'auth' })
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Add Vehicle</h1>
    <VehicleForm />
  </div>
</template>
