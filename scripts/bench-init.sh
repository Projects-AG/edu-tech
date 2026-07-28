#!/usr/bin/env bash
# Initialize Frappe bench with ERPNext, Education, and NAAC app.
# Run inside Docker: docker compose exec frappe bash /workspace/scripts/bench-init.sh
# Or on WSL after wsl-setup.sh: bash scripts/bench-init.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEV_DIR="${PROJECT_ROOT}/development"
BENCH_DIR="${DEV_DIR}/frappe-bench"
APPS_JSON="${DEV_DIR}/apps.json"

cd "${DEV_DIR}"

if [ ! -d "${BENCH_DIR}" ]; then
  echo "==> Initializing bench (Frappe v15 + ERPNext + Education)..."
  bench init frappe-bench \
    --skip-redis-config-generation \
    --frappe-branch version-15 \
    --frappe-path https://github.com/frappe/frappe \
    --apps_path "${APPS_JSON}"

  cd "${BENCH_DIR}"
  bench set-config -g db_host mariadb
  bench set-config -g redis_cache "redis://redis-cache:6379"
  bench set-config -g redis_queue "redis://redis-queue:6379"
  bench set-config -g redis_socketio "redis://redis-queue:6379"
  bench set-config -gp developer_mode 1
else
  echo "==> Bench already exists at ${BENCH_DIR}"
  cd "${BENCH_DIR}"
fi

# Link custom NAAC app into bench
if [ ! -e "${BENCH_DIR}/apps/naac" ]; then
  echo "==> Linking NAAC custom app..."
  ln -sf "${PROJECT_ROOT}" "${BENCH_DIR}/apps/naac"
fi

# Create site if missing
if [ ! -d "${BENCH_DIR}/sites/development.localhost" ]; then
  echo "==> Creating development.localhost site..."
  bench new-site development.localhost \
    --db-root-username root \
    --db-host mariadb \
    --db-type mariadb \
    --mariadb-user-host-login-scope='%' \
    --db-root-password 123 \
    --admin-password admin \
    --install-app erpnext \
    --install-app education \
    --install-app naac
else
  echo "==> Site exists; ensuring apps are installed..."
  bench --site development.localhost install-app naac 2>/dev/null || true
fi

bench --site development.localhost set-config developer_mode 1
bench --site development.localhost migrate

echo ""
echo "==> Setup complete!"
echo "    Start server: cd ${BENCH_DIR} && bench start"
echo "    URL:          http://development.localhost:8000"
echo "    Login:        Administrator / admin"
