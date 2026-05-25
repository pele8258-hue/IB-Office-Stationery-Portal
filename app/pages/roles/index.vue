<script setup>
definePageMeta({ middleware: 'auth' })

const { $api } = useNuxtApp()
const authStore = useAuthStore()

// ── Sub-tabs ──────────────────────────────────────────────────────────────────
const activeTab = ref('roles')

// ── Roles ─────────────────────────────────────────────────────────────────────
const roles        = ref([])
const rolesLoading = ref(false)
const rolesError   = ref('')

async function fetchRoles() {
  rolesLoading.value = true
  rolesError.value   = ''
  try {
    const res  = await $api('/api/roles')
    roles.value = res.data ?? []
  } catch (e) {
    rolesError.value = e?.data?.message || 'Failed to load roles'
  } finally {
    rolesLoading.value = false
  }
}

// ── Selected Role + Permissions ───────────────────────────────────────────────
const selectedRole = ref(null)
const permissions  = ref([])   // [{ resource_id, code, name, module, can_view, can_create, can_edit, can_delete }]
const permLoading  = ref(false)
const saving       = ref(false)
const saveMsg      = ref('')

async function selectRole(role) {
  selectedRole.value = role
  saveMsg.value      = ''
  permLoading.value  = true
  try {
    const res = await $api(`/api/roles/${role.ID}/permissions`)
    permissions.value = (res.data ?? []).map(p => ({
      ...p,
      can_view:   p.CAN_VIEW   === 1,
      can_create: p.CAN_CREATE === 1,
      can_edit:   p.CAN_EDIT   === 1,
      can_delete: p.CAN_DELETE === 1,
      resource_id: p.RESOURCE_ID,
      code:        p.CODE,
      name:        p.NAME,
      module:      p.MODULE,
    }))
  } catch (e) {
    permissions.value = []
  } finally {
    permLoading.value = false
  }
}

function toggleAll(perm) {
  const all = perm.can_view && perm.can_create && perm.can_edit && perm.can_delete
  perm.can_view   = !all
  perm.can_create = !all
  perm.can_edit   = !all
  perm.can_delete = !all
}

function onActionCheck(perm, action) {
  if (action !== 'can_view' && perm[action]) {
    perm.can_view = true
  }
}

async function savePermissions() {
  saving.value  = true
  saveMsg.value = ''
  try {
    await $api(`/api/roles/${selectedRole.value.ID}/permissions`, {
      method: 'PUT',
      body: {
        permissions: permissions.value.map(p => ({
          resource_id: p.resource_id,
          can_view:    p.can_view,
          can_create:  p.can_create,
          can_edit:    p.can_edit,
          can_delete:  p.can_delete,
        })),
      },
    })

    // If editing the current user's own role, refresh their live permissions immediately
    if (authStore.user?.role_id === selectedRole.value.ID) {
      const newPerms = {}
      for (const p of permissions.value) {
        newPerms[p.code] = {
          view:   !!p.can_view,
          create: !!p.can_create,
          edit:   !!p.can_edit,
          delete: !!p.can_delete,
        }
      }
      authStore.permissions = newPerms
      localStorage.setItem('auth_permissions', JSON.stringify(newPerms))
    }

    saveMsg.value = 'Permissions saved successfully!'
  } catch (e) {
    saveMsg.value = '❌ ' + (e?.data?.message || 'Failed to save')
  } finally {
    saving.value = false
    setTimeout(() => { saveMsg.value = '' }, 3000)
  }
}

// ── Add Role ──────────────────────────────────────────────────────────────────
const showAddRole  = ref(false)
const addRoleForm  = reactive({ name: '', code: '', description: '' })
const addRoleErr   = ref({})
const addRoleLoading = ref(false)

function openAddRole() {
  Object.assign(addRoleForm, { name: '', code: '', description: '' })
  addRoleErr.value  = {}
  showAddRole.value = true
}

