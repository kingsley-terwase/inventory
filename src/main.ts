import { createApp } from 'vue'
import { createPinia } from 'pinia'
import * as ionic from '@ionic/vue'
import { IonicVue } from '@ionic/vue'
import App from './App.vue'
import router from './router'
import { useAuth } from './stores/auth'
import { setUnauthorizedHandler } from './services/api'
import { clearAll } from './services/session'
import { toast } from './composables/useUi'

import '@ionic/vue/css/core.css'
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'
import '@ionic/vue/css/padding.css'
import '@ionic/vue/css/flex-utils.css'
import '@ionic/vue/css/display.css'
import './theme/variables.css'
import './theme/app.css'

const pinia = createPinia()
const app = createApp(App).use(pinia).use(IonicVue, { mode: 'md' }).use(router)

// Register every Ion* component globally so page templates stay short.
Object.entries(ionic).forEach(([name, comp]) => {
  if (/^Ion[A-Z]/.test(name) && typeof comp === 'object') app.component(name, comp as any)
})

// The server rejected our token (expired or logged out elsewhere): clear everything and go to the login page.
setUnauthorizedHandler(() => {
  useAuth().clear(); clearAll()
  router.replace('/login')
  toast('Your session has expired. Please sign in again.', 'warning')
})

router.isReady().then(() => app.mount('#app'))
