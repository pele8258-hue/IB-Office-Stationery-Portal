import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null as string | null,
    user:  null as Record<string, any> | null,
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    branchId:   (state) => state.user?.branch_id,
    role:       (state) => state.user?.role,
  },
  actions: {
    setUser(data: any) {
      this.token = data.access_token
      this.user  = data.user
      if (import.meta.client) {
        localStorage.setItem('auth_token', data.access_token)
        localStorage.setItem('auth_user',  JSON.stringify(data.user))
      }
    },
    restore() {
      if (import.meta.client) {
        const token = localStorage.getItem('auth_token')
        const user  = localStorage.getItem('auth_user')
        if (token && user) {
          this.token = token
          this.user  = JSON.parse(user)
        }
      }
    },
    clear() {
      this.token = null
      this.user  = null
      if (import.meta.client) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      }
    },
  },
})
