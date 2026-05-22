<script setup>
import bgBanner from '~/assets/images/backgrounds/Login.png'
import frameLogo from '~/assets/images/logos/Frame 10.png'

definePageMeta({ middleware: 'auth' })
</script>

<template>
  <div>
    <!-- Purple banner -->
    <div
      class="rounded-2xl overflow-hidden flex items-center px-8"
      style="min-height: 88px; background-image: url(); background-size: cover; background-position: center;"
      :style="{ backgroundImage: `url(${bgBanner})` }"
    >
      <img :src="frameLogo" alt="Indochina Bank" class="h-12 object-contain" />
    </div>
  </div>
</template>
