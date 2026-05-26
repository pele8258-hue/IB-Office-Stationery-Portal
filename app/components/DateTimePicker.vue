<script setup>
const props = defineProps({
  modelValue:  { type: [Date, null], default: null },
  placeholder: { type: String, default: 'Select date & time' },
  hasError:    { type: Boolean, default: false },
  color:       { type: String, default: 'blue' }, // 'blue' | 'green'
  min:         { type: [Date, String, null], default: null }, // minimum allowed datetime
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const el   = ref(null)

const viewYear  = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())
const selYear   = ref(null)
const selMonth  = ref(null)
const selDay    = ref(null)
const selHour   = ref(12)
const selMin    = ref(0)
const selAmpm   = ref('AM')

function fromModel(val) {
  if (!val) return
  const d = new Date(val)
  viewYear.value  = d.getFullYear()
  viewMonth.value = d.getMonth()
  selYear.value   = d.getFullYear()
  selMonth.value  = d.getMonth()
  selDay.value    = d.getDate()
  const h         = d.getHours()
  selAmpm.value   = h >= 12 ? 'PM' : 'AM'
  selHour.value   = h % 12 || 12
  selMin.value    = d.getMinutes()
}
watch(() => props.modelValue, fromModel, { immediate: true })

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa']

const calDays = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1).getDay()
  const total = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const prev  = new Date(viewYear.value, viewMonth.value, 0).getDate()
  const days  = []
  for (let i = first - 1; i >= 0; i--)
    days.push({ n: prev - i, mo: viewMonth.value - 1, yr: viewYear.value, out: true })
  for (let i = 1; i <= total; i++)
    days.push({ n: i, mo: viewMonth.value, yr: viewYear.value, out: false })
  while (days.length < 42)
    days.push({ n: days.length - total - first + 1, mo: viewMonth.value + 1, yr: viewYear.value, out: true })
  return days
})

const todayMidnight = new Date()
todayMidnight.setHours(0, 0, 0, 0)

// The effective minimum date (midnight), driven by the `min` prop or today
const minDate = computed(() => {
  if (props.min) {
    const m = new Date(props.min)
    m.setHours(0, 0, 0, 0)
    return m
  }
  return todayMidnight
})

function isPast(d) {
  const m    = ((d.mo % 12) + 12) % 12
  const date = new Date(d.yr, m, d.n)
  date.setHours(0, 0, 0, 0)
  return date < minDate.value
}

const canGoPrev = computed(() => {
  const m = minDate.value
  return !(viewYear.value === m.getFullYear() && viewMonth.value === m.getMonth())
})

// Whether the selected day is exactly the min day (need to block earlier times)
const isOnMinDate = computed(() => {
  if (!props.min || selDay.value == null) return false
  const m = new Date(props.min)
  return selYear.value === m.getFullYear()
    && selMonth.value  === m.getMonth()
    && selDay.value    === m.getDate()
})

// Clamp current time to min time when on the min date
function clampToMin() {
  if (!isOnMinDate.value || !props.min) return
  const minD = new Date(props.min)
  const minH = minD.getHours()
  const minM = minD.getMinutes()
  const curH = selAmpm.value === 'AM'
    ? (selHour.value === 12 ? 0 : selHour.value)
    : (selHour.value === 12 ? 12 : selHour.value + 12)
  if (curH < minH || (curH === minH && selMin.value < minM)) {
    selAmpm.value = minH >= 12 ? 'PM' : 'AM'
    selHour.value = minH % 12 || 12
    selMin.value  = minM
  }
}

function prevMo() {
  if (!canGoPrev.value) return
  if (viewMonth.value === 0) { viewMonth.value = 11; viewYear.value-- }
  else viewMonth.value--
}
function nextMo() {
  if (viewMonth.value === 11) { viewMonth.value = 0; viewYear.value++ }
  else viewMonth.value++
}

