// Route → resource code mapping for permission checks
const ROUTE_RESOURCE: Record<string, string> = {
  '/stationary/daily':     'STATIONARY',
  '/stationary/monthly':   'STATIONARY',
  '/bookings':             'BOOKINGS',
  '/inventory/stock':      'INVENTORY',
  '/inventory/categories': 'INVENTORY',
  '/staff':                'STAFF',
  '/settings/branches':    'BRANCHES',
  '/vehicles':                   'VEHICLES',
  '/vehicles/documents':         'VEHICLES',
  '/roles':                      'ROLES',
  '/reports/vehicle/requests':   'REPORTS',
  '/reports/vehicle/department': 'REPORTS',
}

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return

  const authStore = useAuthStore()
  authStore.restore()

  if (!authStore.isLoggedIn) {
    return navigateTo('/auth/login')
  }

  // Check route-level permission (can_view)
  // If no permissions configured yet, allow all routes (fail-open during setup)
  const resource = ROUTE_RESOURCE[to.path]
  if (resource && authStore.permissions && Object.keys(authStore.permissions).length > 0) {
    if (!authStore.permissions[resource]?.view) {
      return navigateTo('/dashboard')
    }
  }
})
