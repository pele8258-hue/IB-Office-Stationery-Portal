export function useStaff() {
  const { $api } = useNuxtApp()
  const staffList = ref([])
  const staff = ref(null)
  const loading = ref(false)

  async function fetchStaff() {
    loading.value = true
    staffList.value = await $api('/api/staff')
    loading.value = false
  }

  async function fetchOne(id: string | string[]) {
    loading.value = true
    staff.value = await $api(`/api/staff/${id}`)
    loading.value = false
  }

  return { staffList, staff, loading, fetchStaff, fetchOne }
}
