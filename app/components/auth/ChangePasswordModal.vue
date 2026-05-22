<script setup>
const { $api } = useNuxtApp()
const authStore = useAuthStore()
const router    = useRouter()

const form = reactive({ password: '', confirm_password: '' })
const errors     = ref({})
const submitting = ref(false)
const showPw     = ref(false)
const showCpw    = ref(false)

async function submit() {
  errors.value   = {}
  submitting.value = true
  try {
    await $api('/api/auth/change-password', { method: 'POST', body: { ...form } })
    // Update local store so the modal hides
    authStore.user = { ...authStore.user, status: 'A' }
    localStorage.setItem('auth_user', JSON.stringify(authStore.user))
    router.push('/dashboard')
  } catch (e) {
    if (e?.data?.errors) errors.value = e.data.errors
    else errors.value = { _global: e?.data?.message || 'Something went wrong' }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <!-- Backdrop -->
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.55); backdrop-filter: blur(3px);">
    <Transition name="modal" appear>
      <div
        class="bg-white rounded-2xl shadow-2xl w-full overflow-hidden"
        style="max-width: 420px;"
      >
        <!-- Header bar -->
        <div class="px-7 pt-7 pb-5">
          <div class="flex items-center gap-3 mb-1">
            <div class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style="background: linear-gradient(135deg,#7C3AED,#5B21B6);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="11" width="14" height="10" rx="2" stroke="white" stroke-width="1.8"/>
                <path d="M8 11V7a4 4 0 018 0v4" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
                <circle cx="12" cy="16" r="1.5" fill="white"/>
              </svg>
            </div>
            <div>
              <h2 class="text-base font-bold text-gray-800">Set New Password</h2>
              <p class="text-xs text-gray-400">Please set a new password before continuing</p>
            </div>
          </div>
          <div class="mt-3 h-0.5 rounded-full" style="background: linear-gradient(90deg,#7C3AED,#A855F7,transparent);"></div>
        </div>

        <!-- Body -->
        <form class="px-7 pb-7 space-y-4" @submit.prevent="submit">
          <!-- Global error -->
          <p v-if="errors._global" class="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{{ errors._global }}</p>

          <!-- New Password -->
          <div>
            <label class="block text-xs font-semibold mb-1.5" style="color:#6D28D9;">
              New Password <span class="text-red-400">*</span>
            </label>
            <div class="relative">
              <input
                v-model="form.password"
                :type="showPw ? 'text' : 'password'"
                placeholder="Minimum 6 characters"
                required
                class="w-full pl-3 pr-10 py-2.5 text-sm rounded-xl border text-gray-700 placeholder-gray-300 focus:outline-none transition-all"
                :class="errors.password ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'"
              />
              <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-purple-500 transition-colors" @click="showPw = !showPw">
                <svg v-if="!showPw" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/></svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
              </button>
            </div>
            <p v-if="errors.password" class="text-xs text-red-400 mt-1">{{ errors.password[0] }}</p>
          </div>

          <!-- Confirm Password -->
          <div>
            <label class="block text-xs font-semibold mb-1.5" style="color:#6D28D9;">
              Confirm Password <span class="text-red-400">*</span>
            </label>
            <div class="relative">
              <input
                v-model="form.confirm_password"
                :type="showCpw ? 'text' : 'password'"
                placeholder="Repeat new password"
                required
                class="w-full pl-3 pr-10 py-2.5 text-sm rounded-xl border text-gray-700 placeholder-gray-300 focus:outline-none transition-all"
                :class="errors.confirm_password ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100'"
              />
              <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-purple-500 transition-colors" @click="showCpw = !showCpw">
                <svg v-if="!showCpw" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/></svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
              </button>
            </div>
            <p v-if="errors.confirm_password" class="text-xs text-red-400 mt-1">{{ errors.confirm_password[0] }}</p>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="submitting"
            class="w-full py-2.5 rounded-xl text-white text-sm font-bold tracking-wide transition-all mt-2"
            :class="submitting ? 'opacity-70 cursor-not-allowed' : ''"
            style="background: linear-gradient(135deg,#7C3AED,#6D28D9); box-shadow: 0 6px 20px rgba(109,40,217,0.35);"
          >
            {{ submitting ? 'Saving...' : 'Set Password & Continue' }}
          </button>
        </form>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.modal-enter-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.modal-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.95) translateY(8px); }
</style>