function pick(d) {
  if (isPast(d)) return
  const m = ((d.mo % 12) + 12) % 12
  selYear.value  = d.yr
  selMonth.value = m
  selDay.value   = d.n
  if (d.out) { viewYear.value = d.yr; viewMonth.value = m }
  clampToMin()
  emitVal()
}

function isSel(d) {
  const m = ((d.mo % 12) + 12) % 12
  return selYear.value === d.yr && selMonth.value === m && selDay.value === d.n
}
function isToday(d) {
  const t = new Date()
  const m = ((d.mo % 12) + 12) % 12
  return d.yr === t.getFullYear() && m === t.getMonth() && d.n === t.getDate()
}

function emitVal() {
  if (selDay.value == null) return
  const h = selAmpm.value === 'AM'
    ? (selHour.value === 12 ? 0 : selHour.value)
    : (selHour.value === 12 ? 12 : selHour.value + 12)
  emit('update:modelValue', new Date(selYear.value, selMonth.value, selDay.value, h, selMin.value))
}

function adjHour(n) { selHour.value = ((selHour.value - 1 + n + 12) % 12) + 1; clampToMin(); emitVal() }
function adjMin(n)  { selMin.value  = ((selMin.value + n) + 60) % 60; clampToMin(); emitVal() }

function setToday() {
  const t = new Date()
  viewYear.value = t.getFullYear(); viewMonth.value = t.getMonth()
  selYear.value  = t.getFullYear(); selMonth.value  = t.getMonth(); selDay.value = t.getDate()
  selHour.value  = t.getHours() % 12 || 12; selMin.value = t.getMinutes()
  selAmpm.value  = t.getHours() >= 12 ? 'PM' : 'AM'
  emitVal()
}
function clear() { selDay.value = null; emit('update:modelValue', null) }

const display = computed(() => {
  if (!props.modelValue) return ''
  return new Date(props.modelValue).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
})

const accent = computed(() => props.color === 'green'
  ? { bg: 'bg-green-500', hover: 'hover:bg-green-600', ring: 'focus:ring-green-300', text: 'text-green-600' }
  : { bg: 'bg-blue-500',  hover: 'hover:bg-blue-600',  ring: 'focus:ring-blue-300',  text: 'text-blue-600'  }
)

onMounted(() => {
  document.addEventListener('mousedown', (e) => {
    if (el.value && !el.value.contains(e.target)) open.value = false
  })
})
</script>

