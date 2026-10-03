<template>
  <AppLayout>
    <el-card>
      <template #header>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-weight: 600;">통화 이력</span>
          <div style="display: flex; gap: 8px;">
            <el-select
              v-model="filterStatus"
              placeholder="상태 필터"
              clearable
              size="small"
              style="width: 140px;"
              @change="fetchHistory"
            >
              <el-option label="전체" value="" />
              <el-option label="활성" value="active" />
              <el-option label="완료" value="completed" />
              <el-option label="오류" value="error" />
            </el-select>
            <el-button size="small" @click="fetchHistory" :loading="loading">
              <el-icon><Refresh /></el-icon>
              새로고침
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="tableData"
        v-loading="loading"
        style="width: 100%;"
        stripe
      >
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="roomId" label="룸 ID" min-width="160">
          <template #default="{ row }">
            <el-text truncated>{{ row.roomId }}</el-text>
          </template>
        </el-table-column>
        <el-table-column prop="participantIdentity" label="참가자" min-width="140">
          <template #default="{ row }">
            {{ row.participantIdentity || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="시작 시간" min-width="160">
          <template #default="{ row }">
            {{ formatDate(row.startedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="종료 시간" min-width="160">
          <template #default="{ row }">
            {{ row.endedAt ? formatDate(row.endedAt) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="통화 시간" width="110">
          <template #default="{ row }">
            {{ row.durationSeconds ? formatDuration(row.durationSeconds) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="상태" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="sizes, prev, pager, next, total"
          @size-change="fetchHistory"
          @current-change="fetchHistory"
        />
      </div>
    </el-card>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import AppLayout from '../components/AppLayout.vue'
import api from '../api'

const tableData = ref([])
const loading = ref(false)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const filterStatus = ref('')

function statusType(status) {
  const map = { active: '', completed: 'success', error: 'danger' }
  return map[status] || 'info'
}

function statusLabel(status) {
  const map = { active: '활성', completed: '완료', error: '오류' }
  return map[status] || status
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(dateStr))
}

function formatDuration(seconds) {
  if (!seconds) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}시간 ${m}분 ${s}초`
  if (m > 0) return `${m}분 ${s}초`
  return `${s}초`
}

async function fetchHistory() {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
    }
    if (filterStatus.value) {
      params.status = filterStatus.value
    }
    const res = await api.get('/call-history', { params })
    tableData.value = res.data.data
    total.value = res.data.total
  } catch (err) {
    ElMessage.error('통화 이력을 불러오는 데 실패했습니다.')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchHistory()
})
</script>
