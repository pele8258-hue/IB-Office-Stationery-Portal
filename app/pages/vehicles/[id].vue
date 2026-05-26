<script setup>
definePageMeta({ middleware: 'auth' })

const { $api }  = useNuxtApp()
const route     = useRoute()
const authStore = useAuthStore()

const vehicle  = ref(null)
const loading  = ref(true)
const error    = ref('')

const isChecker   = computed(() => ['CHECKER', 'SUPER_ADMIN'].includes(authStore.user?.role_code))
const isAdminRole = computed(() => ['ADMIN', 'CHECKER', 'SUPER_ADMIN'].includes(authStore.user?.role_code))
const canEdit     = computed(() => !!authStore.permissions?.VEHICLES?.edit)

async function fetchVehicle() {
  loading.value = true
  error.value   = ''
  try {
    const res     = await $api(`/api/vehicles/${route.params.id}`)
    vehicle.value = res.data
    if (editMode.value) populateEdit()
    initStatusForm()
  } catch (e) {
    error.value = e?.data?.message || 'Failed to load vehicle'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchVehicle()
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closePreview(); closeReject() } })
})

// ── Edit mode ─────────────────────────────────────────────────────────────────
const editMode  = ref(false)
const editForm  = reactive({
  plate_number: '', branch_id: '', brand: '', model: '', color: '', year: '',
  type: '', ownership_type: 'OWN', engine_number: '', frame_number: '',
  parking_lot: '', parking_floor: '',
  owner_name: '', owner_email: '', owner_phone: '', owner_dob: '',
})
const editSaving = ref(false)
const editError  = ref('')
const branches   = ref([])

const VEHICLE_TYPES   = ['SEDAN', 'VAN', 'TRUCK', 'SUV', 'PICKUP', 'OTHER']
const OWNERSHIP_TYPES = ['OWN', 'LEASE']

function populateEdit() {
  const v = vehicle.value
  if (!v) return
  Object.assign(editForm, {
    plate_number:   v.PLATE_NUMBER  || '',
    branch_id:      v.BRANCH_ID     || '',
    brand:          v.BRAND         || '',
    model:          v.MODEL         || '',
    color:          v.COLOR         || '',
    year:           v.YEAR          || '',
    type:           v.TYPE          || '',
    ownership_type: v.OWNERSHIP_TYPE || 'OWN',
    engine_number:  v.ENGINE_NUMBER  || '',
    frame_number:   v.FRAME_NUMBER   || '',
    parking_lot:    v.PARKING_LOT    || '',
    parking_floor:  v.PARKING_FLOOR  || '',
    owner_name:     v.OWNER_NAME     || '',
    owner_email:    v.OWNER_EMAIL    || '',
    owner_phone:    v.OWNER_PHONE    || '',
    owner_dob:      v.OWNER_DOB ? v.OWNER_DOB.substring(0, 10) : '',
  })
}

async function loadBranches() {
  const res = await $api('/api/branches')
  branches.value = res.data || []
}

function startEdit() {
  populateEdit()
  loadBranches()
  editError.value = ''
  editMode.value  = true
}
function cancelEdit() { editMode.value = false; editError.value = '' }

async function saveEdit() {
  editSaving.value = true
  editError.value  = ''
  try {
    await $api(`/api/vehicles/${route.params.id}`, { method: 'PUT', body: { ...editForm } })
    editMode.value = false
    fetchVehicle()
  } catch (e) {
    editError.value = e?.data?.message || 'Update failed'
  } finally {
    editSaving.value = false
  }
}

// ── Verify actions (CHECKER / SUPER_ADMIN only) ───────────────────────────────
const verifying     = ref(false)
const showReject    = ref(false)
const rejectReason  = ref('')
const verifyError   = ref('')

function closeReject() { showReject.value = false; rejectReason.value = ''; verifyError.value = '' }

