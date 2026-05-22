<script setup>
defineProps({ booking: Object })
</script>

<template>
  <div class="bg-white border rounded-lg p-4 hover:shadow transition">
    <div class="flex justify-between items-start">
      <div>
        <p class="font-semibold">{{ booking.destination }}</p>
        <p class="text-sm text-gray-500">{{ booking.purpose }}</p>
        <p class="text-sm text-gray-500">Out: {{ booking.requested_time_out }}</p>
        <p class="text-sm text-gray-500">Return: {{ booking.requested_time_in }}</p>
      </div>
      <AppBadge
        :label="booking.status"
        :color="{
          PENDING: 'yellow', APPROVED: 'blue', IN_USE: 'blue',
          COMPLETED: 'green', REJECTED: 'red', CANCELLED: 'gray',
        }[booking.status]"
      />
    </div>
  </div>
</template>
