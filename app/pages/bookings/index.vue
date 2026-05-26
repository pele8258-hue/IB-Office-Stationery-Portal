<script setup>
definePageMeta({ middleware: 'auth' })
import bgVientiane from '~/assets/images/backgrounds/vientiane_capital_pastel_dream_20260430_085013 1.png'

const { $api }  = useNuxtApp()
const route     = useRoute()
const authStore = useAuthStore()

const isAdmin = computed(() => ['ADMIN', 'SUPER_ADMIN', 'CHECKER'].includes(authStore.user?.role_code))

const bookings     = ref([])
const loading      = ref(false)
const error        = ref('')
const search       = ref('')
const filterStatus = ref('')
const perPage      = ref(20)
const pagination   = reactive({ current_page: 1, total_page: 1, total_data: 0, per_page: 20 })

const PER_PAGE_OPTS = [10, 20, 50]

const STATUS_OPTS = [
  { value: '',           label: 'All Status' },
  { value: 'PENDING',    label: 'Pending' },
  { value: 'APPROVED',   label: 'Approved' },
  { value: 'REJECTED',   label: 'Rejected' },
  { value: 'IN_USE',     label: 'In Use' },
  { value: 'COMPLETED',  label: 'Completed' },
  { value: 'CANCELLED',  label: 'Cancelled' },
]

const from = computed(() => pagination.total_data === 0 ? 0 : (pagination.current_page - 1) * perPage.value + 1)
const to   = computed(() => Math.min(pagination.current_page * perPage.value, pagination.total_data))

async function fetchBookings(page = 1) {
  loading.value = true
  error.value   = ''
  try {
    const params = new URLSearchParams({ page, limit: perPage.value, own: '1' })
    if (search.value)       params.set('search', search.value)
    if (filterStatus.value) params.set('status', filterStatus.value)
    const res = await $api(`/api/bookings?${params}`)
    bookings.value = res.data || []
    Object.assign(pagination, res.pagination)
  } catch (e) {
    error.value = e?.data?.message || 'Failed to load bookings'
  } finally {
    loading.value = false
  }
}

watch(search,       () => fetchBookings(1))
watch(filterStatus, () => fetchBookings(1))
watch(perPage,      () => fetchBookings(1))

const createdNotice = ref(route.query.created || '')
if (createdNotice.value) setTimeout(() => createdNotice.value = '', 5000)

onMounted(fetchBookings)

