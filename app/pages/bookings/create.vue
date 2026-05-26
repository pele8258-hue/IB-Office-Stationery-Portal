<script setup>
definePageMeta({ middleware: 'auth' })
import bgVientiane from '~/assets/images/backgrounds/vientiane_capital_pastel_dream_20260430_085013 1.png'

const { $api } = useNuxtApp()
const router    = useRouter()
const authStore = useAuthStore()

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'CHECKER']
const isAdmin = computed(() => ADMIN_ROLES.includes(authStore.user?.role_code))

// ── Dropdowns ─────────────────────────────────────────────────────────────────
const staffList   = ref([])
const departments = ref([])

async function loadDropdowns() {
  const [sRes, dRes] = await Promise.all([
    $api('/api/staff?limit=500&status=A').catch(() => ({ data: [] })),
    $api('/api/departments').catch(() => ({ data: [] })),
  ])
  staffList.value   = sRes.data || []
  departments.value = dRes.data || []
}

// ── Form State ─────────────────────────────────────────────────────────────────
const form = reactive({
  requester_id:         null,
  requested_time_out:   '',
  requested_time_in:    '',
  destination:          '',
  purpose:              '',
  driver_id:            null,
  passenger_count:      0,
  notes:                '',
})

const passengerIds = ref([])

watch(() => form.passenger_count, (val) => {
  const count = Math.max(0, Math.min(15, parseInt(val) || 0))
  const current = passengerIds.value.length
  if (count > current) {
    for (let i = current; i < count; i++) passengerIds.value.push(null)
  } else {
    passengerIds.value = passengerIds.value.slice(0, count)
  }
})

// Exclude already-picked people from other slots
const excludeForDriver = computed(() => passengerIds.value.filter(Boolean))
function excludeForPassenger(idx) {
  const others = passengerIds.value.filter((id, i) => i !== idx && id)
  return form.driver_id ? [...others, form.driver_id] : others
}

// ── Errors & Submit ────────────────────────────────────────────────────────────
const errors     = ref({})
const submitting = ref(false)

function validate() {
  const e = {}
  if (isAdmin.value && !form.requester_id) e.requester_id = ['Requester is required']
  if (!form.destination.trim())    e.destination        = ['Destination is required']
  if (!form.purpose.trim())        e.purpose            = ['Purpose is required']
  if (!form.requested_time_out)    e.requested_time_out = ['Departure date & time is required']
  if (!form.requested_time_in)     e.requested_time_in  = ['Return date & time is required']
  if (form.requested_time_out && form.requested_time_in) {
    if (new Date(form.requested_time_in) <= new Date(form.requested_time_out))
      e.requested_time_in = ['Return time must be after departure time']
  }
  if (!form.driver_id)             e.driver_id          = ['Driver is required']
  passengerIds.value.forEach((id, idx) => {
    if (!id) e[`passenger_${idx}`] = [`Passenger ${idx + 1} is required`]
  })
  return e
}

const hasErrors = computed(() => {
  if (isAdmin.value && !form.requester_id) return true
  if (!form.destination.trim() || !form.purpose.trim()) return true
  if (!form.requested_time_out || !form.requested_time_in) return true
  if (!form.driver_id) return true
  if (passengerIds.value.some(id => !id)) return true
  return false
})

