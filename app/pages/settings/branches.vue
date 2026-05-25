<script setup>
definePageMeta({ middleware: 'auth' })

const { $api } = useNuxtApp()

// ── Tab ──────────────────────────────────────────────────────────────────────
const activeTab = ref('branches')

// ── Branches ─────────────────────────────────────────────────────────────────
const branches      = ref([])
const branchSearch  = ref('')
const branchLoading = ref(false)
const showBranchModal  = ref(false)
const editingBranch    = ref(null)
const branchSaving     = ref(false)
const branchForm = reactive({ name: '', code: '', type: 'BRANCH' })

const BRANCH_TYPES   = ['HEAD', 'BRANCH']
const PER_PAGE_OPTS  = [10, 20, 30]

// ── Branch pagination ─────────────────────────────────────────────────────────
const branchPage    = ref(1)
const branchPerPage = ref(10)

const filteredBranches = computed(() => {
  const q = branchSearch.value.trim().toLowerCase()
  if (!q) return branches.value
  return branches.value.filter(b =>
    b.NAME?.toLowerCase().includes(q) || b.CODE?.toLowerCase().includes(q)
  )
})

const branchTotalPages = computed(() => Math.max(1, Math.ceil(filteredBranches.value.length / branchPerPage.value)))

const paginatedBranches = computed(() => {
  const start = (branchPage.value - 1) * branchPerPage.value
  return filteredBranches.value.slice(start, start + branchPerPage.value)
})

const branchFrom = computed(() => filteredBranches.value.length === 0 ? 0 : (branchPage.value - 1) * branchPerPage.value + 1)
const branchTo   = computed(() => Math.min(branchPage.value * branchPerPage.value, filteredBranches.value.length))

watch([branchSearch, branchPerPage], () => { branchPage.value = 1 })

async function loadBranches() {
  branchLoading.value = true
  try {
    const res = await $api('/api/branches?all=1')
    branches.value = res.data || []
  } finally {
    branchLoading.value = false
  }
}

function openAddBranch() {
  editingBranch.value = null
  Object.assign(branchForm, { name: '', code: '', type: 'Branch' })
  showBranchModal.value = true
}

function openEditBranch(b) {
  editingBranch.value = b
  Object.assign(branchForm, { name: b.NAME, code: b.CODE, type: b.TYPE || 'BRANCH' })
  showBranchModal.value = true
}

async function saveBranch() {
  if (!branchForm.name.trim() || !branchForm.code.trim()) return
  branchSaving.value = true
  try {
    if (editingBranch.value) {
      await $api(`/api/branches/${editingBranch.value.ID}`, { method: 'PUT', body: branchForm })
    } else {
      await $api('/api/branches', { method: 'POST', body: branchForm })
    }
    showBranchModal.value = false
    await loadBranches()
  } finally {
    branchSaving.value = false
  }
}

// ── Departments ───────────────────────────────────────────────────────────────
const departments   = ref([])
const deptSearch    = ref('')
const deptLoading   = ref(false)
const showDeptModal = ref(false)
const editingDept   = ref(null)
const deptSaving    = ref(false)
const deptForm = reactive({ name: '', code: '' })

const filteredDepts = computed(() => {
  const q = deptSearch.value.trim().toLowerCase()
  if (!q) return departments.value
  return departments.value.filter(d =>
    d.NAME?.toLowerCase().includes(q) || d.CODE?.toLowerCase().includes(q)
  )
})

// ── Dept pagination ───────────────────────────────────────────────────────────
const deptPage    = ref(1)
const deptPerPage = ref(10)

const deptTotalPages = computed(() => Math.max(1, Math.ceil(filteredDepts.value.length / deptPerPage.value)))

const paginatedDepts = computed(() => {
  const start = (deptPage.value - 1) * deptPerPage.value
  return filteredDepts.value.slice(start, start + deptPerPage.value)
})

const deptFrom = computed(() => filteredDepts.value.length === 0 ? 0 : (deptPage.value - 1) * deptPerPage.value + 1)
const deptTo   = computed(() => Math.min(deptPage.value * deptPerPage.value, filteredDepts.value.length))

watch([deptSearch, deptPerPage], () => { deptPage.value = 1 })

async function loadDepartments() {
  deptLoading.value = true
  try {
    const res = await $api('/api/departments?all=1')
    departments.value = res.data || []
  } finally {
    deptLoading.value = false
  }
}

function openAddDept() {
  editingDept.value = null
  Object.assign(deptForm, { name: '', code: '' })
  showDeptModal.value = true
}

function openEditDept(d) {
  editingDept.value = d
  Object.assign(deptForm, { name: d.NAME, code: d.CODE })
  showDeptModal.value = true
}

