<template>
  <AppLayout>
    <el-card>
      <template #header>
        <span style="font-weight: 600;">AI 에이전트 설정</span>
      </template>

      <el-form
        v-if="!loading"
        ref="formRef"
        :model="form"
        label-position="top"
        style="max-width: 860px;"
      >
        <!-- 시스템 프롬프트 -->
        <el-form-item label="시스템 프롬프트">
          <el-input
            v-model="form.system_prompt"
            type="textarea"
            :rows="8"
            placeholder="AI 에이전트 시스템 프롬프트를 입력하세요"
          />
          <div style="font-size: 12px; color: #909399; margin-top: 4px;">
            AI 에이전트의 역할과 행동 방식을 정의합니다. 상담원 훈련 메뉴의 지식 베이스가 이 프롬프트 뒤에 자동으로 추가됩니다.
          </div>
        </el-form-item>

        <!-- TTS 설정 -->
        <el-divider content-position="left">TTS 설정</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="TTS 음성 ID">
              <el-input v-model="form.tts_voice_id" placeholder="ElevenLabs 음성 ID" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="TTS 모델">
              <el-select v-model="form.tts_model" style="width: 100%;">
                <el-option label="eleven_multilingual_v2" value="eleven_multilingual_v2" />
                <el-option label="eleven_turbo_v2" value="eleven_turbo_v2" />
                <el-option label="eleven_flash_v2_5" value="eleven_flash_v2_5" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- LLM 설정 -->
        <el-divider content-position="left">LLM 설정</el-divider>

        <!-- 프리셋 선택 -->
        <el-form-item label="모델 프리셋">
          <el-select
            v-model="selectedPreset"
            style="width: 100%;"
            placeholder="프리셋을 선택하거나 직접 입력하세요"
            @change="applyPreset"
          >
            <el-option-group label="Groq (현재 계정 사용 가능)">
              <el-option
                v-for="p in groqPresets"
                :key="p.model"
                :label="p.label"
                :value="p.model"
              />
            </el-option-group>
            <el-option-group label="OpenRouter (Qwen 2.5 등 — 별도 API 키 필요)">
              <el-option
                v-for="p in openrouterPresets"
                :key="p.model"
                :label="p.label"
                :value="p.model"
              />
            </el-option-group>
            <el-option-group label="기타">
              <el-option label="직접 입력" value="__custom__" />
            </el-option-group>
          </el-select>
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="LLM 모델">
              <el-input
                v-model="form.llm_model"
                placeholder="예: openai/gpt-oss-20b"
                :disabled="selectedPreset !== '__custom__' && selectedPreset !== ''"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="LLM Base URL">
              <el-input
                v-model="form.llm_base_url"
                placeholder="예: https://api.groq.com/openai/v1"
                :disabled="selectedPreset !== '__custom__' && selectedPreset !== ''"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- OpenRouter 선택 시 안내 -->
        <el-alert
          v-if="isOpenRouter"
          type="warning"
          :closable="false"
          style="margin-bottom: 16px;"
        >
          <template #title>
            OpenRouter API 키 설정 필요
          </template>
          에이전트 서버의 <code>.env</code> 파일에 <code>OPENROUTER_API_KEY</code>를 추가하고,
          <code>agent.ts</code>의 <code>apiKey</code>를 <code>process.env.OPENROUTER_API_KEY</code>로 변경하세요.
        </el-alert>

        <el-form-item>
          <el-button type="primary" size="large" :loading="saving" @click="handleSave">저장</el-button>
          <el-button size="large" @click="loadSettings">초기화</el-button>
        </el-form-item>
      </el-form>

      <div v-else style="text-align: center; padding: 60px;">
        <el-icon class="is-loading" size="32"><Loading /></el-icon>
      </div>
    </el-card>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import AppLayout from '../components/AppLayout.vue'
import api from '../api'

const loading = ref(false)
const saving = ref(false)
const selectedPreset = ref('')

const form = reactive({
  system_prompt: '',
  tts_voice_id: '',
  tts_model: '',
  llm_model: '',
  llm_base_url: '',
})

const groqPresets = [
  { label: 'GPT OSS 20B (빠름, 현재 사용 중)', model: 'openai/gpt-oss-20b', baseUrl: 'https://api.groq.com/openai/v1' },
  { label: 'GPT OSS 120B (고성능)', model: 'openai/gpt-oss-120b', baseUrl: 'https://api.groq.com/openai/v1' },
  { label: 'Qwen 3 27B (다국어 우수)', model: 'qwen/qwen3.8-27b', baseUrl: 'https://api.groq.com/openai/v1' },
]

const openrouterPresets = [
  { label: 'Qwen 2.5 72B Instruct', model: 'qwen/qwen-2.5-72b-instruct', baseUrl: 'https://openrouter.ai/api/v1' },
  { label: 'Qwen 2.5 7B Instruct (경량)', model: 'qwen/qwen-2.5-7b-instruct', baseUrl: 'https://openrouter.ai/api/v1' },
  { label: 'Qwen 2.5 Coder 32B', model: 'qwen/qwen-2.5-coder-32b-instruct', baseUrl: 'https://openrouter.ai/api/v1' },
]

const allPresets = [...groqPresets, ...openrouterPresets]

const isOpenRouter = computed(() =>
  form.llm_base_url.includes('openrouter.ai')
)

function applyPreset(value) {
  if (value === '__custom__') return
  const preset = allPresets.find(p => p.model === value)
  if (preset) {
    form.llm_model = preset.model
    form.llm_base_url = preset.baseUrl
  }
}

function syncPresetFromForm() {
  const matched = allPresets.find(
    p => p.model === form.llm_model && p.baseUrl === form.llm_base_url
  )
  selectedPreset.value = matched ? matched.model : '__custom__'
}

async function loadSettings() {
  loading.value = true
  try {
    const res = await api.get('/settings')
    const data = res.data
    form.system_prompt = data.system_prompt || ''
    form.tts_voice_id  = data.tts_voice_id  || ''
    form.tts_model     = data.tts_model     || ''
    form.llm_model     = data.llm_model     || ''
    form.llm_base_url  = data.llm_base_url  || ''
    syncPresetFromForm()
  } catch {
    ElMessage.error('설정을 불러오는 데 실패했습니다.')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  saving.value = true
  try {
    await api.put('/settings', {
      system_prompt: form.system_prompt,
      tts_voice_id:  form.tts_voice_id,
      tts_model:     form.tts_model,
      llm_model:     form.llm_model,
      llm_base_url:  form.llm_base_url,
    })
    ElMessage.success('설정이 저장되었습니다.')
  } catch {
    ElMessage.error('설정 저장에 실패했습니다.')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>
