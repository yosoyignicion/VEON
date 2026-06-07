#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
echo "⚡ VEON — Animated SVG to MP4 Engine"
echo "───"
cd "$DIR"
echo "Starting server on :3001 ..."
node server/index.js &
SERVER_PID=$!
sleep 1
echo "Starting frontend on :5173 ..."
npm --prefix frontend run dev -- --host 2>/dev/null &
FRONTEND_PID=$!
echo ""
echo "  🎬 Frontend: http://localhost:5173"
echo "  ⚙️  API:      http://localhost:3001/api"
echo ""
sleep 2 && xdg-open http://localhost:5173 &
echo "Press Ctrl+C to stop both."
trap "kill $SERVER_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
