import { createApp } from 'vue'
import { router } from './router'
import { initAuth } from './stores/auth'
import App from './App.vue'
import './styles/main.css'

// Restore any existing session before mounting so route guards see the truth.
initAuth().finally(() => {
  createApp(App).use(router).mount('#app')
})