async function doVerify(action) {
  verifyError.value = ''
  if (action === 'REJECTED' && !rejectReason.value.trim()) {
    verifyError.value = 'Please enter a reject reason'
    return
  }
  verifying.value = true
  try {
    await $api(`/api/vehicles/${route.params.id}/verify`, {
      method: 'POST',
      body: { action, reject_reason: rejectReason.value.trim() || undefined },
    })
    closeReject()
    fetchVehicle()
  } catch (e) {
    verifyError.value = e?.data?.message || 'Action failed'
  } finally {
    verifying.value = false
  }
}

// ── Status change (ADMIN / CHECKER / SUPER_ADMIN only) ────────────────────────
const VEHICLE_STATUSES = ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'LEASE_EXPIRED']
const statusForm    = reactive({ status: '' })
const statusSaving  = ref(false)
const statusError   = ref('')
const statusSuccess = ref(false)

function initStatusForm() {
  statusForm.status  = vehicle.value?.STATUS || ''
  statusError.value  = ''
  statusSuccess.value = false
}

async function changeStatus() {
  statusError.value   = ''
  statusSuccess.value = false
  if (!statusForm.status) { statusError.value = 'Please select a status'; return }
  statusSaving.value = true
  try {
    await $api(`/api/vehicles/${route.params.id}/status`, {
      method: 'POST',
      body: { status: statusForm.status },
    })
    statusSuccess.value = true
    fetchVehicle()
    setTimeout(() => { statusSuccess.value = false }, 3000)
  } catch (e) {
    statusError.value = e?.data?.message || e?.data?.errors?.status?.[0] || 'Failed to update status'
  } finally {
    statusSaving.value = false
  }
}

// ── Document management (add / soft-delete) ───────────────────────────────────
const newDocRows  = ref([])   // rows to upload: { name, issued_date, expiry_date, file, fileName }
const docUploading = ref(false)
const docError     = ref('')

function addDocRow() {
  newDocRows.value.push({ name: '', issued_date: '', expiry_date: '', file: null, fileName: '' })
}
function removeDocRow(i) { newDocRows.value.splice(i, 1) }
function onDocFile(i, e) {
  const f = e.target.files[0]
  if (f) { newDocRows.value[i].file = f; newDocRows.value[i].fileName = f.name }
}

async function uploadDocs() {
  const rows = newDocRows.value.filter(r => r.name.trim() && r.file)
  if (!rows.length) { docError.value = 'Add at least one document with a name and file'; return }
  docUploading.value = true
  docError.value     = ''
  try {
    for (const row of rows) {
      const fd = new FormData()
      fd.append('document_name', row.name.trim())
      if (row.issued_date) fd.append('issued_date', row.issued_date)
      if (row.expiry_date) fd.append('expiry_date', row.expiry_date)
      fd.append('file', row.file)
      await $api(`/api/vehicles/${route.params.id}/documents`, { method: 'POST', body: fd })
    }
    newDocRows.value = []
    fetchVehicle()
  } catch (e) {
    docError.value = e?.data?.message || 'Upload failed'
  } finally {
    docUploading.value = false
  }
}

async function deleteDoc(docId) {
  if (!confirm('Delete this document? This cannot be undone.')) return
  try {
    await $api(`/api/vehicles/documents/${docId}`, { method: 'DELETE' })
    fetchVehicle()
  } catch (e) {
    alert(e?.data?.message || 'Delete failed')
  }
}

// ── Image preview lightbox ────────────────────────────────────────────────────
const previewSrc  = ref(null)
const previewName = ref('')

function isImage(path) { return path && /\.(jpg|jpeg|png|webp)$/i.test(path) }
function openPreview(doc) { previewSrc.value = doc.FILE_PATH; previewName.value = doc.DOCUMENT_NAME }
function closePreview()   { previewSrc.value = null; previewName.value = '' }

