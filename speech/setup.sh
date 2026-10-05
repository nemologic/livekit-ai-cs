#!/bin/sh
# 로컬 음성 서버 설치 (최초 1회). 필요: uv, ffmpeg (brew install uv ffmpeg)
set -e
cd "$(dirname "$0")"

uv sync --python 3.10

# 일본어용 MeCab 사전 — MeloTTS가 import 시점에 요구한다
.venv/bin/python -m unidic download

# 영어 발음 변환(g2p_en)용 NLTK 데이터
.venv/bin/python -m nltk.downloader averaged_perceptron_tagger_eng

# python-mecab-ko(mecab)와 mecab-python3(MeCab)는 macOS의 대소문자 구분 없는
# 파일시스템에서 같은 폴더로 충돌하므로, 한국어용은 vendor/에 따로 설치한다
uv pip install --python .venv/bin/python --target vendor python-mecab-ko

# 내 목소리 입히기용 OpenVoice — 고정된 의존성 버전이 다른 패키지와 충돌하므로
# 의존성 없이 vendor/에 설치한다 (wavmark: 합성 음성에 넣는 워터마크)
uv pip install --python .venv/bin/python --no-deps --target vendor \
  "git+https://github.com/myshell-ai/OpenVoice.git" wavmark resampy
