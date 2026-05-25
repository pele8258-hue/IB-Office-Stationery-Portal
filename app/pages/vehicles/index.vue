<script setup>
definePageMeta({ middleware: 'auth' })

const { $api } = useNuxtApp()
const authStore = useAuthStore()

const activeTab = ref('list')

// ── Constants ────────────────────────────────────────────────────────────────
const VEHICLE_TYPES    = ['SEDAN', 'VAN', 'TRUCK', 'SUV', 'PICKUP', 'OTHER']
const OWNERSHIP_TYPES  = ['OWN', 'LEASE']
const PER_PAGE_OPTS    = [10, 20, 30]

// ── Vehicle List ─────────────────────────────────────────────────────────────
const vehicleList   = ref([])
const listLoading   = ref(false)
const listError     = ref('')
const search        = ref('')
const filterStatus  = ref('')
const filterType    = ref('')
const perPage       = ref(10)
const pagination    = reactive({ current_page: 1, total_page: 1, total_data: 0, per_page: 10 })

const vehicleFrom = computed(() => pagination.total_data === 0 ? 0 : (pagination.current_page - 1) * perPage.value + 1)
const vehicleTo   = computed(() => Math.min(pagination.current_page * perPage.value, pagination.total_data))

async function fetchVehicles(page = 1) {
  listLoading.value = true
  listError.value   = ''
  try {
    const params = new URLSearchParams({ page, limit: perPage.value })
    if (search.value)       params.set('search', search.value)
    if (filterStatus.value) params.set('status', filterStatus.value)
    if (filterType.value)   params.set('type',   filterType.value)
    const res = await $api(`/api/vehicles?${params}`)
    vehicleList.value = res.data || []
    Object.assign(pagination, res.pagination)
  } catch (e) {
    listError.value = e?.data?.message || 'Failed to load vehicles'
  } finally {
    listLoading.value = false
  }
}

watch([search, filterStatus, filterType], () => fetchVehicles(1))
watch(perPage, () => fetchVehicles(1))

function statusColor(s) {
  if (s === 'AVAILABLE')     return 'bg-green-100 text-green-700'
  if (s === 'IN_USE')        return 'bg-blue-100 text-blue-700'
  if (s === 'MAINTENANCE')   return 'bg-yellow-100 text-yellow-700'
  if (s === 'LEASE_EXPIRED') return 'bg-red-100 text-red-600'
  return 'bg-gray-100 text-gray-500'
}

function statusLabel(s) {
  return { AVAILABLE: 'Available', IN_USE: 'In Use', MAINTENANCE: 'Maintenance', LEASE_EXPIRED: 'Lease Expired' }[s] || s
}

function verifyColor(s) {
  if (s === 'APPROVED') return 'bg-green-100 text-green-700'
  if (s === 'REJECTED') return 'bg-red-100 text-red-600'
  return 'bg-yellow-100 text-yellow-700'
}

// ── Branches dropdown ─────────────────────────────────────────────────────────
const branches = ref([])
async function loadBranches() {
  const res = await $api('/api/branches')
  branches.value = res.data || []
}

// ── Add Vehicle Form ──────────────────────────────────────────────────────────
const form = reactive({
  plate_number: '', brand: '', model: '', color: '', year: '',
  type: '', ownership_type: 'OWN',
  engine_number: '', frame_number: '',
  parking_lot: '', parking_floor: '',
  owner_name: '', owner_email: '', owner_phone: '', owner_dob: '',
  branch_id: '',
})
const formErrors  = ref({})
const submitting  = ref(false)
const successData = ref(null)

// ── Document rows ─────────────────────────────────────────────────────────────
const docRows = ref([{ document_name: '', issued_date: '', expiry_date: '', file: null }])

function addDoc() {
  docRows.value.push({ document_name: '', issued_date: '', expiry_date: '', file: null })
}
function removeDoc(idx) {
  if (docRows.value.length === 1) {
    docRows.value[0] = { document_name: '', issued_date: '', expiry_date: '', file: null }
  } else {
    docRows.value.splice(idx, 1)
  }
}
function onFileChange(idx, e) {
  docRows.value[idx].file = e.target.files?.[0] || null
}