// ── Helpers ───────────────────────────────────────────────────────────────────
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
function formatDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatDateTime(val) {
  if (!val) return '—'
  return new Date(val).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function isExpired(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}
function isExpiringSoon(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const soon = new Date()
  soon.setDate(soon.getDate() + 30)
  return d > new Date() && d <= soon
}
</script>

<template>
  <div>
    <!-- Back + header -->
    <div class="flex items-center gap-3 mb-6">
      <NuxtLink
        to="/vehicles"
        class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </NuxtLink>
      <div>
        <h1 class="text-xl font-bold text-gray-800">Vehicle Detail</h1>
        <p class="text-sm text-gray-400 mt-0.5">Full information and documents</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-24">
      <svg class="animate-spin w-8 h-8" style="color:#7C3AED;" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="32" stroke-dashoffset="12"/>
      </svg>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-white rounded-xl shadow-sm p-8 text-center">
      <p class="text-red-500 text-sm">{{ error }}</p>
      <NuxtLink to="/vehicles" class="mt-4 inline-block text-sm text-purple-600 hover:underline">← Back to list</NuxtLink>
    </div>

    <!-- Content -->
    <div v-else-if="vehicle" class="space-y-4">

      <!-- Top bar: plate + badges + actions -->
      <div class="bg-white rounded-xl shadow-sm px-6 py-4 flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background:linear-gradient(135deg,#7C3AED,#6D28D9);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="1" y="9" width="22" height="10" rx="2" fill="#fff" fill-opacity=".9"/>
              <circle cx="6.5" cy="19" r="2" fill="#E9D5FF"/>
              <circle cx="17.5" cy="19" r="2" fill="#E9D5FF"/>
            </svg>
          </div>
          <div class="min-w-0">
            <p class="font-mono font-bold text-lg text-purple-700">{{ vehicle.PLATE_NUMBER }}</p>
            <p class="text-sm text-gray-400 truncate">{{ vehicle.BRAND || '' }} {{ vehicle.MODEL || '' }} {{ vehicle.YEAR ? '· ' + vehicle.YEAR : '' }}</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs px-3 py-1 rounded-full font-semibold" :class="statusColor(vehicle.STATUS)">{{ statusLabel(vehicle.STATUS) }}</span>
          <span class="text-xs px-3 py-1 rounded-full font-semibold" :class="verifyColor(vehicle.VERIFY_STATUS)">{{ vehicle.VERIFY_STATUS || 'PENDING' }}</span>
          <span class="text-xs px-3 py-1 rounded-full font-semibold" :class="vehicle.OWNERSHIP_TYPE === 'LEASE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'">{{ vehicle.OWNERSHIP_TYPE || 'OWN' }}</span>

          <template v-if="canEdit && !editMode">
            <button
              class="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
              style="background:linear-gradient(135deg,#7C3AED,#6D28D9);"
              @click="startEdit"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="white" stroke-width="2" stroke-linecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>
              Edit
            </button>
          </template>
          <template v-if="editMode">
            <button
              :disabled="editSaving"
              class="ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
              style="background:linear-gradient(135deg,#059669,#047857);"
              @click="saveEdit"
            >{{ editSaving ? 'Saving...' : 'Save Changes' }}</button>
            <button class="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:bg-gray-50" @click="cancelEdit">Cancel</button>
          </template>
        </div>
      </div>

      <!-- Edit error -->
      <div v-if="editError" class="bg-red-50 border border-red-200 rounded-xl px-5 py-3">
        <p class="text-sm text-red-600">{{ editError }}</p>
      </div>

      <!-- Reject reason -->
      <div v-if="vehicle.VERIFY_STATUS === 'REJECTED' && vehicle.REJECT_REASON"
        class="bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-start gap-2.5">
        <svg class="flex-shrink-0 mt-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#EF4444" stroke-width="2"/>
          <line x1="12" y1="8" x2="12" y2="12" stroke="#EF4444" stroke-width="2" stroke-linecap="round"/>
          <circle cx="12" cy="16" r="1" fill="#EF4444"/>
        </svg>
        <p class="text-sm text-red-600"><span class="font-semibold">Rejection reason:</span> {{ vehicle.REJECT_REASON }}</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <!-- Left col: 2 info cards -->
        <div class="lg:col-span-2 space-y-4">

          <!-- Vehicle Information -->
          <div class="bg-white rounded-xl shadow-sm p-5">
            <p class="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-4">Vehicle Information</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">

              <!-- Plate Number -->
              <div>
                <p class="text-xs text-gray-400 mb-0.5">Plate Number</p>
                <template v-if="editMode">
                  <input v-model="editForm.plate_number" type="text"
                    class="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-purple-300"
                    style="text-transform:uppercase;" placeholder="e.g. B 1234 XY" />
                </template>
                <p v-else class="text-sm font-mono font-bold text-purple-700">{{ vehicle.PLATE_NUMBER }}</p>
              </div>

              <!-- Brand -->
              <div>
                <p class="text-xs text-gray-400 mb-0.5">Brand</p>
                <input v-if="editMode" v-model="editForm.brand" type="text"
                  class="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="e.g. Toyota" />
                <p v-else class="text-sm font-medium text-gray-700">{{ vehicle.BRAND || '—' }}</p>
              </div>

              <!-- Model -->
              <div>
                <p class="text-xs text-gray-400 mb-0.5">Model</p>
                <input v-if="editMode" v-model="editForm.model" type="text"
                  class="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="e.g. Avanza" />
                <p v-else class="text-sm font-medium text-gray-700">{{ vehicle.MODEL || '—' }}</p>
              </div>

              <!-- Color -->
              <div>
                <p class="text-xs text-gray-400 mb-0.5">Color</p>
                <input v-if="editMode" v-model="editForm.color" type="text"
                  class="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="e.g. White" />
                <p v-else class="text-sm font-medium text-gray-700">{{ vehicle.COLOR || '—' }}</p>
              </div>

              <!-- Year -->
              <div>
                <p class="text-xs text-gray-400 mb-0.5">Year</p>
                <input v-if="editMode" v-model="editForm.year" type="number" min="1990" max="2100"
                  class="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="e.g. 2022" />
                <p v-else class="text-sm font-medium text-gray-700">{{ vehicle.YEAR || '—' }}</p>
              </div>

              <!-- Type -->
              <div>
                <p class="text-xs text-gray-400 mb-0.5">Type</p>
                <select v-if="editMode" v-model="editForm.type"
                  class="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white">
                  <option value="">— Select —</option>
                  <option v-for="t in VEHICLE_TYPES" :key="t" :value="t">{{ t }}</option>
                </select>
                <p v-else class="text-sm font-medium text-gray-700">{{ vehicle.TYPE || '—' }}</p>
              </div>

              <!-- Branch -->
              <div>
                <p class="text-xs text-gray-400 mb-0.5">Branch</p>
                <select v-if="editMode" v-model="editForm.branch_id"
                  class="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white">
                  <option value="">— Select —</option>
                  <option v-for="b in branches" :key="b.ID" :value="b.ID">{{ b.CODE }} — {{ b.NAME }}</option>
                </select>
                <p v-else class="text-sm font-medium text-gray-700">{{ vehicle.BRANCH_CODE }} — {{ vehicle.BRANCH_NAME }}</p>
              </div>

              <!-- Ownership Type -->
              <div>
                <p class="text-xs text-gray-400 mb-0.5">Ownership</p>
                <select v-if="editMode" v-model="editForm.ownership_type"
                  class="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white">
                  <option v-for="o in OWNERSHIP_TYPES" :key="o" :value="o">{{ o }}</option>
                </select>
                <span v-else class="inline-block text-xs px-2 py-0.5 rounded-full font-semibold"
                  :class="vehicle.OWNERSHIP_TYPE === 'LEASE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'">
                  {{ vehicle.OWNERSHIP_TYPE || 'OWN' }}
                </span>
              </div>

            </div>
          </div>

          <!-- Registration & Parking -->
          <div class="bg-white rounded-xl shadow-sm p-5">
            <p class="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-4">Registration & Parking</p>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">

              <div class="sm:col-span-2">
                <p class="text-xs text-gray-400 mb-0.5">Engine Number</p>
                <input v-if="editMode" v-model="editForm.engine_number" type="text"
                  class="w-full text-sm font-mono border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="Engine number" />
                <p v-else class="text-sm font-mono font-medium text-gray-700">{{ vehicle.ENGINE_NUMBER || '—' }}</p>
              </div>

              <div class="sm:col-span-2">
                <p class="text-xs text-gray-400 mb-0.5">Frame / Chassis Number</p>
                <input v-if="editMode" v-model="editForm.frame_number" type="text"
                  class="w-full text-sm font-mono border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="Frame/chassis number" />
                <p v-else class="text-sm font-mono font-medium text-gray-700">{{ vehicle.FRAME_NUMBER || '—' }}</p>
              </div>

              <div>
                <p class="text-xs text-gray-400 mb-0.5">Parking Lot</p>
                <input v-if="editMode" v-model="editForm.parking_lot" type="text"
                  class="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="e.g. A" />
                <p v-else class="text-sm font-medium text-gray-700">{{ vehicle.PARKING_LOT || '—' }}</p>
              </div>

              <div>
                <p class="text-xs text-gray-400 mb-0.5">Parking Floor</p>
                <input v-if="editMode" v-model="editForm.parking_floor" type="text"
                  class="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="e.g. 2" />
                <p v-else class="text-sm font-medium text-gray-700">{{ vehicle.PARKING_FLOOR || '—' }}</p>
              </div>

            </div>
          </div>

          <!-- Owner Details -->
          <div class="bg-white rounded-xl shadow-sm p-5">
            <p class="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-4">Owner Details</p>
            <div class="grid grid-cols-2 sm:grid-cols-2 gap-4">

              <div>
                <p class="text-xs text-gray-400 mb-0.5">Name</p>
                <input v-if="editMode" v-model="editForm.owner_name" type="text"
                  class="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="Owner name" />
                <p v-else class="text-sm font-medium text-gray-700">{{ vehicle.OWNER_NAME || '—' }}</p>
              </div>

              <div>
                <p class="text-xs text-gray-400 mb-0.5">Date of Birth</p>
                <input v-if="editMode" v-model="editForm.owner_dob" type="date"
                  class="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300" />
                <p v-else class="text-sm font-medium text-gray-700">{{ formatDate(vehicle.OWNER_DOB) }}</p>
              </div>

              <div>
                <p class="text-xs text-gray-400 mb-0.5">Email</p>
                <input v-if="editMode" v-model="editForm.owner_email" type="email"
                  class="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="owner@email.com" />
                <p v-else class="text-sm font-medium text-gray-700 break-all">{{ vehicle.OWNER_EMAIL || '—' }}</p>
              </div>

              <div>
                <p class="text-xs text-gray-400 mb-0.5">Phone</p>
                <input v-if="editMode" v-model="editForm.owner_phone" type="tel"
                  class="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="+62..." />
                <p v-else class="text-sm font-medium text-gray-700">{{ vehicle.OWNER_PHONE || '—' }}</p>
              </div>

            </div>
          </div>
        </div>

        <!-- Right col: meta + documents -->
        <div class="space-y-4">

          <!-- Verify (CHECKER / SUPER_ADMIN only, visible in edit mode) -->
          <div v-if="isChecker && editMode" class="bg-white rounded-xl shadow-sm p-5">
            <p class="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-4">Verification</p>

            <!-- Current status -->
            <div class="flex items-center gap-2 mb-4">
              <span class="text-xs text-gray-400">Status:</span>
              <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold" :class="verifyColor(vehicle.VERIFY_STATUS)">
                {{ vehicle.VERIFY_STATUS || 'PENDING' }}
              </span>
            </div>

            <!-- Error -->
            <div v-if="verifyError" class="mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p class="text-xs text-red-600">{{ verifyError }}</p>
            </div>

            <!-- Reject textarea -->
            <div v-if="showReject" class="mb-3">
              <label class="block text-xs text-gray-500 mb-1">Reject reason <span class="text-red-500">*</span></label>
              <textarea v-model="rejectReason" rows="3"
                class="w-full text-sm border border-red-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                placeholder="Explain why this vehicle is rejected…"
              />
            </div>

            <!-- Action buttons -->
            <div class="flex flex-col gap-2">
              <template v-if="!showReject">
                <button
                  :disabled="verifying"
                  class="w-full py-2 rounded-lg text-xs font-semibold text-white transition-all"
                  style="background:linear-gradient(135deg,#059669,#047857);"
                  @click="doVerify('APPROVED')"
                >{{ verifying ? 'Processing…' : 'Approve' }}</button>
                <button
                  :disabled="verifying"
                  class="w-full py-2 rounded-lg text-xs font-semibold text-white transition-all"
                  style="background:linear-gradient(135deg,#DC2626,#B91C1C);"
                  @click="showReject = true"
                >Reject</button>
              </template>
              <template v-else>
                <button
                  :disabled="verifying"
                  class="w-full py-2 rounded-lg text-xs font-semibold text-white transition-all"
                  style="background:linear-gradient(135deg,#DC2626,#B91C1C);"
                  @click="doVerify('REJECTED')"
                >{{ verifying ? 'Processing…' : 'Confirm Reject' }}</button>
                <button
                  :disabled="verifying"
                  class="w-full py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                  @click="closeReject"
                >Cancel</button>
              </template>
            </div>
          </div>

          <!-- Vehicle Status (ADMIN / CHECKER / SUPER_ADMIN) -->
          <div v-if="isAdminRole" class="bg-white rounded-xl shadow-sm p-5">
            <p class="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-4">Vehicle Status</p>

            <!-- Current status display -->
            <div class="flex items-center gap-2 mb-3">
              <span class="w-2 h-2 rounded-full flex-shrink-0"
                :style="`background:${{AVAILABLE:'#10B981',IN_USE:'#3B82F6',MAINTENANCE:'#EAB308',LEASE_EXPIRED:'#EF4444'}[vehicle.STATUS] || '#9CA3AF'}`"
              ></span>
              <span class="text-sm font-semibold text-gray-800">
                {{ { AVAILABLE: 'Available', IN_USE: 'In Use', MAINTENANCE: 'Maintenance', LEASE_EXPIRED: 'Lease Expired' }[vehicle.STATUS] || vehicle.STATUS || '—' }}
              </span>
              <span class="text-xs text-gray-400">current</span>
            </div>

            <!-- Status selector -->
            <div class="mb-3">
              <label class="block text-xs text-gray-500 mb-1">Change to</label>
              <select
                v-model="statusForm.status"
                class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
              >
                <option value="" disabled>— Select status —</option>
                <option
                  v-for="s in VEHICLE_STATUSES"
                  :key="s"
                  :value="s"
                  :disabled="s === vehicle.STATUS"
                >
                  {{ { AVAILABLE: 'Available', IN_USE: 'In Use', MAINTENANCE: 'Maintenance', LEASE_EXPIRED: 'Lease Expired' }[s] }}
                  {{ s === vehicle.STATUS ? '(current)' : '' }}
                </option>
              </select>
            </div>

            <!-- Error / Success -->
            <div v-if="statusError" class="mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p class="text-xs text-red-600">{{ statusError }}</p>
            </div>
            <div v-if="statusSuccess" class="mb-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#10B981" stroke-width="2.5" stroke-linecap="round"/></svg>
              <p class="text-xs text-green-700 font-medium">Status updated successfully</p>
            </div>

            <button
              :disabled="statusSaving || !statusForm.status || statusForm.status === vehicle.STATUS"
              class="w-full py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style="background:linear-gradient(135deg,#7C3AED,#6D28D9);"
              @click="changeStatus"
            >
              <span v-if="statusSaving">Updating…</span>
              <span v-else>Update Status</span>
            </button>
          </div>

          <!-- Meta -->
          <div class="bg-white rounded-xl shadow-sm p-5">
            <p class="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-4">Record Info</p>
            <div class="space-y-3">
              <div>
                <p class="text-xs text-gray-400 mb-0.5">Registered By</p>
                <p class="text-sm font-medium text-gray-700">{{ vehicle.CREATED_BY_NAME || '—' }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400 mb-0.5">Registered At</p>
                <p class="text-sm font-medium text-gray-700">{{ formatDateTime(vehicle.CREATED_AT) }}</p>
              </div>
              <div v-if="vehicle.VERIFY_STATUS !== 'PENDING'">
                <p class="text-xs text-gray-400 mb-0.5">Verified At</p>
                <p class="text-sm font-medium text-gray-700">{{ formatDateTime(vehicle.VERIFIED_AT) }}</p>
              </div>
            </div>
          </div>

          <!-- Documents -->
          <div class="bg-white rounded-xl shadow-sm p-5">
            <div class="flex items-center justify-between mb-4">
              <p class="text-xs font-semibold text-purple-700 uppercase tracking-wide">Documents</p>
              <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                :class="vehicle.documents?.length ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'">
                {{ vehicle.documents?.length || 0 }} file{{ vehicle.documents?.length !== 1 ? 's' : '' }}
              </span>
            </div>

            <!-- Existing documents list -->
            <div v-if="!vehicle.documents?.length && !editMode" class="text-center py-6">
              <svg class="mx-auto mb-2 text-gray-200" width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
              </svg>
              <p class="text-xs text-gray-400">No documents attached</p>
            </div>

            <div class="space-y-2">
              <div
                v-for="doc in vehicle.documents"
                :key="doc.ID"
                class="p-3 rounded-lg border border-gray-100 hover:border-purple-200 transition-colors"
              >
                <!-- Image thumbnail (clickable) -->
                <div
                  v-if="isImage(doc.FILE_PATH)"
                  class="mb-2 rounded-lg overflow-hidden cursor-pointer relative group"
                  style="height:110px;"
                  @click="openPreview(doc)"
                >
                  <img :src="doc.FILE_PATH" :alt="doc.DOCUMENT_NAME" class="w-full h-full object-cover" />
                  <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                    <svg class="opacity-0 group-hover:opacity-100 transition-opacity" width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="white" fill-opacity="0.9"/>
                      <path d="M10 8l6 4-6 4V8z" fill="#7C3AED"/>
                    </svg>
                  </div>
                </div>

                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-start gap-2 min-w-0">
                    <svg class="flex-shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#7C3AED" stroke-width="1.8" stroke-linejoin="round"/>
                      <polyline points="14 2 14 8 20 8" stroke="#7C3AED" stroke-width="1.8" stroke-linejoin="round"/>
                    </svg>
                    <p class="text-xs font-semibold text-gray-700 truncate">{{ doc.DOCUMENT_NAME }}</p>
                  </div>
                  <div class="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      v-if="isImage(doc.FILE_PATH)"
                      class="text-xs font-medium px-2.5 py-1 rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors"
                      @click="openPreview(doc)"
                    >Preview</button>
                    <a
                      v-else-if="doc.FILE_PATH"
                      :href="doc.FILE_PATH"
                      target="_blank"
                      class="text-xs font-medium px-2.5 py-1 rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors"
                    >View</a>
                    <!-- Delete button (edit mode only) -->
                    <button
                      v-if="editMode && canEdit"
                      class="text-xs font-medium px-2.5 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                      @click="deleteDoc(doc.ID)"
                    >Delete</button>
                  </div>
                </div>
                <div class="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span class="text-xs text-gray-400">Issued: {{ formatDate(doc.ISSUED_DATE) }}</span>
                  <span
                    class="text-xs font-medium"
                    :class="isExpired(doc.EXPIRY_DATE) ? 'text-red-500' : isExpiringSoon(doc.EXPIRY_DATE) ? 'text-yellow-500' : 'text-gray-400'"
                  >
                    Expiry: {{ formatDate(doc.EXPIRY_DATE) }}
                    <span v-if="isExpired(doc.EXPIRY_DATE)"> · Expired</span>
                    <span v-else-if="isExpiringSoon(doc.EXPIRY_DATE)"> · Expiring soon</span>
                  </span>
                </div>
                <p v-if="doc.UPLOADED_BY_NAME" class="text-xs text-gray-300 mt-1">by {{ doc.UPLOADED_BY_NAME }}</p>
              </div>

              <!-- Add new document rows (edit mode only) -->
              <template v-if="editMode && canEdit">
                <div
                  v-for="(row, i) in newDocRows"
                  :key="i"
                  class="p-3 rounded-lg border border-dashed border-purple-300 bg-purple-50 space-y-2"
                >
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-xs font-semibold text-purple-600">New Document {{ i + 1 }}</p>
                    <button class="text-xs text-red-400 hover:text-red-600" @click="removeDocRow(i)">Remove</button>
                  </div>
                  <input v-model="row.name" type="text" placeholder="Document name *"
                    class="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300" />
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <p class="text-xs text-gray-400 mb-0.5">Issued date</p>
                      <input v-model="row.issued_date" type="date"
                        class="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300" />
                    </div>
                    <div>
                      <p class="text-xs text-gray-400 mb-0.5">Expiry date</p>
                      <input v-model="row.expiry_date" type="date"
                        class="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300" />
                    </div>
                  </div>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <span class="text-xs text-gray-500 flex-shrink-0">File *</span>
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf,.webp" class="hidden" @change="onDocFile(i, $event)" />
                    <span class="text-xs px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 truncate max-w-full">
                      {{ row.fileName || 'Choose file…' }}
                    </span>
                  </label>
                </div>

                <!-- Upload error -->
                <div v-if="docError" class="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <p class="text-xs text-red-600">{{ docError }}</p>
                </div>

                <!-- Add row + Upload buttons -->
                <div class="flex gap-2 pt-1">
                  <button
                    class="flex-1 py-1.5 rounded-lg text-xs font-medium border border-dashed border-purple-400 text-purple-600 hover:bg-purple-50 transition-colors"
                    @click="addDocRow"
                  >+ Add Document</button>
                  <button
                    v-if="newDocRows.length"
                    :disabled="docUploading"
                    class="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                    style="background:linear-gradient(135deg,#7C3AED,#6D28D9);"
                    @click="uploadDocs"
                  >{{ docUploading ? 'Uploading…' : 'Upload' }}</button>
                </div>
              </template>

            </div>
          </div>

        </div>
      </div>
    </div>
  </div>

  <!-- Image lightbox -->
  <Teleport to="body">
    <Transition name="lightbox">
      <div
        v-if="previewSrc"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        style="background:rgba(0,0,0,0.85);"
        @click.self="closePreview"
      >
        <div class="relative max-w-4xl w-full">
          <!-- Header -->
          <div class="flex items-center justify-between mb-3">
            <p class="text-white text-sm font-semibold truncate pr-4">{{ previewName }}</p>
            <div class="flex items-center gap-2 flex-shrink-0">
              <a
                :href="previewSrc"
                target="_blank"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white border border-white/30 hover:bg-white/10 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke="white" stroke-width="2" stroke-linecap="round"/>
                  <polyline points="15 3 21 3 21 9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <line x1="10" y1="14" x2="21" y2="3" stroke="white" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Open original
              </a>
              <button
                class="w-8 h-8 rounded-lg flex items-center justify-center text-white border border-white/30 hover:bg-white/10 transition-colors"
                @click="closePreview"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>
          <!-- Image -->
          <img
            :src="previewSrc"
            :alt="previewName"
            class="w-full rounded-xl object-contain shadow-2xl"
            style="max-height:80vh;"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.lightbox-enter-active { transition: opacity 0.2s ease; }
.lightbox-leave-active { transition: opacity 0.15s ease; }
.lightbox-enter-from,
.lightbox-leave-to     { opacity: 0; }
</style>
