<template>
  <AppLayout>
    <el-card>
      <template #header>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-weight: 600;">착신 설정</span>
          <el-button type="primary" @click="openModal()">
            <el-icon><Plus /></el-icon>
            착신 규칙 추가
          </el-button>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" style="width: 100%;" stripe>
        <el-table-column prop="name" label="이름" min-width="140" />
        <el-table-column prop="phoneNumber" label="전화번호" min-width="140">
          <template #default="{ row }">{{ row.phoneNumber || '-' }}</template>
        </el-table-column>
        <el-table-column prop="sipUri" label="SIP URI" min-width="180">
          <template #default="{ row }">
            <el-text truncated>{{ row.sipUri || '-' }}</el-text>
          </template>
        </el-table-column>
        <el-table-column label="조건" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="conditionType(row.condition)">
              {{ conditionLabel(row.condition) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="활성화" width="90">
          <template #default="{ row }">
            <el-switch
              :model-value="row.enabled"
              @change="handleToggle(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="작업" width="140" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openModal(row)">수정</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">삭제</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Modal -->
    <el-dialog
      v-model="modalVisible"
      :title="editingItem ? '착신 규칙 수정' : '착신 규칙 추가'"
      width="500px"
      @closed="resetForm"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
      >
        <el-form-item label="이름" prop="name">
          <el-input v-model="form.name" placeholder="규칙 이름" />
        </el-form-item>

        <el-form-item label="전화번호">
          <el-input v-model="form.phoneNumber" placeholder="예: +82-10-1234-5678" />
        </el-form-item>

        <el-form-item label="SIP URI">
          <el-input v-model="form.sipUri" placeholder="예: sip:user@domain.com" />
        </el-form-item>

        <el-form-item label="착신 조건" prop="condition">
          <el-select v-model="form.condition" style="width: 100%;">
            <el-option label="항상" value="always" />
            <el-option label="무응답 시" value="no_answer" />
            <el-option label="통화 중" value="busy" />
          </el-select>
        </el-form-item>

        <el-form-item label="활성화">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="modalVisible = false">취소</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">저장</el-button>
      </template>
    </el-dialog>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppLayout from '../components/AppLayout.vue'
import api from '../api'

const tableData = ref([])
const loading = ref(false)
const saving = ref(false)
const modalVisible = ref(false)
const editingItem = ref(null)
const formRef = ref(null)

const form = reactive({
  name: '',
  phoneNumber: '',
  sipUri: '',
  condition: 'no_answer',
  enabled: false,
})

const rules = {
  name: [{ required: true, message: '이름을 입력하세요', trigger: 'blur' }],
  condition: [{ required: true, message: '조건을 선택하세요', trigger: 'change' }],
}

function conditionType(condition) {
  const map = { always: 'danger', no_answer: 'warning', busy: 'info' }
  return map[condition] || ''
}

function conditionLabel(condition) {
  const map = { always: '항상', no_answer: '무응답 시', busy: '통화 중' }
  return map[condition] || condition
}

async function fetchData() {
  loading.value = true
  try {
    const res = await api.get('/forwarding')
    tableData.value = res.data
  } catch (err) {
    ElMessage.error('착신 설정을 불러오는 데 실패했습니다.')
  } finally {
    loading.value = false
  }
}

function openModal(item = null) {
  editingItem.value = item
  if (item) {
    form.name = item.name
    form.phoneNumber = item.phoneNumber || ''
    form.sipUri = item.sipUri || ''
    form.condition = item.condition
    form.enabled = item.enabled
  } else {
    resetForm()
  }
  modalVisible.value = true
}

function resetForm() {
  form.name = ''
  form.phoneNumber = ''
  form.sipUri = ''
  form.condition = 'no_answer'
  form.enabled = false
  editingItem.value = null
  formRef.value?.resetFields()
}

async function handleSave() {
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    try {
      const payload = {
        name: form.name,
        phoneNumber: form.phoneNumber || null,
        sipUri: form.sipUri || null,
        condition: form.condition,
        enabled: form.enabled,
      }
      if (editingItem.value) {
        await api.put(`/forwarding/${editingItem.value.id}`, payload)
        ElMessage.success('착신 규칙이 수정되었습니다.')
      } else {
        await api.post('/forwarding', payload)
        ElMessage.success('착신 규칙이 추가되었습니다.')
      }
      modalVisible.value = false
      fetchData()
    } catch (err) {
      ElMessage.error('저장에 실패했습니다.')
    } finally {
      saving.value = false
    }
  })
}

async function handleToggle(row) {
  try {
    await api.patch(`/forwarding/${row.id}/toggle`)
    row.enabled = !row.enabled
    ElMessage.success(`착신 규칙이 ${row.enabled ? '활성화' : '비활성화'}되었습니다.`)
  } catch (err) {
    ElMessage.error('변경에 실패했습니다.')
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `"${row.name}" 착신 규칙을 삭제하시겠습니까?`,
      '삭제 확인',
      { confirmButtonText: '삭제', cancelButtonText: '취소', type: 'warning' }
    )
    await api.delete(`/forwarding/${row.id}`)
    ElMessage.success('삭제되었습니다.')
    fetchData()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('삭제에 실패했습니다.')
    }
  }
}

onMounted(() => {
  fetchData()
})
</script>
