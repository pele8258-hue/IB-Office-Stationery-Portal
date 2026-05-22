export function useVehicles() {
  const { $api } = useNuxtApp()
  const vehicles = ref([])
  const vehicle = ref(null)
  const loading = ref(false)

  async function fetchVehicles() {
    loading.value = true
    vehicles.value = await $api('/api/vehicles')
    loading.value = false
  }

  async function fetchVehicle(id: string | string[]) {
    loading.value = true
    vehicle.value = await $api(`/api/vehicles/${id}`)
    loading.value = false
  }

  return { vehicles, vehicle, loading, fetchVehicles, fetchVehicle }
}
