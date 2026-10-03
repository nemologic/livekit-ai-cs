import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'
import Settings from '../views/Settings.vue'
import CallHistory from '../views/CallHistory.vue'
import Forwarding from '../views/Forwarding.vue'
import Training from '../views/Training.vue'
import Voice from '../views/Voice.vue'

const routes = [
  { path: '/login', component: Login, meta: { public: true } },
  { path: '/', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/settings', component: Settings, meta: { requiresAuth: true } },
  { path: '/call-history', component: CallHistory, meta: { requiresAuth: true } },
  { path: '/forwarding', component: Forwarding, meta: { requiresAuth: true } },
  { path: '/training', component: Training, meta: { requiresAuth: true } },
  { path: '/voice', component: Voice, meta: { requiresAuth: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('admin_token')
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/')
  } else {
    next()
  }
})

export default router
