<script setup>
definePageMeta({ middleware: 'auth' })

const { $api } = useNuxtApp()

const activeTab = ref('list')

// ── View Modal ─────────────────────────────────────────────────────────────
const viewingId = ref(null)

function openView(id) { viewingId.value = id }
function closeView()  { viewingId.value = null }

// ── Staff List ─────────────────────────────────────────────────────────────
const staffList   = ref([])
const listLoading = ref(false)
const listError   = ref('')
const search      = ref('')
const filterStatus = ref('')
const pagination  = reactive({ current_page: 1, total_page: 1, total_data: 0 })

async function fetchStaff(page = 1) {
  listLoading.value = true
  listError.value   = ''
  try {
    const params = new URLSearchParams({ page, limit: 20 })
    if (search.value)       params.set('search', search.value)
    if (filterStatus.value) params.set('status', filterStatus.value)
    const res = await $api(`/api/staff?${params}`)
    staffList.value = res.data
    Object.assign(pagination, res.pagination)
  } catch (e) {
    listError.value = e?.data?.message || 'Failed to load staff'
  } finally {
    listLoading.value = false
  }
}

watch([search, filterStatus], () => fetchStaff(1))

onMounted(() => {
  fetchStaff()
  loadDropdowns()
})

function statusLabel(s) {
  return s === 'A' ? 'Active' : s === 'N' ? 'New' : 'Inactive'
}
function statusColor(s) {
  return s === 'A'
    ? 'bg-green-100 text-green-700'
    : s === 'N'
    ? 'bg-yellow-100 text-yellow-700'
    : 'bg-red-100 text-red-600'
}

// ── Add User ────────────────────────────────────────────────────────────────
const branches    = ref([])
const departments = ref([])
const roles       = ref([])

const form = reactive({
  name: '', email: '', phone: '',
  position: '', password: '',
  branch_id: '', department_id: '', role_id: '',
})
const showPassword = ref(false)
const formErrors  = ref({})
const submitting  = ref(false)
const successData = ref(null)

const dropdownError = ref('')

async function loadDropdowns() {
  dropdownError.value = ''
  try {
    const [b, d, r] = await Promise.all([
      $api('/api/branches'),
      $api('/api/departments'),
      $api('/api/roles'),
    ])
    branches.value    = b.data ?? []
    departments.value = d.data ?? []
    roles.value       = r.data ?? []
  } catch (e) {
    dropdownError.value = 'Failed to load options. Please refresh.'
  }
}

function resetForm() {
  Object.assign(form, { name: '', email: '', phone: '', position: '', password: '', branch_id: '', department_id: '', role_id: '' })
  showPassword.value = false
  formErrors.value  = {}
  successData.value = null
}

async function submitForm() {
  formErrors.value = {}
  submitting.value = true
  try {
    const res = await $api('/api/staff', { method: 'POST', body: { ...form } })
    successData.value = res.data
    resetForm()
    fetchStaff()
  } catch (e) {
    if (e?.data?.errors) formErrors.value = e.data.errors
    else formErrors.value = { _global: [e?.data?.message || 'Something went wrong. Please try again.'] }
  } finally {
    submitting.value = false
  }
}

function switchToList() {
  activeTab.value   = 'list'
  successData.value = null
}

// ── Upload Users ─────────────────────────────────────────────────────────────
const uploadFile      = ref(null)
const uploadRows      = ref([])
const uploadError     = ref('')
const uploading       = ref(false)
const uploadResults   = ref(null)
const isDragging      = ref(false)

const TEMPLATE_HEADERS = ['name','email','password','phone','position','branch_code','department','role_code']
const ACCEPTED_EXTS    = ['.csv', '.xlsx', '.xls']