function resetForm() {
  Object.assign(form, {
    plate_number: '', brand: '', model: '', color: '', year: '',
    type: '', ownership_type: 'OWN',
    engine_number: '', frame_number: '',
    parking_lot: '', parking_floor: '',
    owner_name: '', owner_email: '', owner_phone: '', owner_dob: '',
    branch_id: '',
  })
  docRows.value  = [{ document_name: '', issued_date: '', expiry_date: '', file: null }]
  formErrors.value  = {}
  successData.value = null
}

async function submitForm() {
  formErrors.value = {}
  submitting.value = true
  try {
    const res = await $api('/api/vehicles', { method: 'POST', body: { ...form } })
    const vehicleId = res.data?.id

    // Upload each document row that has at least a name or file
    if (vehicleId) {
      for (const doc of docRows.value) {
        if (!doc.document_name.trim() && !doc.file) continue
        const fd = new FormData()
        fd.append('document_name', doc.document_name.trim() || 'Untitled')
        if (doc.issued_date) fd.append('issued_date', doc.issued_date)
        if (doc.expiry_date) fd.append('expiry_date', doc.expiry_date)
        if (doc.file)        fd.append('file', doc.file)
        await $api(`/api/vehicles/${vehicleId}/documents`, { method: 'POST', body: fd })
      }
    }

    successData.value = res.data
    resetForm()
    fetchVehicles()
  } catch (e) {
    if (e?.data?.errors) formErrors.value = e.data.errors
    else formErrors.value = { _global: [e?.data?.message || 'Something went wrong. Please try again.'] }
  } finally {
    submitting.value = false
  }
}

// ── Bulk Upload ───────────────────────────────────────────────────────────────
const bulkFile       = ref(null)
const bulkUploading  = ref(false)
const bulkResult     = ref(null)
const bulkError      = ref('')

function onBulkFileChange(e) {
  bulkFile.value   = e.target.files?.[0] || null
  bulkResult.value = null
  bulkError.value  = ''
}

async function downloadTemplate() {
  try {
    const token = authStore.token
    const blob  = await $fetch('/api/vehicles/template', {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob',
    })
    const url = URL.createObjectURL(blob)
    const a   = document.createElement('a')
    a.href     = url
    a.download = 'vehicle_import_template.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    bulkError.value = 'Failed to download template'
  }
}

async function submitBulk() {
  if (!bulkFile.value) { bulkError.value = 'Please select an Excel file'; return }
  bulkUploading.value = true
  bulkResult.value    = null
  bulkError.value     = ''
  try {
    const fd = new FormData()
    fd.append('file', bulkFile.value)
    const res = await $api('/api/vehicles/bulk', { method: 'POST', body: fd })
    bulkResult.value = res.data
    if (res.data?.inserted > 0) fetchVehicles()
  } catch (e) {
    bulkError.value = e?.data?.message || 'Upload failed. Please check the file format.'
  } finally {
    bulkUploading.value = false
  }
}

function resetBulk() {
  bulkFile.value    = null
  bulkResult.value  = null
  bulkError.value   = ''
}

