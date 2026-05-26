<script setup>
definePageMeta({ middleware: 'auth' })

const { $api } = useNuxtApp()

const logs       = ref([])
const loading    = ref(false)
const error      = ref('')
const search     = ref('')
const filterStatus = ref('')
const filterType   = ref('')
const perPage    = ref(20)
const pagination = reactive({ current_page: 1, total_page: 1, total_data: 0, per_page: 20 })

const PER_PAGE_OPTS = [10, 20, 50]

const TYPE_OPTS = [
  { value: '',         label: 'All Types' },
  { value: '2_MONTHS', label: '2 Months' },
  { value: '1_MONTH',  label: '1 Month' },
  { value: '1_WEEK',   label: '1 Week' },
  { value: 'EXPIRED',  label: 'Expired' },
]

const STATUS_OPTS = [
  { value: '',       label: 'All Status' },
  { value: 'SENT',   label: 'Sent' },
  { value: 'FAILED', label: 'Failed' },
]

const logsFrom = computed(() => pagination.total_data === 0 ? 0 : (pagination.current_page - 1) * perPage.value + 1)
const logsTo   = computed(() => Math.min(pagination.current_page * perPage.value, pagination.total_data))

async function fetchLogs(page = 1) {
  loading.value = true
  error.value   = ''
  try {
    const params = new URLSearchParams({ page, limit: perPage.value })
    if (search.value)       params.set('search',            search.value)
    if (filterStatus.value) params.set('status',            filterStatus.value)
    if (filterType.value)   params.set('notification_type', filterType.value)
    const res = await $api(`/api/notifications/email-logs?${params}`)
    logs.value = res.data || []
    Object.assign(pagination, res.pagination)
  } catch (e) {
    error.value = e?.data?.message || 'Failed to load email logs'
  } finally {
    loading.value = false
  }
}

watch(search,        () => fetchLogs(1))
watch(filterStatus,  () => fetchLogs(1))
watch(filterType,    () => fetchLogs(1))
watch(perPage,       () => fetchLogs(1))

onMounted(() => fetchLogs())

function formatDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(val) {
  if (!val) return '—'
  return new Date(val).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function typeBadge(type) {
  const map = {
    '2_MONTHS': { label: '2 Months', cls: 'bg-blue-100 text-blue-700' },
    '1_MONTH':  { label: '1 Month',  cls: 'bg-amber-100 text-amber-700' },
    '1_WEEK':   { label: '1 Week',   cls: 'bg-orange-100 text-orange-700' },
    'EXPIRED':  { label: 'Expired',  cls: 'bg-red-100 text-red-700' },
  }
  return map[type] || { label: type, cls: 'bg-gray-100 text-gray-600' }
}

function statusBadge(status) {
  return status === 'SENT'
    ? { label: 'Sent',   cls: 'bg-green-100 text-green-700' }
    : { label: 'Failed', cls: 'bg-red-100 text-red-700' }
}

// Detail modal
const viewLog = ref(null)
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="flex items-center justify-between mb-5">
      <div>
        <h1 class="text-xl font-bold text-gray-800">Email Notification Logs</h1>
        <p class="text-xs text-gray-400 mt-0.5">History of all document expiry email notifications</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-400">Total:</span>
        <span class="text-xs font-bold text-purple-700">{{ pagination.total_data }}</span>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
      <div class="flex flex-col sm:flex-row gap-3">
        <!-- Search -->
        <div class="relative flex-1">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <input
            v-model="search"
            type="text"
            placeholder="Search email, plate, document..."
            class="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
          />
        </div>
        <!-- Type filter -->
        <select
          v-model="filterType"
          class="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white text-gray-600"
        >
          <option v-for="o in TYPE_OPTS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <!-- Status filter -->
        <select
          v-model="filterStatus"
          class="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white text-gray-600"
        >
          <option v-for="o in STATUS_OPTS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <!-- Per page -->
        <select
          v-model="perPage"
          class="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white text-gray-600"
        >
          <option v-for="n in PER_PAGE_OPTS" :key="n" :value="n">{{ n }} / page</option>
        </select>
      </div>
    </div>

    <!-- Table Card -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="w-7 h-7 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
        <span class="ml-3 text-sm text-gray-400">Loading...</span>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="flex items-center gap-2 p-6 text-red-600 text-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>
        {{ error }}
      </div>

      <!-- Empty -->
      <div v-else-if="!logs.length" class="flex flex-col items-center justify-center py-16 text-gray-400">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" class="mb-3 opacity-30">
          <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
          <path d="M3 9l9 6 9-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <p class="text-sm">No email logs found</p>
      </div>

      <!-- Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50">
              <th class="text-left px-4 py-3 text-gray-500 font-semibold">#</th>
              <th class="text-left px-4 py-3 text-gray-500 font-semibold">Type</th>
              <th class="text-left px-4 py-3 text-gray-500 font-semibold">Document</th>
              <th class="text-left px-4 py-3 text-gray-500 font-semibold">Vehicle</th>
              <th class="text-left px-4 py-3 text-gray-500 font-semibold">Sent To</th>
              <th class="text-left px-4 py-3 text-gray-500 font-semibold">Status</th>
              <th class="text-left px-4 py-3 text-gray-500 font-semibold">Sent At</th>
              <th class="text-left px-4 py-3 text-gray-500 font-semibold"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr
              v-for="(log, i) in logs"
              :key="log.ID"
              class="hover:bg-gray-50 transition-colors"
            >
              <td class="px-4 py-3 text-gray-400">{{ logsFrom + i }}</td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  :class="typeBadge(log.NOTIFICATION_TYPE).cls"
                >
                  {{ typeBadge(log.NOTIFICATION_TYPE).label }}
                </span>
              </td>
              <td class="px-4 py-3">
                <p class="font-medium text-gray-700">{{ log.DOCUMENT_NAME }}</p>
                <p class="text-[10px] text-gray-400">Expires: {{ formatDate(log.EXPIRY_DATE) }}</p>
              </td>
              <td class="px-4 py-3">
                <p class="font-semibold text-gray-700">{{ log.PLATE_NUMBER }}</p>
                <p class="text-[10px] text-gray-400">{{ [log.BRAND, log.MODEL].filter(Boolean).join(' ') || '—' }}</p>
              </td>
              <td class="px-4 py-3">
                <p class="text-gray-700">{{ log.SENT_TO }}</p>
                <p class="text-[10px] text-gray-400">{{ log.OWNER_NAME || '—' }}</p>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  :class="statusBadge(log.STATUS).cls"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="log.STATUS === 'SENT' ? 'bg-green-500' : 'bg-red-500'"></span>
                  {{ statusBadge(log.STATUS).label }}
                </span>
              </td>
              <td class="px-4 py-3 text-gray-500 whitespace-nowrap">{{ formatDateTime(log.SENT_AT) }}</td>
              <td class="px-4 py-3">
                <button
                  v-if="log.ERROR_MESSAGE || log.STATUS === 'FAILED'"
                  class="text-[10px] text-purple-600 hover:text-purple-800 underline"
                  @click="viewLog = log"
                >
                  Details
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="!loading && logs.length" class="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
        <p class="text-xs text-gray-400">
          Showing {{ logsFrom }}–{{ logsTo }} of {{ pagination.total_data }}
        </p>
        <div class="flex items-center gap-1">
          <button
            :disabled="!pagination.has_previous_page"
            class="px-2 py-1 text-xs rounded border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-100 transition-colors"
            @click="fetchLogs(pagination.current_page - 1)"
          >
            Prev
          </button>
          <span class="px-3 py-1 text-xs font-semibold text-purple-700">
            {{ pagination.current_page }} / {{ pagination.total_page }}
          </span>
          <button
            :disabled="!pagination.has_next_page"
            class="px-2 py-1 text-xs rounded border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-100 transition-colors"
            @click="fetchLogs(pagination.current_page + 1)"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- Detail Modal (for failed emails) -->
    <Transition name="modal">
      <div v-if="viewLog" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.45);">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" @click.stop>
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-bold text-gray-800">Notification Details</h3>
            <button class="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors" @click="viewLog = null">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#374151" stroke-width="2.5" stroke-linecap="round"/></svg>
            </button>
          </div>

          <div class="space-y-3 text-xs">
            <div class="flex justify-between py-2 border-b border-gray-100">
              <span class="text-gray-500">Type</span>
              <span class="font-semibold" :class="typeBadge(viewLog.NOTIFICATION_TYPE).cls.replace('bg-', 'text-').split(' ')[1]">
                {{ typeBadge(viewLog.NOTIFICATION_TYPE).label }}
              </span>
            </div>
            <div class="flex justify-between py-2 border-b border-gray-100">
              <span class="text-gray-500">Document</span>
              <span class="font-semibold text-gray-700">{{ viewLog.DOCUMENT_NAME }}</span>
            </div>
            <div class="flex justify-between py-2 border-b border-gray-100">
              <span class="text-gray-500">Vehicle</span>
              <span class="font-semibold text-gray-700">{{ viewLog.PLATE_NUMBER }}</span>
            </div>
            <div class="flex justify-between py-2 border-b border-gray-100">
              <span class="text-gray-500">Sent To</span>
              <span class="text-gray-700">{{ viewLog.SENT_TO }}</span>
            </div>
            <div class="flex justify-between py-2 border-b border-gray-100">
              <span class="text-gray-500">Status</span>
              <span class="font-semibold" :class="viewLog.STATUS === 'SENT' ? 'text-green-600' : 'text-red-600'">
                {{ viewLog.STATUS }}
              </span>
            </div>
            <div class="flex justify-between py-2 border-b border-gray-100">
              <span class="text-gray-500">Sent At</span>
              <span class="text-gray-700">{{ formatDateTime(viewLog.SENT_AT) }}</span>
            </div>
            <div v-if="viewLog.ERROR_MESSAGE" class="py-2">
              <p class="text-gray-500 mb-1">Error Message</p>
              <p class="bg-red-50 text-red-700 rounded-lg p-3 text-[11px] leading-relaxed break-words">{{ viewLog.ERROR_MESSAGE }}</p>
            </div>
          </div>

          <button
            class="mt-4 w-full py-2 rounded-lg text-xs font-semibold text-white"
            style="background:#7C3AED;"
            @click="viewLog = null"
          >
            Close
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.modal-enter-active { transition: opacity 0.2s ease; }
.modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
