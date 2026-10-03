<template>
  <AppLayout>
    <div>
      <!-- Summary cards -->
      <el-row :gutter="20" style="margin-bottom: 24px;">
        <el-col :span="8">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon blue">
                <el-icon size="28"><VideoCamera /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ statusData.totalRooms }}</div>
                <div class="stat-label">활성 룸</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon green">
                <el-icon size="28"><User /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ statusData.totalParticipants }}</div>
                <div class="stat-label">총 참가자</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" :class="agentRunning ? 'green' : 'gray'">
                <el-icon size="28"><Cpu /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value" :style="{ color: agentRunning ? '#67C23A' : '#909399' }">
                  {{ agentRunning ? '에이전트 실행 중' : '대기 중' }}
                </div>
                <div class="stat-label">에이전트 상태</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- Active rooms -->
      <el-card>
        <template #header>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-weight: 600;">활성 통화 룸</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <el-tag v-if="!statusData.error" type="success" size="small">연결됨</el-tag>
              <el-tag v-else type="danger" size="small">연결 오류</el-tag>
              <el-text type="info" size="small">{{ lastUpdated }} 기준</el-text>
              <el-button size="small" @click="fetchStatus" :loading="loading">
                <el-icon><Refresh /></el-icon>
                새로고침
              </el-button>
            </div>
          </div>
        </template>

        <el-alert
          v-if="statusData.error"
          :title="statusData.error"
          type="warning"
          :closable="false"
          show-icon
          style="margin-bottom: 16px;"
        />

        <div v-if="statusData.rooms && statusData.rooms.length > 0">
          <el-row :gutter="16">
            <el-col
              v-for="room in statusData.rooms"
              :key="room.sid"
              :span="8"
              style="margin-bottom: 16px;"
            >
              <el-card shadow="hover" class="room-card">
                <div class="room-header">
                  <el-tag type="success" effect="dark" size="small">활성</el-tag>
                  <span class="room-duration">{{ formatDuration(room.durationSeconds) }}</span>
                </div>
                <div class="room-name">{{ room.name }}</div>
                <div class="room-meta">
                  <el-icon><User /></el-icon>
                  <span>참가자 {{ room.numParticipants }}명</span>
                </div>
                <div v-if="room.participants && room.participants.length > 0" class="room-participants">
                  <el-tag
                    v-for="p in room.participants"
                    :key="p.identity"
                    size="small"
                    style="margin: 2px;"
                  >
                    {{ p.name || p.identity }}
                  </el-tag>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>

        <el-empty
          v-else-if="!loading"
          description="현재 활성 통화가 없습니다."
          :image-size="80"
        />

        <div v-if="loading" style="text-align: center; padding: 40px;">
          <el-icon class="is-loading" size="32"><Loading /></el-icon>
        </div>
      </el-card>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import api from '../api'

const statusData = ref({ rooms: [], totalRooms: 0, totalParticipants: 0 })
const loading = ref(false)
const lastUpdated = ref('')
let refreshTimer = null

const agentRunning = computed(() => statusData.value.totalRooms > 0)

function formatDuration(seconds) {
  if (!seconds) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatTime(date) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

async function fetchStatus() {
  loading.value = true
  try {
    const res = await api.get('/agent-status')
    statusData.value = res.data
    lastUpdated.value = formatTime(new Date())
  } catch (err) {
    console.error('Failed to fetch agent status', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchStatus()
  refreshTimer = setInterval(fetchStatus, 10000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style scoped>
.stat-card {
  border-radius: 10px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-icon.blue { background: #409EFF; }
.stat-icon.green { background: #67C23A; }
.stat-icon.gray { background: #909399; }

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.room-card {
  border-radius: 8px;
  height: 100%;
}

.room-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.room-duration {
  font-size: 12px;
  color: #909399;
  font-family: monospace;
}

.room-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
  word-break: break-all;
}

.room-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #606266;
  font-size: 13px;
  margin-bottom: 8px;
}

.room-participants {
  margin-top: 6px;
}
</style>
