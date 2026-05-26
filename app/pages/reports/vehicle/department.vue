<script setup>
definePageMeta({ middleware: 'auth' })
import bgVientiane from '~/assets/images/backgrounds/vientiane_capital_pastel_dream_20260430_085013 1.png'

const { $api }  = useNuxtApp()

const now         = new Date()
const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
const today        = now.toISOString().split('T')[0]

const dateFrom     = ref(firstOfMonth)
const dateTo       = ref(today)

const loading      = ref(false)
const error        = ref('')
const rows         = ref([])
const totalRequests = ref(0)

async function fetchReport() {
  loading.value = true
  error.value   = ''
  try {
    const params = new URLSearchParams({ date_from: dateFrom.value, date_to: dateTo.value })
    const res = await $api(`/api/reports/vehicle/department?${params}`)
    rows.value          = res.data  || []
    totalRequests.value = res.total_requests || 0
  } catch (e) {
    error.value = e?.data?.message || 'Failed to load report'
  } finally {
    loading.value = false
  }
}

onMounted(fetchReport)
function applyFilters() { fetchReport() }

function pct(val) {
  if (!totalRequests.value) return 0
  return Math.round((val / totalRequests.value) * 100)
}

const exportMenuOpen = ref(false)

async function exportPdf() {
  exportMenuOpen.value = false
  try {
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
    doc.text('Department Report — Vehicle Requests', 58, 11)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(`Period: ${dateFrom.value} to ${dateTo.value}   ·   Total: ${totalRequests.value} requests across ${rows.value.length} departments`, 58, 17)

    // Pre-calculate grand totals
    const gTotal     = rows.value.reduce((a, r) => a + (r.TOTAL     || 0), 0)
    const gPending   = rows.value.reduce((a, r) => a + (r.PENDING   || 0), 0)
    const gApproved  = rows.value.reduce((a, r) => a + (r.APPROVED  || 0), 0)
    const gInUse     = rows.value.reduce((a, r) => a + (r.IN_USE    || 0), 0)
    const gCompleted = rows.value.reduce((a, r) => a + (r.COMPLETED || 0), 0)
    const gRejected  = rows.value.reduce((a, r) => a + (r.REJECTED  || 0), 0)
    const gCancelled = rows.value.reduce((a, r) => a + (r.CANCELLED || 0), 0)

    // Build HTML table — rendered via html2canvas so Lao/Unicode displays correctly
    const tempDiv = document.createElement('div')
    tempDiv.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1080px;background:white;font-family:Phetsarath OT,Noto Sans Lao,Noto Sans,Arial Unicode MS,sans-serif;font-size:10px;color:#1F2937'
    tempDiv.innerHTML = `
      <table style="border-collapse:collapse;width:100%">
        <thead><tr style="background:#D97706;color:white;font-weight:bold">
          <th style="padding:5px 8px;text-align:left;width:30px">#</th>
          <th style="padding:5px 8px;text-align:left">Department</th>
          <th style="padding:5px 8px;text-align:left">Branch</th>
          <th style="padding:5px 8px;text-align:center">Total</th>
          <th style="padding:5px 8px;text-align:center">Pending</th>
          <th style="padding:5px 8px;text-align:center">Approved</th>
          <th style="padding:5px 8px;text-align:center">In Use</th>
          <th style="padding:5px 8px;text-align:center">Completed</th>
          <th style="padding:5px 8px;text-align:center">Rejected</th>
          <th style="padding:5px 8px;text-align:center">Cancelled</th>
        </tr></thead>
        <tbody>
          ${rows.value.map((r, i) => `<tr style="background:${i % 2 === 0 ? '#FAFAFA' : '#FFFFFF'}">
            <td style="padding:4px 8px;color:#9CA3AF">${i + 1}</td>
            <td style="padding:4px 8px;font-weight:500">${r.DEPARTMENT || ''}</td>
            <td style="padding:4px 8px;color:#6B7280">${r.BRANCH || ''}</td>
            <td style="padding:4px 8px;text-align:center;font-weight:700">${r.TOTAL || 0}</td>
            <td style="padding:4px 8px;text-align:center;color:#D97706">${r.PENDING || 0}</td>
            <td style="padding:4px 8px;text-align:center;color:#2563EB">${r.APPROVED || 0}</td>
            <td style="padding:4px 8px;text-align:center;color:#059669">${r.IN_USE || 0}</td>
            <td style="padding:4px 8px;text-align:center;color:#6B7280">${r.COMPLETED || 0}</td>
            <td style="padding:4px 8px;text-align:center;color:#DC2626">${r.REJECTED || 0}</td>
            <td style="padding:4px 8px;text-align:center;color:#EA580C">${r.CANCELLED || 0}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot><tr style="background:#FEF3C7;font-weight:bold;color:#92400E">
          <td style="padding:5px 8px"></td>
          <td style="padding:5px 8px">Grand Total</td>
          <td style="padding:5px 8px"></td>
          <td style="padding:5px 8px;text-align:center">${gTotal}</td>
          <td style="padding:5px 8px;text-align:center">${gPending}</td>
          <td style="padding:5px 8px;text-align:center">${gApproved}</td>
          <td style="padding:5px 8px;text-align:center">${gInUse}</td>
          <td style="padding:5px 8px;text-align:center">${gCompleted}</td>
          <td style="padding:5px 8px;text-align:center">${gRejected}</td>
          <td style="padding:5px 8px;text-align:center">${gCancelled}</td>
        </tr></tfoot>
      </table>`
    document.body.appendChild(tempDiv)

    await new Promise(resolve => {
      doc.html(tempDiv, {
        callback: resolve,
        x: 10,
        y: 26,
        width: 277,
        windowWidth: 1080,
        autoPaging: 'text',
        html2canvas: { useCORS: true, logging: false },
      })
    })
    document.body.removeChild(tempDiv)

    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(7)
      doc.setTextColor(150)
      doc.text(`Page ${i} of ${pageCount}   ·   Generated ${new Date().toLocaleString('en-GB')}`, 10, doc.internal.pageSize.height - 5)
    }

    doc.save(`department-report-${dateFrom.value}-to-${dateTo.value}.pdf`)
  } catch (e) { console.error('PDF export error:', e) }
}

function exportCsv() {
  exportMenuOpen.value = false
  const headers = ['Department','Branch','Total','Pending','Approved','In Use','Completed','Rejected','Cancelled']
  const csvRows = [
    headers.join(','),
    ...rows.value.map(r => [
      `"${r.DEPARTMENT || ''}"`,
      `"${r.BRANCH || ''}"`,
      r.TOTAL     || 0,
      r.PENDING   || 0,
      r.APPROVED  || 0,
      r.IN_USE    || 0,
      r.COMPLETED || 0,
      r.REJECTED  || 0,
      r.CANCELLED || 0,
    ].join(','))
  ]
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `department-report-${dateFrom.value}-to-${dateTo.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
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
        <div>
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-[10px] font-semibold uppercase tracking-wider text-amber-500">Vehicle Report</span>
          </div>
          <h1 class="text-xl font-bold text-gray-800">Department Report</h1>
          <p class="text-xs text-gray-400 mt-0.5">Vehicle requests grouped by department</p>
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
          <button
            type="button"
            class="px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-all"
            style="background:#D97706;"
            @click="applyFilters"
          >Apply</button>
        </div>
      </div>

      <!-- Summary pill -->
      <div v-if="!loading && totalRequests > 0" class="mb-4">
        <span class="text-xs text-gray-500">
          Total <span class="font-bold text-gray-800">{{ totalRequests }}</span> requests across <span class="font-bold text-gray-800">{{ rows.length }}</span> departments
        </span>
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
            <rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/>
            <line x1="2" y1="9" x2="22" y2="9" stroke="currentColor" stroke-width="1.5"/>
            <line x1="2" y1="15" x2="22" y2="15" stroke="currentColor" stroke-width="1.5"/>
            <line x1="8" y1="9" x2="8" y2="21" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <p class="text-sm">No data found for the selected period</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-xs" style="min-width:700px;">
            <thead>
              <tr class="border-b border-gray-100 bg-gray-50">
                <th class="text-left px-4 py-3 text-gray-500 font-semibold">#</th>
                <th class="text-left px-4 py-3 text-gray-500 font-semibold">Department</th>
                <th class="text-left px-4 py-3 text-gray-500 font-semibold">Branch</th>
                <th class="text-center px-3 py-3 text-gray-500 font-semibold">Total</th>
                <th class="text-center px-3 py-3 text-amber-600 font-semibold">Pending</th>
                <th class="text-center px-3 py-3 text-blue-600 font-semibold">Approved</th>
                <th class="text-center px-3 py-3 text-green-600 font-semibold">In Use</th>
                <th class="text-center px-3 py-3 text-gray-500 font-semibold">Completed</th>
                <th class="text-center px-3 py-3 text-red-500 font-semibold">Rejected</th>
                <th class="text-center px-3 py-3 text-orange-500 font-semibold">Cancelled</th>
                <th class="text-left px-4 py-3 text-gray-500 font-semibold">Share</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="(r, i) in rows" :key="i" class="hover:bg-amber-50/30 transition-colors">
                <td class="px-4 py-3 text-gray-400 font-mono">{{ i + 1 }}</td>
                <td class="px-4 py-3">
                  <p class="font-semibold text-gray-800">{{ r.DEPARTMENT }}</p>
                </td>
                <td class="px-4 py-3 text-gray-500">{{ r.BRANCH }}</td>
                <td class="px-3 py-3 text-center font-bold text-gray-800">{{ r.TOTAL }}</td>
                <td class="px-3 py-3 text-center">
                  <span v-if="r.PENDING" class="font-semibold text-amber-600">{{ r.PENDING }}</span>
                  <span v-else class="text-gray-300">—</span>
                </td>
                <td class="px-3 py-3 text-center">
                  <span v-if="r.APPROVED" class="font-semibold text-blue-600">{{ r.APPROVED }}</span>
                  <span v-else class="text-gray-300">—</span>
                </td>
                <td class="px-3 py-3 text-center">
                  <span v-if="r.IN_USE" class="font-semibold text-green-600">{{ r.IN_USE }}</span>
                  <span v-else class="text-gray-300">—</span>
                </td>
                <td class="px-3 py-3 text-center">
                  <span v-if="r.COMPLETED" class="font-semibold text-gray-600">{{ r.COMPLETED }}</span>
                  <span v-else class="text-gray-300">—</span>
                </td>
                <td class="px-3 py-3 text-center">
                  <span v-if="r.REJECTED" class="font-semibold text-red-500">{{ r.REJECTED }}</span>
                  <span v-else class="text-gray-300">—</span>
                </td>
                <td class="px-3 py-3 text-center">
                  <span v-if="r.CANCELLED" class="font-semibold text-orange-500">{{ r.CANCELLED }}</span>
                  <span v-else class="text-gray-300">—</span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden" style="min-width:60px;">
                      <div class="h-full rounded-full" style="background:#D97706;" :style="`width:${pct(r.TOTAL)}%`"></div>
                    </div>
                    <span class="text-[10px] text-gray-400 w-8 text-right">{{ pct(r.TOTAL) }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
            <!-- Totals row -->
            <tfoot>
              <tr class="border-t-2 border-gray-200 bg-amber-50/50">
                <td class="px-4 py-3" colspan="3">
                  <span class="text-xs font-bold text-gray-700">Grand Total</span>
                </td>
                <td class="px-3 py-3 text-center font-bold text-amber-700">{{ totalRequests }}</td>
                <td class="px-3 py-3 text-center font-bold text-amber-600">{{ rows.reduce((a,r) => a + (r.PENDING||0), 0) || '—' }}</td>
                <td class="px-3 py-3 text-center font-bold text-blue-600">{{ rows.reduce((a,r) => a + (r.APPROVED||0), 0) || '—' }}</td>
                <td class="px-3 py-3 text-center font-bold text-green-600">{{ rows.reduce((a,r) => a + (r.IN_USE||0), 0) || '—' }}</td>
                <td class="px-3 py-3 text-center font-bold text-gray-600">{{ rows.reduce((a,r) => a + (r.COMPLETED||0), 0) || '—' }}</td>
                <td class="px-3 py-3 text-center font-bold text-red-500">{{ rows.reduce((a,r) => a + (r.REJECTED||0), 0) || '—' }}</td>
                <td class="px-3 py-3 text-center font-bold text-orange-500">{{ rows.reduce((a,r) => a + (r.CANCELLED||0), 0) || '—' }}</td>
                <td class="px-4 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.dp-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.dp-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.dp-enter-from, .dp-leave-to { opacity: 0; transform: translateY(-6px) scale(0.98); }
</style>
