import { defineStore } from 'pinia'

type PermissionMap = Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }>

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token:       null as string | null,
    user:        null as Record<string, any> | null,
    permissions: null as PermissionMap | null,
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    branchId:   (state) => state.user?.branch_id,
    role:       (state) => state.user?.role,
  },
  actions: {
    setUser(data: any) {
      this.token       = data.access_token
      this.user        = data.user
      this.permissions = data.permissions ?? {}
      if (import.meta.client) {
        localStorage.setItem('auth_token',       data.access_token)
        localStorage.setItem('auth_user',        JSON.stringify(data.user))
        localStorage.setItem('auth_permissions', JSON.stringify(data.permissions ?? {}))
      }
    },
    restore() {
      if (import.meta.client) {
        const token = localStorage.getItem('auth_token')
        const user  = localStorage.getItem('auth_user')
        const perms = localStorage.getItem('auth_permissions')
        if (token && user) {
          this.token       = token
          this.user        = JSON.parse(user)
          this.permissions = perms ? JSON.parse(perms) : {}
        }
      }
    },
    clear() {
      this.token       = null
      this.user        = null
      this.permissions = null
      if (import.meta.client) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
        localStorage.removeItem('auth_permissions')
      }
    },
  },
})
