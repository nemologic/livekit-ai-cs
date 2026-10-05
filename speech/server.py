"""로컬 음성 서버 — OpenAI 호환 API

  POST   /v1/audio/transcriptions  Whisper large-v3 (MLX)
  POST   /v1/audio/speech          MeloTTS (+ 등록한 목소리면 OpenVoice로 음색 변환)
  GET    /v1/voices                사용 가능한 목소리 목록
  POST   /v1/voices                녹음 파일로 내 목소리 등록
  DELETE /v1/voices/{voice_id}     등록한 목소리 삭제
  GET    /health
"""

import io
import json
import os
import re
import subprocess
import sys
import tempfile
import threading
import uuid
import wave
from contextlib import asynccontextmanager
from fractions import Fraction
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
# python-mecab-ko, OpenVoice는 vendor/에 따로 설치되어 있다 (setup.sh 참고)
sys.path.append(str(BASE_DIR / "vendor"))

import mlx_whisper
import numpy as np
import soundfile
import torch
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response
from huggingface_hub import snapshot_download
from melo.api import TTS
from openvoice.api import ToneColorConverter
from pydantic import BaseModel
from scipy.signal import resample_poly

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "mlx-community/whisper-large-v3-mlx")
TTS_DEVICE = os.getenv("TTS_DEVICE", "auto")
TTS_LANGUAGES = os.getenv("TTS_LANGUAGES", "KR,EN").split(",")
OUTPUT_SAMPLE_RATE = 24000  # LiveKit OpenAI 플러그인이 기대하는 PCM 샘플레이트

VOICES_DIR = BASE_DIR / "voices"
CLONE_MIN_SECONDS = 5
CLONE_MAX_SECONDS = 120
# 등록한 목소리로 말할 때 바탕이 되는 MeloTTS 화자와, 그 화자의 OpenVoice 음색 파일
CLONE_BASE_VOICES = {"KR": "kr", "EN-US": "en-us"}

HANGUL = re.compile(r"[ㄱ-ㆎ가-힣]")

# MLX / torch 모델은 동시 호출에 안전하지 않으므로 모델별로 직렬화한다
stt_lock = threading.Lock()
tts_lock = threading.Lock()
tts_models: dict[str, TTS] = {}
converter: ToneColorConverter | None = None
base_tones: dict[str, torch.Tensor] = {}
# 등록한 목소리: voice_id → {"name": 표시 이름, "tone": 음색 벡터}
cloned_voices: dict[str, dict] = {}


def load_tts(language: str) -> TTS:
    if language not in tts_models:
        tts_models[language] = TTS(language=language, device=TTS_DEVICE)
    return tts_models[language]


def builtin_voices() -> list[str]:
    return [name for model in tts_models.values() for name in model.hps.data.spk2id.keys()]


def voice_for_text(text: str) -> str:
    return "KR" if HANGUL.search(text) or "EN" not in TTS_LANGUAGES else "EN-US"


def load_converter() -> None:
    global converter
    checkpoints = snapshot_download(
        "myshell-ai/OpenVoiceV2",
        allow_patterns=["converter/*", *[f"base_speakers/ses/{f}.pth" for f in CLONE_BASE_VOICES.values()]],
    )
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    converter = ToneColorConverter(f"{checkpoints}/converter/config.json", device=device)
    converter.load_ckpt(f"{checkpoints}/converter/checkpoint.pth")
    for voice, filename in CLONE_BASE_VOICES.items():
        base_tones[voice] = torch.load(f"{checkpoints}/base_speakers/ses/{filename}.pth", map_location=device)

    VOICES_DIR.mkdir(exist_ok=True)
    for meta_path in VOICES_DIR.glob("*.json"):
        tone = torch.load(meta_path.with_suffix(".pth"), map_location=device)
        cloned_voices[meta_path.stem] = {"name": json.loads(meta_path.read_text())["name"], "tone": tone}


def synthesize(text: str, voice: str, speed: float, variation: float) -> np.ndarray:
    """텍스트를 24kHz int16 PCM으로 합성한다.

    voice: MeloTTS 화자(KR, EN-US, ...), 등록한 목소리 id, 또는 auto(텍스트 언어로 판단)
    variation: 억양 변화 정도 0~1 (0.5가 MeloTTS 기본값)
    """
    clone = cloned_voices.get(voice)
    if clone or voice not in builtin_voices():
        voice = voice_for_text(text)

    with tts_lock:
        model = load_tts(voice.split("-")[0].split("_")[0])
        audio = model.tts_to_file(
            text,
            model.hps.data.spk2id[voice],
            None,
            speed=speed,
            sdp_ratio=0.4 * variation,
            noise_scale=0.2 + 0.8 * variation,
            noise_scale_w=0.4 + 0.8 * variation,
            quiet=True,
        )
        rate = model.hps.data.sampling_rate
        if clone:
            with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
                soundfile.write(tmp.name, audio, rate)
                audio = converter.convert(tmp.name, base_tones[voice], clone["tone"])
            rate = converter.hps.data.sampling_rate

    ratio = Fraction(OUTPUT_SAMPLE_RATE, rate)
    audio = resample_poly(audio, ratio.numerator, ratio.denominator)
    return (np.clip(audio, -1.0, 1.0) * 32767).astype(np.int16)


