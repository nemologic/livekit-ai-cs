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
            <el-form-item label="TTS 음성">
              <el-input v-model="form.tts_voice_id" placeholder="예: auto, KR, EN-US" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="TTS 모델">
              <el-select v-model="form.tts_model" style="width: 100%;">
                <el-option label="MeloTTS (로컬)" value="melotts" />
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
            <el-option-group label="Ollama (로컬)">
              <el-option
                v-for="p in ollamaPresets"
                :key="p.model"
                :label="p.label"
                :value="p.model"
              />
            </el-option-group>
            <el-option-group label="OpenAI (클라우드 — API 키 필요, 대화 내용이 외부로 전송됨)">
              <el-option
                v-for="p in openaiPresets"
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
                placeholder="예: qwen2.5:32b"
                :disabled="selectedPreset !== '__custom__' && selectedPreset !== ''"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="LLM Base URL">
              <el-input
                v-model="form.llm_base_url"
                placeholder="예: http://localhost:11434/v1"
                :disabled="selectedPreset !== '__custom__' && selectedPreset !== ''"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 외부 API 선택 시 안내 -->
        <el-alert
          v-if="isRemoteLlm"
          type="warning"
          :closable="false"
          style="margin-bottom: 16px;"
        >
          <template #title>
            외부 LLM API 키 설정 필요
          </template>
          OpenAI 모델은 에이전트 서버의 <code>agent/.env</code>에 <code>OPENAI_API_KEY</code>가, 그 밖의 외부 주소는 <code>LLM_API_KEY</code>가 있어야 합니다. 키를 넣은 뒤에는 에이전트를 재시작하세요.
        </el-alert>

        <!-- 운영 설정 -->
        <el-divider content-position="left">운영 설정</el-divider>
        <el-form-item label="동시 통화 수">
          <el-input-number v-model="form.max_concurrent_calls" :min="1" :max="20" :step="1" step-strictly />
          <div style="font-size: 12px; color: #909399; margin-top: 4px; width: 100%;">
            이 수만큼 통화 중이면 새 고객에게는 "모든 상담원이 통화 중" 안내가 나갑니다. 통화가 겹치면 응답이 그만큼 느려지므로 장비 성능에 맞춰 정하세요.
          </div>
        </el-form-item>

        <el-form-item label="통화 시간 제한">
          <div style="display: flex; align-items: center; gap: 12px;">
            <el-switch v-model="form.call_time_limit_enabled" active-text="사용" inactive-text="사용 안 함" />
            <el-input-number
              v-model="form.call_time_limit_minutes"
              :min="1"
              :max="120"
              :step="1"
              step-strictly
              :disabled="!form.call_time_limit_enabled"
            />
            <span>분</span>
            <el-checkbox
              v-model="form.call_time_limit_warning"
              :disabled="!form.call_time_limit_enabled"
              style="margin-left: 12px;"
            >종료 1분 전 예고 멘트</el-checkbox>
          </div>
          <div style="font-size: 12px; color: #909399; margin-top: 4px; width: 100%;">
            켜 두면 통화가 이 시간을 넘길 때 상담원이 종료 안내를 하고 통화를 끝냅니다. 예고 멘트를 켜면 끝나기 1분 전에 "상담 시간이 1분 남았습니다"라고 알립니다. 다음 통화부터 적용됩니다.
          </div>
        </el-form-item>

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
  max_concurrent_calls: 2,
  call_time_limit_enabled: false,
  call_time_limit_minutes: 10,
  call_time_limit_warning: true,
})

const OLLAMA_BASE_URL = 'http://localhost:11434/v1'

const ollamaPresets = [
  { label: 'Qwen 2.5 32B (권장 — 실시간 통화 가능)', model: 'qwen2.5:32b', baseUrl: OLLAMA_BASE_URL },
  { label: 'DeepSeek-R1 Distill Qwen 32B (추론 모델 — 답변 전 생각 시간 때문에 통화에서는 응답이 끊김)', model: 'deepseek-r1:32b', baseUrl: OLLAMA_BASE_URL },
  { label: 'Mistral-Nemo 12B (빠름 — 한국어가 다소 어색)', model: 'mistral-nemo:12b', baseUrl: OLLAMA_BASE_URL },
  { label: 'Llama 3.1 8B (매우 빠름 — 한국어 내용이 부정확)', model: 'llama3.1:8b', baseUrl: OLLAMA_BASE_URL },
  { label: 'Llama 3.2 3B (가장 빠름 — 한국어가 깨짐, 비권장)', model: 'llama3.2:3b', baseUrl: OLLAMA_BASE_URL },
  { label: 'Qwen 2.5 72B (64GB 장비에서는 너무 느려 응답 끊김)', model: 'qwen2.5:72b', baseUrl: OLLAMA_BASE_URL },
]

const OPENAI_BASE_URL = 'https://api.openai.com/v1'

const openaiPresets = [
  { label: 'GPT-4.1', model: 'gpt-4.1', baseUrl: OPENAI_BASE_URL },
  { label: 'GPT-4.1 mini (빠름)', model: 'gpt-4.1-mini', baseUrl: OPENAI_BASE_URL },
  { label: 'GPT-4o mini (빠름, 저렴)', model: 'gpt-4o-mini', baseUrl: OPENAI_BASE_URL },
]

const allPresets = [...ollamaPresets, ...openaiPresets]

const isRemoteLlm = computed(() =>
  form.llm_base_url !== '' && !/\/\/(localhost|127\.0\.0\.1)[:/]/.test(form.llm_base_url)
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
    form.max_concurrent_calls = Number(data.max_concurrent_calls) || 2
    form.call_time_limit_enabled = data.call_time_limit_enabled === 'true'
    form.call_time_limit_minutes = Number(data.call_time_limit_minutes) || 10
    form.call_time_limit_warning = data.call_time_limit_warning !== 'false'
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
      max_concurrent_calls: String(form.max_concurrent_calls),
      call_time_limit_enabled: String(form.call_time_limit_enabled),
      call_time_limit_minutes: String(form.call_time_limit_minutes),
      call_time_limit_warning: String(form.call_time_limit_warning),
    })
    ElMessage.success('설정이 저장되었습니다.')
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '설정 저장에 실패했습니다.')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>
