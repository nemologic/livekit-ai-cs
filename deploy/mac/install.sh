#!/bin/sh
# Mac Studio 자동 시작 등록 — 로그인 시 서비스를 띄우고, 죽으면 다시 살린다 (launchd)
# 사용: deploy/mac/install.sh          코드를 고친 뒤 다시 실행하면 재빌드 후 재시작한다
# 로그: ~/Library/Logs/livekit-ai-cs/
set -e
REPO=$(cd "$(dirname "$0")/../.." && pwd)
AGENTS_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="$HOME/Library/Logs/livekit-ai-cs"
NODE=$(command -v node)
mkdir -p "$AGENTS_DIR" "$LOG_DIR"

echo "빌드 중..."
(cd "$REPO/agent" && npm run build >/dev/null)
(cd "$REPO/admin/backend" && npm run build >/dev/null)
(cd "$REPO/admin/frontend" && npm run build >/dev/null)

# register <이름> <작업 폴더> <명령> [인자...]
register() {
  name=$1; workdir=$2; shift 2
  label="com.livekit-ai-cs.$name"
  plist="$AGENTS_DIR/$label.plist"
  args=""
  for arg in "$@"; do args="$args    <string>$arg</string>
"; done

  cat > "$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$label</string>
  <key>WorkingDirectory</key><string>$workdir</string>
  <key>ProgramArguments</key>
  <array>
$args  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$LOG_DIR/$name.log</string>
  <key>StandardErrorPath</key><string>$LOG_DIR/$name.log</string>
</dict>
</plist>
EOF

  # bootout은 비동기라, 이전 프로세스가 완전히 내려간 뒤에 다시 올려야 한다
  launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
  while launchctl print "gui/$(id -u)/$label" >/dev/null 2>&1; do sleep 1; done
  launchctl bootstrap "gui/$(id -u)" "$plist"
  echo "등록: $label"
}

register speech "$REPO/speech" \
  "$REPO/speech/.venv/bin/uvicorn" server:app --host 127.0.0.1 --port 8100
register admin-backend "$REPO/admin/backend" "$NODE" dist/main
register admin-frontend "$REPO/admin/frontend" \
  "$NODE" node_modules/.bin/vite preview --host --port 5173 --strictPort
register agent "$REPO/agent" "$NODE" dist/index.js start
