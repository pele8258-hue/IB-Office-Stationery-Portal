<script setup>
definePageMeta({ middleware: 'auth' })
import bgVientiane from '~/assets/images/backgrounds/vientiane_capital_pastel_dream_20260430_085013 1.png'

const { $api }  = useNuxtApp()
const route     = useRoute()
const router    = useRouter()
const authStore = useAuthStore()

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'CHECKER']
const isAdmin     = computed(() => ADMIN_ROLES.includes(authStore.user?.role_code))
const isOwner     = computed(() => booking.value?.STAFF_ID == authStore.user?.id)

const booking       = ref(null)
const loading       = ref(true)
const error         = ref('')
const actionLoading = ref(false)

// Approve / Change Vehicle modal (shared)
const approveModal    = ref(false)
const isChangeVehicle = ref(false)   // false = approve, true = change vehicle
const vehicles        = ref([])
const vehicleSearch   = ref('')
const selectedVehicle = ref(null)
const approveError    = ref('')
const vehiclesLoading = ref(false)

// Reject modal
const rejectModal  = ref(false)
const rejectReason = ref('')
const rejectError  = ref('')

// Confirm modal for cancel only
const confirmModal   = ref(false)
const confirmAction  = ref('cancel')
const confirmTitle   = ref('Cancel Request')
const confirmMessage = ref('Are you sure you want to cancel this request? This cannot be undone.')
const confirmBtnCls  = ref('bg-red-500 hover:bg-red-600')

// Trip departure form (shown when APPROVED / IN_USE)
const depDateTime = ref(null)   // Date object for VueDatePicker
const depMeter    = ref('')
const depErrors   = reactive({})
const depLoading  = ref(false)
const depSaved    = ref(false)
const depPhoto    = ref(null)
const depPreview  = ref('')

// Trip return form (shown when IN_USE)
const retDateTime = ref(null)   // Date object for VueDatePicker
const retMeter    = ref('')
const retErrors   = reactive({})
const retLoading  = ref(false)
const retSaved    = ref(false)
const retPhoto    = ref(null)
const retPreview  = ref('')

// Show/hide departure & return edit forms when COMPLETED
const showTripEdit = ref(false)

// Inline edit mode for departure & return cards
const depEditMode  = ref(false)
const retEditMode  = ref(false)

// Trip details edit
const editTripMode = ref(false)
const editForm     = reactive({ destination: '', purpose: '', time_out: null, time_in: null, notes: '' })
const editErrors   = reactive({})
const editLoading  = ref(false)

const depHasData = computed(() =>
  !!(booking.value?.ACTUAL_TIME_OUT || booking.value?.METER_BEFORE != null || booking.value?.TIME_OUT_PHOTO)
)
const retHasData = computed(() =>
  !!(booking.value?.ACTUAL_TIME_IN || booking.value?.METER_AFTER != null || booking.value?.TIME_IN_PHOTO)
)

const canComplete = computed(() => {
  if (!booking.value) return false
  const b = booking.value
  const depFilled = !!(b.ACTUAL_TIME_OUT || b.METER_BEFORE != null)
  const retFilled = !!(b.ACTUAL_TIME_IN  || b.METER_AFTER  != null)
  return depFilled && retFilled
})

const canEditTrip = computed(() => {
  if (!booking.value) return false
  const s = booking.value.STATUS
  if (isAdmin.value)  return ['PENDING', 'REJECTED', 'APPROVED'].includes(s)
  if (isOwner.value)  return ['PENDING', 'REJECTED'].includes(s)
  return false
})

