<script setup>
definePageMeta({ middleware: 'auth' })

const { $api } = useNuxtApp()

const docs         = ref([])
const loading      = ref(false)
const error        = ref('')
const search       = ref('')
const expiryFilter = ref('expired')
const vehicleId    = ref('')
const perPage      = ref(20)
const pagination   = reactive({ current_page: 1, total_page: 1, total_data: 0, per_page: 20 })
const PER_PAGE_OPTS = [10, 20, 30]

const EXPIRY_OPTS = [
  { value: 'expired', label: 'Expired' },
  { value: 'soon',    label: 'Expiring Soon (60 days)' },
  { value: 'all',     label: 'All Documents' },
]

// Vehicle dropdown
const vehicles = ref([])
async function loadVehicles() {
  try {
    const res = await $api('/api/vehicles?limit=200')
    vehicles.value = res.data || []
  } catch {}
}
const docFrom = computed(() => pagination.total_data === 0 ? 0 : (pagination.current_page - 1) * perPage.value + 1)
const docTo   = computed(() => Math.min(pagination.current_page * perPage.value, pagination.total_data))

async function fetchDocs(page = 1) {
  loading.value = true
  error.value   = ''
  try {
    const params = new URLSearchParams({ page, limit: perPage.value, expiry: expiryFilter.value })
    if (search.value)    params.set('search',     search.value)
    if (vehicleId.value) params.set('vehicle_id', vehicleId.value)
    const res = await $api(`/api/vehicles/documents?${params}`)
    docs.value = res.data || []
    Object.assign(pagination, res.pagination)
  } catch (e) {
    error.value = e?.data?.message || 'Failed to load documents'
  } finally {
    loading.value = false
  }
}

watch(search,       () => fetchDocs(1))
watch(expiryFilter, () => fetchDocs(1))
watch(vehicleId,    () => fetchDocs(1))
watch(perPage,      () => fetchDocs(1))

