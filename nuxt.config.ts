// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  devtools: { enabled: true },
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
  ],
  css: ['~/assets/css/main.css'],
  components: {
    dirs: [{ path: '~/components', pathPrefix: false }],
  },
  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
      ],
    },
  },
  nitro: {
    experimental: {
      tasks: true,
    },
    // Runs document:expiry-check every day at 08:00 server time
    scheduledTasks: {
      '0 8 * * *': ['document:expiry-check'],
    },
  },
})