async function saveDept() {
  if (!deptForm.name.trim() || !deptForm.code.trim()) return
  deptSaving.value = true
  try {
    if (editingDept.value) {
      await $api(`/api/departments/${editingDept.value.ID}`, { method: 'PUT', body: deptForm })
    } else {
      await $api('/api/departments', { method: 'POST', body: deptForm })
    }
    showDeptModal.value = false
    await loadDepartments()
  } finally {
    deptSaving.value = false
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
const deleteModal = reactive({ show: false, type: '', item: null, loading: false })

function confirmDelete(type, item) {
  deleteModal.type    = type
  deleteModal.item    = item
  deleteModal.show    = true
  deleteModal.loading = false
}

async function doDelete() {
  deleteModal.loading = true
  try {
    if (deleteModal.type === 'branch') {
      await $api(`/api/branches/${deleteModal.item.ID}`, { method: 'DELETE' })
      await loadBranches()
    } else {
      await $api(`/api/departments/${deleteModal.item.ID}`, { method: 'DELETE' })
      await loadDepartments()
    }
    deleteModal.show = false
  } finally {
    deleteModal.loading = false
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
onMounted(() => {
  loadBranches()
  loadDepartments()
})
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Organization Setup</h1>
        <p class="text-sm text-gray-400 mt-0.5">Manage branches and departments</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <div class="border-b border-gray-100 flex">
        <button
          class="px-6 py-3.5 text-sm font-medium transition-colors relative"
          :class="activeTab === 'branches'
            ? 'text-purple-700 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-purple-600'
            : 'text-gray-500 hover:text-gray-700'"
          @click="activeTab = 'branches'"
        >
          <span class="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="3" width="9" height="18" rx="2" fill="currentColor" opacity=".3"/>
              <rect x="13" y="8" width="9" height="13" rx="2" fill="currentColor"/>
            </svg>
            Branches
            <span class="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">{{ branches.length }}</span>
          </span>
        </button>
        <button
          class="px-6 py-3.5 text-sm font-medium transition-colors relative"
          :class="activeTab === 'departments'
            ? 'text-orange-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-orange-500'
            : 'text-gray-500 hover:text-gray-700'"
          @click="activeTab = 'departments'"
        >
          <span class="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" fill="currentColor"/>
              <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" opacity=".5"/>
            </svg>
            Departments
            <span class="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">{{ departments.length }}</span>
          </span>
        </button>
      </div>

      <!-- ── BRANCHES TAB ───────────────────────────────────────────────────── -->
      <div v-if="activeTab === 'branches'" class="p-5">
        <div class="flex flex-col sm:flex-row gap-3 mb-4">
          <div class="relative flex-1">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
              <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <input
              v-model="branchSearch"
              type="text"
              placeholder="Search branch name or code..."
              class="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
          <button
            class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex-shrink-0"
            style="background:#7C3AED;"
            @click="openAddBranch"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            Add Branch
          </button>
        </div>

        <!-- Branch Table -->
        <div class="overflow-x-auto rounded-lg border border-gray-100">
          <table class="w-full text-sm" style="min-width:520px;">
            <thead>
              <tr class="bg-gray-50 text-gray-500 text-xs">
                <th class="px-4 py-3 text-left font-medium">#</th>
                <th class="px-4 py-3 text-left font-medium">Code</th>
                <th class="px-4 py-3 text-left font-medium">Branch Name</th>
                <th class="px-4 py-3 text-left font-medium hidden sm:table-cell">Type</th>
                <th class="px-4 py-3 text-left font-medium">Status</th>
                <th class="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="branchLoading">
                <td colspan="6" class="px-4 py-8 text-center text-gray-400">
                  <div class="flex items-center justify-center gap-2">
                    <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#E5E7EB" stroke-width="3"/>
                      <path d="M12 2a10 10 0 0110 10" stroke="#7C3AED" stroke-width="3" stroke-linecap="round"/>
                    </svg>
                    Loading...
                  </div>
                </td>
              </tr>
              <tr v-else-if="filteredBranches.length === 0">
                <td colspan="6" class="px-4 py-8 text-center text-gray-400">No branches found</td>
              </tr>
              <tr
                v-for="(b, i) in paginatedBranches"
                :key="b.ID"
                class="border-t border-gray-50 hover:bg-gray-50 transition-colors"
              >
                <td class="px-4 py-3 text-gray-400">{{ branchFrom + i }}</td>
                <td class="px-4 py-3">
                  <span class="font-mono text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{{ b.CODE }}</span>
                </td>
                <td class="px-4 py-3 font-medium text-gray-800">{{ b.NAME }}</td>
                <td class="px-4 py-3 text-gray-500 hidden sm:table-cell">{{ b.TYPE || '—' }}</td>
                <td class="px-4 py-3">
                  <span
                    class="text-xs px-2 py-0.5 rounded-full font-medium"
                    :class="b.STATUS === 'A' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                  >{{ b.STATUS === 'A' ? 'Active' : 'Inactive' }}</span>
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      class="p-1.5 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors"
                      title="Edit"
                      @click="openEditBranch(b)"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </button>
                    <button
                      class="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete"
                      @click="confirmDelete('branch', b)"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Branch Pagination -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
          <div class="flex items-center gap-2 text-xs text-gray-500">
            <span>Show</span>
            <select
              v-model="branchPerPage"
              class="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option v-for="n in PER_PAGE_OPTS" :key="n" :value="n">{{ n }}</option>
            </select>
            <span>entries</span>
            <span class="ml-2 text-gray-400">
              Showing {{ branchFrom }}–{{ branchTo }} of {{ filteredBranches.length }}
            </span>
          </div>
          <div class="flex items-center gap-1">
            <button
              class="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              :disabled="branchPage === 1"
              @click="branchPage--"
            >Prev</button>
            <template v-for="p in branchTotalPages" :key="p">
              <button
                v-if="branchTotalPages <= 7 || Math.abs(p - branchPage) <= 1 || p === 1 || p === branchTotalPages"
                class="w-7 h-7 text-xs rounded-lg border transition-colors"
                :class="p === branchPage
                  ? 'bg-purple-600 border-purple-600 text-white font-medium'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'"
                @click="branchPage = p"
              >{{ p }}</button>
              <span
                v-else-if="p === branchPage - 2 || p === branchPage + 2"
                class="text-gray-400 text-xs px-0.5"
              >…</span>
            </template>
            <button
              class="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              :disabled="branchPage === branchTotalPages"
              @click="branchPage++"
            >Next</button>
          </div>
        </div>
      </div>

      <!-- ── DEPARTMENTS TAB ────────────────────────────────────────────────── -->
      <div v-if="activeTab === 'departments'" class="p-5">
        <div class="flex flex-col sm:flex-row gap-3 mb-4">
          <div class="relative flex-1">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
              <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <input
              v-model="deptSearch"
              type="text"
              placeholder="Search department name or code..."
              class="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <button
            class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex-shrink-0"
            style="background:#F97316;"
            @click="openAddDept"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            Add Department
          </button>
        </div>

        <!-- Department Table -->
        <div class="overflow-x-auto rounded-lg border border-gray-100">
          <table class="w-full text-sm" style="min-width:460px;">
            <thead>
              <tr class="bg-gray-50 text-gray-500 text-xs">
                <th class="px-4 py-3 text-left font-medium">#</th>
                <th class="px-4 py-3 text-left font-medium">Code</th>
                <th class="px-4 py-3 text-left font-medium">Department Name</th>
                <th class="px-4 py-3 text-left font-medium">Status</th>
                <th class="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="deptLoading">
                <td colspan="5" class="px-4 py-8 text-center text-gray-400">
                  <div class="flex items-center justify-center gap-2">
                    <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#E5E7EB" stroke-width="3"/>
                      <path d="M12 2a10 10 0 0110 10" stroke="#F97316" stroke-width="3" stroke-linecap="round"/>
                    </svg>
                    Loading...
                  </div>
                </td>
              </tr>
              <tr v-else-if="filteredDepts.length === 0">
                <td colspan="5" class="px-4 py-8 text-center text-gray-400">No departments found</td>
              </tr>
              <tr
                v-for="(d, i) in paginatedDepts"
                :key="d.ID"
                class="border-t border-gray-50 hover:bg-gray-50 transition-colors"
              >
                <td class="px-4 py-3 text-gray-400">{{ deptFrom + i }}</td>
                <td class="px-4 py-3">
                  <span class="font-mono text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded">{{ d.CODE }}</span>
                </td>
                <td class="px-4 py-3 font-medium text-gray-800">{{ d.NAME }}</td>
                <td class="px-4 py-3">
                  <span
                    class="text-xs px-2 py-0.5 rounded-full font-medium"
                    :class="d.STATUS === 'A' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                  >{{ d.STATUS === 'A' ? 'Active' : 'Inactive' }}</span>
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      class="p-1.5 rounded-lg hover:bg-orange-50 text-gray-400 hover:text-orange-600 transition-colors"
                      title="Edit"
                      @click="openEditDept(d)"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </button>
                    <button
                      class="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete"
                      @click="confirmDelete('department', d)"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Dept Pagination -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
          <div class="flex items-center gap-2 text-xs text-gray-500">
            <span>Show</span>
            <select
              v-model="deptPerPage"
              class="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option v-for="n in PER_PAGE_OPTS" :key="n" :value="n">{{ n }}</option>
            </select>
            <span>entries</span>
            <span class="ml-2 text-gray-400">
              Showing {{ deptFrom }}–{{ deptTo }} of {{ filteredDepts.length }}
            </span>
          </div>
          <div class="flex items-center gap-1">
            <button
              class="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              :disabled="deptPage === 1"
              @click="deptPage--"
            >Prev</button>
            <template v-for="p in deptTotalPages" :key="p">
              <button
                v-if="deptTotalPages <= 7 || Math.abs(p - deptPage) <= 1 || p === 1 || p === deptTotalPages"
                class="w-7 h-7 text-xs rounded-lg border transition-colors"
                :class="p === deptPage
                  ? 'bg-orange-500 border-orange-500 text-white font-medium'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'"
                @click="deptPage = p"
              >{{ p }}</button>
              <span
                v-else-if="p === deptPage - 2 || p === deptPage + 2"
                class="text-gray-400 text-xs px-0.5"
              >…</span>
            </template>
            <button
              class="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              :disabled="deptPage === deptTotalPages"
              @click="deptPage++"
            >Next</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── BRANCH MODAL ───────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showBranchModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.4);">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md">
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 class="font-semibold text-gray-800">{{ editingBranch ? 'Edit Branch' : 'Add Branch' }}</h3>
            <button class="text-gray-400 hover:text-gray-600 transition-colors" @click="showBranchModal = false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
          <div class="p-5 space-y-4">
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Branch Code <span class="text-red-400">*</span></label>
              <input
                v-model="branchForm.code"
                type="text"
                placeholder="e.g. VTE001"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 uppercase"
                @input="branchForm.code = branchForm.code.toUpperCase()"
              />
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Branch Name <span class="text-red-400">*</span></label>
              <input
                v-model="branchForm.name"
                type="text"
                placeholder="e.g. Vientiane Main Branch"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Type</label>
              <select
                v-model="branchForm.type"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option v-for="t in BRANCH_TYPES" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
          </div>
          <div class="flex gap-3 px-5 py-4 border-t border-gray-100">
            <button
              class="flex-1 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              @click="showBranchModal = false"
            >Cancel</button>
            <button
              class="flex-1 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
              style="background:#7C3AED;"
              :disabled="branchSaving || !branchForm.name.trim() || !branchForm.code.trim()"
              @click="saveBranch"
            >
              <span v-if="branchSaving">Saving...</span>
              <span v-else>{{ editingBranch ? 'Update' : 'Add Branch' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── DEPARTMENT MODAL ───────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showDeptModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.4);">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md">
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 class="font-semibold text-gray-800">{{ editingDept ? 'Edit Department' : 'Add Department' }}</h3>
            <button class="text-gray-400 hover:text-gray-600 transition-colors" @click="showDeptModal = false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
          <div class="p-5 space-y-4">
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Department Code <span class="text-red-400">*</span></label>
              <input
                v-model="deptForm.code"
                type="text"
                placeholder="e.g. IT"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 uppercase"
                @input="deptForm.code = deptForm.code.toUpperCase()"
              />
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1 block">Department Name <span class="text-red-400">*</span></label>
              <input
                v-model="deptForm.name"
                type="text"
                placeholder="e.g. Information Technology"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>
          <div class="flex gap-3 px-5 py-4 border-t border-gray-100">
            <button
              class="flex-1 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              @click="showDeptModal = false"
            >Cancel</button>
            <button
              class="flex-1 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
              style="background:#F97316;"
              :disabled="deptSaving || !deptForm.name.trim() || !deptForm.code.trim()"
              @click="saveDept"
            >
              <span v-if="deptSaving">Saving...</span>
              <span v-else>{{ editingDept ? 'Update' : 'Add Department' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── DELETE CONFIRM MODAL ───────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="deleteModal.show" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.4);">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-sm">
          <div class="p-6 text-center">
            <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01" stroke="#EF4444" stroke-width="2" stroke-linecap="round"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#EF4444" stroke-width="2"/></svg>
            </div>
            <h3 class="font-semibold text-gray-800 mb-1">Delete {{ deleteModal.type === 'branch' ? 'Branch' : 'Department' }}</h3>
            <p class="text-sm text-gray-500">
              Are you sure you want to delete
              <span class="font-medium text-gray-700">{{ deleteModal.item?.NAME }}</span>?
              This action cannot be undone.
            </p>
          </div>
          <div class="flex gap-3 px-5 pb-5">
            <button
              class="flex-1 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              @click="deleteModal.show = false"
            >Cancel</button>
            <button
              class="flex-1 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
              :disabled="deleteModal.loading"
              @click="doDelete"
            >
              <span v-if="deleteModal.loading">Deleting...</span>
              <span v-else>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