async function submit() {
  const e = validate()
  if (Object.keys(e).length) { errors.value = e; return }
  errors.value = {}
  submitting.value = true
  try {
    const res = await $api('/api/bookings', {
      method: 'POST',
      body: {
        requester_id:        form.requester_id || undefined,
        requested_time_out:  toApiFormat(form.requested_time_out),
        requested_time_in:   toApiFormat(form.requested_time_in),
        destination:         form.destination,
        purpose:             form.purpose,
        driver_id:           form.driver_id,
        passenger_count:     passengerIds.value.length,
        passengers:          passengerIds.value.filter(Boolean),
        notes:               form.notes,
      },
    })
    router.push({ path: '/bookings', query: { created: res.data?.request_no } })
  } catch (e) {
    if (e?.data?.errors) errors.value = e.data.errors
    else errors.value = { _global: e?.data?.message || 'Submission failed. Please try again.' }
  } finally {
    submitting.value = false
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function toApiFormat(date) {
  if (!date) return null
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

const minDateTime = computed(() => {
  const now = new Date()
  now.setSeconds(0, 0)
  return now.toISOString().slice(0, 16)
})

onMounted(loadDropdowns)
</script>

<template>
  <div class="-m-4 md:-m-6 relative min-h-screen">
    <!-- Background -->
    <div
      class="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none"
      :style="{ backgroundImage: `url('${bgVientiane}')` }"
    ></div>

    <div class="relative p-4 md:p-6">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <NuxtLink to="/bookings" class="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M12 5l-7 7 7 7" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </NuxtLink>
      <div>
        <h1 class="text-xl font-bold text-gray-800">New Vehicle Request</h1>
        <p class="text-xs text-gray-400 mt-0.5">Fill in the details below to submit a transport request</p>
      </div>
    </div>

    <form @submit.prevent="submit">
      <!-- Global Error -->
      <div v-if="errors._global" class="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" class="flex-shrink-0">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <circle cx="12" cy="16" r="1" fill="currentColor"/>
        </svg>
        {{ errors._global }}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <!-- LEFT: Trip Details -->
        <div class="lg:col-span-2 space-y-5">

          <!-- Vehicle & Trip -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 class="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg flex items-center justify-center" style="background:#E0F2FE;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="1" y="9" width="22" height="10" rx="2" fill="#0EA5E9"/><circle cx="6.5" cy="19" r="2" fill="#0369A1"/><circle cx="17.5" cy="19" r="2" fill="#0369A1"/><path d="M1 13h22" stroke="white" stroke-width="1.2"/><path d="M5 9V7a2 2 0 012-2h10a2 2 0 012 2v2" stroke="#0EA5E9" stroke-width="1.5"/></svg>
              </span>
              Trip Details
            </h2>

            <div class="space-y-4">
              <!-- Destination -->
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1.5">Destination / Location <span class="text-red-400">*</span></label>
                <input
                  v-model="form.destination"
                  type="text"
                  placeholder="e.g. Head Office, Ministry of Finance"
                  class="w-full px-3 py-2.5 text-sm rounded-lg border text-gray-700 focus:outline-none focus:ring-2 transition-all"
                  :class="errors.destination ? 'border-red-400 bg-red-50 focus:ring-red-200' : 'border-gray-200 focus:border-green-400 focus:ring-green-100'"
                />
                <p v-if="errors.destination" class="text-xs text-red-400 mt-1">{{ errors.destination[0] }}</p>
              </div>

              <!-- Purpose -->
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1.5">Purpose <span class="text-red-400">*</span></label>
                <input
                  v-model="form.purpose"
                  type="text"
                  placeholder="e.g. Client meeting, Site inspection"
                  class="w-full px-3 py-2.5 text-sm rounded-lg border text-gray-700 focus:outline-none focus:ring-2 transition-all"
                  :class="errors.purpose ? 'border-red-400 bg-red-50 focus:ring-red-200' : 'border-gray-200 focus:border-green-400 focus:ring-green-100'"
                />
                <p v-if="errors.purpose" class="text-xs text-red-400 mt-1">{{ errors.purpose[0] }}</p>
              </div>

              <!-- Date/Time -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1.5">Departure Date & Time <span class="text-red-400">*</span></label>
                  <DateTimePicker
                    v-model="form.requested_time_out"
                    :min="minDateTime"
                    placeholder="Select departure"
                    :error="!!errors.requested_time_out"
                  />
                  <p v-if="errors.requested_time_out" class="text-xs text-red-400 mt-1">{{ errors.requested_time_out[0] }}</p>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1.5">Return Date & Time <span class="text-red-400">*</span></label>
                  <DateTimePicker
                    v-model="form.requested_time_in"
                    :min="form.requested_time_out || minDateTime"
                    placeholder="Select return"
                    :error="!!errors.requested_time_in"
                  />
                  <p v-if="errors.requested_time_in" class="text-xs text-red-400 mt-1">{{ errors.requested_time_in[0] }}</p>
                </div>
              </div>

              <!-- Notes -->
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1.5">Notes <span class="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  v-model="form.notes"
                  rows="3"
                  placeholder="Any additional information..."
                  class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-700 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 resize-none transition-all"
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT: People -->
        <div class="space-y-5">

          <!-- Requester (admin only) -->
          <div
            v-if="isAdmin"
            class="bg-white rounded-xl shadow-sm p-5 transition-all"
            :class="errors.requester_id ? 'border-2 border-red-300' : !form.requester_id ? 'border-2 border-amber-300' : 'border border-gray-100'"
          >
            <h2 class="text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg flex items-center justify-center" style="background:#FEF3C7;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" fill="#D97706"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="#D97706"/>
                </svg>
              </span>
              Requester <span class="text-red-400 text-xs">*</span>
            </h2>
            <p v-if="errors.requester_id" class="text-xs text-red-400 mb-3">{{ errors.requester_id[0] }}</p>
            <div v-else class="mb-3"></div>
            <StaffSelector
              v-model="form.requester_id"
              :staff-list="staffList"
              :departments="departments"
              :exclude="[form.driver_id, ...passengerIds].filter(Boolean)"
              placeholder="Select requester"
            />
            <!-- Empty state notice -->
            <div v-if="!form.requester_id" class="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" class="flex-shrink-0 mt-0.5 text-amber-500">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <p class="text-xs text-amber-700 leading-snug">
                No requester selected. Please select who is making this request before submitting.
              </p>
            </div>
          </div>

          <!-- Driver -->
          <div
            class="bg-white rounded-xl shadow-sm p-5 transition-all"
            :class="errors.driver_id ? 'border-2 border-red-300' : 'border border-gray-100'"
          >
            <h2 class="text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg flex items-center justify-center" style="background:#DCFCE7;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" fill="#16A34A"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="#16A34A"/></svg>
              </span>
              Driver <span class="text-red-400 text-xs">*</span>
            </h2>
            <p v-if="errors.driver_id" class="text-xs text-red-400 mb-3">{{ errors.driver_id[0] }}</p>
            <div v-else class="mb-3"></div>
            <StaffSelector
              v-model="form.driver_id"
              :staff-list="staffList"
              :departments="departments"
              :exclude="excludeForDriver"
              placeholder="Select driver"
            />
          </div>

          <!-- Passengers -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 class="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg flex items-center justify-center" style="background:#F3E8FF;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="3" fill="#7C3AED"/><path d="M1 19c0-3.5 3.1-6 8-6s8 2.5 8 6" fill="#7C3AED"/><circle cx="19" cy="8" r="2.5" fill="#A78BFA"/><path d="M17 19c0-2 1.3-3.5 3-4.5" stroke="#A78BFA" stroke-width="1.5" stroke-linecap="round"/></svg>
              </span>
              Passengers
            </h2>

            <!-- Count input -->
            <div class="mb-4">
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">Number of Passengers</label>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40"
                  :disabled="form.passenger_count <= 0"
                  @click="form.passenger_count = Math.max(0, form.passenger_count - 1)"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                </button>
                <input
                  v-model.number="form.passenger_count"
                  type="number"
                  min="0"
                  max="15"
                  class="w-16 text-center px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                />
                <button
                  type="button"
                  class="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40"
                  :disabled="form.passenger_count >= 15"
                  @click="form.passenger_count = Math.min(15, form.passenger_count + 1)"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                </button>
              </div>
            </div>

            <!-- Passenger Slots -->
            <div v-if="passengerIds.length" class="space-y-3">
              <div v-for="(_, idx) in passengerIds" :key="idx">
                <label class="block text-xs font-semibold mb-1" :class="errors[`passenger_${idx}`] ? 'text-red-500' : 'text-gray-500'">
                  Passenger {{ idx + 1 }} <span class="text-red-400">*</span>
                </label>
                <StaffSelector
                  v-model="passengerIds[idx]"
                  :staff-list="staffList"
                  :departments="departments"
                  :exclude="excludeForPassenger(idx)"
                  :placeholder="`Select passenger ${idx + 1}`"
                />
                <p v-if="errors[`passenger_${idx}`]" class="text-xs text-red-400 mt-1">{{ errors[`passenger_${idx}`][0] }}</p>
              </div>
            </div>
            <div v-else class="text-center py-4 text-xs text-gray-400">
              Set passenger count above to add passengers
            </div>
          </div>

          <!-- No requester warning banner -->
          <div v-if="isAdmin && !form.requester_id" class="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" class="flex-shrink-0 text-amber-500">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              <path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <p class="text-xs font-medium text-amber-700">
              Cannot submit — no requester selected. Choose who is making this request first.
            </p>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="submitting"
            class="w-full py-3 rounded-xl text-sm font-semibold text-white shadow-lg transition-all"
            :class="submitting ? 'opacity-60 cursor-not-allowed' : hasErrors ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 active:scale-[0.98]'"
            style="background:linear-gradient(135deg,#10B981,#059669); box-shadow:0 4px 14px rgba(16,185,129,0.35);"
          >
            <span v-if="submitting" class="flex items-center justify-center gap-2">
              <svg class="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="white" stroke-width="3" stroke-dasharray="32" stroke-dashoffset="12"/>
              </svg>
              Submitting...
            </span>
            <span v-else>Submit Request</span>
          </button>
        </div>
      </div>
    </form>
    </div>
  </div>
</template>
