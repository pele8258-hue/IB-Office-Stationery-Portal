<script setup>
definePageMeta({ middleware: 'auth' })
const { bookings, fetchBookings } = useBookings()
onMounted(fetchBookings)
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Vehicle Bookings</h1>
  </div>
</template>
