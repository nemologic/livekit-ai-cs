<template>
  <AppLayout>
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
      <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #303133;">AI 상담원 훈련</h2>
      <el-button type="info" plain @click="openPromptPreview">
        <el-icon><View /></el-icon>
        프롬프트 미리보기
      </el-button>
    </div>

    <el-card>
      <el-tabs v-model="activeTab">
        <!-- Tab 1: 회사 정보 -->
        <el-tab-pane label="회사 정보" name="company_info">
          <div v-loading="loadingCompany">
            <el-form label-position="top">
              <el-form-item label="제목">
                <el-input v-model="companyForm.title" placeholder="회사 정보 제목 (예: 회사 소개)" />
              </el-form-item>
              <el-form-item label="내용">
                <el-input
                  v-model="companyForm.content"
                  type="textarea"
                  :rows="12"
                  placeholder="회사 정보, 서비스 소개 등을 입력하세요..."
                />
              </el-form-item>
              <el-form-item>
                <el-switch v-model="companyForm.enabled" active-text="활성화" inactive-text="비활성화" />
              </el-form-item>
            </el-form>
            <div style="text-align: right; margin-top: 12px;">
              <el-button type="primary" :loading="savingCompany" @click="saveCompanyInfo">저장</el-button>
            </div>
          </div>
        </el-tab-pane>

        <!-- Tab 2: FAQ -->
        <el-tab-pane label="FAQ" name="faq">
          <div style="display: flex; justify-content: flex-end; margin-bottom: 12px;">
            <el-button type="primary" @click="openModal('faq')">
              <el-icon><Plus /></el-icon>
              FAQ 추가
            </el-button>
          </div>
          <el-table :data="faqData" v-loading="loadingFaq" style="width: 100%;" stripe>
            <el-table-column prop="title" label="질문 (Q)" min-width="200" />
            <el-table-column prop="content" label="답변 (A)" min-width="300">
              <template #default="{ row }">
                <el-text truncated>{{ row.content }}</el-text>
              </template>
            </el-table-column>
            <el-table-column label="활성화" width="90">
              <template #default="{ row }">
                <el-switch :model-value="row.enabled" @change="handleToggle(row)" />
              </template>
            </el-table-column>
            <el-table-column label="작업" width="140" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="openModal('faq', row)">수정</el-button>
                <el-button size="small" type="danger" @click="handleDelete(row)">삭제</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- Tab 3: 상담 시나리오 -->
        <el-tab-pane label="상담 시나리오" name="scenario">
          <div style="display: flex; justify-content: flex-end; margin-bottom: 12px;">
            <el-button type="primary" @click="openModal('scenario')">
              <el-icon><Plus /></el-icon>
              시나리오 추가
            </el-button>
          </div>
          <el-table :data="scenarioData" v-loading="loadingScenario" style="width: 100%;" stripe>
            <el-table-column prop="title" label="시나리오 제목" min-width="200" />
            <el-table-column prop="content" label="내용" min-width="300">
              <template #default="{ row }">
                <el-text truncated>{{ row.content }}</el-text>
              </template>
            </el-table-column>
            <el-table-column label="활성화" width="90">
              <template #default="{ row }">
                <el-switch :model-value="row.enabled" @change="handleToggle(row)" />
              </template>
            </el-table-column>
            <el-table-column label="작업" width="140" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="openModal('scenario', row)">수정</el-button>
                <el-button size="small" type="danger" @click="handleDelete(row)">삭제</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- Tab 5: 문서 업로드 -->
        <el-tab-pane label="📄 문서 업로드" name="upload">
          <el-upload
            ref="uploadRef"
            drag
            :auto-upload="false"
            :limit="1"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            accept=".pdf,.docx,.txt"
            action=""
            style="margin-bottom: 20px;"
          >
            <el-icon style="font-size: 48px; color: #c0c4cc; margin-bottom: 8px;"><UploadFilled /></el-icon>
            <div style="font-size: 14px; color: #606266;">
              파일을 여기에 드래그하거나 <em style="color: #409EFF;">클릭하여 선택</em>하세요
            </div>
            <template #tip>
              <div style="font-size: 12px; color: #909399; margin-top: 8px; text-align: center;">
                PDF, DOCX, TXT 파일 지원 · 최대 20MB
              </div>
            </template>
          </el-upload>

          <template v-if="uploadFile">
            <el-divider />

            <el-form label-position="top">
              <el-form-item label="문서 제목">
                <el-input v-model="uploadForm.title" placeholder="지식 베이스에 저장될 제목을 입력하세요" />
              </el-form-item>
              <el-form-item label="분류">
                <el-select v-model="uploadForm.type" style="width: 100%;">
                  <el-option label="회사 정보" value="company_info" />
                  <el-option label="FAQ" value="faq" />
                  <el-option label="상담 시나리오" value="scenario" />
                  <el-option label="금지 사항" value="prohibited" />
                </el-select>
              </el-form-item>
            </el-form>

            <template v-if="uploadPreviewText">
              <el-divider content-position="left">추출된 텍스트 미리보기</el-divider>
              <el-input
                v-model="uploadPreviewText"
                type="textarea"
                :rows="10"
                readonly
                style="font-family: monospace; font-size: 12px;"
              />
              <div style="color: #909399; font-size: 12px; margin-top: 6px;">
                {{ uploadCharCount.toLocaleString() }}자 추출됨
              </div>
            </template>

            <div style="display: flex; gap: 10px; margin-top: 20px;">
              <el-button :loading="parsing" @click="handleParsePreview">
                <el-icon><View /></el-icon>
                텍스트 추출 미리보기
              </el-button>
              <el-button type="primary" :loading="uploading" @click="handleUploadSave">
                <el-icon><DocumentAdd /></el-icon>
                학습 데이터로 저장
              </el-button>
              <el-button @click="resetUpload">초기화</el-button>
            </div>
          </template>
        </el-tab-pane>

        <!-- Tab 4: 금지 사항 -->
        <el-tab-pane label="금지 사항" name="prohibited">
          <div style="display: flex; justify-content: flex-end; margin-bottom: 12px;">
            <el-button type="primary" @click="openModal('prohibited')">
              <el-icon><Plus /></el-icon>
              금지 사항 추가
            </el-button>
          </div>
          <el-table :data="prohibitedData" v-loading="loadingProhibited" style="width: 100%;" stripe>
            <el-table-column prop="title" label="항목" min-width="200" />
            <el-table-column prop="content" label="상세 내용" min-width="300">
              <template #default="{ row }">
                <el-text truncated>{{ row.content }}</el-text>
              </template>
            </el-table-column>
            <el-table-column label="활성화" width="90">
              <template #default="{ row }">
                <el-switch :model-value="row.enabled" @change="handleToggle(row)" />
              </template>
            </el-table-column>
            <el-table-column label="작업" width="140" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="openModal('prohibited', row)">수정</el-button>
                <el-button size="small" type="danger" @click="handleDelete(row)">삭제</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- Add/Edit Modal -->
    <el-dialog
      v-model="modalVisible"
      :title="modalTitle"
      width="560px"
      @closed="resetModal"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-position="top">
        <el-form-item :label="titleLabel" prop="title">
          <el-input v-model="form.title" :placeholder="titlePlaceholder" />
        </el-form-item>
        <el-form-item :label="contentLabel" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="6"
            :placeholder="contentPlaceholder"
          />
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

    <!-- Prompt Preview Dialog -->
    <el-dialog v-model="promptDialogVisible" title="프롬프트 미리보기" width="700px">
      <div v-loading="loadingPrompt">
        <el-input
          v-model="promptPreview"
          type="textarea"
          :rows="20"
          readonly
          style="font-family: monospace; font-size: 13px;"
        />
      </div>
      <template #footer>
        <el-button @click="promptDialogVisible = false">닫기</el-button>
      </template>
    </el-dialog>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppLayout from '../components/AppLayout.vue'