function toApiFormat(date) {
  if (!date) return ''
  const d   = new Date(date)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const filteredVehicles = computed(() => {
  const s = vehicleSearch.value.toLowerCase()
  if (!s) return vehicles.value
  return vehicles.value.filter(v =>
    v.PLATE_NUMBER?.toLowerCase().includes(s) ||
    v.BRAND?.toLowerCase().includes(s) ||
    v.MODEL?.toLowerCase().includes(s)
  )
})

async function fetchBooking() {
  loading.value = true
  error.value   = ''
  try {
    const res = await $api(`/api/bookings/${route.params.id}`)
    booking.value = res.data
    // Pre-fill forms with existing recorded values
    if (res.data?.ACTUAL_TIME_OUT) depDateTime.value = new Date(res.data.ACTUAL_TIME_OUT)
    if (res.data?.METER_BEFORE != null) depMeter.value = res.data.METER_BEFORE
    if (res.data?.ACTUAL_TIME_IN) retDateTime.value = new Date(res.data.ACTUAL_TIME_IN)
    if (res.data?.METER_AFTER != null) retMeter.value = res.data.METER_AFTER
  } catch (e) {
    error.value = e?.data?.message || 'Failed to load request'
  } finally {
    loading.value = false
  }
}

async function fetchVehicles() {
  vehiclesLoading.value = true
  try {
    const res = await $api('/api/vehicles?limit=500&verify_status=APPROVED')
    vehicles.value = res.data || []
  } catch {}
  finally { vehiclesLoading.value = false }
}

function openApprove() {
  isChangeVehicle.value = false
  selectedVehicle.value = null
  vehicleSearch.value   = ''
  approveError.value    = ''
  approveModal.value    = true
  fetchVehicles()
}

function openChangeVehicle() {
  isChangeVehicle.value = true
  selectedVehicle.value = null
  vehicleSearch.value   = ''
  approveError.value    = ''
  approveModal.value    = true
  fetchVehicles()
}

function openReject() {
  rejectReason.value = ''
  rejectError.value  = ''
  rejectModal.value  = true
}

function openConfirm() {
  confirmAction.value  = 'cancel'
  confirmTitle.value   = 'Cancel Request'
  confirmMessage.value = 'Are you sure you want to cancel this request? This cannot be undone.'
  confirmBtnCls.value  = 'bg-red-500 hover:bg-red-600'
  confirmModal.value   = true
}

function openRevertConfirm() {
  confirmAction.value  = 'revert'
  confirmTitle.value   = 'Revert to Pending'
  confirmMessage.value = 'This will revert the booking back to PENDING and release the assigned vehicle. Continue?'
  confirmBtnCls.value  = 'bg-orange-500 hover:bg-orange-600'
  confirmModal.value   = true
}

function openDispatchConfirm() {
  confirmAction.value  = 'dispatch'
  confirmTitle.value   = 'Dispatch Vehicle'
  confirmMessage.value = 'Mark this booking as In Use? The vehicle will be considered dispatched now.'
  confirmBtnCls.value  = 'bg-blue-500 hover:bg-blue-600'
  confirmModal.value   = true
}

function openCompleteConfirm() {
  confirmAction.value  = 'complete'
  confirmTitle.value   = 'Mark as Completed'
  confirmMessage.value = 'Mark this trip as Completed? The vehicle will be released back to Available.'
  confirmBtnCls.value  = 'bg-green-500 hover:bg-green-600'
  confirmModal.value   = true
}

async function submitApprove() {
  if (!selectedVehicle.value) {
    approveError.value = 'Please select a vehicle to assign'
    return
  }
  approveError.value  = ''
  actionLoading.value = true
  try {
    const action = isChangeVehicle.value ? 'change_vehicle' : 'approve'
    await $api(`/api/bookings/${route.params.id}`, {
      method: 'PUT',
      body: { action, vehicle_id: selectedVehicle.value.ID },
    })
    approveModal.value = false
    await fetchBooking()
  } catch (e) {
    approveError.value = e?.data?.message || e?.data?.errors?.vehicle_id?.[0] || 'Failed'
  } finally {
    actionLoading.value = false
  }
}

async function submitReject() {
  if (!rejectReason.value.trim()) {
    rejectError.value = 'Please provide a reason for rejection'
    return
  }
  rejectError.value   = ''
  actionLoading.value = true
  try {
    await $api(`/api/bookings/${route.params.id}`, {
      method: 'PUT',
      body: { action: 'reject', reject_reason: rejectReason.value },
    })
    rejectModal.value = false
    await fetchBooking()
  } catch (e) {
    rejectError.value = e?.data?.message || 'Failed to reject'
  } finally {
    actionLoading.value = false
  }
}

async function submitConfirm() {
  actionLoading.value = true
  try {
    await $api(`/api/bookings/${route.params.id}`, {
      method: 'PUT',
      body: { action: confirmAction.value },
    })
    confirmModal.value = false
    await fetchBooking()
  } catch (e) {
    confirmModal.value = false
    error.value = e?.data?.message || 'Action failed'
  } finally {
    actionLoading.value = false
  }
}

function onDepPhoto(e) {
  const file = e.target.files?.[0]
  if (!file) return
  depPhoto.value   = file
  depPreview.value = URL.createObjectURL(file)
}

async function submitDeparture() {
  Object.keys(depErrors).forEach(k => delete depErrors[k])
  depSaved.value = false

  depLoading.value = true
  try {
    const fd = new FormData()
    fd.append('actual_time_out', toApiFormat(depDateTime.value))
    fd.append('meter_before',    String(depMeter.value))
    if (depPhoto.value) fd.append('photo', depPhoto.value)
    await $api(`/api/bookings/${route.params.id}/dispatch`, { method: 'POST', body: fd })
    depPhoto.value    = null
    depPreview.value  = ''
    depSaved.value    = true
    depEditMode.value = false
    await fetchBooking()
    setTimeout(() => { depSaved.value = false }, 4000)
  } catch (e) {
    const errs = e?.data?.errors || {}
    Object.assign(depErrors, errs)
    if (!Object.keys(errs).length) depErrors._global = e?.data?.message || 'Failed to record departure'
  } finally {
    depLoading.value = false
  }
}

function onRetPhoto(e) {
  const file = e.target.files?.[0]
  if (!file) return
  retPhoto.value   = file
  retPreview.value = URL.createObjectURL(file)
}

async function submitReturn() {
  Object.keys(retErrors).forEach(k => delete retErrors[k])
  retSaved.value = false

  retLoading.value = true
  try {
    const fd = new FormData()
    fd.append('actual_time_in', toApiFormat(retDateTime.value))
    fd.append('meter_after',    String(retMeter.value))
    if (retPhoto.value) fd.append('photo', retPhoto.value)
    await $api(`/api/bookings/${route.params.id}/complete`, { method: 'POST', body: fd })
    retPhoto.value    = null
    retPreview.value  = ''
    retSaved.value    = true
    retEditMode.value = false
    await fetchBooking()
    setTimeout(() => { retSaved.value = false }, 4000)
  } catch (e) {
    const errs = e?.data?.errors || {}
    Object.assign(retErrors, errs)
    if (!Object.keys(errs).length) retErrors._global = e?.data?.message || 'Failed to record return'
  } finally {
    retLoading.value = false
  }
}

function startEditTrip() {
  editForm.destination = booking.value.DESTINATION || ''
  editForm.purpose     = booking.value.PURPOSE     || ''
  editForm.time_out    = booking.value.REQUESTED_TIME_OUT ? new Date(booking.value.REQUESTED_TIME_OUT) : null
  editForm.time_in     = booking.value.REQUESTED_TIME_IN  ? new Date(booking.value.REQUESTED_TIME_IN)  : null
  editForm.notes       = booking.value.NOTES || ''
  Object.keys(editErrors).forEach(k => delete editErrors[k])
  editTripMode.value   = true
}

function cancelEditTrip() {
  editTripMode.value = false
}

async function saveEditTrip() {
  Object.keys(editErrors).forEach(k => delete editErrors[k])
  if (!editForm.destination.trim()) editErrors.destination = 'Destination is required'
  if (!editForm.purpose.trim())     editErrors.purpose     = 'Purpose is required'
  if (Object.keys(editErrors).length) return

  editLoading.value = true
  try {
    await $api(`/api/bookings/${route.params.id}`, {
      method: 'PUT',
      body: {
        action:             'update_details',
        destination:        editForm.destination.trim(),
        purpose:            editForm.purpose.trim(),
        requested_time_out: editForm.time_out ? toApiFormat(editForm.time_out) : null,
        requested_time_in:  editForm.time_in  ? toApiFormat(editForm.time_in)  : null,
        notes:              editForm.notes.trim() || null,
      },
    })
    editTripMode.value = false
    await fetchBooking()
  } catch (e) {
    const errs = e?.data?.errors || {}
    Object.assign(editErrors, errs)
    if (!Object.keys(errs).length) editErrors._global = e?.data?.message || 'Failed to save'
  } finally {
    editLoading.value = false
  }
}

function openRevertDispatchConfirm() {
  confirmAction.value  = 'revert_dispatch'
  confirmTitle.value   = 'Revert to Approved'
  confirmMessage.value = 'This will revert the booking back to APPROVED status. The vehicle stays assigned.'
  confirmBtnCls.value  = 'bg-orange-500 hover:bg-orange-600'
  confirmModal.value   = true
}

function openResubmitConfirm() {
  confirmAction.value  = 'resubmit'
  confirmTitle.value   = 'Resubmit Request'
  confirmMessage.value = 'This will resubmit the request for review. Status will go back to PENDING.'
  confirmBtnCls.value  = 'bg-blue-500 hover:bg-blue-600'
  confirmModal.value   = true
}

function formatDateTime(val) {
  if (!val) return '—'
  return new Date(val).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function vehicleStatusStyle(s) {
  const map = {
    AVAILABLE:   { cls: 'bg-green-100 text-green-700',  dot: '#10B981' },
    IN_USE:      { cls: 'bg-blue-100 text-blue-600',    dot: '#3B82F6' },
    MAINTENANCE: { cls: 'bg-yellow-100 text-yellow-700', dot: '#EAB308' },
  }
  return map[s] || { cls: 'bg-gray-100 text-gray-500', dot: '#9CA3AF' }
}

function statusStyle(s) {
  const map = {
    PENDING:   { cls: 'bg-yellow-100 text-yellow-700', dot: '#EAB308' },
    APPROVED:  { cls: 'bg-blue-100 text-blue-700',     dot: '#3B82F6' },
    REJECTED:  { cls: 'bg-red-100 text-red-600',       dot: '#EF4444' },
    IN_USE:    { cls: 'bg-green-100 text-green-700',   dot: '#10B981' },
    COMPLETED: { cls: 'bg-gray-100 text-gray-600',     dot: '#9CA3AF' },
    CANCELLED: { cls: 'bg-orange-100 text-orange-600', dot: '#F97316' },
  }
  return map[s] || { cls: 'bg-gray-100 text-gray-500', dot: '#D1D5DB' }
}

onMounted(fetchBooking)
</script>

<template>
  <div class="-m-4 md:-m-6 relative min-h-screen">
    <!-- Background -->
    <div
      class="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none"
      :style="{ backgroundImage: `url('${bgVientiane}')` }"
    ></div>

    <div class="relative p-4 md:p-6">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-24">
      <div class="w-7 h-7 border-2 border-green-300 border-t-green-600 rounded-full animate-spin"></div>
      <span class="ml-3 text-sm text-gray-400">Loading...</span>
    </div>

    <!-- Error / access denied -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-24 text-center">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" class="mb-3 text-red-300">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
        <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p class="text-sm text-gray-500 mb-4">{{ error }}</p>
      <NuxtLink to="/bookings" class="text-xs text-green-600 hover:underline">← Back to bookings</NuxtLink>
    </div>

    <!-- Content -->
    <div v-else-if="booking">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div class="flex items-center gap-3">
          <button
            class="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-500"
            @click="router.push('/bookings')"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-mono text-sm font-bold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-lg">
                {{ booking.REQUEST_NO }}
              </span>
              <span
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                :class="statusStyle(booking.STATUS).cls"
              >
                <span class="w-1.5 h-1.5 rounded-full" :style="`background:${statusStyle(booking.STATUS).dot}`"></span>
                {{ booking.STATUS }}
              </span>
            </div>
            <p class="text-[11px] text-gray-400 mt-0.5">Submitted {{ formatDateTime(booking.CREATED_AT) }}</p>
          </div>
        </div>

        <!-- Quick actions in header for admin -->
        <div v-if="isAdmin && booking.STATUS === 'PENDING'" class="flex items-center gap-2">
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
            style="background:linear-gradient(135deg,#10B981,#059669);"
            @click="openApprove"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
            Approve
          </button>
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-all"
            @click="openReject"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Reject
          </button>
        </div>
      </div>

      <!-- Rejection notice -->
      <div
        v-if="booking.STATUS === 'REJECTED' && booking.REJECT_REASON"
        class="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="flex-shrink-0 mt-0.5 text-red-500">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8"/>
          <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <div>
          <p class="font-semibold text-red-700">Request Rejected</p>
          <p class="text-red-600 mt-0.5 text-xs">{{ booking.REJECT_REASON }}</p>
          <p v-if="booking.APPROVED_BY_NAME" class="text-[11px] text-red-400 mt-1">by {{ booking.APPROVED_BY_NAME }}</p>
        </div>
      </div>

      <!-- Status progress bar -->
      <BookingStatusBar :status="booking.STATUS" />

      <!--
        Desktop: two independent flex-col wrappers side by side (no shared rows → no gaps).
        Mobile:  wrappers use display:contents so cards become direct grid children,
                 and CSS order controls the stacking sequence.
        Mobile order: Trip Details(1) → Vehicle(2) → People(3) → Passengers(4)
                      → Departure(5) → Return(6) → Summary(7) → Actions(last)
      -->
      <div class="grid grid-cols-1 lg:grid-cols-3 lg:gap-x-4 gap-4 items-start">

        <!-- LEFT wrapper: display:contents on mobile, col-span-2 flex-col on desktop -->
        <div class="contents lg:flex lg:flex-col lg:col-span-2 lg:gap-4">

          <!-- Trip Details — mobile order 1 -->
          <div class="order-1 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xs font-bold text-gray-500 uppercase tracking-wider">Trip Details</h2>
              <div class="flex items-center gap-2">
                <button
                  v-if="canEditTrip && !editTripMode"
                  type="button"
                  class="flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  @click="startEditTrip"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                  Edit
                </button>
                <template v-if="editTripMode">
                  <button type="button" class="text-[10px] font-semibold text-gray-400 hover:text-gray-600 transition-colors" @click="cancelEditTrip">Cancel</button>
                  <button type="button" :disabled="editLoading" class="flex items-center gap-1 text-[10px] font-semibold text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 px-2.5 py-1 rounded-lg transition-colors" @click="saveEditTrip">
                    <svg v-if="editLoading" class="animate-spin" width="9" height="9" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" stroke-width="3" stroke-dasharray="32" stroke-dashoffset="12"/></svg>
                    {{ editLoading ? 'Saving…' : 'Save' }}
                  </button>
                </template>
              </div>
            </div>

            <!-- VIEW mode -->
            <div v-if="!editTripMode">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p class="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Destination</p>
                  <p class="text-sm font-medium text-gray-800">{{ booking.DESTINATION }}</p>
                </div>
                <div>
                  <p class="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Purpose</p>
                  <p class="text-sm font-medium text-gray-800">{{ booking.PURPOSE }}</p>
                </div>
                <div>
                  <p class="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Departure</p>
                  <p class="text-sm font-medium text-gray-800">{{ formatDateTime(booking.REQUESTED_TIME_OUT) }}</p>
                  <p v-if="booking.ACTUAL_TIME_OUT" class="text-[10px] text-green-600 mt-0.5">Actual: {{ formatDateTime(booking.ACTUAL_TIME_OUT) }}</p>
                </div>
                <div>
                  <p class="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Return</p>
                  <p class="text-sm font-medium text-gray-800">{{ formatDateTime(booking.REQUESTED_TIME_IN) }}</p>
                  <p v-if="booking.ACTUAL_TIME_IN" class="text-[10px] text-green-600 mt-0.5">Actual: {{ formatDateTime(booking.ACTUAL_TIME_IN) }}</p>
                </div>
              </div>
              <div v-if="booking.NOTES" class="mt-4 pt-4 border-t border-gray-100">
                <p class="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Notes</p>
                <p class="text-sm text-gray-600">{{ booking.NOTES }}</p>
              </div>
            </div>

            <!-- EDIT mode -->
            <div v-else class="space-y-3">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Destination <span class="text-red-400">*</span></label>
                  <input v-model="editForm.destination" type="text" placeholder="e.g. Ministry of Finance"
                    class="w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 transition-all"
                    :class="editErrors.destination ? 'border-red-400 bg-red-50 focus:ring-red-200' : 'border-gray-200 focus:border-green-400 focus:ring-green-100'" />
                  <p v-if="editErrors.destination" class="text-[10px] text-red-500 mt-0.5">{{ Array.isArray(editErrors.destination) ? editErrors.destination[0] : editErrors.destination }}</p>
                </div>
                <div>
                  <label class="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Purpose <span class="text-red-400">*</span></label>
                  <input v-model="editForm.purpose" type="text" placeholder="e.g. Client meeting"
                    class="w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 transition-all"
                    :class="editErrors.purpose ? 'border-red-400 bg-red-50 focus:ring-red-200' : 'border-gray-200 focus:border-green-400 focus:ring-green-100'" />
                  <p v-if="editErrors.purpose" class="text-[10px] text-red-500 mt-0.5">{{ Array.isArray(editErrors.purpose) ? editErrors.purpose[0] : editErrors.purpose }}</p>
                </div>
                <div>
                  <label class="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Departure Date & Time</label>
                  <DateTimePicker v-model="editForm.time_out" placeholder="Select departure" />
                </div>
                <div>
                  <label class="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Return Date & Time</label>
                  <DateTimePicker v-model="editForm.time_in" placeholder="Select return" :min="editForm.time_out" />
                </div>
              </div>
              <div>
                <label class="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</label>
                <textarea v-model="editForm.notes" rows="2" placeholder="Any additional information..."
                  class="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 resize-none transition-all"></textarea>
              </div>
              <p v-if="editErrors._global" class="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{{ editErrors._global }}</p>
            </div>
          </div>

          <!-- Trip Departure — mobile order 5 -->
          <div v-if="booking.STATUS === 'IN_USE' || (booking.STATUS === 'COMPLETED' && isAdmin)" id="departure-form" class="order-5 bg-white rounded-xl shadow-sm border border-blue-100 p-5">
            <!-- Header -->
            <div class="flex items-center gap-2 mb-4">
              <div class="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="text-blue-500">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="flex-1">
                <h2 class="text-sm font-bold text-gray-800">Trip Departure</h2>
                <p class="text-[10px] text-gray-400">{{ depHasData ? 'Departure info recorded' : 'Fill in actual departure details' }}</p>
              </div>
              <!-- Edit / Cancel toggle -->
              <button
                v-if="depHasData && !depEditMode"
                type="button"
                class="flex items-center gap-1 text-[10px] font-semibold text-blue-600 border border-blue-100 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                @click="depEditMode = true"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                Edit
              </button>
              <button
                v-if="depEditMode"
                type="button"
                class="flex items-center gap-1 text-[10px] font-semibold text-gray-400 border border-gray-200 hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors"
                @click="depEditMode = false"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                Cancel
              </button>
            </div>

            <!-- ── Compact read-only card (has data, not editing) ── -->
            <div v-if="depHasData && !depEditMode" class="space-y-2">
              <div v-if="depSaved" class="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" class="flex-shrink-0 text-green-500"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8"/><path d="M8 12l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                <p class="text-xs font-semibold text-green-700">Departure info saved successfully</p>
              </div>
              <div class="flex items-start gap-3 py-2.5 px-3 bg-gray-50 rounded-lg border border-gray-100">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="flex-shrink-0 mt-0.5 text-blue-400"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                <div>
                  <p class="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Actual Departure Time</p>
                  <p class="text-xs font-semibold text-gray-800 mt-0.5">{{ booking.ACTUAL_TIME_OUT ? formatDateTime(booking.ACTUAL_TIME_OUT) : '—' }}</p>
                </div>
              </div>
              <div class="flex items-start gap-3 py-2.5 px-3 bg-gray-50 rounded-lg border border-gray-100">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="flex-shrink-0 mt-0.5 text-blue-400"><rect x="3" y="11" width="18" height="3" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M7 11V7m10 4V7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                <div>
                  <p class="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Starting Meter</p>
                  <p class="text-xs font-semibold text-gray-800 mt-0.5">{{ booking.METER_BEFORE != null ? booking.METER_BEFORE + ' km' : '—' }}</p>
                </div>
              </div>
              <div v-if="booking.TIME_OUT_PHOTO" class="mt-1">
                <p class="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Departure Photo</p>
                <a :href="booking.TIME_OUT_PHOTO" target="_blank" class="block rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity">
                  <img :src="booking.TIME_OUT_PHOTO" class="w-full h-28 object-cover" />
                </a>
              </div>
            </div>

            <!-- ── Edit form (no data yet OR editing) ── -->
            <div v-else class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1.5">Actual Departure Time <span class="text-gray-400 font-normal">(optional)</span></label>
                <DateTimePicker v-model="depDateTime" placeholder="Select date & time" color="blue" :has-error="!!depErrors.actual_time_out" />
                <p v-if="depErrors.actual_time_out" class="mt-0.5 text-[10px] text-red-500">{{ Array.isArray(depErrors.actual_time_out) ? depErrors.actual_time_out[0] : depErrors.actual_time_out }}</p>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1.5">Starting Meter Reading <span class="text-gray-400 font-normal">(optional)</span></label>
                <div class="relative">
                  <input v-model="depMeter" type="number" min="0" step="0.1" placeholder="e.g. 12345.6"
                    class="w-full pl-3 pr-10 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors"
                    :class="depErrors.meter_before ? 'border-red-400 bg-red-50' : 'border-gray-200'" />
                  <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-medium pointer-events-none">km</span>
                </div>
                <p v-if="depErrors.meter_before" class="mt-0.5 text-[10px] text-red-500">{{ Array.isArray(depErrors.meter_before) ? depErrors.meter_before[0] : depErrors.meter_before }}</p>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1.5">Departure Photo <span class="text-gray-400 font-normal">(optional)</span></label>
                <PhotoPicker v-model="depPhoto" v-model:preview="depPreview" color="blue" />
              </div>
              <p v-if="depErrors._global" class="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{{ depErrors._global }}</p>
              <button
                type="button"
                :disabled="depLoading"
                class="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-50"
                style="background:linear-gradient(135deg,#3B82F6,#2563EB);"
                @click="submitDeparture"
              >
                <div v-if="depLoading" class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                {{ depLoading ? 'Saving…' : depHasData ? 'Save Changes' : 'Record Departure' }}
              </button>
            </div>
          </div>

          <!-- Trip Return — mobile order 6 -->
          <div v-if="booking.STATUS === 'IN_USE' || (booking.STATUS === 'COMPLETED' && isAdmin)" id="return-form" class="order-6 bg-white rounded-xl shadow-sm border border-green-100 p-5">
            <!-- Header -->
            <div class="flex items-center gap-2 mb-4">
              <div class="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="text-green-600">
                  <path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="flex-1">
                <h2 class="text-sm font-bold text-gray-800">Trip Return</h2>
                <p class="text-[10px] text-gray-400">{{ retHasData ? 'Return info recorded' : 'Fill in actual return details' }}</p>
              </div>
              <!-- Edit / Cancel toggle -->
              <button
                v-if="retHasData && !retEditMode"
                type="button"
                class="flex items-center gap-1 text-[10px] font-semibold text-green-600 border border-green-100 hover:bg-green-50 px-2 py-1 rounded-lg transition-colors"
                @click="retEditMode = true"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                Edit
              </button>
              <button
                v-if="retEditMode"
                type="button"
                class="flex items-center gap-1 text-[10px] font-semibold text-gray-400 border border-gray-200 hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors"
                @click="retEditMode = false"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                Cancel
              </button>
            </div>

            <!-- ── Compact read-only card (has data, not editing) ── -->
            <div v-if="retHasData && !retEditMode" class="space-y-2">
              <div v-if="retSaved" class="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" class="flex-shrink-0 text-green-500"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8"/><path d="M8 12l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                <p class="text-xs font-semibold text-green-700">Return info saved successfully</p>
              </div>
              <div class="flex items-start gap-3 py-2.5 px-3 bg-gray-50 rounded-lg border border-gray-100">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="flex-shrink-0 mt-0.5 text-green-500"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                <div>
                  <p class="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Actual Return Time</p>
                  <p class="text-xs font-semibold text-gray-800 mt-0.5">{{ booking.ACTUAL_TIME_IN ? formatDateTime(booking.ACTUAL_TIME_IN) : '—' }}</p>
                </div>
              </div>
              <div class="flex items-start gap-3 py-2.5 px-3 bg-gray-50 rounded-lg border border-gray-100">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="flex-shrink-0 mt-0.5 text-green-500"><rect x="3" y="11" width="18" height="3" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M7 11V7m10 4V7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                <div>
                  <p class="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Ending Meter</p>
                  <p class="text-xs font-semibold text-gray-800 mt-0.5">{{ booking.METER_AFTER != null ? booking.METER_AFTER + ' km' : '—' }}</p>
                </div>
              </div>
              <div v-if="booking.TIME_IN_PHOTO" class="mt-1">
                <p class="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Return Photo</p>
                <a :href="booking.TIME_IN_PHOTO" target="_blank" class="block rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity">
                  <img :src="booking.TIME_IN_PHOTO" class="w-full h-28 object-cover" />
                </a>
              </div>
            </div>

            <!-- ── Edit form (no data yet OR editing) ── -->
            <div v-else class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1.5">Actual Return Time <span class="text-gray-400 font-normal">(optional)</span></label>
                <DateTimePicker v-model="retDateTime" placeholder="Select date & time" color="green" :has-error="!!retErrors.actual_time_in" />
                <p v-if="retErrors.actual_time_in" class="mt-0.5 text-[10px] text-red-500">{{ Array.isArray(retErrors.actual_time_in) ? retErrors.actual_time_in[0] : retErrors.actual_time_in }}</p>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1.5">Ending Meter Reading <span class="text-gray-400 font-normal">(optional)</span></label>
                <div class="relative">
                  <input v-model="retMeter" type="number" min="0" step="0.1" placeholder="e.g. 12445.3"
                    class="w-full pl-3 pr-10 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 transition-colors"
                    :class="retErrors.meter_after ? 'border-red-400 bg-red-50' : 'border-gray-200'" />
                  <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-medium pointer-events-none">km</span>
                </div>
                <p v-if="retErrors.meter_after" class="mt-0.5 text-[10px] text-red-500">{{ Array.isArray(retErrors.meter_after) ? retErrors.meter_after[0] : retErrors.meter_after }}</p>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1.5">Return Photo <span class="text-gray-400 font-normal">(optional)</span></label>
                <PhotoPicker v-model="retPhoto" v-model:preview="retPreview" color="green" />
              </div>
              <p v-if="retErrors._global" class="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{{ retErrors._global }}</p>
              <button
                type="button"
                :disabled="retLoading"
                class="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-50"
                style="background:linear-gradient(135deg,#10B981,#059669);"
                @click="submitReturn"
              >
                <div v-if="retLoading" class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 18l-6-6 6-6" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                {{ retLoading ? 'Saving…' : retHasData ? 'Save Changes' : 'Record Return' }}
              </button>
            </div>
          </div>

          <!-- Completed Summary — mobile order 7 -->
          <div v-if="booking.STATUS === 'COMPLETED'" class="order-7 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="text-gray-500">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <div>
                <h2 class="text-sm font-bold text-gray-800">Trip Summary</h2>
                <p class="text-[10px] text-gray-400">Recorded trip details</p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-gray-50 rounded-lg p-3">
                <p class="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Meter Start</p>
                <p class="text-sm font-bold text-gray-800">{{ booking.METER_BEFORE != null ? booking.METER_BEFORE + ' km' : '—' }}</p>
              </div>
              <div class="bg-gray-50 rounded-lg p-3">
                <p class="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Meter End</p>
                <p class="text-sm font-bold text-gray-800">{{ booking.METER_AFTER != null ? booking.METER_AFTER + ' km' : '—' }}</p>
              </div>
              <div v-if="booking.METER_BEFORE != null && booking.METER_AFTER != null" class="col-span-2 bg-green-50 rounded-lg p-3">
                <p class="text-[10px] text-green-600 font-semibold uppercase tracking-wider mb-1">Total Distance</p>
                <p class="text-sm font-bold text-green-700">{{ (booking.METER_AFTER - booking.METER_BEFORE).toFixed(1) }} km</p>
              </div>
            </div>
            <div v-if="booking.TIME_OUT_PHOTO || booking.TIME_IN_PHOTO" class="mt-3 grid grid-cols-2 gap-3">
              <div v-if="booking.TIME_OUT_PHOTO">
                <p class="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Departure Photo</p>
                <a :href="booking.TIME_OUT_PHOTO" target="_blank" class="block rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity">
                  <img :src="booking.TIME_OUT_PHOTO" class="w-full h-24 object-cover" />
                </a>
              </div>
              <div v-if="booking.TIME_IN_PHOTO">
                <p class="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Return Photo</p>
                <a :href="booking.TIME_IN_PHOTO" target="_blank" class="block rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity">
                  <img :src="booking.TIME_IN_PHOTO" class="w-full h-24 object-cover" />
                </a>
              </div>
            </div>
          </div>

        </div>

        <!-- RIGHT wrapper: display:contents on mobile, col-span-1 flex-col on desktop -->
        <div class="contents lg:flex lg:flex-col lg:gap-4">

          <!-- Vehicle Assigned — mobile order 2 -->
          <div v-if="!['REJECTED','CANCELLED'].includes(booking.STATUS)" class="order-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-xs font-bold text-gray-500 uppercase tracking-wider">Vehicle Assigned</h2>
              <button
                v-if="isAdmin && ['APPROVED','IN_USE'].includes(booking.STATUS)"
                type="button"
                class="flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                @click="openChangeVehicle"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                Change
              </button>
            </div>
            <div v-if="booking.PLATE_NUMBER" class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="text-blue-500">
                  <rect x="1" y="9" width="22" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/>
                  <circle cx="6.5" cy="19" r="2" stroke="currentColor" stroke-width="1.5"/>
                  <circle cx="17.5" cy="19" r="2" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M5 9V7a2 2 0 012-2h10a2 2 0 012 2v2" stroke="currentColor" stroke-width="1.5"/>
                </svg>
              </div>
              <div>
                <p class="font-bold text-gray-800 text-sm">{{ booking.PLATE_NUMBER }}</p>
                <p class="text-xs text-gray-500">{{ [booking.BRAND, booking.MODEL].filter(Boolean).join(' ') }}</p>
                <p v-if="booking.COLOR" class="text-[10px] text-gray-400">{{ booking.COLOR }}</p>
                <div v-if="booking.PARKING_LOT || booking.PARKING_FLOOR" class="mt-2 pt-2 border-t border-gray-100 space-y-1">
                  <div v-if="booking.PARKING_LOT" class="flex items-center justify-between gap-4">
                    <span class="text-xs text-gray-400">Parking Lot</span>
                    <span class="text-sm font-semibold text-gray-700">{{ booking.PARKING_LOT }}</span>
                  </div>
                  <div v-if="booking.PARKING_FLOOR" class="flex items-center justify-between gap-4">
                    <span class="text-xs text-gray-400">Floor</span>
                    <span class="text-sm font-semibold text-gray-700">{{ booking.PARKING_FLOOR }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-lg px-3 py-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <span class="text-xs font-medium">Pending vehicle assignment</span>
            </div>
          </div>

          <!-- People — mobile order 3 -->
          <div class="order-3 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">People</h2>
            <div class="space-y-3">
              <div>
                <p class="text-[10px] text-gray-400 mb-1">Requester</p>
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <span class="text-[10px] font-bold text-indigo-600">{{ booking.REQUESTER_NAME?.charAt(0)?.toUpperCase() }}</span>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-gray-700">{{ booking.REQUESTER_NAME }}</p>
                    <p class="text-[10px] text-gray-400">{{ booking.REQUESTER_EMAIL }}</p>
                    <p v-if="booking.REQUESTER_DEPT || booking.REQUESTER_BRANCH" class="text-[10px] text-gray-400 mt-0.5">
                      <span v-if="booking.REQUESTER_DEPT">{{ booking.REQUESTER_DEPT }}</span>
                      <span v-if="booking.REQUESTER_DEPT && booking.REQUESTER_BRANCH"> · </span>
                      <span v-if="booking.REQUESTER_BRANCH">{{ booking.REQUESTER_BRANCH }}</span>
                    </p>
                  </div>
                </div>
              </div>
              <div v-if="booking.DRIVER_NAME" class="pt-2 border-t border-gray-100">
                <p class="text-[10px] text-gray-400 mb-1">Driver</p>
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" class="text-green-600">
                      <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.8"/>
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-gray-700">{{ booking.DRIVER_NAME }}</p>
                    <p v-if="booking.DRIVER_DEPT || booking.DRIVER_BRANCH" class="text-[10px] text-gray-400 mt-0.5">
                      <span v-if="booking.DRIVER_DEPT">{{ booking.DRIVER_DEPT }}</span>
                      <span v-if="booking.DRIVER_DEPT && booking.DRIVER_BRANCH"> · </span>
                      <span v-if="booking.DRIVER_BRANCH">{{ booking.DRIVER_BRANCH }}</span>
                    </p>
                  </div>
                </div>
              </div>
              <!-- Passengers -->
              <div class="pt-2 border-t border-gray-100">
                <p class="text-[10px] text-gray-400 mb-1.5">
                  Passengers
                  <span class="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-semibold">{{ booking.PASSENGERS?.length || 0 }}</span>
                </p>
                <div v-if="!booking.PASSENGERS?.length" class="text-xs text-gray-400">No passengers</div>
                <div v-else class="space-y-1.5">
                  <div
                    v-for="p in booking.PASSENGERS"
                    :key="p.STAFF_ID"
                    class="flex items-center gap-2"
                  >
                    <div class="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <span class="text-[10px] font-bold text-purple-600">{{ p.NAME?.charAt(0)?.toUpperCase() }}</span>
                    </div>
                    <div>
                      <p class="text-xs font-semibold text-gray-700">{{ p.NAME }}</p>
                      <p v-if="p.DEPARTMENT || p.BRANCH" class="text-[10px] text-gray-400 mt-0.5">
                        <span v-if="p.DEPARTMENT">{{ p.DEPARTMENT }}</span>
                        <span v-if="p.DEPARTMENT && p.BRANCH"> · </span>
                        <span v-if="p.BRANCH">{{ p.BRANCH }}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="booking.APPROVED_BY_NAME && booking.STATUS !== 'PENDING'" class="pt-2 border-t border-gray-100">
                <p class="text-[10px] text-gray-400 mb-1">
                  {{ booking.STATUS === 'REJECTED' ? 'Rejected by' : 'Approved by' }}
                </p>
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span class="text-[10px] font-bold text-gray-500">{{ booking.APPROVED_BY_NAME?.charAt(0)?.toUpperCase() }}</span>
                  </div>
                  <p class="text-xs font-semibold text-gray-700">{{ booking.APPROVED_BY_NAME }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions — mobile order last -->
          <div class="order-last bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-2">
            <h2 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Actions</h2>

            <!-- PENDING: approve / reject (admin) or cancel (owner) -->
            <template v-if="isAdmin && booking.STATUS === 'PENDING'">
              <button class="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90" style="background:linear-gradient(135deg,#10B981,#059669);" @click="openApprove">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>
                Approve & Assign Vehicle
              </button>
              <button class="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-all" @click="openReject">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>
                Reject Request
              </button>
            </template>

            <template v-else-if="!isAdmin && isOwner && booking.STATUS === 'PENDING'">
              <button class="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-all" @click="openConfirm">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                Cancel Request
              </button>
            </template>

            <!-- REJECTED: maker can resubmit or cancel -->
            <template v-else-if="isOwner && booking.STATUS === 'REJECTED'">
              <p class="text-[10px] text-gray-400 mb-1">Edit the trip details above, then resubmit.</p>
              <button
                class="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                style="background:linear-gradient(135deg,#3B82F6,#2563EB);"
                @click="openResubmitConfirm"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M1 4v6h6M23 20v-6h-6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Resubmit Request
              </button>
              <button class="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-all" @click="openConfirm">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                Cancel Request
              </button>
            </template>

            <!-- APPROVED: dispatch → IN_USE (admin) -->
            <template v-else-if="isAdmin && booking.STATUS === 'APPROVED'">
              <button
                class="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                style="background:linear-gradient(135deg,#3B82F6,#2563EB);"
                @click="openDispatchConfirm"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Dispatch → In Use
              </button>
              <p class="text-[10px] text-gray-400 text-center">vehicle will be marked as In Use</p>
              <button class="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold text-orange-600 border border-orange-200 hover:bg-orange-50 transition-all" @click="openRevertConfirm">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Revert to Pending
              </button>
            </template>

            <!-- IN_USE: complete → COMPLETED (admin) -->
            <template v-else-if="isAdmin && booking.STATUS === 'IN_USE'">
              <!-- Complete button — disabled until both departure & return are filled -->
              <button
                :disabled="!canComplete"
                class="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold text-white transition-all"
                :class="canComplete ? 'hover:opacity-90' : 'opacity-40 cursor-not-allowed'"
                style="background:linear-gradient(135deg,#10B981,#059669);"
                @click="canComplete && openCompleteConfirm()"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>
                Mark as Completed
              </button>
              <p v-if="!canComplete" class="text-[10px] text-amber-500 text-center font-medium">
                Fill in Trip Departure &amp; Trip Return info first
              </p>
              <p v-else class="text-[10px] text-gray-400 text-center">vehicle will be released back to Available</p>
              <button
                class="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold text-orange-600 border border-orange-200 hover:bg-orange-50 transition-all"
                @click="openRevertDispatchConfirm"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Revert to Approved
              </button>
            </template>

            <template v-else>
              <p class="text-xs text-gray-400 text-center py-1">No actions available</p>
            </template>
          </div>

        </div>

      </div>
    </div>

    <!-- ── Approve Modal ─────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="approveModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="approveModal = false"></div>
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div class="p-5 border-b border-gray-100">
              <h3 class="text-sm font-bold text-gray-800">{{ isChangeVehicle ? 'Change Vehicle' : 'Approve & Assign Vehicle' }}</h3>
              <p class="text-xs text-gray-400 mt-0.5">{{ isChangeVehicle ? 'Select a new vehicle to replace the current one' : 'Select a vehicle to assign to this request' }}</p>
            </div>
            <div class="p-5">
              <!-- Vehicle search -->
              <div class="relative mb-3">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
                  <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <input
                  v-model="vehicleSearch"
                  type="text"
                  placeholder="Search plate, brand, model..."
                  class="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300"
                />
              </div>

              <div v-if="vehiclesLoading" class="flex justify-center py-8">
                <div class="w-5 h-5 border-2 border-green-300 border-t-green-600 rounded-full animate-spin"></div>
              </div>
              <div v-else-if="!filteredVehicles.length" class="text-center py-6 text-xs text-gray-400">No vehicles found</div>
              <div v-else class="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                <button
                  v-for="v in filteredVehicles"
                  :key="v.ID"
                  type="button"
                  :disabled="v.STATUS !== 'AVAILABLE'"
                  class="w-full flex items-center gap-3 p-2.5 rounded-xl border-2 text-left transition-all"
                  :class="v.STATUS !== 'AVAILABLE'
                    ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                    : selectedVehicle?.ID === v.ID
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'"
                  @click="v.STATUS === 'AVAILABLE' && (selectedVehicle = v)"
                >
                  <div class="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="text-gray-400">
                      <rect x="1" y="9" width="22" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/>
                      <circle cx="6.5" cy="19" r="2" stroke="currentColor" stroke-width="1.5"/>
                      <circle cx="17.5" cy="19" r="2" stroke="currentColor" stroke-width="1.5"/>
                      <path d="M5 9V7a2 2 0 012-2h10a2 2 0 012 2v2" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-bold text-gray-800">{{ v.PLATE_NUMBER }}</p>
                    <p class="text-[10px] text-gray-400 truncate">{{ [v.BRAND, v.MODEL].filter(Boolean).join(' ') }}</p>
                  </div>
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <span
                      class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                      :class="vehicleStatusStyle(v.STATUS).cls"
                    >
                      <span class="w-1.5 h-1.5 rounded-full" :style="`background:${vehicleStatusStyle(v.STATUS).dot}`"></span>
                      {{ v.STATUS || '—' }}
                    </span>
                    <svg v-if="selectedVehicle?.ID === v.ID" width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="#10B981"/>
                      <path d="M8 12l3 3 5-5" stroke="white" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                  </div>
                </button>
              </div>

              <p v-if="approveError" class="mt-2 text-xs text-red-500">{{ approveError }}</p>
            </div>
            <div class="px-5 pb-5 flex gap-2">
              <button
                type="button"
                class="flex-1 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
                @click="approveModal = false"
              >Cancel</button>
              <button
                type="button"
                :disabled="actionLoading || !selectedVehicle"
                class="flex-1 py-2 rounded-xl text-xs font-semibold text-white transition-all"
                :class="selectedVehicle && !actionLoading ? 'hover:opacity-90' : 'opacity-50 cursor-not-allowed'"
                style="background:linear-gradient(135deg,#10B981,#059669);"
                @click="submitApprove"
              >
                <span v-if="actionLoading">Processing…</span>
                <span v-else>{{ isChangeVehicle ? 'Confirm Change' : 'Confirm Approval' }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Reject Modal ──────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="rejectModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="rejectModal = false"></div>
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div class="p-5 border-b border-gray-100">
              <h3 class="text-sm font-bold text-gray-800">Reject Request</h3>
              <p class="text-xs text-gray-400 mt-0.5">Provide a reason for rejecting this request</p>
            </div>
            <div class="p-5">
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">Reason <span class="text-red-400">*</span></label>
              <textarea
                v-model="rejectReason"
                rows="4"
                placeholder="e.g. Vehicle unavailable on requested date, please re-submit..."
                class="w-full px-3 py-2.5 text-xs border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                :class="rejectError ? 'border-red-400 bg-red-50' : 'border-gray-200'"
              ></textarea>
              <p v-if="rejectError" class="mt-1 text-xs text-red-500">{{ rejectError }}</p>
            </div>
            <div class="px-5 pb-5 flex gap-2">
              <button
                type="button"
                class="flex-1 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
                @click="rejectModal = false"
              >Cancel</button>
              <button
                type="button"
                :disabled="actionLoading"
                class="flex-1 py-2 rounded-xl text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-all disabled:opacity-50"
                @click="submitReject"
              >
                <span v-if="actionLoading">Processing…</span>
                <span v-else>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Confirm Modal (cancel / dispatch / complete) ─────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="confirmModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="confirmModal = false"></div>
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div class="p-5">
              <h3 class="text-sm font-bold text-gray-800 mb-1.5">{{ confirmTitle }}</h3>
              <p class="text-xs text-gray-500">{{ confirmMessage }}</p>
            </div>
            <div class="px-5 pb-5 flex gap-2">
              <button
                type="button"
                class="flex-1 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
                @click="confirmModal = false"
              >Cancel</button>
              <button
                type="button"
                :disabled="actionLoading"
                class="flex-1 py-2 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-50"
                :class="confirmBtnCls"
                @click="submitConfirm"
              >
                <span v-if="actionLoading">Processing…</span>
                <span v-else>Confirm</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    </div>
  </div>
</template>

<style scoped>
.modal-enter-active { transition: opacity 0.2s ease; }
.modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>

