#!/usr/bin/env bash
# WSL-native bench init (no Docker). Run after scripts/wsl-setup.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

export NVM_DIR="$HOME/.nvm"
# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

mkdir -p ~/frappe
cd ~/frappe

if [ ! -d frappe-bench ]; then
  bench init frappe-bench --frappe-branch version-15
  cd frappe-bench
  bench get-app --branch version-15 erpnext
  bench get-app --branch version-15 education
else
  cd frappe-bench
fi

if [ ! -e apps/naac ]; then
  ln -sf "${PROJECT_ROOT}" apps/naac
fi

if [ ! -d sites/development.localhost ]; then
  bench new-site development.localhost \
    --admin-password admin \
    --mariadb-root-password admin \
    --install-app erpnext \
    --install-app education \
    --install-app naac
fi

bench set-config -g developer_mode 1
bench --site development.localhost migrate

echo "Run: cd ~/frappe/frappe-bench && bench start"
