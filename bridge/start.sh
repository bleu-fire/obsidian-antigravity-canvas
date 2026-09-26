#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fuser -k 3099/tcp 2>/dev/null || true
sleep 1
setsid node "$DIR/server.js" </dev/null >/tmp/agy-bridge.log 2>&1 &
sleep 2
curl -s http://127.0.0.1:3099/health && echo "" && echo "✅ Antigravity Bridge running in background on port 3099"
