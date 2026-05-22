<script setup>
definePageMeta({ middleware: 'auth' })
const route = useRoute()
const { booking, fetchBooking } = useBookings()
onMounted(() => fetchBooking(route.params.id))
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Booking Detail</h1>
  </div>
</template>
