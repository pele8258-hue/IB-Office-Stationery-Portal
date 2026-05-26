<script setup>
const props = defineProps({
  status: { type: String, required: true },
})

const MAIN_STEPS = [
  { key: 'PENDING',   label: 'Pending Request' },
  { key: 'APPROVED',  label: 'Approved'        },
  { key: 'IN_USE',    label: 'In Use'          },
  { key: 'COMPLETED', label: 'Completed'       },
]

const steps = computed(() => {
  if (props.status === 'REJECTED')  return [{ key: 'PENDING', label: 'Pending Request' }, { key: 'REJECTED',  label: 'Rejected'  }]
  if (props.status === 'CANCELLED') return [{ key: 'PENDING', label: 'Pending Request' }, { key: 'CANCELLED', label: 'Cancelled' }]
  return MAIN_STEPS
})

const ORDER = { PENDING: 0, APPROVED: 1, IN_USE: 2, COMPLETED: 3 }

// Per-step color config
const COLORS = {
  PENDING:   { node: 'bg-amber-400',   ring: 'ring-amber-100',   line: 'bg-amber-300',   label: 'text-amber-500',   icon: 'text-amber-200'   },
  APPROVED:  { node: 'bg-blue-500',    ring: 'ring-blue-100',    line: 'bg-blue-300',    label: 'text-blue-600',    icon: 'text-blue-200'    },
  IN_USE:    { node: 'bg-violet-500',  ring: 'ring-violet-100',  line: 'bg-violet-300',  label: 'text-violet-600',  icon: 'text-violet-200'  },
  COMPLETED: { node: 'bg-green-500',   ring: 'ring-green-100',   line: 'bg-green-300',   label: 'text-green-600',   icon: 'text-green-200'   },
  REJECTED:  { node: 'bg-red-500',     ring: 'ring-red-100',     line: 'bg-red-300',     label: 'text-red-500',     icon: 'text-red-200'     },
  CANCELLED: { node: 'bg-gray-400',    ring: 'ring-gray-100',    line: 'bg-gray-300',    label: 'text-gray-500',    icon: 'text-gray-200'    },
}

function getState(key) {
  if (key === props.status) return 'current'
  if (['REJECTED', 'CANCELLED'].includes(props.status)) return key === 'PENDING' ? 'done' : 'upcoming'
  return (ORDER[key] ?? 0) < (ORDER[props.status] ?? 0) ? 'done' : 'upcoming'
}

function nodeClass(key) {
  const s = getState(key)
  const c = COLORS[key]
  if (s === 'done')    return `${c.node} shadow-sm`
  if (s === 'current') return `${c.node} ring-4 ${c.ring} shadow-md`
  return 'bg-white border-2 border-gray-200'
}

function iconColor(key) {
  const s = getState(key)
  if (s === 'done' || s === 'current') return 'text-white'
  return COLORS[key]?.icon ?? 'text-gray-200'
}

function labelClass(key) {
  const s = getState(key)
  if (s === 'current') return `${COLORS[key].label} font-bold`
  if (s === 'done')    return 'text-gray-500'
  return 'text-gray-300'
}

function lineClass(i) {
  const leftKey = steps.value[i].key
  if (getState(leftKey) !== 'done') return 'bg-gray-200'
  return COLORS[leftKey]?.line ?? 'bg-gray-300'
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4 mb-4 overflow-x-auto">
    <div class="flex items-start" style="min-width: max-content;">
      <template v-for="(step, i) in steps" :key="step.key">

        <!-- Step node -->
        <div class="flex flex-col items-center gap-2" style="min-width: 80px;">
          <div
            class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
            :class="nodeClass(step.key)"
          >
            <!-- Done: white checkmark -->
            <template v-if="getState(step.key) === 'done'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="text-white">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </template>

            <!-- PENDING: clock -->
            <template v-else-if="step.key === 'PENDING'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" :class="iconColor(step.key)">
                <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
                <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </template>

            <!-- APPROVED: shield check -->
            <template v-else-if="step.key === 'APPROVED'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" :class="iconColor(step.key)">
                <path d="M12 2l7 4v5c0 4.4-3 8.5-7 9.5C8 19.5 5 15.4 5 11V6l7-4z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </template>

            <!-- IN_USE: car -->
            <template v-else-if="step.key === 'IN_USE'">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" :class="iconColor(step.key)">
                <rect x="1" y="9" width="22" height="10" rx="2" stroke="currentColor" stroke-width="1.8"/>
                <circle cx="6.5" cy="19" r="2" stroke="currentColor" stroke-width="1.8"/>
                <circle cx="17.5" cy="19" r="2" stroke="currentColor" stroke-width="1.8"/>
                <path d="M5 9V7a2 2 0 012-2h10a2 2 0 012 2v2" stroke="currentColor" stroke-width="1.8"/>
              </svg>
            </template>

            <!-- COMPLETED: flag -->
            <template v-else-if="step.key === 'COMPLETED'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" :class="iconColor(step.key)">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </template>

            <!-- REJECTED / CANCELLED: X -->
            <template v-else>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" class="text-white">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
              </svg>
            </template>
          </div>

          <!-- Label -->
          <span class="text-[10px] text-center leading-tight transition-colors duration-300" :class="labelClass(step.key)">
            {{ step.label }}
          </span>
        </div>

        <!-- Connector line -->
        <div
          v-if="i < steps.length - 1"
          class="h-0.5 flex-1 self-start mt-[18px] mx-1.5 rounded-full transition-all duration-300"
          style="min-width: 48px;"
          :class="lineClass(i)"
        ></div>

      </template>
    </div>
  </div>
</template>
