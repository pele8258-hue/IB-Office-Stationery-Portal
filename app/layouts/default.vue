<script setup>
import logoIB from '~/assets/images/logos/Logo ib band.png'

const authStore = useAuthStore()
const { logout } = useAuth()
const router = useRouter()

const openMenus = reactive({ stationary: true, inventory: true, userMgmt: true })
const mobileOpen = ref(false)

function closeMobile() { mobileOpen.value = false }

watch(() => router.currentRoute.value.path, closeMobile)
</script>

<template>
  <div class="min-h-screen flex flex-col md:flex-row" style="background: #EFEFEF;">

    <!-- ========== MOBILE TOPBAR (hidden on md+) ========== -->
    <header class="md:hidden bg-white shadow-sm flex items-center justify-between px-4 py-2 flex-shrink-0 sticky top-0 z-40">
      <!-- Logo + title -->
      <div class="flex items-center gap-2">
        <img :src="logoIB" alt="Indochina Bank" class="w-9 h-9 object-contain" />
        <span class="text-xs font-bold" style="color:#4C1D95;">Office Services Portal</span>
      </div>
      <!-- Right: user + hamburger -->
      <div class="flex items-center gap-3">
        <div class="text-right leading-tight hidden xs:block">
          <p class="text-xs font-semibold text-gray-700">{{ authStore.user?.name }}</p>
          <p class="text-[10px] text-gray-400">{{ authStore.user?.department || 'IT Department' }}</p>
        </div>
        <button
          class="w-8 h-8 rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-gray-100 transition-colors"
          @click="mobileOpen = !mobileOpen"
        >
          <span class="block w-5 h-0.5 bg-gray-500 transition-all" :class="mobileOpen ? 'rotate-45 translate-y-1.5' : ''"></span>
          <span class="block w-5 h-0.5 bg-gray-500 transition-all" :class="mobileOpen ? 'opacity-0' : ''"></span>
          <span class="block w-5 h-0.5 bg-gray-500 transition-all" :class="mobileOpen ? '-rotate-45 -translate-y-1.5' : ''"></span>
        </button>
      </div>
    </header>

    <!-- ========== MOBILE DROPDOWN MENU ========== -->
    <Transition name="dropdown">
      <div
        v-if="mobileOpen"
        class="md:hidden bg-white shadow-lg z-30 border-t border-gray-100 overflow-y-auto"
        style="max-height: 75vh;"
      >
        <!-- User info row -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-purple-50">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style="background: linear-gradient(135deg, #7C3AED, #5B21B6);">
              {{ authStore.user?.name?.charAt(0)?.toUpperCase() }}
            </div>
            <div class="leading-tight">
              <p class="text-sm font-bold text-gray-800">{{ authStore.user?.name }}</p>
              <p class="text-xs text-gray-500">
                {{ authStore.user?.role }}
                <span v-if="authStore.user?.department" class="text-gray-300 mx-1">·</span>
                {{ authStore.user?.department }}
              </p>
              <p v-if="authStore.user?.position" class="text-xs" style="color:#A78BFA;">
                {{ authStore.user?.position }}
              </p>
            </div>
          </div>
          <button
            class="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-red-50 transition-colors"
            @click="logout"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round"/>
              <polyline points="16,17 21,12 16,7" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round"/>
              <line x1="21" y1="12" x2="9" y2="12" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <!-- Nav items -->
        <nav class="px-3 py-3 space-y-0.5">
          <NuxtLink to="/dashboard" class="mob-item" @click="closeMobile">
            <span class="nav-icon" style="background:#DBEAFE;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="8" height="8" rx="1.5" fill="#3B82F6"/><rect x="13" y="3" width="8" height="8" rx="1.5" fill="#3B82F6"/>
                <rect x="3" y="13" width="8" height="8" rx="1.5" fill="#3B82F6"/><rect x="13" y="13" width="8" height="8" rx="1.5" fill="#3B82F6"/>
              </svg>
            </span>
            Dashboard
          </NuxtLink>

          <button class="mob-item w-full" @click="openMenus.stationary = !openMenus.stationary">
            <span class="nav-icon" style="background:#FFEDD5;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="4" y="2" width="16" height="20" rx="2" fill="#F97316"/><line x1="8" y1="8" x2="16" y2="8" stroke="white" stroke-width="1.8" stroke-linecap="round"/><line x1="8" y1="12" x2="16" y2="12" stroke="white" stroke-width="1.8" stroke-linecap="round"/><line x1="8" y1="16" x2="12" y2="16" stroke="white" stroke-width="1.8" stroke-linecap="round"/></svg>
            </span>
            <span class="flex-1 text-left">Stationary Request</span>
            <svg class="w-3 h-3 text-gray-300 transition-transform" :class="openMenus.stationary ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
          </button>
          <div v-if="openMenus.stationary" class="ml-3 pl-3 border-l border-gray-100 space-y-0.5">
            <NuxtLink to="/stationary/daily" class="mob-sub-item" @click="closeMobile">
              <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#EAB308;"></span>
              Daily Request
            </NuxtLink>
            <NuxtLink to="/stationary/monthly" class="mob-sub-item" @click="closeMobile">
              <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#10B981;"></span>
              Monthly Request
            </NuxtLink>
          </div>

          <NuxtLink to="/bookings" class="mob-item" @click="closeMobile">
            <span class="nav-icon" style="background:#DCFCE7;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="1" y="9" width="22" height="10" rx="2" fill="#22C55E"/><circle cx="6.5" cy="19" r="2" fill="#166834"/><circle cx="17.5" cy="19" r="2" fill="#166834"/><line x1="1" y1="13" x2="23" y2="13" stroke="white" stroke-width="1.2"/></svg>
            </span>
            Transport Request
          </NuxtLink>

          <button class="mob-item w-full" @click="openMenus.inventory = !openMenus.inventory">
            <span class="nav-icon" style="background:#F3E8FF;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="18" rx="2" fill="#8B5CF6"/><line x1="2" y1="9" x2="22" y2="9" stroke="white" stroke-width="1.5"/><line x1="2" y1="15" x2="22" y2="15" stroke="white" stroke-width="1.5"/><line x1="8" y1="9" x2="8" y2="21" stroke="white" stroke-width="1.5"/></svg>
            </span>
            <span class="flex-1 text-left">Stationery Inventory</span>
            <svg class="w-3 h-3 text-gray-300 transition-transform" :class="openMenus.inventory ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
          </button>
          <div class="submenu ml-3 pl-3 border-l border-gray-100" :class="{ 'submenu-open': openMenus.inventory }">
            <NuxtLink to="/inventory/stock" class="mob-sub-item" @click="closeMobile">
              <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#14B8A6;"></span>
              Stock Management
            </NuxtLink>
            <NuxtLink to="/inventory/categories" class="mob-sub-item" @click="closeMobile">
              <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#A855F7;"></span>
              Item Category
            </NuxtLink>
          </div>

          <button class="mob-item w-full" @click="openMenus.userMgmt = !openMenus.userMgmt">
            <span class="nav-icon" style="background:#F3E8FF;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="4" fill="#7C3AED"/><path d="M1 21c0-4 3.6-7 8-7s8 3 8 7" fill="#7C3AED"/><circle cx="19" cy="8" r="3" fill="#A78BFA"/></svg>
            </span>
            <span class="flex-1 text-left">User Management</span>
            <svg class="w-3 h-3 text-gray-300 transition-transform" :class="openMenus.userMgmt ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
          </button>
          <div class="submenu ml-3 pl-3 border-l border-gray-100" :class="{ 'submenu-open': openMenus.userMgmt }">
            <NuxtLink to="/staff" class="mob-sub-item" @click="closeMobile">
              <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#7C3AED;"></span>
              User List
            </NuxtLink>
            <NuxtLink to="/settings/branches" class="mob-sub-item" @click="closeMobile">
              <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#F97316;"></span>
              Branch Management
            </NuxtLink>
          </div>
        </nav>
      </div>
    </Transition>

    <!-- ========== DESKTOP SIDEBAR (hidden on mobile) ========== -->
    <aside class="hidden md:flex flex-col bg-white shadow-md flex-shrink-0" style="width: 220px; min-height: 100vh;">
      <div class="flex flex-col items-center px-4 pb-3 border-b border-gray-100">
        <img :src="logoIB" alt="Indochina Bank" class="w-24 object-contain object-top" style="margin-top: -8px;" />
        <span class="text-sm font-semibold text-center leading-snug" style="color: #4C1D95;">Office Services Portal</span>
      </div>
      <div class="pt-4 pb-2 flex justify-center">
        <span class="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Navigation</span>
      </div>
      <nav class="flex-1 px-3 pb-4 space-y-0.5 text-sm overflow-y-auto">
        <NuxtLink to="/dashboard" class="nav-item">
          <span class="nav-icon" style="background:#DBEAFE;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="1.5" fill="#3B82F6"/><rect x="13" y="3" width="8" height="8" rx="1.5" fill="#3B82F6"/><rect x="3" y="13" width="8" height="8" rx="1.5" fill="#3B82F6"/><rect x="13" y="13" width="8" height="8" rx="1.5" fill="#3B82F6"/></svg></span>
          Dashboard
        </NuxtLink>
        <div>
          <button class="nav-item w-full" @click="openMenus.stationary = !openMenus.stationary">
            <span class="nav-icon" style="background:#FFEDD5;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="4" y="2" width="16" height="20" rx="2" fill="#F97316"/><line x1="8" y1="8" x2="16" y2="8" stroke="white" stroke-width="1.8" stroke-linecap="round"/><line x1="8" y1="12" x2="16" y2="12" stroke="white" stroke-width="1.8" stroke-linecap="round"/><line x1="8" y1="16" x2="12" y2="16" stroke="white" stroke-width="1.8" stroke-linecap="round"/></svg></span>
            <span>Stationary Request</span>
            <svg class="w-3 h-3 text-gray-300 transition-transform duration-200 absolute right-2" :class="openMenus.stationary ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <div class="submenu" :class="{ 'submenu-open': openMenus.stationary }">
            <NuxtLink to="/stationary/daily" class="nav-sub-item">
              <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#EAB308;"></span>
              Daily Request
            </NuxtLink>
            <NuxtLink to="/stationary/monthly" class="nav-sub-item">
              <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#10B981;"></span>
              Monthly Request
            </NuxtLink>
          </div>
        </div>
        <NuxtLink to="/bookings" class="nav-item">
          <span class="nav-icon" style="background:#DCFCE7;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="1" y="9" width="22" height="10" rx="2" fill="#22C55E"/><circle cx="6.5" cy="19" r="2" fill="#166834"/><circle cx="17.5" cy="19" r="2" fill="#166834"/><line x1="1" y1="13" x2="23" y2="13" stroke="white" stroke-width="1.2"/></svg></span>
          Transport Request
        </NuxtLink>
        <div>
          <button class="nav-item w-full" @click="openMenus.inventory = !openMenus.inventory">
            <span class="nav-icon" style="background:#F3E8FF;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="18" rx="2" fill="#8B5CF6"/><line x1="2" y1="9" x2="22" y2="9" stroke="white" stroke-width="1.5"/><line x1="2" y1="15" x2="22" y2="15" stroke="white" stroke-width="1.5"/><line x1="8" y1="9" x2="8" y2="21" stroke="white" stroke-width="1.5"/></svg></span>
            <span>Stationery Inventory</span>
            <svg class="w-3 h-3 text-gray-300 transition-transform duration-200 absolute right-2" :class="openMenus.inventory ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <div class="submenu" :class="{ 'submenu-open': openMenus.inventory }">
            <NuxtLink to="/inventory/stock" class="nav-sub-item">
              <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#14B8A6;"></span>
              Stock Management
            </NuxtLink>
            <NuxtLink to="/inventory/categories" class="nav-sub-item">
              <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#A855F7;"></span>
              Item Category
            </NuxtLink>
          </div>
        </div>
        <div>
          <button class="nav-item w-full" @click="openMenus.userMgmt = !openMenus.userMgmt">
            <span class="nav-icon" style="background:#F3E8FF;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="4" fill="#7C3AED"/><path d="M1 21c0-4 3.6-7 8-7s8 3 8 7" fill="#7C3AED"/><circle cx="19" cy="8" r="3" fill="#A78BFA"/><path d="M15 21c0-2.5 1.8-4.5 4-5" stroke="#A78BFA" stroke-width="1.5" stroke-linecap="round"/></svg></span>
            <span>User Management</span>
            <svg class="w-3 h-3 text-gray-300 transition-transform duration-200 absolute right-2" :class="openMenus.userMgmt ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <div class="submenu" :class="{ 'submenu-open': openMenus.userMgmt }">
            <NuxtLink to="/staff" class="nav-sub-item">
              <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#7C3AED;"></span>
              User List
            </NuxtLink>
            <NuxtLink to="/settings/branches" class="nav-sub-item">
              <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:#F97316;"></span>
              Branch Management
            </NuxtLink>
          </div>
        </div>
      </nav>
    </aside>

    <!-- ========== DESKTOP MAIN AREA ========== -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Desktop header (hidden on mobile) -->
      <header class="hidden md:flex bg-white shadow-sm px-6 py-3 items-center justify-end gap-4 flex-shrink-0">
        <!-- User card -->
        <div class="flex items-center gap-3">
          <!-- Avatar -->
          <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style="background: linear-gradient(135deg, #7C3AED, #5B21B6);">
            {{ authStore.user?.name?.charAt(0)?.toUpperCase() }}
          </div>
          <!-- Info -->
          <div class="text-left leading-tight">
            <p class="text-sm font-bold text-gray-800">{{ authStore.user?.name }}</p>
            <p class="text-xs text-gray-400">
              {{ authStore.user?.role }}
              <span v-if="authStore.user?.department" class="text-gray-300 mx-1">·</span>
              {{ authStore.user?.department }}
            </p>
            <p v-if="authStore.user?.position || authStore.user?.job_title" class="text-xs" style="color:#A78BFA;">
              {{ authStore.user?.position || authStore.user?.job_title }}
            </p>
          </div>
        </div>
        <button class="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-purple-400 hover:bg-purple-50 transition-colors" title="Logout" @click="logout">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="16,17 21,12 16,7" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="21" y1="12" x2="9" y2="12" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </header>
      <main class="flex-1 p-4 md:p-6 overflow-auto">
        <slot />
      </main>
    </div>

  </div>
</template>

<style scoped>
.nav-item {
  @apply flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors w-full relative;
}
.router-link-active.nav-item { @apply bg-purple-50 text-purple-700; }
.nav-sub-item {
  @apply flex items-center justify-center gap-2 px-2 py-1.5 rounded-lg text-gray-500 text-xs hover:bg-gray-50 hover:text-gray-700 transition-colors;
}
.router-link-active.nav-sub-item { @apply bg-purple-50 text-purple-600; }
.mob-item {
  @apply flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors w-full;
}
.router-link-active.mob-item { @apply bg-purple-50 text-purple-700; }
.mob-sub-item {
  @apply flex items-center gap-2 px-2 py-2 rounded-lg text-gray-500 text-sm hover:bg-gray-50 transition-colors;
}
.router-link-active.mob-sub-item { @apply bg-purple-50 text-purple-600; }
.nav-icon  { @apply flex items-center justify-center rounded-md flex-shrink-0; width:26px; height:26px; }
.nav-icon-sm { @apply flex items-center justify-center rounded flex-shrink-0; width:20px; height:20px; }

/* Mobile hamburger dropdown */
.dropdown-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.dropdown-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-6px); }

/* Sidebar submenu smooth slide */
.submenu {
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  transition: max-height 0.28s ease, opacity 0.2s ease, padding 0.2s ease;
  padding-top: 0;
  padding-bottom: 0;
  margin-top: 0;
}
.submenu.submenu-open {
  max-height: 300px;
  opacity: 1;
  padding-top: 2px;
  padding-bottom: 2px;
  margin-top: 2px;
}
</style>
