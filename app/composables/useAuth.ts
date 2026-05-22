export function useAuth() {
  const authStore = useAuthStore()
  const router    = useRouter()

  async function login(credentials: { email: string; password: string }) {
    const res: any = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: credentials.email, password: credentials.password },
    })

    authStore.setUser(res.data)
    // If status = N the ChangePasswordModal will appear automatically on top of the page
    return router.push('/dashboard')
  }

  function logout() {
    authStore.clear()
    router.push('/auth/login')
  }

  return { login, logout }
}
