<script setup>
import bgLogin from '~/assets/images/backgrounds/Login.png'
definePageMeta({ layout: false })
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center p-4"
    :style="{ backgroundImage: `url(${bgLogin})`, backgroundSize: 'cover', backgroundPosition: 'center' }"
  >
    <LoginForm />
  </div>
</template>
