<script setup>
const props = defineProps({ staffId: { type: Number, required: true } })
const emit  = defineEmits(['close', 'updated'])

const { $api } = useNuxtApp()

// ── Data ─────────────────────────────────────────────────────────────────────
const staff      = ref(null)
const loading    = ref(true)
const error      = ref('')
const mode       = ref('view') // 'view' | 'edit' | 'reset'

// ── Dropdowns ────────────────────────────────────────────────────────────────
const branches    = ref([])
const departments = ref([])
const roles       = ref([])

// ── Edit form ────────────────────────────────────────────────────────────────
const editForm   = reactive({ name: '', email: '', phone: '', position: '', branch_id: '', department_id: '', role_id: '', status: 'A' })
const editErrors = ref({})
const saving     = ref(false)

// ── Reset password ────────────────────────────────────────────────────────────
const resetForm   = reactive({ password: '' })
const showResetPw = ref(false)
const resetErrors = ref({})
const resetting   = ref(false)
const resetDone   = ref(false)

// ── Load ──────────────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const [res, b, d, r] = await Promise.all([
      $api(`/api/staff/${props.staffId}`),
      $api('/api/branches'),
      $api('/api/departments'),
      $api('/api/roles'),
    ])
    staff.value       = res.data
    branches.value    = b.data ?? []
    departments.value = d.data ?? []
    roles.value       = r.data ?? []
    fillEditForm()
  } catch (e) {
    error.value = e?.data?.message || 'Failed to load staff details'
  } finally {
    loading.value = false
  }
})

function fillEditForm() {
  const s = staff.value
  Object.assign(editForm, {
    name:          s.NAME,
    email:         s.EMAIL,
    phone:         s.PHONE         || '',
    position:      s.POSITION      || '',
    branch_id:     s.BRANCH_ID     || '',
    department_id: s.DEPARTMENT_ID || '',
    role_id:       s.ROLE_ID       || '',
    status:        s.STATUS,
  })
}

function switchMode(m) {
  mode.value    = m
  editErrors.value = {}
  resetErrors.value = {}
  resetDone.value   = false
  resetForm.password = ''
  showResetPw.value  = false
}

// ── Save edit ────────────────────────────────────────────────────────────────
async function saveEdit() {
  editErrors.value = {}
  saving.value = true
  try {
    await $api(`/api/staff/${props.staffId}`, { method: 'PUT', body: { ...editForm } })
    // Refresh staff data
    const res  = await $api(`/api/staff/${props.staffId}`)
    staff.value = res.data
    mode.value  = 'view'
    emit('updated')
  } catch (e) {
    if (e?.data?.errors) editErrors.value = e.data.errors
    else editErrors.value = { _global: e?.data?.message || 'Failed to save changes' }
  } finally {
    saving.value = false
  }
}

