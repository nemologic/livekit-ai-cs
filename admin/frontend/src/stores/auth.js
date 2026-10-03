import { defineStore } from 'pinia'
import api from '../api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('admin_token') || null,
    admin: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
  },

  actions: {
    async login(id, password) {
      const response = await api.post('/auth/login', { id, password })
      const { access_token, admin } = response.data
      this.token = access_token
      this.admin = admin
      localStorage.setItem('admin_token', access_token)
      return admin
    },

    async fetchProfile() {
      const response = await api.get('/auth/profile')
      this.admin = response.data
      return this.admin
    },

    logout() {
      this.token = null
      this.admin = null
      localStorage.removeItem('admin_token')
    },
  },
})