import api from '../api'

// ── 문서 업로드 ──────────────────────────────────────────
const uploadRef = ref(null)
const uploadFile = ref(null)       // 선택된 File 객체
const uploadPreviewText = ref('')
const uploadCharCount = ref(0)
const parsing = ref(false)
const uploading = ref(false)
const uploadForm = reactive({ title: '', type: 'company_info' })

function handleFileChange(file) {
  uploadFile.value = file.raw
  uploadForm.title = file.name.replace(/\.[^.]+$/, '')
  uploadPreviewText.value = ''
  uploadCharCount.value = 0
}

function handleFileRemove() {
  resetUpload()
}

function resetUpload() {
  uploadFile.value = null
  uploadPreviewText.value = ''
  uploadCharCount.value = 0
  uploadForm.title = ''
  uploadForm.type = 'company_info'
  uploadRef.value?.clearFiles()
}

async function handleParsePreview() {
  if (!uploadFile.value) return
  parsing.value = true
  try {
    const fd = new FormData()
    fd.append('file', uploadFile.value)
    const res = await api.post('/training/upload/parse', fd)
    uploadPreviewText.value = res.data.text
    uploadCharCount.value = res.data.characterCount
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '텍스트 추출에 실패했습니다.')
  } finally {
    parsing.value = false
  }
}