async function submitAddRole() {
  addRoleErr.value    = {}
  addRoleLoading.value = true
  try {
    const res = await $api('/api/roles', { method: 'POST', body: { ...addRoleForm } })
    showAddRole.value = false
    await fetchRoles()
    const newRole = roles.value.find(r => r.ID === res.data?.role_id)
    if (newRole) selectRole(newRole)
  } catch (e) {
    if (e?.data?.errors) addRoleErr.value = e.data.errors
    else addRoleErr.value = { _global: [e?.data?.message || 'Failed to create role'] }
  } finally {
    addRoleLoading.value = false
  }
}

// ── Resources ─────────────────────────────────────────────────────────────────
const resources        = ref([])
const resourcesLoading = ref(false)
const resourcesError   = ref('')

async function fetchResources() {
  resourcesLoading.value = true
  resourcesError.value   = ''
  try {
    const res = await $api('/api/resources')
    resources.value = res.data ?? []
  } catch (e) {
    resourcesError.value = e?.data?.message || 'Failed to load resources'
  } finally {
    resourcesLoading.value = false
  }
}

// ── Add/Edit Resource ─────────────────────────────────────────────────────────
const resourceModal   = ref(false)
const editingResource = ref(null)
const resForm  = reactive({ code: '', name: '', module: '', description: '' })
const resErr   = ref({})
const resSaving = ref(false)

function openAddResource() {
  editingResource.value = null
  Object.assign(resForm, { code: '', name: '', module: '', description: '' })
  resErr.value    = {}
  resourceModal.value = true
}

function openEditResource(r) {
  editingResource.value = r
  Object.assign(resForm, { code: r.CODE, name: r.NAME, module: r.MODULE, description: r.DESCRIPTION || '' })
  resErr.value    = {}
  resourceModal.value = true
}

async function submitResource() {
  resErr.value   = {}
  resSaving.value = true
  try {
    if (editingResource.value) {
      await $api(`/api/resources/${editingResource.value.ID}`, { method: 'PUT', body: { ...resForm } })
    } else {
      await $api('/api/resources', { method: 'POST', body: { ...resForm } })
    }
    resourceModal.value = false
    await fetchResources()
  } catch (e) {
    if (e?.data?.errors) resErr.value = e.data.errors
    else resErr.value = { _global: [e?.data?.message || 'Failed to save resource'] }
  } finally {
    resSaving.value = false
  }
}

async function toggleResourceStatus(r) {
  const newStatus = r.STATUS === 'A' ? 'I' : 'A'
  await $api(`/api/resources/${r.ID}`, {
    method: 'PUT',
    body: { name: r.NAME, module: r.MODULE, description: r.DESCRIPTION, status: newStatus },
  })
  r.STATUS = newStatus
}

// ── Init ───────────────────────────────────────────────────────────────────────
onMounted(() => {
  fetchRoles()
  fetchResources()
})

// Group permissions by module for display
const groupedPerms = computed(() => {
  const groups = {}
  for (const p of permissions.value) {
    const mod = p.module || 'OTHER'
    if (!groups[mod]) groups[mod] = []
    groups[mod].push(p)
  }
  return groups
})

