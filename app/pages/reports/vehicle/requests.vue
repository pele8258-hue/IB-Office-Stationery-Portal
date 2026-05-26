<script setup>
definePageMeta({ middleware: 'auth' })
import bgVientiane from '~/assets/images/backgrounds/vientiane_capital_pastel_dream_20260430_085013 1.png'

const { $api }  = useNuxtApp()
const authStore = useAuthStore()
const isAdmin   = computed(() => ['ADMIN', 'SUPER_ADMIN', 'CHECKER'].includes(authStore.user?.role_code))

const now         = new Date()
const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
const today        = now.toISOString().split('T')[0]

const dateFrom     = ref(firstOfMonth)
const dateTo       = ref(today)
const filterStatus = ref('')
const perPage      = ref(20)

const loading    = ref(false)
const error      = ref('')
const summary    = ref({ total:0, pending:0, approved:0, in_use:0, completed:0, rejected:0, cancelled:0 })
const rows       = ref([])
const pagination = reactive({ current_page:1, total_page:1, total_data:0, per_page:20 })

const STATUS_OPTS = [
  { value: '',           label: 'All Status' },
  { value: 'PENDING',    label: 'Pending' },
  { value: 'APPROVED',   label: 'Approved' },
  { value: 'IN_USE',     label: 'In Use' },
  { value: 'COMPLETED',  label: 'Completed' },
  { value: 'REJECTED',   label: 'Rejected' },
  { value: 'CANCELLED',  label: 'Cancelled' },
]

const SUMMARY_CARDS = computed(() => [
  { label: 'Total',     value: summary.value.total,     cls: 'bg-slate-50 border-slate-200',   num: 'text-slate-700'  },
  { label: 'Pending',   value: summary.value.pending,   cls: 'bg-amber-50 border-amber-200',   num: 'text-amber-600'  },
  { label: 'Approved',  value: summary.value.approved,  cls: 'bg-blue-50 border-blue-200',     num: 'text-blue-600'   },
  { label: 'In Use',    value: summary.value.in_use,    cls: 'bg-green-50 border-green-200',   num: 'text-green-600'  },
  { label: 'Completed', value: summary.value.completed, cls: 'bg-gray-50 border-gray-200',     num: 'text-gray-600'   },
  { label: 'Rejected',  value: summary.value.rejected,  cls: 'bg-red-50 border-red-200',       num: 'text-red-600'    },
  { label: 'Cancelled', value: summary.value.cancelled, cls: 'bg-orange-50 border-orange-200', num: 'text-orange-600' },
])

const from = computed(() => pagination.total_data === 0 ? 0 : (pagination.current_page - 1) * perPage.value + 1)
const to   = computed(() => Math.min(pagination.current_page * perPage.value, pagination.total_data))

async function fetchReport(page = 1) {
  loading.value = true
  error.value   = ''
  try {
    const params = new URLSearchParams({ page, limit: perPage.value, date_from: dateFrom.value, date_to: dateTo.value })
    if (filterStatus.value) params.set('status', filterStatus.value)
    const res = await $api(`/api/reports/vehicle/requests?${params}`)
    summary.value = res.summary || summary.value
    rows.value    = res.data    || []
    Object.assign(pagination, res.pagination)
  } catch (e) {
    error.value = e?.data?.message || 'Failed to load report'
  } finally {
    loading.value = false
  }
}

watch(perPage, () => fetchReport(1))
onMounted(fetchReport)

function applyFilters() { fetchReport(1) }

function fmt(val) {
  if (!val) return '—'
  return new Date(val).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
}
function fmtDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
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

const exportMenuOpen = ref(false)

