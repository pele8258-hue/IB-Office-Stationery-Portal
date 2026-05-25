export function usePermissions() {
  const authStore = useAuthStore()

  function can(resource: string, action: 'view' | 'create' | 'edit' | 'delete'): boolean {
    const perms = authStore.permissions
    // No permissions configured yet → allow everything (fail-open during setup)
    if (!perms || Object.keys(perms).length === 0) return true
    const p = perms[resource]
    if (!p) return false
    return !!p[action]
  }

  return {
    can,
    canView:   (r: string) => can(r, 'view'),
    canCreate: (r: string) => can(r, 'create'),
    canEdit:   (r: string) => can(r, 'edit'),
    canDelete: (r: string) => can(r, 'delete'),
  }
}
