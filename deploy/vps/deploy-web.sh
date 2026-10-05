#!/bin/sh
# 웹 상담 화면을 빌드해 VPS에 올린다. 사용: deploy/vps/deploy-web.sh
set -e
VPS=${VPS:-linuxuser@158.247.233.134}
cd "$(dirname "$0")/../../flutter_app"

flutter build web --release
rsync -az --delete build/web/ "$VPS:/var/www/cs.esimbongsa.com/"