function formatDateTime(val) {
  if (!val) return '—'
  return new Date(val).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function statusStyle(s) {
  const map = {
    PENDING:   { cls: 'bg-yellow-100 text-yellow-700', dot: '#EAB308' },
    APPROVED:  { cls: 'bg-blue-100 text-blue-700',    dot: '#3B82F6' },
    REJECTED:  { cls: 'bg-red-100 text-red-600',      dot: '#EF4444' },
    IN_USE:    { cls: 'bg-green-100 text-green-700',  dot: '#10B981' },
    COMPLETED: { cls: 'bg-gray-100 text-gray-600',    dot: '#9CA3AF' },
    CANCELLED: { cls: 'bg-orange-100 text-orange-600',dot: '#F97316' },
  }
  return map[s] || { cls: 'bg-gray-100 text-gray-500', dot: '#D1D5DB' }
}
</script>

<template>
  <div class="-m-4 md:-m-6 relative min-h-screen">
    <div
      class="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none"
      :style="{ backgroundImage: `url('${bgVientiane}')` }"
    ></div>
    <div class="relative p-4 md:p-6">
    <!-- Created toast -->
    <Teleport to="body">
      <Transition name="toast">
        <div
          v-if="createdNotice"
          class="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium text-white"
          style="background:#10b981;"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Request {{ createdNotice }} submitted successfully
        </div>
      </Transition>
    </Teleport>

    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div>
        <h1 class="text-xl font-bold text-gray-800">My Requests</h1>
        <p class="text-xs text-gray-400 mt-0.5">Your vehicle booking requests</p>
      </div>
      <NuxtLink
        to="/bookings/create"
        class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-md hover:opacity-90 transition-all"
        style="background:linear-gradient(135deg,#10B981,#059669);"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <line x1="12" y1="5" x2="12" y2="19" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="5" y1="12" x2="19" y2="12" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
        New Request
      </NuxtLink>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <input
            v-model="search"
            type="text"
            placeholder="Search request no, destination..."
            class="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
          />
        </div>
        <select
          v-model="filterStatus"
          class="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-300 bg-white text-gray-600"
        >
          <option v-for="o in STATUS_OPTS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <select
          v-model="perPage"
          class="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-300 bg-white text-gray-600"
        >
          <option v-for="n in PER_PAGE_OPTS" :key="n" :value="n">{{ n }} / page</option>
        </select>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="w-7 h-7 border-2 border-green-300 border-t-green-600 rounded-full animate-spin"></div>
        <span class="ml-3 text-sm text-gray-400">Loading...</span>
      </div>
      <div v-else-if="error" class="p-6 text-sm text-red-500">{{ error }}</div>
      <div v-else-if="!bookings.length" class="flex flex-col items-center justify-center py-16 text-gray-400">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" class="mb-3 opacity-30">
          <rect x="1" y="9" width="22" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/>
          <circle cx="6.5" cy="19" r="2" stroke="currentColor" stroke-width="1.5"/>
          <circle cx="17.5" cy="19" r="2" stroke="currentColor" stroke-width="1.5"/>
          <path d="M5 9V7a2 2 0 012-2h10a2 2 0 012 2v2" stroke="currentColor" stroke-width="1.5"/>
        </svg>
        <p class="text-sm">No requests found</p>
        <NuxtLink to="/bookings/create" class="mt-3 text-xs text-green-600 hover:underline">
          Create first request
        </NuxtLink>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-xs" style="min-width:640px;">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50">
              <th class="text-left px-4 py-3 text-gray-500 font-semibold">Request No</th>
              <th class="text-left px-4 py-3 text-gray-500 font-semibold">Vehicle</th>
              <th class="text-left px-4 py-3 text-gray-500 font-semibold">Destination</th>
              <th class="text-left px-4 py-3 text-gray-500 font-semibold">Departure</th>
              <th class="text-left px-4 py-3 text-gray-500 font-semibold">Return</th>
              <th class="text-left px-4 py-3 text-gray-500 font-semibold">Status</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="b in bookings" :key="b.ID" class="hover:bg-gray-50 transition-colors">
              <td class="px-4 py-3">
                <span class="font-mono text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                  {{ b.REQUEST_NO }}
                </span>
              </td>
              <td class="px-4 py-3">
                <template v-if="b.PLATE_NUMBER">
                  <p class="font-semibold text-gray-700">{{ b.PLATE_NUMBER }}</p>
                  <p class="text-[10px] text-gray-400">{{ [b.BRAND, b.MODEL].filter(Boolean).join(' ') }}</p>
                </template>
                <span v-else class="text-[10px] text-amber-500 font-medium">Pending assignment</span>
              </td>
              <td class="px-4 py-3 text-gray-700 max-w-[140px] truncate">{{ b.DESTINATION }}</td>
              <td class="px-4 py-3 text-gray-500 whitespace-nowrap">{{ formatDateTime(b.REQUESTED_TIME_OUT) }}</td>
              <td class="px-4 py-3 text-gray-500 whitespace-nowrap">{{ formatDateTime(b.REQUESTED_TIME_IN) }}</td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  :class="statusStyle(b.STATUS).cls"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :style="`background:${statusStyle(b.STATUS).dot}`"></span>
                  {{ b.STATUS }}
                </span>
              </td>
              <td class="px-4 py-3">
                <NuxtLink :to="`/bookings/${b.ID}`" class="text-[10px] text-gray-400 hover:text-gray-600 font-medium">
                  View
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="!loading && bookings.length" class="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
        <p class="text-xs text-gray-400">Showing {{ from }}–{{ to }} of {{ pagination.total_data }}</p>
        <div class="flex items-center gap-1">
          <button
            :disabled="!pagination.has_previous_page"
            class="px-2 py-1 text-xs rounded border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-100 transition-colors"
            @click="fetchBookings(pagination.current_page - 1)"
          >Prev</button>
          <span class="px-3 py-1 text-xs font-semibold text-green-700">{{ pagination.current_page }} / {{ pagination.total_page }}</span>
          <button
            :disabled="!pagination.has_next_page"
            class="px-2 py-1 text-xs rounded border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-100 transition-colors"
            @click="fetchBookings(pagination.current_page + 1)"
          >Next</button>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<style scoped>
.toast-enter-active { transition: all 0.25s ease; }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from   { opacity: 0; transform: translateY(12px); }
.toast-leave-to     { opacity: 0; transform: translateY(6px); }
</style>