// ── Reset password ────────────────────────────────────────────────────────────
async function saveReset() {
  resetErrors.value = {}
  resetting.value = true
  try {
    await $api(`/api/staff/${props.staffId}/reset-password`, { method: 'POST', body: { password: resetForm.password } })
    // Re-fetch to get the real DB state; spread into new object to guarantee Vue reactivity
    const res = await $api(`/api/staff/${props.staffId}`)
    staff.value = { ...res.data }
    fillEditForm()
    resetDone.value = true
    emit('updated')
  } catch (e) {
    if (e?.data?.errors) resetErrors.value = e.data.errors
    else resetErrors.value = { _global: e?.data?.message || 'Failed to reset password' }
  } finally {
    resetting.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusLabel(s) { return s === 'A' ? 'Active' : s === 'N' ? 'New' : 'Inactive' }
function statusColor(s) {
  return s === 'A' ? 'bg-green-100 text-green-700' : s === 'N' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'
}
function formatDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    style="background:rgba(0,0,0,0.45); backdrop-filter:blur(3px);"
    @click.self="emit('close')"
  >
    <Transition name="modal" appear>
      <div class="bg-white rounded-2xl shadow-2xl w-full flex flex-col" style="max-width:560px; max-height:90vh;">

        <!-- Loading -->
        <div v-if="loading" class="flex flex-col items-center justify-center py-20 gap-3">
          <svg class="animate-spin w-7 h-7" style="color:#7C3AED;" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="32" stroke-dashoffset="12"/>
          </svg>
          <p class="text-sm text-gray-400">Loading...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="p-8 text-center">
          <p class="text-sm text-red-500">{{ error }}</p>
          <button class="mt-4 text-xs text-purple-500 hover:underline" @click="emit('close')">Close</button>
        </div>

        <template v-else-if="staff">
          <!-- Purple header (always visible) -->
          <div class="px-6 pt-6 pb-5 flex items-start justify-between flex-shrink-0 rounded-t-2xl" style="background:linear-gradient(135deg,#7C3AED,#5B21B6);">
            <div class="flex items-center gap-4">
              <div class="w-13 h-13 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0" style="width:52px;height:52px;background:rgba(255,255,255,0.2);">
                {{ staff.NAME?.charAt(0)?.toUpperCase() }}
              </div>
              <div class="text-white">
                <h2 class="text-base font-bold leading-tight">{{ staff.NAME }}</h2>
                <p class="text-sm opacity-75 mt-0.5">{{ staff.EMAIL }}</p>
                <span class="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium" :class="statusColor(staff.STATUS)">
                  {{ statusLabel(staff.STATUS) }}
                </span>
              </div>
            </div>
            <button class="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors" @click="emit('close')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <line x1="18" y1="6" x2="6" y2="18" stroke="white" stroke-width="2" stroke-linecap="round"/>
                <line x1="6" y1="6" x2="18" y2="18" stroke="white" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <!-- Tab strip -->
          <div class="flex gap-1 px-4 py-2 border-b border-gray-100 flex-shrink-0 bg-gray-50">
            <button
              v-for="tab in [{ key:'view', label:'Details' }, { key:'edit', label:'Edit' }, { key:'reset', label:'Reset Password' }]"
              :key="tab.key"
              class="px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
              :class="mode === tab.key ? 'text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'"
              :style="mode === tab.key ? 'background:linear-gradient(135deg,#7C3AED,#6D28D9);' : ''"
              @click="switchMode(tab.key)"
            >{{ tab.label }}</button>
          </div>

          <!-- Scrollable body -->
          <div class="overflow-y-auto flex-1">

            <!-- ── VIEW ── -->
            <div v-if="mode === 'view'" class="p-6">
              <div class="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Department</p>
                  <p class="text-sm font-medium text-gray-700">{{ staff.DEPARTMENT_NAME || '—' }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Branch</p>
                  <p class="text-sm font-medium text-gray-700">{{ staff.BRANCH_CODE }} — {{ staff.BRANCH_NAME }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Role</p>
                  <span class="inline-block text-xs px-2.5 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">{{ staff.ROLE_CODE }}</span>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Position</p>
                  <p class="text-sm font-medium text-gray-700">{{ staff.POSITION || '—' }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Phone</p>
                  <p class="text-sm font-medium text-gray-700">{{ staff.PHONE || '—' }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Created By</p>
                  <p class="text-sm font-medium text-gray-700">{{ staff.CREATED_BY_NAME || '—' }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Created At</p>
                  <p class="text-sm font-medium text-gray-700">{{ formatDate(staff.CREATED_AT) }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Last Updated</p>
                  <p class="text-sm font-medium text-gray-700">{{ formatDate(staff.UPDATED_AT) }}</p>
                </div>
              </div>
              <div class="flex justify-between mt-6 pt-4 border-t border-gray-100">
                <button class="px-4 py-2 text-sm font-medium rounded-lg text-white transition-all" style="background:linear-gradient(135deg,#7C3AED,#6D28D9);" @click="switchMode('edit')">
                  Edit Profile
                </button>
                <button class="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all" @click="emit('close')">Close</button>
              </div>
            </div>

            <!-- ── EDIT ── -->
            <form v-else-if="mode === 'edit'" class="p-6 space-y-4" @submit.prevent="saveEdit">
              <p v-if="editErrors._global" class="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{{ editErrors._global }}</p>

              <div class="grid grid-cols-2 gap-4">
                <!-- Name -->
                <div class="col-span-2">
                  <label class="block text-xs font-semibold mb-1" style="color:#6D28D9;">Full Name <span class="text-red-400">*</span></label>
                  <input v-model="editForm.name" type="text" class="w-full px-3 py-2.5 text-sm rounded-lg border text-gray-700 focus:outline-none transition-all"
                    :class="editErrors.name ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'" />
                  <p v-if="editErrors.name" class="text-xs text-red-400 mt-1">{{ editErrors.name[0] }}</p>
                </div>
                <!-- Email -->
                <div>
                  <label class="block text-xs font-semibold mb-1" style="color:#6D28D9;">Email <span class="text-red-400">*</span></label>
                  <input v-model="editForm.email" type="email" class="w-full px-3 py-2.5 text-sm rounded-lg border text-gray-700 focus:outline-none transition-all"
                    :class="editErrors.email ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'" />
                  <p v-if="editErrors.email" class="text-xs text-red-400 mt-1">{{ editErrors.email[0] }}</p>
                </div>
                <!-- Phone -->
                <div>
                  <label class="block text-xs font-semibold mb-1 text-gray-500">Phone</label>
                  <input v-model="editForm.phone" type="text" class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" />
                </div>
                <!-- Position -->
                <div>
                  <label class="block text-xs font-semibold mb-1 text-gray-500">Position</label>
                  <input v-model="editForm.position" type="text" class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" />
                </div>
                <!-- Status -->
                <div>
                  <label class="block text-xs font-semibold mb-1" style="color:#6D28D9;">Status</label>
                  <select v-model="editForm.status" class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-700 focus:outline-none focus:border-purple-400 transition-all">
                    <option value="A">Active</option>
                    <option value="I">Inactive</option>
                    <option value="N">New</option>
                  </select>
                </div>
                <!-- Branch -->
                <div>
                  <label class="block text-xs font-semibold mb-1" style="color:#6D28D9;">Branch <span class="text-red-400">*</span></label>
                  <select v-model="editForm.branch_id" class="w-full px-3 py-2.5 text-sm rounded-lg border text-gray-700 focus:outline-none transition-all"
                    :class="editErrors.branch_id ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-purple-400'">
                    <option value="">Select branch</option>
                    <option v-for="b in branches" :key="b.ID" :value="b.ID">{{ b.CODE }} — {{ b.NAME }}</option>
                  </select>
                </div>
                <!-- Department -->
                <div>
                  <label class="block text-xs font-semibold mb-1" style="color:#6D28D9;">Department <span class="text-red-400">*</span></label>
                  <select v-model="editForm.department_id" class="w-full px-3 py-2.5 text-sm rounded-lg border text-gray-700 focus:outline-none transition-all"
                    :class="editErrors.department_id ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-purple-400'">
                    <option value="">Select department</option>
                    <option v-for="d in departments" :key="d.ID" :value="d.ID">{{ d.NAME }}</option>
                  </select>
                </div>
                <!-- Role -->
                <div>
                  <label class="block text-xs font-semibold mb-1" style="color:#6D28D9;">Role <span class="text-red-400">*</span></label>
                  <select v-model="editForm.role_id" class="w-full px-3 py-2.5 text-sm rounded-lg border text-gray-700 focus:outline-none transition-all"
                    :class="editErrors.role_id ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-purple-400'">
                    <option value="">Select role</option>
                    <option v-for="r in roles" :key="r.ID" :value="r.ID">{{ r.NAME }}</option>
                  </select>
                </div>
              </div>

              <div class="flex gap-3 pt-2 border-t border-gray-100">
                <button type="submit" :disabled="saving" class="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all" :class="saving ? 'opacity-70 cursor-not-allowed' : ''" style="background:linear-gradient(135deg,#7C3AED,#6D28D9);">
                  {{ saving ? 'Saving...' : 'Save Changes' }}
                </button>
                <button type="button" class="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all" @click="switchMode('view')">Cancel</button>
              </div>
            </form>

            <!-- ── RESET PASSWORD ── -->
            <div v-else-if="mode === 'reset'" class="p-6">
              <!-- Success -->
              <div v-if="resetDone" class="flex flex-col items-center gap-3 py-6 text-center">
                <div class="w-12 h-12 rounded-full flex items-center justify-center" style="background:#D1FAE5;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <p class="text-sm font-semibold text-gray-800">Password reset!</p>
                <p class="text-xs text-gray-500">{{ staff.NAME }} will need to set a new password on next login.</p>
                <button class="mt-2 px-5 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all" @click="switchMode('view')">Back to Details</button>
              </div>

              <!-- Form -->
              <div v-else class="space-y-4">
                <div class="flex items-start gap-3 p-3 rounded-lg text-xs text-gray-500" style="background:#FEF3C7;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="mt-0.5 flex-shrink-0"><circle cx="12" cy="12" r="10" stroke="#D97706" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="#D97706" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16" r="1" fill="#D97706"/></svg>
                  Setting a new password will reset {{ staff.NAME }}'s status to <strong class="mx-1">New</strong> — they must change it on next login.
                </div>

                <p v-if="resetErrors._global" class="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{{ resetErrors._global }}</p>

                <div>
                  <label class="block text-xs font-semibold mb-1.5" style="color:#6D28D9;">New Password <span class="text-red-400">*</span></label>
                  <div class="relative">
                    <input
                      v-model="resetForm.password"
                      :type="showResetPw ? 'text' : 'password'"
                      autocomplete="new-password"
                      placeholder="Minimum 6 characters"
                      class="w-full pl-3 pr-10 py-2.5 text-sm rounded-lg border text-gray-700 placeholder-gray-300 focus:outline-none transition-all"
                      :class="resetErrors.password ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'"
                    />
                    <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-purple-500 transition-colors" @click="showResetPw = !showResetPw">
                      <svg v-if="!showResetPw" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/></svg>
                      <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                    </button>
                  </div>
                  <p v-if="resetErrors.password" class="text-xs text-red-400 mt-1">{{ resetErrors.password[0] }}</p>
                </div>

                <div class="flex gap-3 pt-1">
                  <button :disabled="resetting" class="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all" :class="resetting ? 'opacity-70 cursor-not-allowed' : ''" style="background:linear-gradient(135deg,#7C3AED,#6D28D9);" @click="saveReset">
                    {{ resetting ? 'Resetting...' : 'Reset Password' }}
                  </button>
                  <button class="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all" @click="switchMode('view')">Cancel</button>
                </div>
              </div>
            </div>

          </div>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.modal-enter-active { transition: opacity 0.22s ease, transform 0.22s ease; }
.modal-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.96) translateY(8px); }
</style>