<template>
  <div ref="el" class="relative">
    <!-- Trigger -->
    <button
      type="button"
      class="w-full flex items-center gap-2 px-3 py-2 text-xs border rounded-lg text-left bg-white transition-colors focus:outline-none focus:ring-2"
      :class="hasError
        ? 'border-red-400 bg-red-50 focus:ring-red-300'
        : `border-gray-200 hover:border-gray-300 ${accent.ring}`"
      @click="open = !open"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" class="flex-shrink-0 text-gray-400">
        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.8"/>
        <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      <span class="flex-1 truncate" :class="display ? 'text-gray-800 font-medium' : 'text-gray-400'">
        {{ display || placeholder }}
      </span>
      <svg class="flex-shrink-0 text-gray-400 transition-transform duration-150" :class="open ? 'rotate-180' : ''" width="10" height="10" viewBox="0 0 24 24" fill="none">
        <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <!-- Panel -->
    <Transition name="dp">
      <div
        v-if="open"
        class="absolute z-50 mt-1.5 left-0 bg-white rounded-2xl shadow-2xl border border-gray-100"
        style="width:300px;"
      >
        <!-- Month nav -->
        <div class="flex items-center justify-between px-4 pt-4 pb-2">
          <button
            type="button"
            class="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            :class="canGoPrev ? 'hover:bg-gray-100' : 'opacity-30 cursor-not-allowed'"
            :disabled="!canGoPrev"
            @click="prevMo"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
          </button>
          <span class="text-sm font-bold text-gray-800">{{ MONTHS[viewMonth] }} {{ viewYear }}</span>
          <button type="button" class="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors" @click="nextMo">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
          </button>
        </div>

        <!-- Weekday labels -->
        <div class="grid grid-cols-7 px-3">
          <div v-for="d in DAYS" :key="d" class="text-center text-[10px] font-semibold text-gray-400 py-1">{{ d }}</div>
        </div>

        <!-- Day grid -->
        <div class="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
          <button
            v-for="(d, i) in calDays" :key="i"
            type="button"
            :disabled="isPast(d)"
            class="h-8 w-full rounded-lg text-xs font-medium transition-colors"
            :class="isPast(d)
              ? 'text-gray-200 cursor-not-allowed'
              : isSel(d)
                ? `${accent.bg} text-white`
                : isToday(d)
                  ? `${accent.text} font-bold hover:bg-gray-100`
                  : d.out
                    ? 'text-gray-300 hover:bg-gray-50'
                    : 'text-gray-700 hover:bg-gray-100'"
            @click="pick(d)"
          >{{ d.n }}</button>
        </div>

        <!-- Divider -->
        <div class="border-t border-gray-100 mx-3 mb-3"></div>

        <!-- Time picker -->
        <div class="flex items-center justify-center gap-3 px-4 pb-3">
          <!-- Hour -->
          <div class="flex flex-col items-center gap-1">
            <button type="button" class="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors" @click="adjHour(1)">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M18 15l-6-6-6 6" stroke="#9CA3AF" stroke-width="2.5" stroke-linecap="round"/></svg>
            </button>
            <div class="w-10 h-9 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100">
              <span class="text-base font-bold text-gray-800">{{ String(selHour).padStart(2,'0') }}</span>
            </div>
            <button type="button" class="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors" @click="adjHour(-1)">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="#9CA3AF" stroke-width="2.5" stroke-linecap="round"/></svg>
            </button>
          </div>

          <span class="text-xl font-bold text-gray-200 pb-1">:</span>

          <!-- Minute -->
          <div class="flex flex-col items-center gap-1">
            <button type="button" class="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors" @click="adjMin(1)">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M18 15l-6-6-6 6" stroke="#9CA3AF" stroke-width="2.5" stroke-linecap="round"/></svg>
            </button>
            <div class="w-10 h-9 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100">
              <span class="text-base font-bold text-gray-800">{{ String(selMin).padStart(2,'0') }}</span>
            </div>
            <button type="button" class="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors" @click="adjMin(-1)">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="#9CA3AF" stroke-width="2.5" stroke-linecap="round"/></svg>
            </button>
          </div>

          <!-- AM / PM -->
          <div class="ml-1 flex flex-col gap-1.5">
            <button
              type="button"
              class="w-12 py-2 rounded-lg text-xs font-bold transition-colors"
              :class="selAmpm === 'AM' ? `${accent.bg} text-white shadow-sm` : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
              @click="selAmpm = 'AM'; clampToMin(); emitVal()"
            >AM</button>
            <button
              type="button"
              class="w-12 py-2 rounded-lg text-xs font-bold transition-colors"
              :class="selAmpm === 'PM' ? `${accent.bg} text-white shadow-sm` : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
              @click="selAmpm = 'PM'; clampToMin(); emitVal()"
            >PM</button>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between px-4 pb-4">
          <button type="button" class="text-xs text-gray-400 hover:text-gray-600 transition-colors" @click="clear">Clear</button>
          <div class="flex gap-2">
            <button
              type="button"
              class="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              @click="setToday"
            >Today</button>
            <button
              type="button"
              class="text-xs font-semibold px-4 py-1.5 rounded-lg text-white transition-colors"
              :class="`${accent.bg} ${accent.hover}`"
              @click="open = false"
            >Done</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dp-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.dp-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.dp-enter-from, .dp-leave-to { opacity: 0; transform: translateY(-6px) scale(0.98); }
</style>
