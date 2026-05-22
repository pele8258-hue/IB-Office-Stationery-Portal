export default defineNuxtRouteMiddleware((to) => {
  // localStorage is only available on the client — skip on server to avoid false logout
  if (import.meta.server) return

  const authStore = useAuthStore()
  authStore.restore()

  if (!authStore.isLoggedIn) {
    return navigateTo('/auth/login')
  }
})
