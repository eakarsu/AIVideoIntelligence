#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -f "$project_dir/.env" ]] || { echo 'Missing .env; copy .env.example and provide real secrets.' >&2; exit 1; }
[[ -d "$project_dir/backend/node_modules" && -d "$project_dir/frontend/node_modules" ]] || { echo 'Dependencies are missing; install them explicitly before starting.' >&2; exit 1; }
backend_port="${BACKEND_PORT:-${PORT:-4000}}"
frontend_port="${FRONTEND_PORT:-3000}"
(cd "$project_dir/backend" && BACKEND_PORT="$backend_port" PORT="$backend_port" exec node server.js) & backend_pid=$!
frontend_pid=""
cleanup(){ kill "$backend_pid" ${frontend_pid:+"$frontend_pid"} 2>/dev/null || true; }
trap cleanup INT TERM EXIT
api_ready=false
for _ in {1..120}; do
  if curl --fail --silent --max-time 1 "http://127.0.0.1:${backend_port}/api/health" >/dev/null 2>&1; then api_ready=true; break; fi
  kill -0 "$backend_pid" 2>/dev/null || break
  sleep 0.25
done
[[ "$api_ready" == true ]] || { echo "Backend failed to become ready on port $backend_port" >&2; exit 1; }
(cd "$project_dir/frontend" && BACKEND_PORT="$backend_port" FRONTEND_PORT="$frontend_port" npm run dev -- --host 127.0.0.1 --port "$frontend_port") & frontend_pid=$!
wait "$backend_pid" "$frontend_pid"
