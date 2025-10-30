import { createApp } from 'vue'
import App from '@/app/App.vue'
import getRouter from '@/app/router'
import i18n from '@/app/i18n'

// Async IIFE pattern for app initialization
;(async () => {
  const app = createApp(App)
  const router = await getRouter()

  app.use(router)
  app.use(i18n)
  app.mount('#app')
})()
