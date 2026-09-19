#!/bin/zsh
set -eu
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
else
  NODE_BIN="/Users/mingi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [ ! -x "$NODE_BIN" ]; then
  echo "Node.js 22 이상을 설치한 뒤 다시 실행해 주세요: https://nodejs.org"
  read -r "?엔터를 누르면 닫힙니다."
  exit 1
fi
export PATH="$(dirname "$NODE_BIN"):$PATH"
if [ ! -f node_modules/next/dist/bin/next ]; then
  echo "설치 파일이 없습니다. 이 폴더에서 npm install을 먼저 실행해 주세요."
  read -r "?엔터를 누르면 닫힙니다."
  exit 1
fi
echo "웹사이트 주소: http://localhost:3000/demo"
echo "이 창을 닫으면 웹사이트가 중지됩니다."
echo "화면을 준비하고 있습니다. 잠시만 기다려 주세요."
"$NODE_BIN" node_modules/next/dist/bin/next build
exec "$NODE_BIN" node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3000
