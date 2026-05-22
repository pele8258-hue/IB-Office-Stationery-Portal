export function useBookings() {
  const { $api } = useNuxtApp()
  const bookings = ref([])
  const booking = ref(null)
  const loading = ref(false)

  async function fetchBookings() {
    loading.value = true
    bookings.value = await $api('/api/bookings')
    loading.value = false
  }

  async function fetchBooking(id: string | string[]) {
    loading.value = true
    booking.value = await $api(`/api/bookings/${id}`)
    loading.value = false
  }

  return { bookings, booking, loading, fetchBookings, fetchBooking }
}
