<script setup>
const authStore = useAuthStore()
authStore.restore()

const showChangePassword = computed(
  () => authStore.isLoggedIn && authStore.user?.status === 'N'
)
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ChangePasswordModal v-if="showChangePassword" />
</template>