async function exportPdf() {
  exportMenuOpen.value = false
  try {
    const params = new URLSearchParams({ page: 1, limit: 1000, date_from: dateFrom.value, date_to: dateTo.value })
    if (filterStatus.value) params.set('status', filterStatus.value)
    const res  = await $api(`/api/reports/vehicle/requests?${params}`)
    const data = res.data || []

    const { default: jsPDF } = await import('jspdf')

    // Load logo
    const logoUrl  = (await import('~/assets/images/logos/Frame 10.png')).default
    const logoResp = await fetch(logoUrl)
    const logoBlob = await logoResp.blob()
    const logoB64  = await new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsDataURL(logoBlob)
    })

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    // Purple header bar (vector — no font issues)
    doc.setFillColor(76, 29, 149)
    doc.rect(0, 0, 297, 22, 'F')
    doc.addImage(logoB64, 'PNG', 8, 3, 44, 16)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Vehicle Request Report', 58, 11)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(`Period: ${dateFrom.value} to ${dateTo.value}${filterStatus.value ? '  |  Status: ' + filterStatus.value : ''}`, 58, 17)

    // Summary row
    const s = res.summary || {}
    doc.setTextColor(50, 50, 50)
    doc.setFontSize(8)
    doc.text(`Total: ${s.total}   Pending: ${s.pending}   Approved: ${s.approved}   In Use: ${s.in_use}   Completed: ${s.completed}   Rejected: ${s.rejected}   Cancelled: ${s.cancelled}`, 10, 28)

    // Build HTML table — rendered via html2canvas so Lao/Unicode displays correctly
    const STATUS_BG = { PENDING:'#FEF3C7', APPROVED:'#DBEAFE', IN_USE:'#D1FAE5', COMPLETED:'#F3F4F6', REJECTED:'#FEE2E2', CANCELLED:'#FFEDD5' }
    const tempDiv = document.createElement('div')
    tempDiv.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1080px;background:white;font-family:Phetsarath OT,Noto Sans Lao,Noto Sans,Arial Unicode MS,sans-serif;font-size:10px;color:#1F2937'
    tempDiv.innerHTML = `
      <table style="border-collapse:collapse;width:100%">
        <thead><tr style="background:#D97706;color:white;font-weight:bold">
          <th style="padding:5px 8px;text-align:left;white-space:nowrap">Request No</th>
          <th style="padding:5px 8px;text-align:left">Requested By</th>
          <th style="padding:5px 8px;text-align:left">Department</th>
          <th style="padding:5px 8px;text-align:left;white-space:nowrap">Vehicle</th>
          <th style="padding:5px 8px;text-align:left">Destination</th>
          <th style="padding:5px 8px;text-align:left">Status</th>
          <th style="padding:5px 8px;text-align:left;white-space:nowrap">Departure</th>
          <th style="padding:5px 8px;text-align:left;white-space:nowrap">Return</th>
        </tr></thead>
        <tbody>
          ${data.map((r, i) => `<tr style="background:${i % 2 === 0 ? '#FFFBF0' : '#FFFFFF'}">
            <td style="padding:4px 8px;white-space:nowrap;color:#B45309;font-weight:600">${r.REQUEST_NO || ''}</td>
            <td style="padding:4px 8px">${r.REQUESTER_NAME || ''}</td>
            <td style="padding:4px 8px;color:#6B7280;font-size:9px">${[r.DEPARTMENT, r.BRANCH].filter(Boolean).join(' · ') || ''}</td>
            <td style="padding:4px 8px;white-space:nowrap">${r.PLATE_NUMBER || '—'}</td>
            <td style="padding:4px 8px">${r.DESTINATION || ''}</td>
            <td style="padding:4px 8px"><span style="background:${STATUS_BG[r.STATUS] || '#F3F4F6'};padding:2px 7px;border-radius:4px;font-size:9px;font-weight:600">${r.STATUS || ''}</span></td>
            <td style="padding:4px 8px;white-space:nowrap;font-size:9px">${fmt(r.REQUESTED_TIME_OUT)}</td>
            <td style="padding:4px 8px;white-space:nowrap;font-size:9px">${fmt(r.REQUESTED_TIME_IN)}</td>
          </tr>`).join('')}
        </tbody>
      </table>`
    document.body.appendChild(tempDiv)

    await new Promise(resolve => {
      doc.html(tempDiv, {
        callback: resolve,
        x: 10,
        y: 32,
        width: 277,
        windowWidth: 1080,
        autoPaging: 'text',
        html2canvas: { useCORS: true, logging: false },
      })
    })
    document.body.removeChild(tempDiv)

    // Page footers
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(7)
      doc.setTextColor(150)
      doc.text(`Page ${i} of ${pageCount}   ·   Generated ${new Date().toLocaleString('en-GB')}`, 10, doc.internal.pageSize.height - 5)
    }

    doc.save(`vehicle-requests-${dateFrom.value}-to-${dateTo.value}.pdf`)
  } catch (e) { console.error('PDF export error:', e) }
}

