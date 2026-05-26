<script setup>
definePageMeta({ middleware: 'auth' })
import bgVientiane from '~/assets/images/backgrounds/vientiane_capital_pastel_dream_20260430_085013 1.png'
import bgLoginTile from '~/assets/images/backgrounds/Login.png'
import logoIb      from '~/assets/images/logos/Frame 10.png'

const { $api }  = useNuxtApp()
const authStore = useAuthStore()

const loading = ref(true)
const error   = ref('')
const data    = ref(null)

const isAdmin = computed(() => data.value?.role === 'admin')

async function fetchDashboard() {
  loading.value = true
  error.value   = ''
  try {
    data.value = await $api('/api/dashboard')
  } catch (e) {
    error.value = e?.data?.message || 'Failed to load dashboard'
  } finally {
    loading.value = false
  }
}
onMounted(fetchDashboard)

// Greeting
const hour     = new Date().getHours()
const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
const todayStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

function fmt(val) {
  if (!val) return '—'
  return new Date(val).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function fmtDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function waitTime(createdAt) {
  if (!createdAt) return ''
  const mins = Math.floor((Date.now() - new Date(createdAt)) / 60000)
  if (mins < 60)  return `${mins}m`
  if (mins < 1440) return `${Math.floor(mins / 60)}h`
  return `${Math.floor(mins / 1440)}d`
}

function fromNow(dateVal) {
  if (!dateVal) return '—'
  const diff = new Date(dateVal) - Date.now()
  if (diff < 0) return 'Overdue'
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 24) return 'Today'
  if (hrs < 48) return 'Tomorrow'
  return `In ${Math.floor(hrs / 24)}d`
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

// Fleet status bar widths
const fleetBars = computed(() => {
  if (!data.value?.vehicle_status) return []
  const map   = data.value.vehicle_status
  const total = data.value.stats.vehicles_total || 1
  const colors = { AVAILABLE: '#10B981', IN_USE: '#3B82F6', MAINTENANCE: '#F97316', INACTIVE: '#9CA3AF' }
  return Object.entries(map).map(([status, cnt]) => ({
    status,
    cnt,
    pct: Math.round((cnt / total) * 100),
    color: colors[status] || '#D1D5DB',
  })).sort((a, b) => b.cnt - a.cnt)
})

// Month status bars
const monthBars = computed(() => {
  if (!data.value?.month_by_status) return []
  const map   = data.value.month_by_status
  const max   = Math.max(...Object.values(map), 1)
  const colors = {
    COMPLETED: '#10B981', PENDING: '#EAB308', APPROVED: '#3B82F6',
    IN_USE: '#6366F1', REJECTED: '#EF4444', CANCELLED: '#F97316',
  }
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([status, cnt]) => ({ status, cnt, pct: Math.round((cnt / max) * 100), color: colors[status] || '#D1D5DB' }))
})
</script>