function activeTabStyle(val) {
  if (val === 'expired') return 'background:#EF4444;'
  if (val === 'soon')    return 'background:#F59E0B;'
  return 'background:#6366F1;'
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function isExpired(val) {
  if (!val) return false
  return new Date(val) < new Date()
}
function isExpiringSoon(val) {
  if (!val) return false
  const d = new Date(val), soon = new Date()
  soon.setDate(soon.getDate() + 60)
  return d > new Date() && d <= soon
}
function isImage(path) {
  return path && /\.(jpg|jpeg|png|webp)$/i.test(path)
}

// ── Edit modal ────────────────────────────────────────────────────────────────
const editDoc      = ref(null)
const editForm     = reactive({ document_name: '', issued_date: '', expiry_date: '', vehicle_id: '', file: null })
const editErrors   = ref({})
const editSaving   = ref(false)

function openEdit(doc) {
  editDoc.value = doc
  Object.assign(editForm, {
    document_name: doc.DOCUMENT_NAME || '',
    issued_date:   doc.ISSUED_DATE ? doc.ISSUED_DATE.substring(0, 10) : '',
    expiry_date:   doc.EXPIRY_DATE ? doc.EXPIRY_DATE.substring(0, 10) : '',
    vehicle_id:    doc.VEHICLE_ID || '',
    file: null,
  })
  editErrors.value = {}
}
function closeEdit() { editDoc.value = null }
function onEditFile(e) { editForm.file = e.target.files?.[0] || null }

async function saveEdit() {
  editErrors.value = {}
  editSaving.value = true
  try {
    const fd = new FormData()
    fd.append('document_name', editForm.document_name)
    if (editForm.vehicle_id)  fd.append('vehicle_id',  editForm.vehicle_id)
    if (editForm.issued_date) fd.append('issued_date', editForm.issued_date)
    if (editForm.expiry_date) fd.append('expiry_date', editForm.expiry_date)
    if (editForm.file)        fd.append('file', editForm.file)
    await $api(`/api/vehicles/documents/${editDoc.value.ID}`, { method: 'PUT', body: fd })
    closeEdit()
    fetchDocs(pagination.current_page)
  } catch (e) {
    if (e?.data?.errors) editErrors.value = e.data.errors
    else editErrors.value = { _global: e?.data?.message || 'Update failed' }
  } finally {
    editSaving.value = false
  }
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
const previewSrc  = ref(null)
const previewName = ref('')
function openPreview(doc) { previewSrc.value = doc.FILE_PATH; previewName.value = doc.DOCUMENT_NAME }
function closePreview()   { previewSrc.value = null; previewName.value = '' }

onMounted(() => {
  loadVehicles()
  fetchDocs()
  window.addEventListener('keydown', e => { if (e.key === 'Escape') closePreview() })
})
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-xl font-bold text-gray-800">Vehicle Documents</h1>
      <p class="text-sm text-gray-400 mt-0.5">Track expiring and expired documents across fleet vehicles</p>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row gap-3 mb-4">
      <div class="relative flex-1 min-w-[180px]">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
          <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <input
          v-model="search"
          type="text"
          placeholder="Search document name or plate..."
          class="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
        />
      </div>
      <select
        v-model="vehicleId"
        class="text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:border-indigo-400 text-gray-600 min-w-[180px]"
      >
        <option value="">All Vehicles</option>
        <option v-for="v in vehicles" :key="v.ID" :value="v.ID">
          {{ v.PLATE_NUMBER }}{{ v.BRAND ? ' — ' + v.BRAND : '' }}{{ v.MODEL ? ' ' + v.MODEL : '' }}
        </option>
      </select>
      <div class="flex gap-1 bg-white rounded-lg border border-gray-200 p-1">
        <button
          v-for="opt in EXPIRY_OPTS"
          :key="opt.value"
          class="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
          :class="expiryFilter === opt.value ? 'text-white' : 'text-gray-500 hover:text-gray-700'"
          :style="expiryFilter === opt.value ? activeTabStyle(opt.value) : ''"
          @click="expiryFilter = opt.value"
        >{{ opt.label }}</button>
      </div>
    </div>

    <p v-if="error" class="text-sm text-red-500 mb-3">{{ error }}</p>

    <!-- Table -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm" style="min-width:680px;">
          <thead>
            <tr style="background:linear-gradient(135deg,#6366F1,#4F46E5);">
              <th class="text-left px-4 py-3 text-xs font-semibold text-white">#</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-white">Document</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-white">Vehicle</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-white hidden md:table-cell">Issued</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-white">Expiry</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-white hidden lg:table-cell">Uploaded By</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="text-center py-12 text-gray-400 text-sm">
                <div class="flex flex-col items-center gap-2">
                  <svg class="animate-spin w-6 h-6" style="color:#6366F1;" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="32" stroke-dashoffset="12"/>
                  </svg>
                  Loading...
                </div>
              </td>
            </tr>
            <tr v-else-if="!docs.length">
              <td colspan="7" class="text-center py-12 text-gray-400 text-sm">No documents found</td>
            </tr>
            <tr
              v-for="(doc, idx) in docs"
              v-else
              :key="doc.ID"
              class="border-t border-gray-50 hover:bg-indigo-50 transition-colors"
            >
              <td class="px-4 py-3 text-gray-400 text-xs">{{ docFrom + idx }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <!-- Thumbnail if image -->
                  <div
                    v-if="isImage(doc.FILE_PATH)"
                    class="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer border border-gray-100"
                    @click="openPreview(doc)"
                  >
                    <img :src="doc.FILE_PATH" :alt="doc.DOCUMENT_NAME" class="w-full h-full object-cover" />
                  </div>
                  <div v-else-if="doc.FILE_PATH" class="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center border border-gray-100 bg-gray-50">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#6366F1" stroke-width="1.8" stroke-linejoin="round"/>
                      <polyline points="14 2 14 8 20 8" stroke="#6366F1" stroke-width="1.8" stroke-linejoin="round"/>
                    </svg>
                  </div>
                  <div v-else class="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center border border-dashed border-gray-200 bg-gray-50">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#D1D5DB" stroke-width="1.8" stroke-linejoin="round"/>
                      <polyline points="14 2 14 8 20 8" stroke="#D1D5DB" stroke-width="1.8" stroke-linejoin="round"/>
                    </svg>
                  </div>
                  <p class="font-medium text-gray-700 text-xs">{{ doc.DOCUMENT_NAME }}</p>
                </div>
              </td>
              <td class="px-4 py-3">
                <NuxtLink :to="`/vehicles/${doc.VEHICLE_ID}`" class="font-mono text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded">
                  {{ doc.PLATE_NUMBER }}
                </NuxtLink>
                <p class="text-xs text-gray-400 mt-0.5">{{ doc.BRAND }} {{ doc.MODEL }}</p>
              </td>
              <td class="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{{ formatDate(doc.ISSUED_DATE) }}</td>
              <td class="px-4 py-3">
                <span
                  class="text-xs font-medium"
                  :class="isExpired(doc.EXPIRY_DATE) ? 'text-red-500' : isExpiringSoon(doc.EXPIRY_DATE) ? 'text-yellow-500' : 'text-gray-500'"
                >
                  {{ formatDate(doc.EXPIRY_DATE) }}
                  <span v-if="isExpired(doc.EXPIRY_DATE)" class="ml-1 text-xs bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">Expired</span>
                  <span v-else-if="isExpiringSoon(doc.EXPIRY_DATE)" class="ml-1 text-xs bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded-full">Soon</span>
                </span>
              </td>
              <td class="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell">{{ doc.UPLOADED_BY_NAME || '—' }}</td>
              <td class="px-4 py-3">
                <div class="flex flex-col gap-1 items-start">
                  <button
                    v-if="isImage(doc.FILE_PATH)"
                    class="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                    @click="openPreview(doc)"
                  >Preview</button>
                  <a
                    v-else-if="doc.FILE_PATH"
                    :href="doc.FILE_PATH"
                    target="_blank"
                    class="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                  >View Doc</a>
                  <NuxtLink
                    :to="`/vehicles/${doc.VEHICLE_ID}`"
                    class="text-xs text-purple-500 hover:text-purple-700 font-medium"
                  >View Car</NuxtLink>
                  <button
                    class="text-xs text-gray-400 hover:text-gray-700 font-medium"
                    @click="openEdit(doc)"
                  >Edit</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
        <div class="flex items-center gap-2 text-xs text-gray-500">
          <span>Show</span>
          <select v-model="perPage" class="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option v-for="n in PER_PAGE_OPTS" :key="n" :value="n">{{ n }}</option>
          </select>
          <span>entries</span>
          <span class="ml-2 text-gray-400">Showing {{ docFrom }}–{{ docTo }} of {{ pagination.total_data }}</span>
        </div>
        <div class="flex items-center gap-1">
          <button
            :disabled="!pagination.has_previous_page"
            class="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            @click="fetchDocs(pagination.current_page - 1)"
          >Prev</button>
          <template v-for="p in pagination.total_page" :key="p">
            <button
              v-if="pagination.total_page <= 7 || Math.abs(p - pagination.current_page) <= 1 || p === 1 || p === pagination.total_page"
              class="w-7 h-7 text-xs rounded-lg border transition-colors"
              :class="p === pagination.current_page ? 'text-white font-medium border-transparent' : 'border-gray-200 text-gray-500 hover:bg-gray-50'"
              :style="p === pagination.current_page ? 'background:#6366F1;' : ''"
              @click="fetchDocs(p)"
            >{{ p }}</button>
            <span v-else-if="p === pagination.current_page - 2 || p === pagination.current_page + 2" class="text-gray-400 text-xs px-0.5">…</span>
          </template>
          <button
            :disabled="!pagination.has_next_page"
            class="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            @click="fetchDocs(pagination.current_page + 1)"
          >Next</button>
        </div>
      </div>
    </div>

    <!-- Edit modal -->
    <Teleport to="body">
      <Transition name="lightbox">
        <div
          v-if="editDoc"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          style="background:rgba(0,0,0,0.5);"
          @click.self="closeEdit"
        >
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <p class="font-semibold text-gray-800 text-sm">Edit Document</p>
                <p class="text-xs text-gray-400 mt-0.5 font-mono">{{ editDoc.PLATE_NUMBER }}</p>
              </div>
              <button class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" @click="closeEdit">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="px-6 py-5 space-y-4">
              <p v-if="editErrors._global" class="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{{ editErrors._global }}</p>

              <div>
                <label class="block text-xs font-semibold mb-1.5 text-gray-600">Document Name <span class="text-red-400">*</span></label>
                <input
                  v-model="editForm.document_name"
                  type="text"
                  placeholder="e.g. Road Tax, Insurance"
                  class="w-full px-3 py-2.5 text-sm rounded-lg border text-gray-700 focus:outline-none transition-all"
                  :class="editErrors.document_name ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'"
                />
                <p v-if="editErrors.document_name" class="text-xs text-red-400 mt-1">{{ editErrors.document_name[0] }}</p>
              </div>

              <div>
                <label class="block text-xs font-semibold mb-1.5 text-gray-600">Belongs to Vehicle <span class="text-red-400">*</span></label>
                <select
                  v-model="editForm.vehicle_id"
                  class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                >
                  <option value="" disabled>— Select vehicle —</option>
                  <option v-for="v in vehicles" :key="v.ID" :value="v.ID">
                    {{ v.PLATE_NUMBER }}{{ v.BRAND ? ' — ' + v.BRAND : '' }}{{ v.MODEL ? ' ' + v.MODEL : '' }}
                  </option>
                </select>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold mb-1.5 text-gray-600">Issued Date</label>
                  <input
                    v-model="editForm.issued_date"
                    type="date"
                    class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1.5 text-gray-600">Expiry Date</label>
                  <input
                    v-model="editForm.expiry_date"
                    type="date"
                    class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold mb-1.5 text-gray-600">
                  Replace File <span class="text-gray-400 font-normal">(optional — jpg, png, pdf, webp)</span>
                </label>
                <!-- Current file preview -->
                <div v-if="editDoc.FILE_PATH && !editForm.file" class="flex items-center gap-2 mb-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                  <img v-if="isImage(editDoc.FILE_PATH)" :src="editDoc.FILE_PATH" class="w-8 h-8 object-cover rounded" />
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#6366F1" stroke-width="1.8" stroke-linejoin="round"/>
                    <polyline points="14 2 14 8 20 8" stroke="#6366F1" stroke-width="1.8" stroke-linejoin="round"/>
                  </svg>
                  <p class="text-xs text-gray-500 truncate flex-1">{{ editDoc.FILE_PATH.split('/').pop() }}</p>
                </div>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,.webp"
                  class="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:text-indigo-700 file:bg-indigo-50 hover:file:bg-indigo-100 cursor-pointer border border-gray-200 rounded-lg focus:outline-none"
                  @change="onEditFile"
                />
                <p v-if="editForm.file" class="text-xs text-green-600 mt-1">{{ editForm.file.name }}</p>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                class="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all"
                @click="closeEdit"
              >Cancel</button>
              <button
                :disabled="editSaving"
                class="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                :class="editSaving ? 'opacity-60 cursor-not-allowed' : ''"
                style="background:linear-gradient(135deg,#6366F1,#4F46E5); box-shadow:0 4px 14px rgba(99,102,241,0.35);"
                @click="saveEdit"
              >{{ editSaving ? 'Saving...' : 'Save Changes' }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Lightbox -->
    <Teleport to="body">
      <Transition name="lightbox">
        <div
          v-if="previewSrc"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          style="background:rgba(0,0,0,0.85);"
          @click.self="closePreview"
        >
          <div class="relative max-w-4xl w-full">
            <div class="flex items-center justify-between mb-3">
              <p class="text-white text-sm font-semibold truncate pr-4">{{ previewName }}</p>
              <div class="flex items-center gap-2 flex-shrink-0">
                <a :href="previewSrc" target="_blank" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white border border-white/30 hover:bg-white/10 transition-colors">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke="white" stroke-width="2" stroke-linecap="round"/>
                    <polyline points="15 3 21 3 21 9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="10" y1="14" x2="21" y2="3" stroke="white" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                  Open original
                </a>
                <button class="w-8 h-8 rounded-lg flex items-center justify-center text-white border border-white/30 hover:bg-white/10 transition-colors" @click="closePreview">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
            <img :src="previewSrc" :alt="previewName" class="w-full rounded-xl object-contain shadow-2xl" style="max-height:80vh;" />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.lightbox-enter-active { transition: opacity 0.2s ease; }
.lightbox-leave-active { transition: opacity 0.15s ease; }
.lightbox-enter-from,
.lightbox-leave-to     { opacity: 0; }
</style>