// ── Init ──────────────────────────────────────────────────────────────────────
onMounted(() => {
  fetchVehicles()
  loadBranches()
})
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="mb-6">
      <h1 class="text-xl font-bold text-gray-800">Vehicle Management</h1>
      <p class="text-sm text-gray-400 mt-0.5">Manage fleet vehicles and registration</p>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mb-6 bg-white rounded-xl p-1 shadow-sm w-fit">
      <button
        class="px-5 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === 'list' ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'"
        :style="activeTab === 'list' ? 'background:linear-gradient(135deg,#7C3AED,#6D28D9);' : ''"
        @click="activeTab = 'list'"
      >
        <span class="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="1" y="9" width="22" height="10" rx="2" :fill="activeTab==='list'?'#fff':'#9CA3AF'"/>
            <circle cx="6.5" cy="19" r="2" :fill="activeTab==='list'?'#E9D5FF':'#D1D5DB'"/>
            <circle cx="17.5" cy="19" r="2" :fill="activeTab==='list'?'#E9D5FF':'#D1D5DB'"/>
          </svg>
          Vehicle List
        </span>
      </button>
      <button
        class="px-5 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === 'add' ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'"
        :style="activeTab === 'add' ? 'background:linear-gradient(135deg,#7C3AED,#6D28D9);' : ''"
        @click="activeTab = 'add'"
      >
        <span class="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="1" y="9" width="22" height="10" rx="2" :stroke="activeTab==='add'?'#fff':'#9CA3AF'" stroke-width="1.8" fill="none"/>
            <path d="M12 5v14M5 12h14" :stroke="activeTab==='add'?'#fff':'#9CA3AF'" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Add Vehicle
        </span>
      </button>
      <button
        class="px-5 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === 'bulk' ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'"
        :style="activeTab === 'bulk' ? 'background:linear-gradient(135deg,#059669,#047857);' : ''"
        @click="activeTab = 'bulk'"
      >
        <span class="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" :stroke="activeTab==='bulk'?'#fff':'#9CA3AF'" stroke-width="1.8" stroke-linejoin="round" fill="none"/>
            <polyline points="14 2 14 8 20 8" :stroke="activeTab==='bulk'?'#fff':'#9CA3AF'" stroke-width="1.8" stroke-linejoin="round"/>
            <line x1="12" y1="18" x2="12" y2="12" :stroke="activeTab==='bulk'?'#fff':'#9CA3AF'" stroke-width="1.8" stroke-linecap="round"/>
            <polyline points="9 15 12 18 15 15" :stroke="activeTab==='bulk'?'#fff':'#9CA3AF'" stroke-width="1.8" stroke-linejoin="round"/>
          </svg>
          Bulk Upload
        </span>
      </button>
    </div>

    <Transition name="tab-fade" mode="out-in">

    <!-- ===== VEHICLE LIST ===== -->
    <div v-if="activeTab === 'list'" key="list">
      <!-- Toolbar -->
      <div class="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
        <div class="relative flex-1 min-w-[180px]">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <input
            v-model="search"
            type="text"
            placeholder="Search plate, brand, model..."
            class="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
          />
        </div>
        <select
          v-model="filterStatus"
          class="text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:border-purple-400 text-gray-600"
        >
          <option value="">All Status</option>
          <option value="AVAILABLE">Available</option>
          <option value="IN_USE">In Use</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="LEASE_EXPIRED">Lease Expired</option>
        </select>
        <select
          v-model="filterType"
          class="text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:border-purple-400 text-gray-600"
        >
          <option value="">All Types</option>
          <option v-for="t in VEHICLE_TYPES" :key="t" :value="t">{{ t }}</option>
        </select>
        <button
          class="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all ml-auto flex-shrink-0"
          style="background:linear-gradient(135deg,#7C3AED,#6D28D9);"
          @click="activeTab = 'add'"
        >+ Add Vehicle</button>
      </div>

      <p v-if="listError" class="text-sm text-red-500 mb-3">{{ listError }}</p>

      <!-- Table -->
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm" style="min-width:700px;">
            <thead>
              <tr style="background:linear-gradient(135deg,#7C3AED,#6D28D9);">
                <th class="text-left px-4 py-3 text-xs font-semibold text-white">#</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-white">Plate</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-white">Brand / Model</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-white hidden md:table-cell">Type</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-white hidden lg:table-cell">Branch</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-white hidden lg:table-cell">Ownership</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-white">Status</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-white">Verify</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-white hidden md:table-cell">Docs</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="listLoading">
                <td colspan="10" class="text-center py-12 text-gray-400 text-sm">
                  <div class="flex flex-col items-center gap-2">
                    <svg class="animate-spin w-6 h-6" style="color:#7C3AED;" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="32" stroke-dashoffset="12"/>
                    </svg>
                    Loading...
                  </div>
                </td>
              </tr>
              <tr v-else-if="!vehicleList.length">
                <td colspan="10" class="text-center py-12 text-gray-400 text-sm">No vehicles found</td>
              </tr>
              <tr
                v-for="(v, idx) in vehicleList"
                v-else
                :key="v.ID"
                class="border-t border-gray-50 hover:bg-purple-50 transition-colors"
              >
                <td class="px-4 py-3 text-gray-400 text-xs">{{ vehicleFrom + idx }}</td>
                <td class="px-4 py-3">
                  <span class="font-mono font-semibold text-purple-700 text-xs bg-purple-50 px-2 py-0.5 rounded">{{ v.PLATE_NUMBER }}</span>
                </td>
                <td class="px-4 py-3">
                  <p class="font-medium text-gray-700">{{ v.BRAND || '—' }} {{ v.MODEL || '' }}</p>
                  <p class="text-xs text-gray-400">{{ v.COLOR || '' }} {{ v.YEAR ? '· ' + v.YEAR : '' }}</p>
                </td>
                <td class="px-4 py-3 text-gray-500 hidden md:table-cell">{{ v.TYPE || '—' }}</td>
                <td class="px-4 py-3 text-gray-500 hidden lg:table-cell">{{ v.BRANCH_CODE || '—' }}</td>
                <td class="px-4 py-3 hidden lg:table-cell">
                  <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                    :class="v.OWNERSHIP_TYPE === 'LEASE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'">
                    {{ v.OWNERSHIP_TYPE || 'OWN' }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span class="text-xs px-2 py-0.5 rounded-full font-medium" :class="statusColor(v.STATUS)">
                    {{ statusLabel(v.STATUS) }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span class="text-xs px-2 py-0.5 rounded-full font-medium" :class="verifyColor(v.VERIFY_STATUS)">
                    {{ v.VERIFY_STATUS || 'PENDING' }}
                  </span>
                </td>
                <td class="px-4 py-3 hidden md:table-cell">
                  <span
                    class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                    :class="v.DOC_COUNT > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" :stroke="v.DOC_COUNT > 0 ? '#3B82F6' : '#9CA3AF'" stroke-width="2" stroke-linejoin="round"/>
                      <polyline points="14 2 14 8 20 8" :stroke="v.DOC_COUNT > 0 ? '#3B82F6' : '#9CA3AF'" stroke-width="2" stroke-linejoin="round"/>
                    </svg>
                    {{ v.DOC_COUNT > 0 ? v.DOC_COUNT + ' file' + (v.DOC_COUNT > 1 ? 's' : '') : 'None' }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <NuxtLink
                    :to="`/vehicles/${v.ID}`"
                    class="text-xs text-purple-500 hover:text-purple-700 font-medium transition-colors"
                  >View</NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
          <div class="flex items-center gap-2 text-xs text-gray-500">
            <span>Show</span>
            <select
              v-model="perPage"
              class="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option v-for="n in PER_PAGE_OPTS" :key="n" :value="n">{{ n }}</option>
            </select>
            <span>entries</span>
            <span class="ml-2 text-gray-400">Showing {{ vehicleFrom }}–{{ vehicleTo }} of {{ pagination.total_data }}</span>
          </div>
          <div class="flex items-center gap-1">
            <button
              :disabled="!pagination.has_previous_page"
              class="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              @click="fetchVehicles(pagination.current_page - 1)"
            >Prev</button>
            <template v-for="p in pagination.total_page" :key="p">
              <button
                v-if="pagination.total_page <= 7 || Math.abs(p - pagination.current_page) <= 1 || p === 1 || p === pagination.total_page"
                class="w-7 h-7 text-xs rounded-lg border transition-colors"
                :class="p === pagination.current_page ? 'text-white font-medium border-transparent' : 'border-gray-200 text-gray-500 hover:bg-gray-50'"
                :style="p === pagination.current_page ? 'background:#7C3AED;' : ''"
                @click="fetchVehicles(p)"
              >{{ p }}</button>
              <span v-else-if="p === pagination.current_page - 2 || p === pagination.current_page + 2" class="text-gray-400 text-xs px-0.5">…</span>
            </template>
            <button
              :disabled="!pagination.has_next_page"
              class="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              @click="fetchVehicles(pagination.current_page + 1)"
            >Next</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== ADD VEHICLE ===== -->
    <div v-else-if="activeTab === 'add'" key="add">

      <!-- Success -->
      <div v-if="successData" class="bg-white rounded-xl shadow-sm p-6 mb-6 border-l-4" style="border-color:#10B981;">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style="background:#D1FAE5;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="flex-1">
            <p class="font-semibold text-gray-800">Vehicle registered!</p>
            <p class="text-sm text-gray-500 mt-0.5">
              Plate <strong>{{ successData.plate_number }}</strong> has been added. Verify status is <strong>PENDING</strong>.
            </p>
            <div class="flex gap-2 mt-4">
              <button
                class="px-4 py-2 text-sm font-medium rounded-lg text-white"
                style="background:linear-gradient(135deg,#7C3AED,#6D28D9);"
                @click="successData = null"
              >Add Another</button>
              <button
                class="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                @click="activeTab = 'list'; successData = null"
              >View List</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Form -->
      <div v-else class="bg-white rounded-xl shadow-sm p-6">
        <h2 class="text-base font-semibold text-gray-700 mb-5">Register New Vehicle</h2>

        <div v-if="formErrors._global" class="flex items-start gap-2.5 mb-4 px-4 py-3 rounded-xl border border-red-200 bg-red-50">
          <svg class="flex-shrink-0 mt-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#EF4444" stroke-width="2"/>
            <line x1="12" y1="8" x2="12" y2="12" stroke="#EF4444" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="16" r="1" fill="#EF4444"/>
          </svg>
          <p class="text-sm text-red-600">{{ formErrors._global[0] }}</p>
        </div>

        <form class="space-y-6" @submit.prevent="submitForm">

          <!-- Section: Vehicle Info -->
          <div>
            <p class="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-3">Vehicle Information</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-semibold mb-1.5" style="color:#6D28D9;">Plate Number <span class="text-red-400">*</span></label>
                <input v-model="form.plate_number" type="text" placeholder="e.g. ກຂ 1234"
                  class="w-full px-3 py-2.5 text-sm rounded-lg border text-gray-700 placeholder-gray-300 focus:outline-none transition-all uppercase"
                  :class="formErrors.plate_number ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'"
                  @input="form.plate_number = form.plate_number.toUpperCase()"
                />
                <p v-if="formErrors.plate_number" class="text-xs text-red-400 mt-1">{{ formErrors.plate_number[0] }}</p>
              </div>
              <div>
                <label class="block text-xs font-semibold mb-1.5 text-gray-500">Brand</label>
                <input v-model="form.brand" type="text" placeholder="e.g. Toyota"
                  class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-700 placeholder-gray-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold mb-1.5 text-gray-500">Model</label>
                <input v-model="form.model" type="text" placeholder="e.g. Hilux"
                  class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-700 placeholder-gray-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold mb-1.5 text-gray-500">Color</label>
                <input v-model="form.color" type="text" placeholder="e.g. White"
                  class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-700 placeholder-gray-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold mb-1.5 text-gray-500">Year</label>
                <input v-model="form.year" type="number" placeholder="e.g. 2022" min="1990" max="2099"
                  class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-700 placeholder-gray-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold mb-1.5 text-gray-500">Type</label>
                <select v-model="form.type"
                  class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all">
                  <option value="">Select type</option>
                  <option v-for="t in VEHICLE_TYPES" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
            </div>
          </div>

          <hr class="border-gray-100" />

          <!-- Section: Registration Numbers -->
          <div>
            <p class="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-3">Registration Numbers</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold mb-1.5 text-gray-500">Engine Number</label>
                <input v-model="form.engine_number" type="text" placeholder="Engine No."
                  class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-700 placeholder-gray-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold mb-1.5 text-gray-500">Frame Number</label>
                <input v-model="form.frame_number" type="text" placeholder="Chassis / Frame No."
                  class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-700 placeholder-gray-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                />
              </div>
            </div>
          </div>

          <hr class="border-gray-100" />

          <!-- Section: Ownership & Parking -->
          <div>
            <p class="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-3">Ownership & Parking</p>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label class="block text-xs font-semibold mb-1.5" style="color:#6D28D9;">Ownership <span class="text-red-400">*</span></label>
                <select v-model="form.ownership_type"
                  class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all">
                  <option v-for="o in OWNERSHIP_TYPES" :key="o" :value="o">{{ o }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold mb-1.5" style="color:#6D28D9;">Branch <span class="text-red-400">*</span></label>
                <select v-model="form.branch_id"
                  class="w-full px-3 py-2.5 text-sm rounded-lg border text-gray-700 focus:outline-none transition-all"
                  :class="formErrors.branch_id ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'">
                  <option value="">Select branch</option>
                  <option v-for="b in branches" :key="b.ID" :value="b.ID">{{ b.CODE }} — {{ b.NAME }}</option>
                </select>
                <p v-if="formErrors.branch_id" class="text-xs text-red-400 mt-1">{{ formErrors.branch_id[0] }}</p>
              </div>
              <div>
                <label class="block text-xs font-semibold mb-1.5 text-gray-500">Parking Lot</label>
                <input v-model="form.parking_lot" type="text" placeholder="e.g. A"
                  class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-700 placeholder-gray-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold mb-1.5 text-gray-500">Parking Floor</label>
                <input v-model="form.parking_floor" type="text" placeholder="e.g. B1"
                  class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-700 placeholder-gray-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                />
              </div>
            </div>
          </div>

          <hr class="border-gray-100" />

          <!-- Section: Owner Details -->
          <div>
            <p class="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-3">Owner Details <span class="text-gray-400 font-normal normal-case">(optional)</span></p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold mb-1.5 text-gray-500">Owner Name</label>
                <input v-model="form.owner_name" type="text" placeholder="Full name"
                  class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-700 placeholder-gray-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold mb-1.5 text-gray-500">Owner Email</label>
                <input v-model="form.owner_email" type="email" placeholder="owner@example.com"
                  class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-700 placeholder-gray-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold mb-1.5 text-gray-500">Owner Phone</label>
                <input v-model="form.owner_phone" type="text" placeholder="020 XXXX XXXX"
                  class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-700 placeholder-gray-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold mb-1.5 text-gray-500">Owner Date of Birth</label>
                <input v-model="form.owner_dob" type="date"
                  class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                />
              </div>
            </div>
          </div>

          <hr class="border-gray-100" />

          <!-- Section: Documents -->
          <div>
            <p class="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-3">
              Documents <span class="text-gray-400 font-normal normal-case">(optional)</span>
            </p>
            <div class="space-y-3">
              <div
                v-for="(doc, idx) in docRows"
                :key="idx"
                class="grid grid-cols-1 md:grid-cols-[1fr_140px_140px_1fr_auto] gap-3 items-end p-3 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div>
                  <label class="block text-xs font-semibold mb-1.5 text-gray-500">Document Name</label>
                  <input
                    v-model="doc.document_name"
                    type="text"
                    placeholder="e.g. Road Tax, Insurance"
                    class="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 placeholder-gray-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1.5 text-gray-500">Issued Date</label>
                  <input
                    v-model="doc.issued_date"
                    type="date"
                    class="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1.5 text-gray-500">Expiry Date</label>
                  <input
                    v-model="doc.expiry_date"
                    type="date"
                    class="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1.5 text-gray-500">
                    File
                    <span class="text-gray-300 font-normal">(jpg, png, pdf, webp)</span>
                  </label>
                  <div class="relative">
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf,.webp"
                      class="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:text-purple-700 file:bg-purple-50 hover:file:bg-purple-100 cursor-pointer border border-gray-200 rounded-lg focus:outline-none transition-all"
                      @change="onFileChange(idx, $event)"
                    />
                  </div>
                  <p v-if="doc.file" class="text-xs text-green-600 mt-1 truncate">{{ doc.file.name }}</p>
                </div>
                <div class="flex justify-end md:justify-center pb-0.5">
                  <button
                    type="button"
                    class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors border border-gray-200"
                    title="Remove"
                    @click="removeDoc(idx)"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>

              <button
                type="button"
                class="flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-800 px-3 py-2 rounded-lg border border-dashed border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-all"
                @click="addDoc"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                </svg>
                Add Document
              </button>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-3 pt-1">
            <button
              type="submit"
              :disabled="submitting"
              class="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
              :class="submitting ? 'opacity-70 cursor-not-allowed' : ''"
              style="background:linear-gradient(135deg,#7C3AED,#6D28D9); box-shadow:0 4px 14px rgba(109,40,217,0.35);"
            >{{ submitting ? 'Registering...' : 'Register Vehicle' }}</button>
            <button type="button"
              class="px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all"
              @click="resetForm"
            >Clear</button>
          </div>
        </form>
      </div>
    </div>

    <!-- ===== BULK UPLOAD ===== -->
    <div v-else-if="activeTab === 'bulk'" key="bulk">
      <div class="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
        <h2 class="text-base font-semibold text-gray-700 mb-1">Bulk Import Vehicles</h2>
        <p class="text-sm text-gray-400 mb-6">Upload an Excel file (.xlsx) to import multiple vehicles at once.</p>

        <!-- Step 1: Download template -->
        <div class="flex items-start gap-4 mb-6 p-4 rounded-xl border border-dashed border-green-200 bg-green-50">
          <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style="background:#D1FAE5;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 15V3M12 15l-4-4M12 15l4-4" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 17v2a2 2 0 002 2h16a2 2 0 002-2v-2" stroke="#059669" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="flex-1">
            <p class="text-sm font-semibold text-gray-700 mb-0.5">Step 1 — Download Template</p>
            <p class="text-xs text-gray-500 mb-3">Fill in the template with your vehicle data. Row 1 = column headers, Row 2 = notes (don't delete), Row 3+ = your data.</p>
            <button
              type="button"
              class="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
              style="background:linear-gradient(135deg,#059669,#047857);"
              @click="downloadTemplate"
            >Download Template</button>
          </div>
        </div>

        <!-- Step 2: Upload file -->
        <div class="mb-6">
          <p class="text-sm font-semibold text-gray-700 mb-3">Step 2 — Upload Filled File</p>

          <label
            class="flex flex-col items-center justify-center gap-3 w-full py-10 rounded-xl border-2 border-dashed cursor-pointer transition-all"
            :class="bulkFile ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-purple-400 hover:bg-purple-50'"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                :stroke="bulkFile ? '#059669' : '#9CA3AF'" stroke-width="1.5" stroke-linejoin="round" fill="none"/>
              <polyline points="14 2 14 8 20 8" :stroke="bulkFile ? '#059669' : '#9CA3AF'" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
            <div class="text-center">
              <p v-if="bulkFile" class="text-sm font-semibold text-green-700">{{ bulkFile.name }}</p>
              <template v-else>
                <p class="text-sm font-medium text-gray-500">Click to select Excel file</p>
                <p class="text-xs text-gray-400 mt-0.5">.xlsx or .xls only</p>
              </template>
            </div>
            <input type="file" accept=".xlsx,.xls" class="hidden" @change="onBulkFileChange" />
          </label>

          <p v-if="bulkError" class="text-sm text-red-500 mt-3">{{ bulkError }}</p>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            :disabled="!bulkFile || bulkUploading"
            class="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
            :class="(!bulkFile || bulkUploading) ? 'opacity-50 cursor-not-allowed' : ''"
            style="background:linear-gradient(135deg,#059669,#047857); box-shadow:0 4px 14px rgba(5,150,105,0.35);"
            @click="submitBulk"
          >{{ bulkUploading ? 'Importing...' : 'Import Now' }}</button>
          <button
            v-if="bulkFile || bulkResult"
            type="button"
            class="px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all"
            @click="resetBulk"
          >Clear</button>
        </div>

        <!-- Results -->
        <div v-if="bulkResult" class="mt-6">
          <div class="flex items-center gap-3 mb-4">
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-green-100 text-green-700">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              {{ bulkResult.inserted }} Imported
            </span>
            <span v-if="bulkResult.failed" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-100 text-red-700">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="#EF4444" stroke-width="2.5" stroke-linecap="round"/>
              </svg>
              {{ bulkResult.failed }} Failed
            </span>
          </div>

          <!-- Error table -->
          <div v-if="bulkResult.errors?.length" class="rounded-xl border border-red-100 overflow-hidden">
            <div class="px-4 py-2.5 bg-red-50 border-b border-red-100">
              <p class="text-xs font-semibold text-red-700">Rows with errors</p>
            </div>
            <table class="w-full text-xs">
              <thead class="bg-gray-50">
                <tr>
                  <th class="text-left px-4 py-2 text-gray-500 font-semibold">Row</th>
                  <th class="text-left px-4 py-2 text-gray-500 font-semibold">Plate Number</th>
                  <th class="text-left px-4 py-2 text-gray-500 font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="err in bulkResult.errors" :key="err.row" class="border-t border-gray-50">
                  <td class="px-4 py-2 text-gray-400">#{{ err.row }}</td>
                  <td class="px-4 py-2 font-mono text-gray-600">{{ err.plate_number }}</td>
                  <td class="px-4 py-2 text-red-500">{{ err.errors.join(', ') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    </Transition>
  </div>
</template>

<style scoped>
.tab-fade-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.tab-fade-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.tab-fade-enter-from   { opacity: 0; transform: translateY(6px); }
.tab-fade-leave-to     { opacity: 0; transform: translateY(-4px); }
</style>
