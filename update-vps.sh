#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Replica los cambios (ya commiteados y pusheados a GitHub) al VPS.
# Hace: git pull → rebuild → restart, del backend y/o la web.
#
# Uso:
#   bash update-vps.sh          # actualiza backend + web
#   bash update-vps.sh backend  # solo backend
#   bash update-vps.sh web      # solo la web
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

WHAT="${1:-all}"
KEY="$HOME/.ssh/handicapp_vps"
SSH=(ssh -i "$KEY" -p 5133 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=30 root@149.50.152.218)

echo "▶ Actualizando el VPS ($WHAT)…"
"${SSH[@]}" "WHAT='$WHAT' bash -s" <<'REMOTE'
set -e
cd /opt/handicapp
echo "== git pull =="; git pull --ff-only | tail -1

if [ "$WHAT" = "all" ] || [ "$WHAT" = "backend" ]; then
  echo "== backend: build + restart =="
  cd /opt/handicapp/backend
  npm install --include=dev >/dev/null 2>&1
  npm run build >/dev/null 2>&1
  pm2 restart handicapp-api >/dev/null 2>&1
  echo "   backend OK"
fi

if [ "$WHAT" = "all" ] || [ "$WHAT" = "web" ]; then
  echo "== web: build + restart (tarda unos minutos) =="
  cd /opt/handicapp/frontend
  npm install >/dev/null 2>&1
  npm run build >/dev/null 2>&1
  pm2 restart handicapp-web >/dev/null 2>&1
  echo "   web OK"
fi

echo "✅ VPS actualizado — http://149.50.152.218/handicapp"
curl -s --max-time 8 http://127.0.0.1:8080/api/health >/dev/null 2>&1 || \
  curl -s --max-time 8 http://127.0.0.1/handicapp/api/health -o /dev/null && echo "   health: OK"
REMOTE
