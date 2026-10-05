<template>
  <AppLayout>
    <!-- Section 1: My Voice Profiles -->
    <el-card style="margin-bottom: 24px;">
      <template #header>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-weight: 600;">목소리 프로필</span>
          <el-button type="primary" @click="openModal()">
            <el-icon><Plus /></el-icon>
            새 프로필 추가
          </el-button>
        </div>
      </template>

      <el-table :data="profiles" v-loading="loadingProfiles" style="width: 100%;" stripe>
        <el-table-column prop="name" label="이름" min-width="160">
          <template #default="{ row }">
            <span
              :style="row.isActive ? 'color: #67c23a; font-weight: 600;' : ''"
            >
              {{ row.name }}
              <el-tag v-if="row.isActive" type="success" size="small" style="margin-left: 6px;">활성</el-tag>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="목소리" min-width="160">
          <template #default="{ row }">{{ voiceLabel(row.voiceId) }}</template>
        </el-table-column>
        <el-table-column label="속도" width="90">
          <template #default="{ row }">{{ row.speed.toFixed(2) }}x</template>
        </el-table-column>
        <el-table-column label="억양 변화" width="100">
          <template #default="{ row }">{{ row.variation.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="활성화 여부" width="110">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
              {{ row.isActive ? '활성화' : '비활성' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="작업" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="!row.isActive"
              size="small"
              type="success"
              @click="handleActivate(row)"
            >활성화</el-button>
            <el-button size="small" @click="openModal(row)">수정</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">삭제</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Section 2: Voice Browser -->
    <el-card>
      <template #header>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-weight: 600;">목소리 목록</span>
          <div>
            <el-button plain :loading="loadingAvailable" @click="fetchAvailableVoices">
              <el-icon><Refresh /></el-icon>
              새로고침
            </el-button>
            <el-button type="primary" @click="openCloneModal">
              <el-icon><Microphone /></el-icon>
              내 목소리 등록
            </el-button>
          </div>
        </div>
      </template>

      <el-alert
        v-if="availableError"
        :title="availableError"
        type="warning"
        :closable="false"
        style="margin-bottom: 16px;"
      />

      <div v-loading="loadingAvailable">
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
          <el-card
            v-for="voice in availableVoices"
            :key="voice.voice_id"
            shadow="hover"
            style="cursor: default;"
          >
            <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">{{ voice.name }}</div>
            <div style="margin-bottom: 12px;">
              <el-tag size="small" :type="isCloned(voice) ? 'success' : 'info'">{{ voice.category }}</el-tag>
            </div>
            <el-button
              size="small"
              type="primary"
              plain
              @click="prefillFromVoice(voice)"
            >이 목소리로 프로필 만들기</el-button>
            <el-button
              v-if="isCloned(voice)"
              size="small"
              type="danger"
              plain
              @click="handleDeleteVoice(voice)"
            >삭제</el-button>
          </el-card>
        </div>
      </div>
    </el-card>

    <!-- Add/Edit Profile Modal -->
    <el-dialog
      v-model="modalVisible"
      :title="editingItem ? '목소리 프로필 수정' : '목소리 프로필 추가'"
      width="560px"
      @closed="resetModal"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-position="top">
        <el-form-item label="프로필 이름" prop="name">
          <el-input v-model="form.name" placeholder="예: 친절한 상담원" />
        </el-form-item>
        <el-form-item label="목소리" prop="voiceId">
          <el-select v-model="form.voiceId" style="width: 100%;" placeholder="목소리를 선택하세요">
            <el-option
              v-for="voice in availableVoices"
              :key="voice.voice_id"
              :label="`${voice.name} (${voice.category})`"
              :value="voice.voice_id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="말하기 속도">
          <el-slider v-model="form.speed" :min="0.5" :max="1.5" :step="0.05" show-input />
        </el-form-item>
        <el-form-item label="억양 변화">
          <el-slider v-model="form.variation" :min="0" :max="1" :step="0.05" show-input />
          <div style="font-size: 12px; color: #909399;">
            낮을수록 차분하고 일정하게, 높을수록 생동감 있게 말합니다. 기본값은 0.5입니다.
          </div>
        </el-form-item>

        <el-form-item label="미리듣기 문장">
          <el-input v-model="previewText" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item>
          <el-button
            type="info"
            plain
            :loading="loadingPreview"
            @click="handlePreview"
          >
            <el-icon><VideoPlay /></el-icon>
            미리듣기
          </el-button>
          <audio v-if="previewAudioSrc" ref="audioRef" :src="previewAudioSrc" controls style="margin-left: 12px; height: 36px; vertical-align: middle;" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="modalVisible = false">취소</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">저장</el-button>
      </template>
    </el-dialog>

    <!-- Clone Voice Modal -->
    <el-dialog v-model="cloneVisible" title="내 목소리 등록" width="520px">
      <el-form label-position="top">
        <el-form-item label="목소리 이름">
          <el-input v-model="cloneForm.name" placeholder="예: 대표님 목소리" />
        </el-form-item>
        <el-form-item label="녹음 파일">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            accept="audio/*,.m4a,.mp3,.wav,.webm"
            :on-change="(file) => (cloneForm.file = file.raw)"
            :on-remove="() => (cloneForm.file = null)"
          >
            <el-button>파일 선택</el-button>
          </el-upload>
          <div style="font-size: 12px; color: #909399; line-height: 1.6;">
            조용한 곳에서 한 사람이 또박또박 말한 30초~1분 분량이 좋습니다 (최소 5초, 2분까지만 사용).<br />
            음색만 추출해 저장하며 원본 녹음은 보관하지 않습니다.
          </div>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="cloneForm.consent">
            본인 목소리이거나, 목소리 주인에게 사용 동의를 받았습니다.
          </el-checkbox>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="cloneVisible = false">취소</el-button>
        <el-button
          type="primary"
          :loading="cloning"
          :disabled="!cloneForm.name.trim() || !cloneForm.file || !cloneForm.consent"
          @click="handleClone"
        >등록</el-button>
      </template>
    </el-dialog>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppLayout from '../components/AppLayout.vue'
import api from '../api'

const CLONED_CATEGORY = '내 목소리'
const DEFAULT_PREVIEW_TEXT = '안녕하세요, 저는 AI 상담원입니다. 무엇을 도와드릴까요?'

// Profiles
const profiles = ref([])
const loadingProfiles = ref(false)

// Available voices (MeloTTS 기본 화자 + 등록한 내 목소리)
const availableVoices = ref([])
const loadingAvailable = ref(false)
const availableError = ref('')

// Profile modal
const modalVisible = ref(false)
const editingItem = ref(null)
const saving = ref(false)
const formRef = ref(null)
const form = reactive({
  name: '',
  voiceId: '',
  speed: 1.0,
  variation: 0.5,
})

const formRules = {
  name: [{ required: true, message: '프로필 이름을 입력하세요', trigger: 'blur' }],
  voiceId: [{ required: true, message: '목소리를 선택하세요', trigger: 'change' }],
}

// Preview
const loadingPreview = ref(false)
const previewAudioSrc = ref('')
const previewText = ref(DEFAULT_PREVIEW_TEXT)
const audioRef = ref(null)

// Clone modal
const cloneVisible = ref(false)
const cloning = ref(false)
const uploadRef = ref(null)
const cloneForm = reactive({ name: '', file: null, consent: false })

const isCloned = (voice) => voice.category === CLONED_CATEGORY

function voiceLabel(voiceId) {
  const voice = availableVoices.value.find((v) => v.voice_id === voiceId)
  return voice ? voice.name : voiceId
}

async function fetchProfiles() {
  loadingProfiles.value = true
  try {
    const res = await api.get('/voice/profiles')
    profiles.value = res.data
  } catch (err) {
    ElMessage.error('목소리 프로필을 불러오는 데 실패했습니다.')
  } finally {
    loadingProfiles.value = false
  }
}

async function fetchAvailableVoices() {
  loadingAvailable.value = true
  availableError.value = ''
  try {
    const res = await api.get('/voice/available')
    availableVoices.value = res.data.voices || []
    if (res.data.error) {
      availableError.value = res.data.error
    }
  } catch (err) {
    availableError.value = '목소리 목록을 불러오는 데 실패했습니다.'
    availableVoices.value = []
  } finally {
    loadingAvailable.value = false
  }
}

function fillForm({ name = '', voiceId = '', speed = 1.0, variation = 0.5 } = {}) {
  form.name = name
  form.voiceId = voiceId
  form.speed = speed
  form.variation = variation
  previewAudioSrc.value = ''
}

function openModal(item = null) {
  editingItem.value = item
  fillForm(item || {})
  modalVisible.value = true
}

function resetModal() {
  fillForm()
  editingItem.value = null
  formRef.value?.resetFields()
}

function prefillFromVoice(voice) {
  editingItem.value = null
  fillForm({ name: voice.name, voiceId: voice.voice_id })
  modalVisible.value = true
}

async function handleSave() {
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    try {
      const payload = {
        name: form.name,
        voiceId: form.voiceId,
        speed: form.speed,
        variation: form.variation,
      }
      if (editingItem.value) {
        await api.put(`/voice/profiles/${editingItem.value.id}`, payload)
        ElMessage.success('프로필이 수정되었습니다.')
      } else {
        await api.post('/voice/profiles', payload)
        ElMessage.success('프로필이 추가되었습니다.')
      }
      modalVisible.value = false
      fetchProfiles()
    } catch (err) {
      ElMessage.error('저장에 실패했습니다.')
    } finally {
      saving.value = false
    }
  })
}