def transcribe(path: str, language: str | None, prompt: str | None, temperature: float) -> dict:
    with stt_lock:
        return mlx_whisper.transcribe(
            path,
            path_or_hf_repo=WHISPER_MODEL,
            language=language or None,
            initial_prompt=prompt or None,
            temperature=temperature,
            condition_on_previous_text=False,
        )


def to_wav(pcm: np.ndarray) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(OUTPUT_SAMPLE_RATE)
        wav.writeframes(pcm.tobytes())
    return buffer.getvalue()


def list_all_voices() -> list[dict]:
    return [
        {"voice_id": "auto", "name": "자동 (언어 감지)", "category": "기본"},
        *[{"voice_id": name, "name": name, "category": "기본"} for name in builtin_voices()],
        *[
            {"voice_id": voice_id, "name": voice["name"], "category": "내 목소리"}
            for voice_id, voice in cloned_voices.items()
        ],
    ]


@asynccontextmanager
async def lifespan(_: FastAPI):
    # 첫 통화가 모델 로딩을 기다리지 않도록 미리 올려 둔다
    for language in TTS_LANGUAGES:
        load_tts(language)
    load_converter()
    for sample in ("안녕하세요.", "Hello."):
        synthesize(sample, "auto", 1.0, 0.5)
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        tmp.write(to_wav(np.zeros(OUTPUT_SAMPLE_RATE, dtype=np.int16)))
        tmp.flush()
        transcribe(tmp.name, "ko", None, 0.0)
    print(f"[speech] 준비 완료 — STT: {WHISPER_MODEL}, TTS: {[v['voice_id'] for v in list_all_voices()]}")
    yield


app = FastAPI(lifespan=lifespan)


class SpeechRequest(BaseModel):
    input: str
    model: str = "melotts"
    voice: str = "auto"
    speed: float = 1.0
    variation: float = 0.5
    response_format: str = "pcm"


@app.post("/v1/audio/speech")
def create_speech(req: SpeechRequest, variation: float | None = Query(None, ge=0, le=1)):
    # OpenAI 클라이언트는 본문에 임의 필드를 넣을 수 없어서 variation은 쿼리로도 받는다
    if not req.input.strip():
        raise HTTPException(400, "input이 비어 있습니다.")
    pcm = synthesize(req.input, req.voice, req.speed, req.variation if variation is None else variation)
    if req.response_format == "wav":
        return Response(to_wav(pcm), media_type="audio/wav")
    return Response(pcm.tobytes(), media_type="audio/pcm")


@app.post("/v1/audio/transcriptions")
def create_transcription(
    file: UploadFile = File(...),
    language: str | None = Form(None),
    prompt: str | None = Form(None),
    temperature: float = Form(0.0),
):
    suffix = os.path.splitext(file.filename or "")[1] or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix) as tmp:
        tmp.write(file.file.read())
        tmp.flush()
        result = transcribe(tmp.name, language, prompt, temperature)
    return {"text": result["text"].strip(), "language": result.get("language")}


@app.get("/v1/voices")
def list_voices():
    return {"voices": list_all_voices()}


@app.post("/v1/voices", status_code=201)
def create_voice(name: str = Form(...), file: UploadFile = File(...)):
    """녹음 파일에서 음색을 뽑아 목소리로 등록한다. 원본 녹음은 저장하지 않는다."""
    suffix = os.path.splitext(file.filename or "")[1] or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix) as upload, tempfile.NamedTemporaryFile(suffix=".wav") as ref:
        upload.write(file.file.read())
        upload.flush()
        # 어떤 형식이든 모노 wav로 맞추고, 너무 긴 녹음은 앞부분만 쓴다
        converted = subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-i", upload.name, "-t", str(CLONE_MAX_SECONDS), "-ac", "1", ref.name],
            capture_output=True,
        )
        if converted.returncode != 0:
            raise HTTPException(400, "오디오 파일을 읽을 수 없습니다.")
        if soundfile.info(ref.name).duration < CLONE_MIN_SECONDS:
            raise HTTPException(400, f"녹음이 너무 짧습니다. {CLONE_MIN_SECONDS}초 이상 녹음해 주세요.")

        voice_id = f"my-{uuid.uuid4().hex[:8]}"
        with tts_lock:
            tone = converter.extract_se([ref.name], se_save_path=str(VOICES_DIR / f"{voice_id}.pth"))

    (VOICES_DIR / f"{voice_id}.json").write_text(json.dumps({"name": name}, ensure_ascii=False))
    cloned_voices[voice_id] = {"name": name, "tone": tone}
    return {"voice_id": voice_id, "name": name, "category": "내 목소리"}


@app.delete("/v1/voices/{voice_id}", status_code=204)
def delete_voice(voice_id: str):
    if cloned_voices.pop(voice_id, None) is None:
        raise HTTPException(404, "등록된 목소리가 아닙니다.")
    for suffix in (".pth", ".json"):
        (VOICES_DIR / f"{voice_id}{suffix}").unlink(missing_ok=True)


@app.get("/health")
def health():
    return {"status": "ok", "stt": WHISPER_MODEL, "tts": [v["voice_id"] for v in list_all_voices()]}
