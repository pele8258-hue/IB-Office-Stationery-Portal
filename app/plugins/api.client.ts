export default defineNuxtPlugin(() => {
  const authStore = useAuthStore()

  const api = $fetch.create({
    onRequest({ options }) {
      const token = authStore.token ?? localStorage.getItem('auth_token')
      if (token) {
        const headers = new Headers(options.headers as HeadersInit)
        headers.set('Authorization', `Bearer ${token}`)
        options.headers = headers
      }
    },
    onResponseError({ response }) {
      if (response.status === 401) {
        authStore.clear()
        navigateTo('/auth/login')
      }
    },
  })

  return {
    provide: { api },
  }
})

declare module '#app' {
  interface NuxtApp {
    $api: typeof $fetch
  }
}
