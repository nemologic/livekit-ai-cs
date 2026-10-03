<template>
  <AppLayout>
    <!-- Section 1: My Voice Profiles -->
    <el-card style="margin-bottom: 24px;">
      <template #header>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-weight: 600;">내 목소리 프로필</span>
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
        <el-table-column prop="voiceId" label="Voice ID" min-width="180" />
        <el-table-column prop="model" label="모델" min-width="160" />
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

    <!-- Section 2: ElevenLabs Voice Browser -->
    <el-card>
      <template #header>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-weight: 600;">ElevenLabs 목소리 탐색</span>
          <el-button type="primary" plain :loading="loadingAvailable" @click="fetchAvailableVoices">
            <el-icon><Refresh /></el-icon>
            목소리 목록 불러오기
          </el-button>
        </div>
      </template>

      <el-alert
        v-if="availableError"
        :title="availableError"
        type="warning"
        :closable="false"
        style="margin-bottom: 16px;"
      />

      <div v-if="availableVoices.length === 0 && !loadingAvailable" style="text-align: center; padding: 40px; color: #909399;">
        목소리 목록 불러오기 버튼을 눌러 ElevenLabs 목소리를 탐색하세요.
      </div>

      <div v-loading="loadingAvailable">
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
          <el-card
            v-for="voice in availableVoices"
            :key="voice.voice_id"
            shadow="hover"
            style="cursor: default;"
          >
            <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">{{ voice.name }}</div>
            <div style="color: #909399; font-size: 12px; margin-bottom: 8px;">
              {{ voice.category || '커스텀' }}
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px;">
              <el-tag
                v-for="(val, key) in (voice.labels || {})"
                :key="key"
                size="small"
                type="info"
              >{{ val }}</el-tag>
            </div>
            <el-button
              size="small"
              type="primary"
              plain
              @click="prefillFromVoice(voice)"
            >이 목소리로 프로필 만들기</el-button>
          </el-card>
        </div>
      </div>
    </el-card>

    <!-- Add/Edit Modal -->
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
        <el-form-item label="Voice ID" prop="voiceId">
          <el-input v-model="form.voiceId" placeholder="ElevenLabs Voice ID" />
        </el-form-item>
        <el-form-item label="모델" prop="model">
          <el-select v-model="form.model" style="width: 100%;">
            <el-option label="eleven_multilingual_v2" value="eleven_multilingual_v2" />
            <el-option label="eleven_turbo_v2_5" value="eleven_turbo_v2_5" />
            <el-option label="eleven_flash_v2_5" value="eleven_flash_v2_5" />
          </el-select>
        </el-form-item>
        <el-form-item label="안정성 (Stability)">
          <el-slider v-model="form.stability" :min="0" :max="1" :step="0.01" show-input />
        </el-form-item>
        <el-form-item label="유사성 (Similarity Boost)">
          <el-slider v-model="form.similarityBoost" :min="0" :max="1" :step="0.01" show-input />
        </el-form-item>
        <el-form-item label="스타일 (Style)">
          <el-slider v-model="form.style" :min="0" :max="1" :step="0.01" show-input />
        </el-form-item>
        <el-form-item label="Speaker Boost">
          <el-checkbox v-model="form.useSpeakerBoost">Speaker Boost 사용</el-checkbox>
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
  </AppLayout>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppLayout from '../components/AppLayout.vue'
import api from '../api'

// Profiles
const profiles = ref([])
const loadingProfiles = ref(false)

// Available ElevenLabs voices
const availableVoices = ref([])
const loadingAvailable = ref(false)
const availableError = ref('')

// Modal
const modalVisible = ref(false)
const editingItem = ref(null)
const saving = ref(false)
const formRef = ref(null)
const form = reactive({
  name: '',
  voiceId: '',
  model: 'eleven_multilingual_v2',
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0.0,
  useSpeakerBoost: true,
})

const formRules = {
  name: [{ required: true, message: '프로필 이름을 입력하세요', trigger: 'blur' }],
  voiceId: [{ required: true, message: 'Voice ID를 입력하세요', trigger: 'blur' }],
  model: [{ required: true, message: '모델을 선택하세요', trigger: 'change' }],
}

// Preview
const loadingPreview = ref(false)
const previewAudioSrc = ref('')
const audioRef = ref(null)

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
    availableError.value = 'ElevenLabs 목소리 목록을 불러오는 데 실패했습니다.'
    availableVoices.value = []
  } finally {
    loadingAvailable.value = false
  }
}

function openModal(item = null) {
  editingItem.value = item
  if (item) {
    form.name = item.name
    form.voiceId = item.voiceId
    form.model = item.model
    form.stability = item.stability
    form.similarityBoost = item.similarityBoost
    form.style = item.style
    form.useSpeakerBoost = item.useSpeakerBoost
  } else {
    resetModal()
  }
  previewAudioSrc.value = ''
  modalVisible.value = true
}

function resetModal() {
  form.name = ''
  form.voiceId = ''
  form.model = 'eleven_multilingual_v2'
  form.stability = 0.5
  form.similarityBoost = 0.75
  form.style = 0.0
  form.useSpeakerBoost = true
  previewAudioSrc.value = ''
  editingItem.value = null
  formRef.value?.resetFields()
}

function prefillFromVoice(voice) {
  editingItem.value = null
  form.name = voice.name
  form.voiceId = voice.voice_id
  form.model = 'eleven_multilingual_v2'
  form.stability = 0.5
  form.similarityBoost = 0.75
  form.style = 0.0
  form.useSpeakerBoost = true
  previewAudioSrc.value = ''
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
        model: form.model,
        stability: form.stability,
        similarityBoost: form.similarityBoost,
        style: form.style,
        useSpeakerBoost: form.useSpeakerBoost,
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
    ElMessage.warning('Voice ID를 먼저 입력하세요.')
    return
  }
  loadingPreview.value = true
  previewAudioSrc.value = ''
  try {
    const res = await api.post('/voice/preview', {
      voiceId: form.voiceId,
      text: '안녕하세요, 저는 AI 상담원입니다.',
      stability: form.stability,
      similarityBoost: form.similarityBoost,
      style: form.style,
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

onMounted(() => {
  fetchProfiles()
})
</script>
