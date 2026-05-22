<script setup>
defineProps({ vehicle: Object })
</script>

<template>
  <div class="bg-white border rounded-lg p-4 hover:shadow transition">
    <div class="flex justify-between items-start">
      <div>
        <p class="font-bold text-lg">{{ vehicle.plate_number }}</p>
        <p class="text-sm text-gray-500">{{ vehicle.brand }} {{ vehicle.model }} {{ vehicle.year }}</p>
        <p class="text-sm text-gray-500">{{ vehicle.parking_lot }} — Floor {{ vehicle.parking_floor }}</p>
      </div>
      <AppBadge
        :label="vehicle.status"
        :color="vehicle.status === 'AVAILABLE' ? 'green' : vehicle.status === 'IN_USE' ? 'blue' : 'yellow'"
      />
    </div>
  </div>
</template>
