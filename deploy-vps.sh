#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Deploy de HandicApp en un VPS Ubuntu/Debian — acceso por IP (sin dominio/HTTPS).
# Idempotente: se puede volver a correr para actualizar.
# Uso:  bash deploy-vps.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

IP="149.50.152.218"
APP_DIR="/opt/handicapp"
REPO="https://github.com/Handicapp-Arg/App-Handicapp.git"
DB_NAME="handicapp"
DB_USER="handicapp"

log(){ echo -e "\n\033[1;36m▶ $*\033[0m"; }

# ── 1. Paquetes del sistema ──────────────────────────────────────────────────
log "Instalando dependencias del sistema…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git nginx postgresql postgresql-contrib ufw ca-certificates
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
command -v pm2 >/dev/null 2>&1 || npm install -g pm2

# ── 2. Base de datos ─────────────────────────────────────────────────────────
log "Configurando PostgreSQL…"
systemctl enable --now postgresql
# Password de DB: se genera una vez y se guarda en /root/.handicapp_dbpass
if [ -f /root/.handicapp_dbpass ]; then DB_PASS="$(cat /root/.handicapp_dbpass)"; else DB_PASS="$(openssl rand -hex 16)"; echo "$DB_PASS" > /root/.handicapp_dbpass; chmod 600 /root/.handicapp_dbpass; fi
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"

# ── 3. Código ────────────────────────────────────────────────────────────────
log "Obteniendo el código…"
if [ -d "$APP_DIR/.git" ]; then git -C "$APP_DIR" pull --ff-only; else git clone "$REPO" "$APP_DIR"; fi

# ── 4. Backend (NestJS) ──────────────────────────────────────────────────────
log "Compilando el backend…"
cd "$APP_DIR/backend"
npm install --include=dev
# JWT: se genera una vez
if [ -f /root/.handicapp_jwt ]; then JWT="$(cat /root/.handicapp_jwt)"; else JWT="$(openssl rand -hex 32)"; echo "$JWT" > /root/.handicapp_jwt; chmod 600 /root/.handicapp_jwt; fi
# .env de producción — las credenciales de servicios externos quedan vacías (cargar luego).
cat > "$APP_DIR/backend/.env" <<EOF
NODE_ENV=production
PORT=3001
FRONTEND_URL=http://$IP
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=$DB_USER
DB_PASSWORD=$DB_PASS
DB_NAME=$DB_NAME
JWT_SECRET=$JWT
JWT_EXPIRES_IN=15m
SKIP_DEV_SEED=true
HEALTH_REMINDER_DAYS=30
# ── Completar con tus credenciales reales ──
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RESEND_API_KEY=
RESEND_FROM=
MERCADOPAGO_ACCESS_TOKEN=
MP_BACK_URL=http://$IP/perfil
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_API_VERSION=v21.0
EOF
npm run build
pm2 delete handicapp-api >/dev/null 2>&1 || true
pm2 start dist/main.js --name handicapp-api --cwd "$APP_DIR/backend"

# ── 5. Frontend (Next.js) ────────────────────────────────────────────────────
log "Compilando la web…"
cd "$APP_DIR/frontend"
cat > "$APP_DIR/frontend/.env.local" <<EOF
NEXT_PUBLIC_API_URL=http://$IP/api
NEXT_PUBLIC_PUBLIC_BASE_URL=http://$IP
EOF
npm install
npm run build
pm2 delete handicapp-web >/dev/null 2>&1 || true
pm2 start "npm run start" --name handicapp-web --cwd "$APP_DIR/frontend"

pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

# ── 6. Nginx (reverse proxy en el puerto 80) ─────────────────────────────────
log "Configurando Nginx…"
cat > /etc/nginx/sites-available/handicapp <<EOF
server {
    listen 80 default_server;
    server_name $IP;
    client_max_body_size 20M;

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
ln -sf /etc/nginx/sites-available/handicapp /etc/nginx/sites-enabled/handicapp
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── 7. Firewall ──────────────────────────────────────────────────────────────
log "Firewall…"
ufw allow 5133/tcp  || true   # SSH
ufw allow 80/tcp    || true   # HTTP
yes | ufw enable    || true

log "LISTO ✅  Web: http://$IP   ·   API: http://$IP/api/health"
echo "La base arranca vacía (producción). Registrate desde la web para entrar."
echo "Cargá tus credenciales de Cloudinary en $APP_DIR/backend/.env y reiniciá: pm2 restart handicapp-api"
