export default defineNuxtPlugin(() => {
  const authStore = useAuthStore()

  const api = $fetch.create({
    onRequest({ options }) {
      const token = authStore.token ?? localStorage.getItem('auth_token')
      if (token) {
        options.headers = {
          ...(options.headers as Record<string, string>),
          Authorization: `Bearer ${token}`,
        }
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