async function handleActivate(row) {
  try {
    await api.post(`/voice/profiles/${row.id}/activate`)
    ElMessage.success(`"${row.name}" 목소리가 활성화되었습니다.`)
    fetchProfiles()
  } catch (err) {
    ElMessage.error('활성화에 실패했습니다.')
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `"${row.name}" 프로필을 삭제하시겠습니까?`,
      '삭제 확인',
      { confirmButtonText: '삭제', cancelButtonText: '취소', type: 'warning' }
    )
    await api.delete(`/voice/profiles/${row.id}`)
    ElMessage.success('삭제되었습니다.')
    fetchProfiles()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('삭제에 실패했습니다.')
    }
  }
}

async function handlePreview() {
  if (!form.voiceId) {
    ElMessage.warning('목소리를 먼저 선택하세요.')
    return
  }
  loadingPreview.value = true
  previewAudioSrc.value = ''
  try {
    const res = await api.post('/voice/preview', {
      voiceId: form.voiceId,
      text: previewText.value || DEFAULT_PREVIEW_TEXT,
      speed: form.speed,
      variation: form.variation,
    })
    if (res.data.error) {
      ElMessage.error(res.data.error)
      return
    }
    previewAudioSrc.value = `data:${res.data.contentType};base64,${res.data.audio}`
    // Auto-play after next tick
    setTimeout(() => {
      audioRef.value?.play()
    }, 100)
  } catch (err) {
    ElMessage.error('미리듣기에 실패했습니다.')
  } finally {
    loadingPreview.value = false
  }
}

