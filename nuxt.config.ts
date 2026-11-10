export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  modules: ['nuxt-auth-utils'],
  css: ['~/assets/css/main.css'],
  devtools: { enabled: false },
  typescript: { strict: true },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Cleekin',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'Cleekin is a cute online photobooth. Pick a frame, strike a pose, download your photo.' },
        { name: 'theme-color', content: '#DCECFB' },
      ],
      link: [
        { rel: 'preload', href: '/fonts/porkys.woff2', as: 'font', type: 'font/woff2', crossorigin: '' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },

  runtimeConfig: {
    // Set through env vars: NUXT_DATABASE_URL, NUXT_ADMIN_EMAIL, NUXT_ADMIN_PASSWORD_HASH.
    // NUXT_APP_SECRET (session sealing) and BLOB_READ_WRITE_TOKEN are read by their libraries.
    databaseUrl: '',
    adminEmail: '',
    adminPasswordHash: '',
    session: {
      maxAge: 60 * 60 * 24 * 7,
    },
  },

  routeRules: {
    '/admin/**': { ssr: false },
    '/booth/**': { ssr: false },
  },
})