async function exportCsv() {
  exportMenuOpen.value = false
  try {
    const params = new URLSearchParams({ page: 1, limit: 1000, date_from: dateFrom.value, date_to: dateTo.value })
    if (filterStatus.value) params.set('status', filterStatus.value)
    const res = await $api(`/api/reports/vehicle/requests?${params}`)
    const data = res.data || []

    const headers = ['Request No','Requested By','Department','Branch','Vehicle','Destination','Status','Departure','Return','Created At']
    const csvRows = [
      headers.join(','),
      ...data.map(r => [
        r.REQUEST_NO || '',
        `"${r.REQUESTER_NAME || ''}"`,
        `"${r.DEPARTMENT || ''}"`,
        `"${r.BRANCH || ''}"`,
        r.PLATE_NUMBER ? `"${r.PLATE_NUMBER} ${[r.BRAND,r.MODEL].filter(Boolean).join(' ')}"` : '',
        `"${r.DESTINATION || ''}"`,
        r.STATUS || '',
        fmt(r.REQUESTED_TIME_OUT),
        fmt(r.REQUESTED_TIME_IN),
        fmtDate(r.CREATED_AT),
      ].join(','))
    ]
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `vehicle-requests-${dateFrom.value}-to-${dateTo.value}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch {}
}
</script>

<template>
  <div class="-m-4 md:-m-6 relative min-h-screen">
    <div
      class="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none"
      :style="{ backgroundImage: `url('${bgVientiane}')` }"
    ></div>
    <div class="relative p-4 md:p-6">

      <!-- Header -->
      <div class="flex items-center justify-between mb-5">
        <div class="flex items-center gap-3">
          <NuxtLink to="/reports/vehicle/department" class="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </NuxtLink>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-semibold uppercase tracking-wider text-amber-500">Vehicle Report</span>
            </div>
            <h1 class="text-xl font-bold text-gray-800">Vehicle Request Report</h1>
          </div>
        </div>
        <!-- Export dropdown -->
        <div class="relative">
          <button
            type="button"
            class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md hover:opacity-90 transition-all"
            style="background:linear-gradient(135deg,#D97706,#B45309);"
            @click="exportMenuOpen = !exportMenuOpen"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="white" stroke-width="2" stroke-linecap="round"/>
              <polyline points="7,10 12,15 17,10" stroke="white" stroke-width="2" stroke-linecap="round"/>
              <line x1="12" y1="15" x2="12" y2="3" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Export
            <svg class="transition-transform duration-150" :class="exportMenuOpen ? 'rotate-180' : ''" width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>
          </button>
          <Transition name="dp">
            <div v-if="exportMenuOpen" class="absolute right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50" style="min-width:140px;">
              <button type="button" class="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-amber-50 transition-colors" @click="exportCsv">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#D97706" stroke-width="1.8"/><path d="M8 12h8M8 8h5M8 16h6" stroke="#D97706" stroke-width="1.8" stroke-linecap="round"/></svg>
                Export CSV
              </button>
              <button type="button" class="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-red-50 transition-colors" @click="exportPdf">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#EF4444" stroke-width="1.8"/><path d="M8 7h8M8 12h5M8 17h4" stroke="#EF4444" stroke-width="1.8" stroke-linecap="round"/></svg>
                Export PDF
              </button>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div class="flex flex-wrap gap-3 items-end">
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">From</label>
            <input v-model="dateFrom" type="date" class="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white text-gray-700" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">To</label>
            <input v-model="dateTo" type="date" class="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white text-gray-700" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</label>
            <select v-model="filterStatus" class="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white text-gray-600">
              <option v-for="o in STATUS_OPTS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Per page</label>
            <select v-model="perPage" class="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white text-gray-600">
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
          <button
            type="button"
            class="px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-all"
            style="background:#D97706;"
            @click="applyFilters"
          >Apply</button>
        </div>
      </div>

      <!-- Summary cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
        <div
          v-for="card in SUMMARY_CARDS" :key="card.label"
          class="bg-white rounded-xl border p-3 text-center shadow-sm"
          :class="card.cls"
        >
          <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{{ card.label }}</p>
          <p class="text-2xl font-bold" :class="card.num">{{ card.value }}</p>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div v-if="loading" class="flex items-center justify-center py-16">
          <div class="w-7 h-7 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin"></div>
          <span class="ml-3 text-sm text-gray-400">Loading...</span>
        </div>
        <div v-else-if="error" class="p-6 text-sm text-red-500">{{ error }}</div>
        <div v-else-if="!rows.length" class="flex flex-col items-center justify-center py-16 text-gray-400">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" class="mb-3 opacity-30">
            <rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <rect x="13" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <rect x="3" y="13" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <rect x="13" y="13" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <p class="text-sm">No data found for the selected period</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-xs" style="min-width:780px;">
            <thead>
              <tr class="border-b border-gray-100 bg-gray-50">
                <th class="text-left px-4 py-3 text-gray-500 font-semibold">Request No</th>
                <th class="text-left px-4 py-3 text-gray-500 font-semibold">Requested By</th>
                <th class="text-left px-4 py-3 text-gray-500 font-semibold">Vehicle</th>
                <th class="text-left px-4 py-3 text-gray-500 font-semibold">Destination</th>
                <th class="text-left px-4 py-3 text-gray-500 font-semibold">Status</th>
                <th class="text-left px-4 py-3 text-gray-500 font-semibold">Departure</th>
                <th class="text-left px-4 py-3 text-gray-500 font-semibold">Return</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="r in rows" :key="r.ID" class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3">
                  <NuxtLink :to="`/bookings/${r.ID}`" class="font-mono text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded hover:bg-amber-100 transition-colors">
                    {{ r.REQUEST_NO }}
                  </NuxtLink>
                </td>
                <td class="px-4 py-3">
                  <p class="font-medium text-gray-700">{{ r.REQUESTER_NAME || '—' }}</p>
                  <p v-if="r.DEPARTMENT" class="text-[10px] text-gray-400">{{ r.DEPARTMENT }}<span v-if="r.BRANCH"> · {{ r.BRANCH }}</span></p>
                </td>
                <td class="px-4 py-3">
                  <template v-if="r.PLATE_NUMBER">
                    <p class="font-semibold text-gray-700">{{ r.PLATE_NUMBER }}</p>
                    <p class="text-[10px] text-gray-400">{{ [r.BRAND, r.MODEL].filter(Boolean).join(' ') }}</p>
                  </template>
                  <span v-else class="text-[10px] text-gray-400">—</span>
                </td>
                <td class="px-4 py-3 text-gray-700 max-w-[140px] truncate">{{ r.DESTINATION }}</td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" :class="statusStyle(r.STATUS).cls">
                    <span class="w-1.5 h-1.5 rounded-full" :style="`background:${statusStyle(r.STATUS).dot}`"></span>
                    {{ r.STATUS }}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-500 whitespace-nowrap">{{ fmt(r.REQUESTED_TIME_OUT) }}</td>
                <td class="px-4 py-3 text-gray-500 whitespace-nowrap">{{ fmt(r.REQUESTED_TIME_IN) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="!loading && rows.length" class="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p class="text-xs text-gray-400">Showing {{ from }}–{{ to }} of {{ pagination.total_data }}</p>
          <div class="flex items-center gap-1">
            <button :disabled="!pagination.has_previous_page" class="px-2 py-1 text-xs rounded border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-100 transition-colors" @click="fetchReport(pagination.current_page - 1)">Prev</button>
            <span class="px-3 py-1 text-xs font-semibold text-amber-700">{{ pagination.current_page }} / {{ pagination.total_page }}</span>
            <button :disabled="!pagination.has_next_page" class="px-2 py-1 text-xs rounded border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-100 transition-colors" @click="fetchReport(pagination.current_page + 1)">Next</button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