const moduleColor = (mod) => {
  const m = { CORE: '#3B82F6', OFFICE: '#10B981', ADMIN: '#7C3AED', CUSTOM: '#F59E0B' }
  return m[mod] || '#9CA3AF'
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="mb-6">
      <h1 class="text-xl font-bold text-gray-800">Role & Resource Management</h1>
      <p class="text-sm text-gray-400 mt-0.5">Define roles and control what each role can access</p>
    </div>

    <!-- Sub-tabs -->
    <div class="flex gap-1 mb-6 bg-white rounded-xl p-1 shadow-sm w-fit">
      <button
        class="px-5 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === 'roles' ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'"
        :style="activeTab === 'roles' ? 'background:linear-gradient(135deg,#7C3AED,#6D28D9)' : ''"
        @click="activeTab = 'roles'"
      >
        <span class="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="9" cy="7" r="4" :fill="activeTab==='roles'?'#fff':'#9CA3AF'"/>
            <path d="M1 21c0-4 3.6-7 8-7s8 3 8 7" :fill="activeTab==='roles'?'#fff':'#9CA3AF'"/>
            <circle cx="19" cy="8" r="3" :fill="activeTab==='roles'?'#E9D5FF':'#D1D5DB'"/>
          </svg>
          Roles
        </span>
      </button>
      <button
        class="px-5 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeTab === 'resources' ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'"
        :style="activeTab === 'resources' ? 'background:linear-gradient(135deg,#7C3AED,#6D28D9)' : ''"
        @click="activeTab = 'resources'"
      >
        <span class="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="8" height="8" rx="1.5" :fill="activeTab==='resources'?'#fff':'#9CA3AF'"/>
            <rect x="13" y="3" width="8" height="8" rx="1.5" :fill="activeTab==='resources'?'#E9D5FF':'#D1D5DB'"/>
            <rect x="3" y="13" width="8" height="8" rx="1.5" :fill="activeTab==='resources'?'#E9D5FF':'#D1D5DB'"/>
            <rect x="13" y="13" width="8" height="8" rx="1.5" :fill="activeTab==='resources'?'#fff':'#9CA3AF'"/>
          </svg>
          Resources
        </span>
      </button>
    </div>

    <!-- ===== ROLES TAB ===== -->
    <div v-if="activeTab === 'roles'" class="flex gap-4 items-start">

      <!-- Left: Role list -->
      <div class="w-56 flex-shrink-0">
        <div class="bg-white rounded-xl shadow-sm overflow-hidden">
          <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Roles</span>
            <button
              class="text-xs font-medium px-2.5 py-1 rounded-lg text-white transition-all"
              style="background:linear-gradient(135deg,#7C3AED,#6D28D9);"
              @click="openAddRole"
            >+ Add</button>
          </div>

          <div v-if="rolesLoading" class="py-8 text-center">
            <svg class="animate-spin w-5 h-5 mx-auto" style="color:#7C3AED;" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="32" stroke-dashoffset="12"/>
            </svg>
          </div>
          <p v-else-if="rolesError" class="text-xs text-red-500 p-3">{{ rolesError }}</p>
          <div v-else class="py-1">
            <button
              v-for="role in roles"
              :key="role.ID"
              class="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors text-sm"
              :class="selectedRole?.ID === role.ID
                ? 'bg-purple-50 text-purple-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-50'"
              @click="selectRole(role)"
            >
              <span
                class="w-2 h-2 rounded-full flex-shrink-0"
                :style="selectedRole?.ID === role.ID ? 'background:#7C3AED' : 'background:#D1D5DB'"
              ></span>
              <span class="flex-1 truncate">{{ role.NAME }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Right: Permission matrix -->
      <div class="flex-1">
        <!-- Placeholder when no role selected -->
        <div v-if="!selectedRole" class="bg-white rounded-xl shadow-sm flex flex-col items-center justify-center py-16 text-center">
          <div class="w-12 h-12 rounded-full flex items-center justify-center mb-3" style="background:#F5F3FF;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="7" r="4" fill="#A78BFA"/>
              <path d="M1 21c0-4 3.6-7 8-7s8 3 8 7" fill="#A78BFA"/>
              <circle cx="19" cy="8" r="3" fill="#C4B5FD"/>
            </svg>
          </div>
          <p class="text-sm font-medium text-gray-600">Select a role to manage permissions</p>
          <p class="text-xs text-gray-400 mt-1">Click any role on the left to view and edit its access rules</p>
        </div>

        <!-- Permission matrix -->
        <div v-else class="bg-white rounded-xl shadow-sm overflow-hidden">
          <!-- Header -->
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 class="text-sm font-semibold text-gray-800">
                Permissions — <span style="color:#7C3AED;">{{ selectedRole.NAME }}</span>
              </h2>
              <p class="text-xs text-gray-400 mt-0.5">{{ selectedRole.DESCRIPTION || 'Define what this role can access and do' }}</p>
            </div>
            <div class="flex items-center gap-3">
              <Transition name="fade">
                <span
                  v-if="saveMsg"
                  class="text-xs px-3 py-1.5 rounded-lg font-medium"
                  :class="saveMsg.startsWith('❌') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'"
                >{{ saveMsg }}</span>
              </Transition>
              <button
                :disabled="saving"
                class="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                :class="saving ? 'opacity-70 cursor-not-allowed' : ''"
                style="background:linear-gradient(135deg,#7C3AED,#6D28D9); box-shadow:0 4px 14px rgba(109,40,217,0.3);"
                @click="savePermissions"
              >
                {{ saving ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </div>

          <!-- Loading -->
          <div v-if="permLoading" class="py-12 text-center">
            <svg class="animate-spin w-6 h-6 mx-auto" style="color:#7C3AED;" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="32" stroke-dashoffset="12"/>
            </svg>
          </div>

          <!-- Table -->
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-100">
                  <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500">Resource</th>
                  <th class="text-center px-4 py-3 text-xs font-semibold text-gray-500 w-20">View</th>
                  <th class="text-center px-4 py-3 text-xs font-semibold text-gray-500 w-20">Create</th>
                  <th class="text-center px-4 py-3 text-xs font-semibold text-gray-500 w-20">Edit</th>
                  <th class="text-center px-4 py-3 text-xs font-semibold text-gray-500 w-20">Delete</th>
                  <th class="text-center px-4 py-3 text-xs font-semibold text-gray-500 w-20">All</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(group, mod) in groupedPerms" :key="mod">
                  <!-- Module group header -->
                  <tr class="border-t border-gray-100">
                    <td colspan="6" class="px-5 py-1.5">
                      <span
                        class="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                        :style="`color:${moduleColor(mod)}; background:${moduleColor(mod)}18`"
                      >{{ mod }}</span>
                    </td>
                  </tr>
                  <!-- Permission rows -->
                  <tr
                    v-for="perm in group"
                    :key="perm.resource_id"
                    class="border-t border-gray-50 hover:bg-purple-50/40 transition-colors"
                  >
                    <td class="px-5 py-3">
                      <p class="font-medium text-gray-700 text-sm">{{ perm.name }}</p>
                      <p class="text-xs text-gray-400 font-mono">{{ perm.code }}</p>
                    </td>
                    <td class="text-center px-4 py-3">
                      <input
                        v-model="perm.can_view"
                        type="checkbox"
                        class="perm-check accent-purple-600 w-4 h-4 cursor-pointer"
                        @change="() => { if (!perm.can_view) { perm.can_create = false; perm.can_edit = false; perm.can_delete = false } }"
                      />
                    </td>
                    <td class="text-center px-4 py-3">
                      <input
                        v-model="perm.can_create"
                        type="checkbox"
                        class="perm-check accent-purple-600 w-4 h-4 cursor-pointer"
                        @change="() => { if (perm.can_create) perm.can_view = true }"
                      />
                    </td>
                    <td class="text-center px-4 py-3">
                      <input
                        v-model="perm.can_edit"
                        type="checkbox"
                        class="perm-check accent-purple-600 w-4 h-4 cursor-pointer"
                        @change="() => { if (perm.can_edit) perm.can_view = true }"
                      />
                    </td>
                    <td class="text-center px-4 py-3">
                      <input
                        v-model="perm.can_delete"
                        type="checkbox"
                        class="perm-check accent-purple-600 w-4 h-4 cursor-pointer"
                        @change="() => { if (perm.can_delete) perm.can_view = true }"
                      />
                    </td>
                    <td class="text-center px-4 py-3">
                      <button
                        class="text-xs px-2 py-1 rounded-lg border transition-colors"
                        :class="perm.can_view && perm.can_create && perm.can_edit && perm.can_delete
                          ? 'border-purple-300 bg-purple-50 text-purple-700'
                          : 'border-gray-200 text-gray-400 hover:border-purple-200 hover:text-purple-500'"
                        @click="toggleAll(perm)"
                      >All</button>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== RESOURCES TAB ===== -->
    <div v-else-if="activeTab === 'resources'">
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-semibold text-gray-800">System Resources</h2>
            <p class="text-xs text-gray-400 mt-0.5">Pages and modules that can be assigned permission rules</p>
          </div>
          <button
            class="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
            style="background:linear-gradient(135deg,#7C3AED,#6D28D9);"
            @click="openAddResource"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <line x1="12" y1="5" x2="12" y2="19" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
              <line x1="5" y1="12" x2="19" y2="12" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
            Add Resource
          </button>
        </div>

        <p v-if="resourcesError" class="text-sm text-red-500 p-5">{{ resourcesError }}</p>

        <div v-if="resourcesLoading" class="py-12 text-center">
          <svg class="animate-spin w-6 h-6 mx-auto" style="color:#7C3AED;" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="32" stroke-dashoffset="12"/>
          </svg>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500">#</th>
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500">Code</th>
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500">Name</th>
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500">Module</th>
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500">Status</th>
                <th class="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!resources.length">
                <td colspan="6" class="text-center py-10 text-gray-400 text-sm">No resources found</td>
              </tr>
              <tr
                v-for="(r, idx) in resources"
                :key="r.ID"
                class="border-t border-gray-50 hover:bg-purple-50/40 transition-colors"
              >
                <td class="px-5 py-3 text-gray-400 text-xs">{{ idx + 1 }}</td>
                <td class="px-5 py-3">
                  <span class="font-mono text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">{{ r.CODE }}</span>
                </td>
                <td class="px-5 py-3 font-medium text-gray-700">{{ r.NAME }}</td>
                <td class="px-5 py-3">
                  <span
                    class="text-xs px-2 py-0.5 rounded-full font-medium"
                    :style="`color:${moduleColor(r.MODULE)}; background:${moduleColor(r.MODULE)}18`"
                  >{{ r.MODULE }}</span>
                </td>
                <td class="px-5 py-3">
                  <button
                    class="text-xs px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer"
                    :class="r.STATUS === 'A' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                    @click="toggleResourceStatus(r)"
                  >{{ r.STATUS === 'A' ? 'Active' : 'Inactive' }}</button>
                </td>
                <td class="px-5 py-3">
                  <button class="text-xs text-purple-500 hover:text-purple-700 font-medium transition-colors" @click="openEditResource(r)">Edit</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ===== ADD ROLE MODAL ===== -->
    <Transition name="modal">
      <div v-if="showAddRole" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.4);" @click.self="showAddRole = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <h3 class="text-base font-semibold text-gray-800">Add New Role</h3>
            <button class="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-400" @click="showAddRole = false">✕</button>
          </div>
          <form class="px-6 py-5 space-y-4" @submit.prevent="submitAddRole">
            <p v-if="addRoleErr._global" class="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{{ addRoleErr._global[0] }}</p>
            <div>
              <label class="block text-xs font-semibold mb-1.5" style="color:#6D28D9;">Role Name <span class="text-red-400">*</span></label>
              <input
                v-model="addRoleForm.name"
                type="text"
                placeholder="e.g. Senior Maker"
                class="w-full px-3 py-2.5 text-sm rounded-lg border text-gray-700 placeholder-gray-300 focus:outline-none transition-all"
                :class="addRoleErr.name ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'"
              />
              <p v-if="addRoleErr.name" class="text-xs text-red-400 mt-1">{{ addRoleErr.name[0] }}</p>
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1.5" style="color:#6D28D9;">Role Code <span class="text-red-400">*</span></label>
              <input
                v-model="addRoleForm.code"
                type="text"
                placeholder="e.g. SENIOR_MAKER"
                class="w-full px-3 py-2.5 text-sm rounded-lg border text-gray-700 placeholder-gray-300 focus:outline-none transition-all font-mono"
                :class="addRoleErr.code ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'"
              />
              <p v-if="addRoleErr.code" class="text-xs text-red-400 mt-1">{{ addRoleErr.code[0] }}</p>
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1.5 text-gray-500">Description</label>
              <input
                v-model="addRoleForm.description"
                type="text"
                placeholder="Optional description"
                class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-700 placeholder-gray-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
              />
            </div>
            <div class="flex gap-3 pt-1">
              <button
                type="submit"
                :disabled="addRoleLoading"
                class="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
                :class="addRoleLoading ? 'opacity-70 cursor-not-allowed' : ''"
                style="background:linear-gradient(135deg,#7C3AED,#6D28D9);"
              >{{ addRoleLoading ? 'Creating...' : 'Create Role' }}</button>
              <button type="button" class="px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all" @click="showAddRole = false">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- ===== ADD/EDIT RESOURCE MODAL ===== -->
    <Transition name="modal">
      <div v-if="resourceModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.4);" @click.self="resourceModal = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <h3 class="text-base font-semibold text-gray-800">{{ editingResource ? 'Edit Resource' : 'Add Resource' }}</h3>
            <button class="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-400" @click="resourceModal = false">✕</button>
          </div>
          <form class="px-6 py-5 space-y-4" @submit.prevent="submitResource">
            <p v-if="resErr._global" class="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{{ resErr._global[0] }}</p>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold mb-1.5" style="color:#6D28D9;">Code <span class="text-red-400">*</span></label>
                <input
                  v-model="resForm.code"
                  type="text"
                  placeholder="DASHBOARD"
                  :disabled="!!editingResource"
                  class="w-full px-3 py-2.5 text-sm rounded-lg border font-mono disabled:bg-gray-50 disabled:text-gray-400 focus:outline-none transition-all"
                  :class="resErr.code ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-purple-400'"
                />
                <p v-if="resErr.code" class="text-xs text-red-400 mt-1">{{ resErr.code[0] }}</p>
              </div>
              <div>
                <label class="block text-xs font-semibold mb-1.5 text-gray-500">Module</label>
                <select v-model="resForm.module" class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-purple-400 transition-all text-gray-700">
                  <option value="CORE">CORE</option>
                  <option value="OFFICE">OFFICE</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="CUSTOM">CUSTOM</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1.5" style="color:#6D28D9;">Name <span class="text-red-400">*</span></label>
              <input
                v-model="resForm.name"
                type="text"
                placeholder="e.g. Dashboard"
                class="w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none transition-all"
                :class="resErr.name ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-purple-400'"
              />
              <p v-if="resErr.name" class="text-xs text-red-400 mt-1">{{ resErr.name[0] }}</p>
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1.5 text-gray-500">Description</label>
              <input v-model="resForm.description" type="text" placeholder="Optional" class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-purple-400 transition-all" />
            </div>
            <div class="flex gap-3 pt-1">
              <button
                type="submit"
                :disabled="resSaving"
                class="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
                :class="resSaving ? 'opacity-70 cursor-not-allowed' : ''"
                style="background:linear-gradient(135deg,#7C3AED,#6D28D9);"
              >{{ resSaving ? 'Saving...' : editingResource ? 'Save Changes' : 'Add Resource' }}</button>
              <button type="button" class="px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all" @click="resourceModal = false">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.modal-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.modal-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.97); }
.perm-check { cursor: pointer; }
</style>