function openCloneModal() {
  cloneForm.name = ''
  cloneForm.file = null
  cloneForm.consent = false
  uploadRef.value?.clearFiles()
  cloneVisible.value = true
}

async function handleClone() {
  cloning.value = true
  try {
    const body = new FormData()
    body.append('name', cloneForm.name.trim())
    body.append('file', cloneForm.file)
    const res = await api.post('/voice/clone', body, { timeout: 120000 })
    ElMessage.success(`"${res.data.name}" 목소리가 등록되었습니다. 프로필을 만들어 미리 들어보세요.`)
    cloneVisible.value = false
    await fetchAvailableVoices()
    prefillFromVoice(res.data)
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '목소리 등록에 실패했습니다.')
  } finally {
    cloning.value = false
  }
}

async function handleDeleteVoice(voice) {
  try {
    await ElMessageBox.confirm(
      `"${voice.name}" 목소리를 삭제하시겠습니까?`,
      '삭제 확인',
      { confirmButtonText: '삭제', cancelButtonText: '취소', type: 'warning' }
    )
    await api.delete(`/voice/clone/${voice.voice_id}`)
    ElMessage.success('삭제되었습니다.')
    fetchAvailableVoices()
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(err.response?.data?.message || '삭제에 실패했습니다.')
    }
  }
}

onMounted(() => {
  fetchProfiles()
  fetchAvailableVoices()
})
</script>