async function downloadTemplate() {
  try {
    // Fetch live branch / department / role data for dropdowns
    const [bRes, dRes, rRes] = await Promise.all([
      $api('/api/branches'),
      $api('/api/departments'),
      $api('/api/roles'),
    ])
    const branchCodes = (bRes.data ?? []).map(b => String(b.CODE).trim())
    const deptNames   = (dRes.data ?? []).map(d => String(d.NAME).trim())
    const roleCodes   = (rRes.data ?? []).map(r => String(r.CODE).trim())

    const { utils, writeFile } = await import('xlsx')

    // ── Main "Staff" sheet ────────────────────────────────────────────────
    const ws = utils.aoa_to_sheet([
      TEMPLATE_HEADERS,
      [
        'Somchai Keovong',
        'somchai@indochinabank.com',
        'Pass@1234',
        '020123456',
        'Officer',
        branchCodes[0] ?? '010',
        deptNames[0]   ?? 'IT Software Development',
        roleCodes[0]   ?? 'MAKER',
      ],
    ])

    // Force text format on phone (col 3) and branch_code (col 5)
    const textCols = [3, 5]
    const range = utils.decode_range(ws['!ref'])
    for (let r = 1; r <= range.e.r; r++) {
      for (const c of textCols) {
        const addr = utils.encode_cell({ r, c })
        if (ws[addr]) { ws[addr].t = 's'; ws[addr].z = '@' }
      }
    }

    ws['!cols'] = [
      { wch: 25 }, { wch: 35 }, { wch: 15 }, { wch: 15 },
      { wch: 20 }, { wch: 12 }, { wch: 30 }, { wch: 15 },
    ]

    // Dropdown validation — F = branch_code, G = department, H = role_code
    const bEnd = branchCodes.length + 1
    const dEnd = deptNames.length + 1
    const rEnd = roleCodes.length + 1
    ws['!datavalidation'] = [
      { sqref: 'F2:F1001', type: 'list', formula1: `Lists!$A$2:$A$${bEnd}` },
      { sqref: 'G2:G1001', type: 'list', formula1: `Lists!$B$2:$B$${dEnd}` },
      { sqref: 'H2:H1001', type: 'list', formula1: `Lists!$C$2:$C$${rEnd}` },
    ]

    // ── Hidden "Lists" sheet (dropdown source) ────────────────────────────
    const maxLen  = Math.max(branchCodes.length, deptNames.length, roleCodes.length)
    const listsData = [['branch_code', 'department', 'role_code']]
    for (let i = 0; i < maxLen; i++) {
      listsData.push([branchCodes[i] ?? '', deptNames[i] ?? '', roleCodes[i] ?? ''])
    }
    const listsWs = utils.aoa_to_sheet(listsData)

    // Keep branch_code column as text in the Lists sheet too
    for (let r = 1; r < listsData.length; r++) {
      const addr = utils.encode_cell({ r, c: 0 })
      if (listsWs[addr]) { listsWs[addr].t = 's'; listsWs[addr].z = '@' }
    }

    // ── Build workbook ────────────────────────────────────────────────────
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws,      'Staff')
    utils.book_append_sheet(wb, listsWs, 'Lists')

    // Hide the Lists sheet so users don't see / accidentally edit it
    wb.Workbook = { Sheets: [{ Hidden: 0 }, { Hidden: 1 }] }

    writeFile(wb, 'staff_upload_template.xlsx')
  } catch (e) {
    console.error('Template download failed:', e)
  }
}

