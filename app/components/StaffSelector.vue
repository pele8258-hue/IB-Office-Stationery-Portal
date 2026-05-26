<script setup>
const props = defineProps({
  modelValue:  { type: [Number, String, null], default: null },
  staffList:   { type: Array, default: () => [] },
  departments: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Select staff member' },
  exclude:     { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])

const open    = ref(false)
const search  = ref('')
const deptFilter = ref('')
const el      = ref(null)

const selected = computed(() => props.staffList.find(s => s.ID === props.modelValue) || null)

const filtered = computed(() => {
  const q = search.value.toUpperCase()
  return props.staffList.filter(s => {
    if (props.exclude.includes(s.ID) && s.ID !== props.modelValue) return false
    if (deptFilter.value && s.DEPARTMENT_NAME !== deptFilter.value) return false
    if (q && !s.NAME?.toUpperCase().includes(q) && !s.POSITION?.toUpperCase().includes(q)) return false
    return true
  }).slice(0, 30)
})

function select(staff) {
  emit('update:modelValue', staff.ID)
  open.value  = false
  search.value = ''
}
function clear() {
  emit('update:modelValue', null)
  open.value = false
  search.value = ''
}

onMounted(() => {
  document.addEventListener('click', onOutside)
})
onUnmounted(() => {
  document.removeEventListener('click', onOutside)
})
function onOutside(e) {
  if (el.value && !el.value.contains(e.target)) open.value = false
}

function toggle() {
  open.value = !open.value
  if (open.value) nextTick(() => el.value?.querySelector('input')?.focus())
}
</script>

<template>
  <div ref="el" class="relative">
    <!-- Trigger -->
    <button
      type="button"
      class="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left text-sm transition-all"
      :class="open ? 'border-green-400 ring-2 ring-green-100' : 'border-gray-200 hover:border-gray-300'"
      @click="toggle"
    >
      <template v-if="selected">
        <div class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style="background:linear-gradient(135deg,#10B981,#059669);">
          {{ selected.NAME?.charAt(0)?.toUpperCase() }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-semibold text-gray-800 truncate">{{ selected.NAME }}</p>
          <p class="text-[10px] text-gray-400 truncate">{{ selected.DEPARTMENT_NAME || selected.POSITION || '' }}</p>
        </div>
        <span
          class="flex-shrink-0 text-gray-300 hover:text-gray-500"
          @click.stop="clear"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </span>
      </template>
      <template v-else>
        <div class="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="#9CA3AF" stroke-width="1.8"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#9CA3AF" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </div>
        <span class="text-gray-400 text-xs flex-1">{{ placeholder }}</span>
        <svg class="w-3.5 h-3.5 text-gray-300 flex-shrink-0" viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </template>
    </button>

    <!-- Dropdown -->
    <Transition name="dropdown">
      <div
        v-if="open"
        class="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
      >
        <!-- Filters -->
        <div class="p-2 border-b border-gray-100 space-y-2">
          <div class="relative">
            <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
              <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <input
              v-model="search"
              type="text"
              placeholder="Search name..."
              class="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
            />
          </div>
          <select
            v-model="deptFilter"
            class="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-300 bg-white text-gray-600"
          >
            <option value="">All Departments</option>
            <option v-for="d in departments" :key="d.ID" :value="d.NAME">{{ d.NAME }}</option>
          </select>
        </div>

        <!-- List -->
        <div class="max-h-48 overflow-y-auto">
          <div v-if="!filtered.length" class="py-6 text-center text-xs text-gray-400">No staff found</div>
          <button
            v-for="s in filtered"
            :key="s.ID"
            type="button"
            class="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-green-50 transition-colors text-left"
            :class="modelValue === s.ID ? 'bg-green-50' : ''"
            @click="select(s)"
          >
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style="background:linear-gradient(135deg,#10B981,#059669);"
            >
              {{ s.NAME?.charAt(0)?.toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-gray-800 truncate">{{ s.NAME }}</p>
              <p class="text-[10px] text-gray-400 truncate">{{ s.DEPARTMENT_NAME || '' }}<span v-if="s.POSITION" class="text-gray-300 mx-1">·</span>{{ s.POSITION || '' }}</p>
            </div>
            <svg v-if="modelValue === s.ID" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dropdown-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.dropdown-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