async function handleUploadSave() {
  if (!uploadFile.value) return
  if (!uploadForm.title.trim()) {
    ElMessage.warning('문서 제목을 입력하세요.')
    return
  }
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', uploadFile.value)
    fd.append('title', uploadForm.title)
    fd.append('type', uploadForm.type)
    fd.append('enabled', 'true')
    await api.post('/training/upload', fd)
    ElMessage.success('문서가 학습 데이터로 저장되었습니다.')
    resetUpload()
    fetchTabData(uploadForm.type)
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '저장에 실패했습니다.')
  } finally {
    uploading.value = false
  }
}

const activeTab = ref('company_info')

// Company info
const loadingCompany = ref(false)
const savingCompany = ref(false)
const companyItem = ref(null)
const companyForm = reactive({ title: '회사 정보', content: '', enabled: true })

// FAQ
const faqData = ref([])
const loadingFaq = ref(false)

// Scenario
const scenarioData = ref([])
const loadingScenario = ref(false)

// Prohibited
const prohibitedData = ref([])
const loadingProhibited = ref(false)

// Modal
const modalVisible = ref(false)
const modalType = ref('faq')
const editingItem = ref(null)
const saving = ref(false)
const formRef = ref(null)
const form = reactive({ title: '', content: '', enabled: true })

// Prompt preview
const promptDialogVisible = ref(false)
const promptPreview = ref('')
const loadingPrompt = ref(false)

const formRules = {
  title: [{ required: true, message: '제목을 입력하세요', trigger: 'blur' }],
  content: [{ required: true, message: '내용을 입력하세요', trigger: 'blur' }],
}

const modalTitle = computed(() => {
  const typeMap = { faq: 'FAQ', scenario: '상담 시나리오', prohibited: '금지 사항' }
  const action = editingItem.value ? '수정' : '추가'
  return `${typeMap[modalType.value] || ''} ${action}`
})

const titleLabel = computed(() => {
  if (modalType.value === 'faq') return '질문 (Q)'
  if (modalType.value === 'scenario') return '시나리오 제목'
  return '항목'
})

const contentLabel = computed(() => {
  if (modalType.value === 'faq') return '답변 (A)'
  return '내용'
})

const titlePlaceholder = computed(() => {
  if (modalType.value === 'faq') return '자주 묻는 질문을 입력하세요'
  if (modalType.value === 'scenario') return '시나리오 제목을 입력하세요'
  return '금지 항목명을 입력하세요'
})

const contentPlaceholder = computed(() => {
  if (modalType.value === 'faq') return '질문에 대한 답변을 입력하세요'
  if (modalType.value === 'scenario') return '상담 시나리오 내용을 입력하세요'
  return '금지 사항 상세 내용을 입력하세요'
})

async function fetchCompanyInfo() {
  loadingCompany.value = true
  try {
    const res = await api.get('/training?type=company_info')
    const items = res.data
    if (items.length > 0) {
      companyItem.value = items[0]
      companyForm.title = items[0].title
      companyForm.content = items[0].content
      companyForm.enabled = items[0].enabled
    }
  } catch (err) {
    ElMessage.error('회사 정보를 불러오는 데 실패했습니다.')
  } finally {
    loadingCompany.value = false
  }
}