async function parseFile(file) {
  const { read, utils } = await import('xlsx')
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        // header_offset:1 → first row is headers
        const jsonRows = utils.sheet_to_json(ws, { defval: '' })
        // Normalize header keys to lowercase
        const rows = jsonRows.map((r, idx) => {
          const norm = { _row: idx + 2 }
          for (const [k, v] of Object.entries(r)) {
            norm[k.trim().toLowerCase().replace(/\s+/g, '_')] = String(v ?? '').trim()
          }
          return norm
        }).filter(r => Object.keys(r).length > 1) // skip empty rows
        resolve(rows)
      } catch (err) {
        reject(new Error('Could not parse file: ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

function onFileChange(e) {
  handleFile(e.target?.files?.[0])
}

function onDrop(e) {
  isDragging.value = false
  handleFile(e.dataTransfer?.files?.[0])
}

async function handleFile(file) {
  uploadError.value   = ''
  uploadResults.value = null
  uploadRows.value    = []
  uploadFile.value    = null
  if (!file) return

  const ext = '.' + file.name.split('.').pop().toLowerCase()
  if (!ACCEPTED_EXTS.includes(ext)) {
    uploadError.value = 'Only .csv, .xlsx, or .xls files are accepted.'
    return
  }

  try {
    uploadFile.value = file
    const rows = await parseFile(file)
    if (!rows.length) { uploadError.value = 'File is empty or has no data rows.'; return }
    uploadRows.value = rows
  } catch (err) {
    uploadError.value = err.message
    uploadFile.value  = null
  }
}

function clearUpload() {
  uploadFile.value    = null
  uploadRows.value    = []
  uploadError.value   = ''
  uploadResults.value = null
  if (process.client && document.getElementById('csvInput')) {
    document.getElementById('csvInput').value = ''
  }
}

async function submitUpload() {
  if (!uploadRows.value.length) return
  uploading.value   = true
  uploadError.value = ''
  try {
    const res = await $api('/api/staff/upload', {
      method: 'POST',
      body: { rows: uploadRows.value },
    })
    uploadResults.value = res.data
    fetchStaff()
  } catch (e) {
    uploadError.value = e?.data?.message || 'Upload failed. Please try again.'
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="mb-6">
      <h1 class="text-xl font-bold text-gray-800">User Management</h1>
      <p class="text-sm text-gray-400 mt-0.5">Manage staff accounts and access</p>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mb-6 bg-white rounded-xl p-1 shadow-sm w-fit">
      <button
        class="px-5 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === 'list'
          ? 'text-white shadow-sm'
          : 'text-gray-500 hover:text-gray-700'"
        :style="activeTab === 'list' ? 'background: linear-gradient(135deg,#7C3AED,#6D28D9);' : ''"
        @click="activeTab = 'list'"
      >
        <span class="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="9" cy="7" r="4" :fill="activeTab === 'list' ? '#fff' : '#9CA3AF'"/>
            <path d="M1 21c0-4 3.6-7 8-7s8 3 8 7" :fill="activeTab === 'list' ? '#fff' : '#9CA3AF'"/>
            <circle cx="19" cy="8" r="3" :fill="activeTab === 'list' ? '#E9D5FF' : '#D1D5DB'"/>
          </svg>
          User List
        </span>
      </button>
      <button
        class="px-5 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === 'add'
          ? 'text-white shadow-sm'
          : 'text-gray-500 hover:text-gray-700'"
        :style="activeTab === 'add' ? 'background: linear-gradient(135deg,#7C3AED,#6D28D9);' : ''"
        @click="activeTab = 'add'"
      >
        <span class="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="10" cy="7" r="4" :fill="activeTab === 'add' ? '#fff' : '#9CA3AF'"/>
            <path d="M2 21c0-4 3.6-7 8-7" :stroke="activeTab === 'add' ? '#fff' : '#9CA3AF'" stroke-width="2" stroke-linecap="round" fill="none"/>
            <line x1="19" y1="13" x2="19" y2="21" :stroke="activeTab === 'add' ? '#fff' : '#9CA3AF'" stroke-width="2" stroke-linecap="round"/>
            <line x1="15" y1="17" x2="23" y2="17" :stroke="activeTab === 'add' ? '#fff' : '#9CA3AF'" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Add User
        </span>
      </button>
      <button
        class="px-5 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === 'upload'
          ? 'text-white shadow-sm'
          : 'text-gray-500 hover:text-gray-700'"
        :style="activeTab === 'upload' ? 'background: linear-gradient(135deg,#7C3AED,#6D28D9);' : ''"
        @click="activeTab = 'upload'; clearUpload()"
      >
        <span class="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" :stroke="activeTab === 'upload' ? '#fff' : '#9CA3AF'" stroke-width="2" stroke-linecap="round"/>
            <polyline points="17 8 12 3 7 8" :stroke="activeTab === 'upload' ? '#fff' : '#9CA3AF'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <line x1="12" y1="3" x2="12" y2="15" :stroke="activeTab === 'upload' ? '#fff' : '#9CA3AF'" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Upload
        </span>
      </button>
    </div>

    <!-- ===== TAB CONTENT ===== -->
    <Transition name="tab-fade" mode="out-in">

    <!-- ===== USER LIST TAB ===== -->
    <div v-if="activeTab === 'list'" key="list">
      <!-- Toolbar -->
      <div class="flex flex-col sm:flex-row gap-3 mb-4">
        <div class="relative flex-1 max-w-xs">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="#9CA3AF" stroke-width="2"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </span>
          <input
            v-model="search"
            type="text"
            placeholder="Search name or email..."
            autocomplete="off"
            class="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
          />
        </div>
        <select
          v-model="filterStatus"
          class="text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:border-purple-400 transition-all text-gray-600"
        >
          <option value="">All Status</option>
          <option value="A">Active</option>
          <option value="N">New</option>
          <option value="I">Inactive</option>
        </select>
        <button
          class="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all ml-auto"
          style="background: linear-gradient(135deg,#7C3AED,#6D28D9);"
          @click="activeTab = 'add'"
        >
          + Add User
        </button>
      </div>

      <!-- Error -->
      <p v-if="listError" class="text-sm text-red-500 mb-3">{{ listError }}</p>

      <!-- Table -->
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr style="background: linear-gradient(135deg,#7C3AED,#6D28D9);">
                <th class="text-left px-4 py-3 text-xs font-semibold text-white">#</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-white">Name</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-white hidden md:table-cell">Email</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-white hidden lg:table-cell">Department</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-white hidden lg:table-cell">Branch</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-white">Role</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-white">Status</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="listLoading">
                <td colspan="8" class="text-center py-12 text-gray-400 text-sm">
                  <div class="flex flex-col items-center gap-2">
                    <svg class="animate-spin w-6 h-6" style="color:#7C3AED;" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="32" stroke-dashoffset="12"/>
                    </svg>
                    Loading...
                  </div>
                </td>
              </tr>
              <tr v-else-if="!staffList.length">
                <td colspan="8" class="text-center py-12 text-gray-400 text-sm">No staff found</td>
              </tr>
              <tr
                v-for="(staff, idx) in staffList"
                v-else
                :key="staff.ID"
                class="border-t border-gray-50 hover:bg-purple-50 transition-colors"
              >
                <td class="px-4 py-3 text-gray-400 text-xs">{{ (pagination.current_page - 1) * 20 + idx + 1 }}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style="background: linear-gradient(135deg,#7C3AED,#5B21B6);">
                      {{ staff.NAME?.charAt(0)?.toUpperCase() }}
                    </div>
                    <div class="leading-tight">
                      <p class="font-medium text-gray-700">{{ staff.NAME }}</p>
                      <p class="text-xs text-gray-400 md:hidden">{{ staff.EMAIL }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3 text-gray-500 hidden md:table-cell">{{ staff.EMAIL }}</td>
                <td class="px-4 py-3 text-gray-500 hidden lg:table-cell">{{ staff.DEPARTMENT_NAME }}</td>
                <td class="px-4 py-3 text-gray-500 hidden lg:table-cell">{{ staff.BRANCH_CODE }}</td>
                <td class="px-4 py-3">
                  <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                    {{ staff.ROLE_CODE }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="statusColor(staff.STATUS)">
                    {{ statusLabel(staff.STATUS) }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <button
                    class="text-xs text-purple-500 hover:text-purple-700 font-medium transition-colors"
                    @click="openView(staff.ID)"
                  >
                    View
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="pagination.total_page > 1" class="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span class="text-xs text-gray-400">
            Total {{ pagination.total_data }} staff
          </span>
          <div class="flex gap-1">
            <button
              :disabled="!pagination.has_previous_page"
              class="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:border-purple-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              @click="fetchStaff(pagination.current_page - 1)"
            >← Prev</button>
            <span class="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style="background:#7C3AED;">
              {{ pagination.current_page }}
            </span>
            <button
              :disabled="!pagination.has_next_page"
              class="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:border-purple-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              @click="fetchStaff(pagination.current_page + 1)"
            >Next →</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== ADD USER TAB ===== -->
    <div v-else-if="activeTab === 'add'" key="add">

      <!-- Success card -->
      <div
        v-if="successData"
        class="bg-white rounded-xl shadow-sm p-6 mb-6 border-l-4"
        style="border-color:#10B981;"
      >
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style="background:#D1FAE5;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="flex-1">
            <p class="font-semibold text-gray-800">Staff account created!</p>
            <p class="text-sm text-gray-500 mt-0.5">
              Account for <strong>{{ successData.name }}</strong> is ready. They can log in with the password you set — and will be prompted to change it.
            </p>
            <div class="flex gap-2 mt-4">
              <button
                class="px-4 py-2 text-sm font-medium rounded-lg text-white transition-all"
                style="background: linear-gradient(135deg,#7C3AED,#6D28D9);"
                @click="successData = null"
              >Add Another</button>
              <button
                class="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
                @click="switchToList"
              >View User List</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Form -->
      <div v-else class="bg-white rounded-xl shadow-sm p-6">
        <h2 class="text-base font-semibold text-gray-700 mb-5">New Staff Account</h2>

        <!-- Dropdown load error -->
        <p v-if="dropdownError" class="text-sm text-red-500 mb-4 p-3 bg-red-50 rounded-lg">{{ dropdownError }}</p>

        <!-- Global error -->
        <div v-if="formErrors._global" class="flex items-start gap-2.5 mb-4 px-4 py-3 rounded-xl border border-red-200 bg-red-50">
          <svg class="flex-shrink-0 mt-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#EF4444" stroke-width="2"/>
            <line x1="12" y1="8" x2="12" y2="12" stroke="#EF4444" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="16" r="1" fill="#EF4444"/>
          </svg>
          <p class="text-sm text-red-600">{{ formErrors._global[0] }}</p>
        </div>

        <form class="space-y-5" @submit.prevent="submitForm">
          <!-- Row: Name + Email -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold mb-1.5" style="color:#6D28D9;">
                Full Name <span class="text-red-400">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                placeholder="e.g. Somchai Keovong"
                class="w-full px-3 py-2.5 text-sm rounded-lg border text-gray-700 placeholder-gray-300 focus:outline-none transition-all"
                :class="formErrors.name ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'"
              />
              <p v-if="formErrors.name" class="text-xs text-red-400 mt-1">{{ formErrors.name[0] }}</p>
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1.5" style="color:#6D28D9;">
                Email <span class="text-red-400">*</span>
              </label>
              <input
                v-model="form.email"
                type="email"
                placeholder="e.g. somchai@indochinabank.com"
                class="w-full px-3 py-2.5 text-sm rounded-lg border text-gray-700 placeholder-gray-300 focus:outline-none transition-all"
                :class="formErrors.email ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'"
              />
              <p v-if="formErrors.email" class="text-xs text-red-400 mt-1">{{ formErrors.email[0] }}</p>
            </div>
          </div>

          <!-- Row: Phone + Position -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold mb-1.5 text-gray-500">Phone</label>
              <input
                v-model="form.phone"
                type="text"
                placeholder="e.g. 020 5555 1234"
                class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-700 placeholder-gray-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1.5 text-gray-500">Position</label>
              <input
                v-model="form.position"
                type="text"
                placeholder="e.g. Senior Officer"
                class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-700 placeholder-gray-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
              />
            </div>
          </div>

          <!-- Row: Password -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold mb-1.5" style="color:#6D28D9;">
                Password <span class="text-red-400">*</span>
              </label>
              <div class="relative">
                <input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="Set initial password"
                  class="w-full pl-3 pr-10 py-2.5 text-sm rounded-lg border text-gray-700 placeholder-gray-300 focus:outline-none transition-all"
                  :class="formErrors.password ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-purple-500 transition-colors"
                  @click="showPassword = !showPassword"
                >
                  <svg v-if="!showPassword" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.8"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/>
                  </svg>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
              <p v-if="formErrors.password" class="text-xs text-red-400 mt-1">{{ formErrors.password[0] }}</p>
            </div>
          </div>


          <hr class="border-gray-100" />

          <!-- Row: Branch + Department + Role -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold mb-1.5" style="color:#6D28D9;">
                Branch <span class="text-red-400">*</span>
              </label>
              <select
                v-model="form.branch_id"
                class="w-full px-3 py-2.5 text-sm rounded-lg border text-gray-700 focus:outline-none transition-all"
                :class="formErrors.branch_id ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'"
              >
                <option value="">Select branch</option>
                <option v-for="b in branches" :key="b.ID" :value="b.ID">
                  {{ b.CODE }} — {{ b.NAME }}
                </option>
              </select>
              <p v-if="formErrors.branch_id" class="text-xs text-red-400 mt-1">{{ formErrors.branch_id[0] }}</p>
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1.5" style="color:#6D28D9;">
                Department <span class="text-red-400">*</span>
              </label>
              <select
                v-model="form.department_id"
                class="w-full px-3 py-2.5 text-sm rounded-lg border text-gray-700 focus:outline-none transition-all"
                :class="formErrors.department_id ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'"
              >
                <option value="">Select department</option>
                <option v-for="d in departments" :key="d.ID" :value="d.ID">
                  {{ d.NAME }}
                </option>
              </select>
              <p v-if="formErrors.department_id" class="text-xs text-red-400 mt-1">{{ formErrors.department_id[0] }}</p>
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1.5" style="color:#6D28D9;">
                Role <span class="text-red-400">*</span>
              </label>
              <select
                v-model="form.role_id"
                class="w-full px-3 py-2.5 text-sm rounded-lg border text-gray-700 focus:outline-none transition-all"
                :class="formErrors.role_id ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'"
              >
                <option value="">Select role</option>
                <option v-for="r in roles" :key="r.ID" :value="r.ID">
                  {{ r.NAME }}
                </option>
              </select>
              <p v-if="formErrors.role_id" class="text-xs text-red-400 mt-1">{{ formErrors.role_id[0] }}</p>
            </div>
          </div>

          <!-- Note -->
          <div class="flex items-start gap-2 p-3 rounded-lg text-xs text-gray-500" style="background:#F5F3FF;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="mt-0.5 flex-shrink-0">
              <circle cx="12" cy="12" r="10" stroke="#A78BFA" stroke-width="2"/>
              <line x1="12" y1="8" x2="12" y2="12" stroke="#A78BFA" stroke-width="2" stroke-linecap="round"/>
              <circle cx="12" cy="16" r="1" fill="#A78BFA"/>
            </svg>
            The staff member will use this password on first login and will be prompted to set a new one immediately.
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-3 pt-1">
            <button
              type="submit"
              :disabled="submitting"
              class="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
              :class="submitting ? 'opacity-70 cursor-not-allowed' : ''"
              style="background: linear-gradient(135deg,#7C3AED,#6D28D9); box-shadow: 0 4px 14px rgba(109,40,217,0.35);"
            >
              {{ submitting ? 'Creating...' : 'Create Account' }}
            </button>
            <button
              type="button"
              class="px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all"
              @click="resetForm"
            >
              Clear
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ===== UPLOAD TAB ===== -->
    <div v-else-if="activeTab === 'upload'" key="upload">
      <div class="bg-white rounded-xl shadow-sm p-6">
        <div class="flex items-center justify-between mb-5">
          <div>
            <h2 class="text-base font-semibold text-gray-700">Upload Staff File</h2>
            <p class="text-xs text-gray-400 mt-0.5">Bulk-create accounts from Excel or CSV — max 200 rows</p>
          </div>
          <button
            class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-purple-200 text-purple-600 hover:bg-purple-50 transition-all"
            @click="downloadTemplate"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Download Template
          </button>
        </div>

        <!-- Column guide -->
        <div class="mb-5 p-3 rounded-lg text-xs" style="background:#F5F3FF;">
          <p class="font-semibold text-purple-700 mb-1.5">Required CSV columns:</p>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="col in ['name','email','password','branch_code','department','role_code']" :key="col"
              class="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{{ col }}</span>
            <span class="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">phone</span>
            <span class="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">position</span>
          </div>
          <p class="mt-2 text-gray-500">Use <strong>branch_code</strong> (e.g. 010), <strong>department</strong> (full name), <strong>role_code</strong> (e.g. MAKER).</p>
        </div>

        <!-- Drop zone -->
        <div v-if="!uploadRows.length && !uploadResults"
          class="relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 transition-all cursor-pointer"
          :class="isDragging ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'"
          @dragover.prevent="isDragging = true"
          @dragleave="isDragging = false"
          @drop.prevent="onDrop"
          @click="$refs.csvInput.click()"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" :style="isDragging ? 'color:#7C3AED' : 'color:#D1D5DB'">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <polyline points="17 8 12 3 7 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          <div class="text-center">
            <p class="text-sm font-medium text-gray-600">Drop file here or <span style="color:#7C3AED;">browse</span></p>
            <p class="text-xs text-gray-400 mt-0.5">Accepts .xlsx, .xls, .csv</p>
          </div>
          <input id="csvInput" ref="csvInput" type="file" accept=".csv,.xlsx,.xls" class="hidden" @change="onFileChange" />
        </div>

        <!-- Error -->
        <div v-if="uploadError" class="flex items-start gap-2.5 mt-4 px-4 py-3 rounded-xl border border-red-200 bg-red-50">
          <svg class="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#EF4444" stroke-width="2"/>
            <line x1="12" y1="8" x2="12" y2="12" stroke="#EF4444" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="16" r="1" fill="#EF4444"/>
          </svg>
          <p class="text-sm text-red-600">{{ uploadError }}</p>
        </div>

        <!-- Preview -->
        <div v-if="uploadRows.length && !uploadResults" class="mt-4">
          <div class="flex items-center justify-between mb-2">
            <p class="text-xs font-semibold text-gray-600">
              Preview — <span style="color:#7C3AED;">{{ uploadRows.length }} rows</span> from <span class="text-gray-400">{{ uploadFile?.name }}</span>
            </p>
            <button class="text-xs text-gray-400 hover:text-red-400 transition-colors" @click="clearUpload">Clear</button>
          </div>
          <div class="overflow-x-auto rounded-xl border border-gray-100">
            <table class="w-full text-xs">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-100">
                  <th class="text-left px-3 py-2 text-gray-400 font-medium">#</th>
                  <th class="text-left px-3 py-2 text-gray-400 font-medium">Name</th>
                  <th class="text-left px-3 py-2 text-gray-400 font-medium">Email</th>
                  <th class="text-left px-3 py-2 text-gray-400 font-medium">Branch</th>
                  <th class="text-left px-3 py-2 text-gray-400 font-medium">Department</th>
                  <th class="text-left px-3 py-2 text-gray-400 font-medium">Role</th>
                  <th class="text-left px-3 py-2 text-gray-400 font-medium">Phone</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in uploadRows.slice(0, 10)" :key="idx" class="border-t border-gray-50">
                  <td class="px-3 py-2 text-gray-400">{{ row._row }}</td>
                  <td class="px-3 py-2 text-gray-700 font-medium">{{ row.name || '—' }}</td>
                  <td class="px-3 py-2 text-gray-500">{{ row.email || '—' }}</td>
                  <td class="px-3 py-2 text-gray-500">{{ row.branch_code || '—' }}</td>
                  <td class="px-3 py-2 text-gray-500">{{ row.department || '—' }}</td>
                  <td class="px-3 py-2"><span class="px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">{{ row.role_code || '—' }}</span></td>
                  <td class="px-3 py-2 text-gray-500">{{ row.phone || '—' }}</td>
                </tr>
                <tr v-if="uploadRows.length > 10">
                  <td colspan="7" class="px-3 py-2 text-center text-gray-400">… and {{ uploadRows.length - 10 }} more rows</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex gap-3 mt-4">
            <button
              :disabled="uploading"
              class="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
              :class="uploading ? 'opacity-70 cursor-not-allowed' : ''"
              style="background:linear-gradient(135deg,#7C3AED,#6D28D9); box-shadow:0 4px 14px rgba(109,40,217,0.35);"
              @click="submitUpload"
            >
              {{ uploading ? 'Uploading...' : `Upload ${uploadRows.length} Users` }}
            </button>
            <button class="px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all" @click="clearUpload">Cancel</button>
          </div>
        </div>

        <!-- Results -->
        <div v-if="uploadResults" class="mt-4">
          <!-- Summary -->
          <div class="flex gap-3 mb-4">
            <div class="flex-1 rounded-xl p-3 text-center" style="background:#D1FAE5;">
              <p class="text-xl font-bold text-green-700">{{ uploadResults.summary.succeeded }}</p>
              <p class="text-xs text-green-600 mt-0.5">Created</p>
            </div>
            <div class="flex-1 rounded-xl p-3 text-center" style="background:#FEE2E2;">
              <p class="text-xl font-bold text-red-600">{{ uploadResults.summary.failed }}</p>
              <p class="text-xs text-red-500 mt-0.5">Failed</p>
            </div>
            <div class="flex-1 rounded-xl p-3 text-center" style="background:#F3F4F6;">
              <p class="text-xl font-bold text-gray-700">{{ uploadResults.summary.total }}</p>
              <p class="text-xs text-gray-500 mt-0.5">Total</p>
            </div>
          </div>

          <!-- Results table -->
          <div class="overflow-x-auto rounded-xl border border-gray-100">
            <table class="w-full text-xs">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-100">
                  <th class="text-left px-3 py-2 text-gray-400 font-medium">Row</th>
                  <th class="text-left px-3 py-2 text-gray-400 font-medium">Name</th>
                  <th class="text-left px-3 py-2 text-gray-400 font-medium">Email</th>
                  <th class="text-left px-3 py-2 text-gray-400 font-medium">Status</th>
                  <th class="text-left px-3 py-2 text-gray-400 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in uploadResults.results" :key="r.row" class="border-t border-gray-50">
                  <td class="px-3 py-2 text-gray-400">{{ r.row }}</td>
                  <td class="px-3 py-2 text-gray-700">{{ r.name || '—' }}</td>
                  <td class="px-3 py-2 text-gray-500">{{ r.email || '—' }}</td>
                  <td class="px-3 py-2">
                    <span v-if="r.status === 'success'" class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Created</span>
                    <span v-else class="px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">Failed</span>
                  </td>
                  <td class="px-3 py-2 text-gray-400">{{ r.errors?.join(', ') || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex gap-3 mt-4">
            <button class="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all" style="background:linear-gradient(135deg,#7C3AED,#6D28D9);" @click="clearUpload">Upload Another</button>
            <button class="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all" @click="switchToList">View User List</button>
          </div>
        </div>
      </div>
    </div>

    </Transition>

    <!-- View Staff Modal -->
    <ViewModal
      v-if="viewingId"
      :staff-id="viewingId"
      @close="closeView"
      @updated="fetchStaff(pagination.current_page)"
    />
  </div>
</template>

<style scoped>
.tab-fade-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.tab-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.tab-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.tab-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
