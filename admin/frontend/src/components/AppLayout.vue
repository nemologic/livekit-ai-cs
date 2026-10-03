<template>
  <el-container style="height: 100vh;">
    <!-- Sidebar -->
    <el-aside width="220px" style="background-color: #1a1a2e; color: #fff;">
      <div class="logo">
        <el-icon size="24"><Headset /></el-icon>
        <span>LiveKit 관리자</span>
      </div>
      <el-menu
        :router="true"
        :default-active="$route.path"
        background-color="#1a1a2e"
        text-color="#ccc"
        active-text-color="#409EFF"
        style="border: none;"
      >
        <el-menu-item index="/">
          <el-icon><DataBoard /></el-icon>
          <span>대시보드</span>
        </el-menu-item>
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <span>AI 설정</span>
        </el-menu-item>
        <el-menu-item index="/call-history">
          <el-icon><Phone /></el-icon>
          <span>통화 이력</span>
        </el-menu-item>
        <el-menu-item index="/forwarding">
          <el-icon><Switch /></el-icon>
          <span>착신 설정</span>
        </el-menu-item>
        <el-menu-item index="/training">
          <el-icon><Reading /></el-icon>
          <span>상담원 훈련</span>
        </el-menu-item>
        <el-menu-item index="/voice">
          <el-icon><Microphone /></el-icon>
          <span>목소리 설정</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <!-- Top bar -->
      <el-header style="background: #fff; border-bottom: 1px solid #e4e7ed; display: flex; align-items: center; justify-content: space-between; padding: 0 24px;">
        <div style="font-size: 18px; font-weight: 600; color: #303133;">
          {{ pageTitle }}
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <el-icon><UserFilled /></el-icon>
          <span style="color: #606266;">admin</span>
          <el-button type="danger" size="small" @click="logout" plain>로그아웃</el-button>
        </div>
      </el-header>

      <!-- Main content -->
      <el-main style="background: #f5f7fa; padding: 24px;">
        <slot />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const pageTitle = computed(() => {
  const titles = {
    '/': '대시보드',
    '/settings': 'AI 설정',
    '/call-history': '통화 이력',
    '/forwarding': '착신 설정',
    '/training': '상담원 훈련',
    '/voice': '목소리 설정',
  }
  return titles[route.path] || '관리자 패널'
})

function logout() {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 16px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  border-bottom: 1px solid #2d2d50;
  margin-bottom: 8px;
}
</style>