async function saveCompanyInfo() {
  savingCompany.value = true
  try {
    const payload = {
      type: 'company_info',
      title: companyForm.title,
      content: companyForm.content,
      enabled: companyForm.enabled,
    }
    if (companyItem.value) {
      await api.put(`/training/${companyItem.value.id}`, payload)
    } else {
      const res = await api.post('/training', payload)
      companyItem.value = res.data
    }
    ElMessage.success('회사 정보가 저장되었습니다.')
  } catch (err) {
    ElMessage.error('저장에 실패했습니다.')
  } finally {
    savingCompany.value = false
  }
}

async function fetchTabData(type) {
  if (type === 'faq') {
    loadingFaq.value = true
    try {
      const res = await api.get('/training?type=faq')
      faqData.value = res.data
    } catch { ElMessage.error('FAQ를 불러오는 데 실패했습니다.') }
    finally { loadingFaq.value = false }
  } else if (type === 'scenario') {
    loadingScenario.value = true
    try {
      const res = await api.get('/training?type=scenario')
      scenarioData.value = res.data
    } catch { ElMessage.error('시나리오를 불러오는 데 실패했습니다.') }
    finally { loadingScenario.value = false }
  } else if (type === 'prohibited') {
    loadingProhibited.value = true
    try {
      const res = await api.get('/training?type=prohibited')
      prohibitedData.value = res.data
    } catch { ElMessage.error('금지 사항을 불러오는 데 실패했습니다.') }
    finally { loadingProhibited.value = false }
  }
}

function openModal(type, item = null) {
  modalType.value = type
  editingItem.value = item
  if (item) {
    form.title = item.title
    form.content = item.content
    form.enabled = item.enabled
  } else {
    form.title = ''
    form.content = ''
    form.enabled = true
  }
  modalVisible.value = true
}

function resetModal() {
  form.title = ''
  form.content = ''
  form.enabled = true
  editingItem.value = null
  formRef.value?.resetFields()
}

async function handleSave() {
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    try {
      const payload = {
        type: modalType.value,
        title: form.title,
        content: form.content,
        enabled: form.enabled,
      }
      if (editingItem.value) {
        await api.put(`/training/${editingItem.value.id}`, payload)
        ElMessage.success('수정되었습니다.')
      } else {
        await api.post('/training', payload)
        ElMessage.success('추가되었습니다.')
      }
      modalVisible.value = false
      fetchTabData(modalType.value)
    } catch (err) {
      ElMessage.error('저장에 실패했습니다.')
    } finally {
      saving.value = false
    }
  })
}

async function handleToggle(row) {
  try {
    const res = await api.patch(`/training/${row.id}/toggle`)
    row.enabled = res.data.enabled
    ElMessage.success(`${row.enabled ? '활성화' : '비활성화'}되었습니다.`)
  } catch (err) {
    ElMessage.error('변경에 실패했습니다.')
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `"${row.title}"을(를) 삭제하시겠습니까?`,
      '삭제 확인',
      { confirmButtonText: '삭제', cancelButtonText: '취소', type: 'warning' }
    )
    await api.delete(`/training/${row.id}`)
    ElMessage.success('삭제되었습니다.')
    fetchTabData(row.type)
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('삭제에 실패했습니다.')
    }
  }
}

async function openPromptPreview() {
  promptDialogVisible.value = true
  loadingPrompt.value = true
  try {
    const res = await api.get('/training/export/prompt')
    promptPreview.value = res.data || '(활성화된 항목이 없습니다.)'
  } catch (err) {
    ElMessage.error('프롬프트를 불러오는 데 실패했습니다.')
    promptPreview.value = ''
  } finally {
    loadingPrompt.value = false
  }
}

watch(activeTab, (tab) => {
  if (tab !== 'company_info') {
    fetchTabData(tab)
  }
})

onMounted(() => {
  fetchCompanyInfo()
})
</script>