<template>
  <div class="-m-4 md:-m-6 relative min-h-screen">
    <div
      class="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15 pointer-events-none"
      :style="{ backgroundImage: `url('${bgVientiane}')` }"
    ></div>

    <div v-if="loading" class="relative flex items-center justify-center" style="min-height:60vh;">
      <div class="text-center">
        <div class="w-10 h-10 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" style="border-width:3px;"></div>
        <p class="text-sm text-gray-400">Loading dashboard...</p>
      </div>
    </div>
    <div v-else-if="error" class="relative p-4 md:p-6 text-sm text-red-500">{{ error }}</div>

    <!-- ============================================================
         ADMIN DASHBOARD
    ============================================================ -->
    <div v-else-if="isAdmin" class="relative p-4 md:p-6 space-y-5">

      <!-- Welcome Banner -->
      <div
        class="rounded-2xl overflow-hidden flex items-center justify-between px-6 py-5 shadow-xl"
        style="min-height:100px; background-color:#4C1D95; background-size:cover; background-position:center; background-repeat:no-repeat;"
        :style="{ backgroundImage: `url('${bgLoginTile}')` }"
      >
        <!-- Logo left -->
        <img :src="logoIb" alt="Indochina Bank" class="h-20 w-64 object-contain object-left flex-shrink-0" />

        <!-- Text right -->
        <div class="text-right">
          <p class="text-purple-200 text-xs font-medium mb-0.5">{{ todayStr }}</p>
          <h1 class="text-xl md:text-2xl font-bold text-white">{{ greeting }}, {{ authStore.user?.name?.split(' ')[0] }} 👋</h1>
          <p class="text-purple-200 text-xs mt-1">
            {{ authStore.user?.role }}
            <span v-if="authStore.user?.department" class="mx-1 opacity-50">·</span>
            {{ authStore.user?.department }}
          </p>
        </div>
      </div>

      <!-- Stat Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <!-- Pending -->
        <div class="bg-white rounded-2xl border border-amber-100 shadow-sm p-4 flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background:#FEF3C7;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#D97706" stroke-width="2"/><path d="M12 7v5l3 3" stroke="#D97706" stroke-width="2" stroke-linecap="round"/></svg>
            </div>
            <span v-if="data.stats.pending > 0" class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          </div>
          <div>
            <p class="text-2xl font-bold text-amber-600">{{ data.stats.pending }}</p>
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Pending</p>
          </div>
          <NuxtLink to="/bookings/verify" class="text-[10px] text-amber-600 hover:underline font-medium">View all →</NuxtLink>
        </div>

        <!-- In Use -->
        <div class="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 flex flex-col gap-2">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background:#DBEAFE;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="1" y="9" width="22" height="10" rx="2" fill="#3B82F6"/><circle cx="6.5" cy="19" r="2" fill="#1D4ED8"/><circle cx="17.5" cy="19" r="2" fill="#1D4ED8"/><path d="M1 13h22" stroke="white" stroke-width="1.2"/></svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-blue-600">{{ data.stats.vehicles_in_use }}</p>
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">In Use</p>
          </div>
          <p class="text-[10px] text-gray-400">vehicles on trip</p>
        </div>

        <!-- Available -->
        <div class="bg-white rounded-2xl border border-green-100 shadow-sm p-4 flex flex-col gap-2">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background:#DCFCE7;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-green-600">{{ data.stats.vehicles_available }}</p>
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Available</p>
          </div>
          <p class="text-[10px] text-gray-400">of {{ data.stats.vehicles_total }} total</p>
        </div>

        <!-- Today -->
        <div class="bg-white rounded-2xl border border-purple-100 shadow-sm p-4 flex flex-col gap-2">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background:#F3E8FF;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#7C3AED" stroke-width="1.8"/><path d="M16 2v4M8 2v4M3 10h18" stroke="#7C3AED" stroke-width="1.8" stroke-linecap="round"/></svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-purple-600">{{ data.stats.today_requests }}</p>
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Today</p>
          </div>
          <p class="text-[10px] text-gray-400">new requests</p>
        </div>

        <!-- Doc Alert -->
        <div
          class="rounded-2xl shadow-sm p-4 flex flex-col gap-2"
          :class="(data.stats.docs_expired + data.stats.docs_expiring) > 0
            ? 'bg-red-50 border border-red-200'
            : 'bg-white border border-gray-100'"
        >
          <div class="w-9 h-9 rounded-xl flex items-center justify-center" :style="(data.stats.docs_expired + data.stats.docs_expiring) > 0 ? 'background:#FEE2E2' : 'background:#F3F4F6'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01" stroke="#EF4444" stroke-width="2" stroke-linecap="round"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#EF4444" stroke-width="1.8"/></svg>
          </div>
          <div>
            <p class="text-2xl font-bold" :class="(data.stats.docs_expired + data.stats.docs_expiring) > 0 ? 'text-red-600' : 'text-gray-400'">
              {{ data.stats.docs_expired + data.stats.docs_expiring }}
            </p>
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Doc Alert</p>
          </div>
          <NuxtLink to="/vehicles/documents" class="text-[10px] text-red-500 hover:underline font-medium">View docs →</NuxtLink>
        </div>
      </div>

      <!-- Middle Row: Pending Table + Fleet + Month Stats -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <!-- Pending Requests Table -->
        <div class="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-amber-400"></span>
              <h2 class="text-sm font-bold text-gray-800">Pending Requests</h2>
              <span class="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">{{ data.stats.pending }} awaiting</span>
            </div>
            <NuxtLink to="/bookings/verify" class="text-[10px] text-purple-600 hover:underline font-semibold">View all →</NuxtLink>
          </div>
          <div v-if="!data.recent_pending.length" class="flex flex-col items-center justify-center py-10 text-gray-400">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" class="mb-2 opacity-30"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            <p class="text-sm">All caught up!</p>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-xs" style="min-width:500px;">
              <thead>
                <tr class="bg-gray-50">
                  <th class="text-left px-5 py-2.5 text-gray-400 font-semibold">Request</th>
                  <th class="text-left px-4 py-2.5 text-gray-400 font-semibold">Requested By</th>
                  <th class="text-left px-4 py-2.5 text-gray-400 font-semibold">Destination</th>
                  <th class="text-left px-4 py-2.5 text-gray-400 font-semibold">Departure</th>
                  <th class="text-right px-5 py-2.5 text-gray-400 font-semibold">Waiting</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                <tr
                  v-for="r in data.recent_pending" :key="r.ID"
                  class="hover:bg-amber-50/40 transition-colors"
                >
                  <td class="px-5 py-3">
                    <NuxtLink :to="`/bookings/${r.ID}`" class="font-mono text-xs font-bold text-purple-700 hover:text-purple-900">{{ r.REQUEST_NO }}</NuxtLink>
                  </td>
                  <td class="px-4 py-3">
                    <p class="font-medium text-gray-700">{{ r.REQUESTER_NAME }}</p>
                    <p v-if="r.DEPARTMENT" class="text-[10px] text-gray-400">{{ r.DEPARTMENT }}</p>
                  </td>
                  <td class="px-4 py-3 text-gray-600 max-w-[120px] truncate">{{ r.DESTINATION }}</td>
                  <td class="px-4 py-3 text-gray-400 whitespace-nowrap">{{ fmt(r.REQUESTED_TIME_OUT) }}</td>
                  <td class="px-5 py-3 text-right">
                    <span
                      class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      :class="waitTime(r.CREATED_AT).includes('d') && parseInt(waitTime(r.CREATED_AT)) > 1
                        ? 'bg-red-100 text-red-600'
                        : 'bg-amber-100 text-amber-700'"
                    >{{ waitTime(r.CREATED_AT) }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Right Column: Fleet + Month -->
        <div class="flex flex-col gap-4">

          <!-- Fleet Status -->
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 class="text-sm font-bold text-gray-800 mb-4">Fleet Status</h2>
            <div v-if="!fleetBars.length" class="text-xs text-gray-400">No vehicles found</div>
            <div v-else class="space-y-3">
              <div v-for="bar in fleetBars" :key="bar.status" class="space-y-1">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-medium text-gray-600 capitalize">{{ bar.status.replace('_', ' ') }}</span>
                  <span class="font-bold text-gray-800">{{ bar.cnt }}</span>
                </div>
                <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :style="`width:${bar.pct}%; background:${bar.color};`"
                  ></div>
                </div>
              </div>
              <p class="text-[10px] text-gray-400 pt-1">{{ data.stats.vehicles_total }} total vehicles</p>
            </div>
          </div>

          <!-- This Month -->
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-sm font-bold text-gray-800">This Month</h2>
              <span class="text-xs font-bold text-purple-600">{{ data.stats.month_total }} total</span>
            </div>
            <div v-if="!monthBars.length" class="text-xs text-gray-400">No data yet</div>
            <div v-else class="space-y-2.5">
              <div v-for="bar in monthBars" :key="bar.status" class="flex items-center gap-3">
                <span class="text-[10px] font-semibold text-gray-500 w-20 flex-shrink-0 capitalize">{{ bar.status.replace('_', ' ') }}</span>
                <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div class="h-full rounded-full" :style="`width:${bar.pct}%; background:${bar.color};`"></div>
                </div>
                <span class="text-[10px] font-bold text-gray-700 w-6 text-right">{{ bar.cnt }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Currently In Use -->
      <div v-if="data.in_use.length" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <h2 class="text-sm font-bold text-gray-800">Currently In Use</h2>
            <span class="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{{ data.in_use.length }} active</span>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs" style="min-width:560px;">
            <thead>
              <tr class="bg-gray-50">
                <th class="text-left px-5 py-2.5 text-gray-400 font-semibold">Vehicle</th>
                <th class="text-left px-4 py-2.5 text-gray-400 font-semibold">Requester</th>
                <th class="text-left px-4 py-2.5 text-gray-400 font-semibold">Destination</th>
                <th class="text-left px-4 py-2.5 text-gray-400 font-semibold">Departed</th>
                <th class="text-left px-4 py-2.5 text-gray-400 font-semibold">Exp. Return</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="r in data.in_use" :key="r.ID" class="hover:bg-blue-50/30 transition-colors">
                <td class="px-5 py-3">
                  <p class="font-bold text-gray-800">{{ r.PLATE_NUMBER }}</p>
                  <p class="text-[10px] text-gray-400">{{ [r.BRAND, r.MODEL].filter(Boolean).join(' ') }}</p>
                </td>
                <td class="px-4 py-3 font-medium text-gray-700">{{ r.REQUESTER_NAME }}</td>
                <td class="px-4 py-3 text-gray-500 max-w-[130px] truncate">{{ r.DESTINATION }}</td>
                <td class="px-4 py-3 text-gray-400">{{ fmt(r.ACTUAL_TIME_OUT) }}</td>
                <td class="px-4 py-3">
                  <span
                    class="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    :class="new Date(r.REQUESTED_TIME_IN) < new Date()
                      ? 'bg-red-100 text-red-600'
                      : 'bg-green-100 text-green-700'"
                  >{{ fmt(r.REQUESTED_TIME_IN) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- ============================================================
         STAFF DASHBOARD
    ============================================================ -->
    <div v-else-if="data" class="relative p-4 md:p-6 space-y-5">

      <!-- Welcome Banner -->
      <div
        class="rounded-2xl px-6 py-5 flex items-center justify-between"
        style="background: linear-gradient(135deg, #065F46 0%, #047857 50%, #10B981 100%);"
      >
        <div>
          <p class="text-green-200 text-xs font-medium mb-0.5">{{ todayStr }}</p>
          <h1 class="text-xl md:text-2xl font-bold text-white">{{ greeting }}, {{ authStore.user?.name?.split(' ')[0] }} 👋</h1>
          <p class="text-green-200 text-xs mt-1">
            {{ authStore.user?.role }}
            <span v-if="authStore.user?.department" class="mx-1 opacity-50">·</span>
            {{ authStore.user?.department }}
          </p>
        </div>
        <NuxtLink
          to="/bookings/create"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white text-green-700 shadow-md hover:shadow-lg transition-all flex-shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <line x1="12" y1="5" x2="12" y2="19" stroke="#047857" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="5" y1="12" x2="19" y2="12" stroke="#047857" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
          New Request
        </NuxtLink>
      </div>

      <!-- Stat Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="bg-white rounded-2xl border border-purple-100 shadow-sm p-4 flex flex-col gap-2">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background:#F3E8FF;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="1.5" fill="#7C3AED"/><rect x="13" y="3" width="8" height="8" rx="1.5" fill="#7C3AED"/><rect x="3" y="13" width="8" height="8" rx="1.5" fill="#7C3AED"/><rect x="13" y="13" width="8" height="8" rx="1.5" fill="#7C3AED"/></svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-purple-600">{{ data.stats.month_total }}</p>
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">This Month</p>
          </div>
          <p class="text-[10px] text-gray-400">{{ data.stats.all_time }} all time</p>
        </div>

        <div class="bg-white rounded-2xl border border-amber-100 shadow-sm p-4 flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background:#FEF3C7;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#D97706" stroke-width="2"/><path d="M12 7v5l3 3" stroke="#D97706" stroke-width="2" stroke-linecap="round"/></svg>
            </div>
            <span v-if="data.stats.pending > 0" class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          </div>
          <div>
            <p class="text-2xl font-bold text-amber-600">{{ data.stats.pending }}</p>
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Pending</p>
          </div>
          <p class="text-[10px] text-gray-400">awaiting approval</p>
        </div>

        <div class="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 flex flex-col gap-2">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background:#DBEAFE;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#3B82F6" stroke-width="2.5" stroke-linecap="round"/></svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-blue-600">{{ data.stats.approved + data.stats.in_use }}</p>
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Approved</p>
          </div>
          <p class="text-[10px] text-gray-400">upcoming trips</p>
        </div>

        <div class="bg-white rounded-2xl border border-green-100 shadow-sm p-4 flex flex-col gap-2">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background:#DCFCE7;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="1" y="9" width="22" height="10" rx="2" fill="#10B981"/><circle cx="6.5" cy="19" r="2" fill="#065F46"/><circle cx="17.5" cy="19" r="2" fill="#065F46"/></svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-green-600">{{ data.stats.completed }}</p>
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Completed</p>
          </div>
          <p class="text-[10px] text-gray-400">trips this month</p>
        </div>
      </div>

      <!-- Main Content Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <!-- My Recent Requests -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 class="text-sm font-bold text-gray-800">My Recent Requests</h2>
            <NuxtLink to="/bookings" class="text-[10px] text-green-600 hover:underline font-semibold">View all →</NuxtLink>
          </div>
          <div v-if="!data.recent.length" class="flex flex-col items-center justify-center py-10 text-gray-400">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" class="mb-2 opacity-30"><rect x="1" y="9" width="22" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/><circle cx="6.5" cy="19" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="17.5" cy="19" r="2" stroke="currentColor" stroke-width="1.5"/></svg>
            <p class="text-sm mb-2">No requests yet</p>
            <NuxtLink to="/bookings/create" class="text-xs text-green-600 hover:underline">Create your first request</NuxtLink>
          </div>
          <div v-else class="divide-y divide-gray-50">
            <NuxtLink
              v-for="r in data.recent" :key="r.ID"
              :to="`/bookings/${r.ID}`"
              class="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                  <span class="font-mono text-[10px] font-bold text-green-700">{{ r.REQUEST_NO }}</span>
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold" :class="statusStyle(r.STATUS).cls">
                    <span class="w-1 h-1 rounded-full" :style="`background:${statusStyle(r.STATUS).dot}`"></span>
                    {{ r.STATUS }}
                  </span>
                </div>
                <p class="text-xs font-medium text-gray-700 truncate">{{ r.DESTINATION }}</p>
                <p class="text-[10px] text-gray-400">{{ fmt(r.REQUESTED_TIME_OUT) }}</p>
              </div>
              <div v-if="r.PLATE_NUMBER" class="text-right flex-shrink-0">
                <p class="text-[10px] font-bold text-gray-600">{{ r.PLATE_NUMBER }}</p>
                <p class="text-[9px] text-gray-400">{{ [r.BRAND, r.MODEL].filter(Boolean).join(' ') }}</p>
              </div>
              <svg class="text-gray-300 flex-shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </NuxtLink>
          </div>
        </div>

        <!-- My Upcoming Trips -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-50">
            <h2 class="text-sm font-bold text-gray-800">My Upcoming Trips</h2>
            <p class="text-[10px] text-gray-400 mt-0.5">Approved requests ready to go</p>
          </div>
          <div v-if="!data.upcoming.length" class="flex flex-col items-center justify-center py-10 text-gray-400">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" class="mb-2 opacity-30"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            <p class="text-sm">No upcoming trips</p>
          </div>
          <div v-else class="divide-y divide-gray-50">
            <NuxtLink
              v-for="r in data.upcoming" :key="r.ID"
              :to="`/bookings/${r.ID}`"
              class="flex items-center gap-4 px-5 py-3.5 hover:bg-blue-50/30 transition-colors"
            >
              <!-- Date chip -->
              <div
                class="flex-shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white text-center"
                style="background: linear-gradient(135deg, #3B82F6, #1D4ED8);"
              >
                <span class="text-[9px] font-bold uppercase leading-none">{{ new Date(r.REQUESTED_TIME_OUT).toLocaleString('en-GB', { month: 'short' }) }}</span>
                <span class="text-lg font-black leading-none">{{ new Date(r.REQUESTED_TIME_OUT).getDate() }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                  <span class="font-mono text-[10px] font-bold text-blue-700">{{ r.REQUEST_NO }}</span>
                  <span
                    class="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    :class="fromNow(r.REQUESTED_TIME_OUT) === 'Overdue'
                      ? 'bg-red-100 text-red-600'
                      : fromNow(r.REQUESTED_TIME_OUT) === 'Today'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'"
                  >{{ fromNow(r.REQUESTED_TIME_OUT) }}</span>
                </div>
                <p class="text-xs font-semibold text-gray-700 truncate">{{ r.DESTINATION }}</p>
                <p class="text-[10px] text-gray-400">{{ new Date(r.REQUESTED_TIME_OUT).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' }) }}</p>
              </div>
              <div v-if="r.PLATE_NUMBER" class="text-right flex-shrink-0">
                <p class="text-[10px] font-bold text-gray-600">{{ r.PLATE_NUMBER }}</p>
                <p class="text-[9px] text-gray-400">{{ r.COLOR }}</p>
              </div>
              <svg class="text-gray-300 flex-shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </NuxtLink>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
