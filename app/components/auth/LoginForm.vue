<script setup>
import ibBranding from '~/assets/images/backgrounds/Frame 4.png'

const { login } = useAuth()
const form        = reactive({ email: '', password: '' })
const error       = ref('')
const isInactive  = ref(false)
const loading     = ref(false)
const showPassword = ref(false)
const rememberMe  = ref(false)

// Restore saved username on mount
onMounted(() => {
  const saved = localStorage.getItem('remembered_username')
  if (saved) {
    form.email   = saved
    rememberMe.value = true
  }
})

async function submit() {
  loading.value   = true
  error.value     = ''
  isInactive.value = false
  try {
    if (rememberMe.value) {
      localStorage.setItem('remembered_username', form.email)
    } else {
      localStorage.removeItem('remembered_username')
    }
    await login(form)
  } catch (e) {
    if (e?.status === 403) {
      isInactive.value = true
      error.value = e?.data?.message || 'Account is inactive. Contact your administrator.'
    } else {
      error.value = e?.data?.message || 'Invalid email or password'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div
    class="flex w-full overflow-hidden"
    style="max-width: 1000px; border-radius: 24px; background: #F6F6F6; box-shadow: 0 32px 80px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.18);"
  >
    <!-- ===== LEFT PANEL (50%) ===== -->
    <div
      class="hidden md:flex items-center justify-center overflow-hidden"
      style="width: 50%; background: #F6F6F6;"
    >
      <img :src="ibBranding" alt="Indochina Bank" class="w-full h-full object-contain" />
    </div>


    <!-- ===== RIGHT PANEL (50%) ===== -->
    <div class="relative flex flex-col w-full md:w-1/2">
      <form class="flex flex-col flex-1 justify-center px-6 py-8 md:px-12 md:py-10" @submit.prevent="submit">

        <!-- Welcome heading -->
        <div class="mb-8 text-center">
          <h2 class="font-bold text-gray-700" style="font-size: 1.1rem; letter-spacing: 0.01em;">
            Welcome to the Office Services Portal
          </h2>
          <div class="mx-auto mt-2 rounded-full" style="width: 40px; height: 3px; background: linear-gradient(90deg, #7C3AED, #A855F7);"></div>
        </div>

        <!-- Username -->
        <div class="mb-5">
          <label class="block text-sm font-semibold mb-2" style="color: #6D28D9;">Username</label>
          <div class="relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="#7C3AED" stroke-width="1.8"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#7C3AED" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </span>
            <input
              v-model="form.email"
              type="text"
              placeholder="Input Username"
              autocomplete="username"
              required
              class="w-full pl-11 pr-4 py-3 text-sm rounded-xl text-gray-700 placeholder-gray-300 focus:outline-none transition-all"
              style="background: #F5F0FF; border: 1.5px solid #DDD6FE;"
              @focus="e => { e.target.style.borderColor = '#7C3AED'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.08)'; }"
              @blur="e => { e.target.style.borderColor = '#DDD6FE'; e.target.style.background = '#F5F0FF'; e.target.style.boxShadow = 'none'; }"
            />
          </div>
        </div>

        <!-- Password -->
        <div class="mb-4">
          <label class="block text-sm font-semibold mb-2" style="color: #6D28D9;">Password</label>
          <div class="relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="11" width="14" height="10" rx="2" stroke="#7C3AED" stroke-width="1.8"/>
                <path d="M8 11V7a4 4 0 018 0v4" stroke="#7C3AED" stroke-width="1.8" stroke-linecap="round"/>
                <circle cx="12" cy="16" r="1.5" fill="#7C3AED"/>
              </svg>
            </span>
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Input Password"
              autocomplete="current-password"
              required
              class="w-full pl-11 pr-12 py-3 text-sm rounded-xl text-gray-700 placeholder-gray-300 focus:outline-none transition-all"
              style="background: #F5F0FF; border: 1.5px solid #DDD6FE;"
              @focus="e => { e.target.style.borderColor = '#7C3AED'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.08)'; }"
              @blur="e => { e.target.style.borderColor = '#DDD6FE'; e.target.style.background = '#F5F0FF'; e.target.style.boxShadow = 'none'; }"
            />
            <button
              type="button"
              class="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
              style="color: #A78BFA;"
              @click="showPassword = !showPassword"
              @mouseenter="e => e.currentTarget.style.color = '#7C3AED'"
              @mouseleave="e => e.currentTarget.style.color = '#A78BFA'"
            >
              <svg v-if="!showPassword" width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.8"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/>
              </svg>
              <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Remember me -->
        <div class="flex items-center gap-2.5 mb-6">
          <input
            id="remember"
            v-model="rememberMe"
            type="checkbox"
            class="w-4 h-4 cursor-pointer accent-purple-600 rounded"
          />
          <label for="remember" class="text-sm text-gray-400 cursor-pointer select-none">Remember Me</label>
        </div>

        <!-- Error: Inactive account -->
        <div v-if="error && isInactive" class="flex items-start gap-2.5 px-4 py-3 rounded-xl mb-3 -mt-3" style="background:#FEF3C7; border:1px solid #F59E0B;">
          <svg class="flex-shrink-0 mt-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#D97706" stroke-width="2"/>
            <line x1="12" y1="8" x2="12" y2="12" stroke="#D97706" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="16" r="1" fill="#D97706"/>
          </svg>
          <p class="text-xs font-medium" style="color:#92400E;">{{ error }}</p>
        </div>
        <!-- Error: Wrong credentials / other -->
        <p v-else-if="error" class="text-xs text-red-500 text-center mb-3 -mt-3">{{ error }}</p>

        <!-- Login button -->
        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 rounded-xl text-white text-sm font-bold tracking-wide transition-all"
          :class="loading ? 'opacity-70 cursor-not-allowed' : ''"
          style="background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%); box-shadow: 0 6px 20px rgba(109, 40, 217, 0.4);"
          @mouseenter="e => { if (!loading.value) e.target.style.boxShadow = '0 8px 24px rgba(109,40,217,0.55)'; }"
          @mouseleave="e => e.target.style.boxShadow = '0 6px 20px rgba(109, 40, 217, 0.4)'"
        >
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>

      </form>

      <!-- Version -->
      <p class="text-center pb-4 text-xs" style="color: #C4B5FD;">V 1.0</p>
    </div>
  </div>
</template>
