#!/usr/bin/env bash
# WSL2 + Ubuntu setup for Frappe Bench (run inside Ubuntu 24.04)
set -euo pipefail

echo "==> Updating packages..."
sudo apt update && sudo apt upgrade -y

echo "==> Installing system dependencies..."
sudo apt install -y git redis-server libmariadb-dev mariadb-server mariadb-client pkg-config \
  xvfb libfontconfig curl

echo "==> Installing wkhtmltopdf..."
WKHTML_DEB="wkhtmltox_0.12.6.1-3.jammy_amd64.deb"
if [ ! -f "/tmp/${WKHTML_DEB}" ]; then
  curl -L "https://github.com/wkhtmltopdf/packaging/releases/download/0.12.6.1-3/${WKHTML_DEB}" \
    -o "/tmp/${WKHTML_DEB}"
fi
sudo dpkg -i "/tmp/${WKHTML_DEB}" || sudo apt-get install -f -y

echo "==> Configuring MariaDB..."
sudo mysql -u root <<'SQL'
ALTER USER 'root'@'localhost' IDENTIFIED BY 'admin';
FLUSH PRIVILEGES;
SQL

sudo tee /etc/mysql/mariadb.conf.d/99-frappe.cnf >/dev/null <<'CNF'
[mysqld]
character-set-client-handshake = FALSE
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
CNF
sudo systemctl restart mariadb

echo "==> Installing Node via nvm..."
export NVM_DIR="$HOME/.nvm"
if [ ! -d "$NVM_DIR" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi
# shellcheck source=/dev/null
source "$NVM_DIR/nvm.sh"
nvm install 18
npm install -g yarn

echo "==> Installing Python via uv..."
if ! command -v uv >/dev/null 2>&1; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
  # shellcheck source=/dev/null
  source "$HOME/.local/bin/env"
fi
uv python install 3.11 --default

echo "==> Installing frappe-bench..."
uv tool install frappe-bench

echo "==> WSL setup complete. Next: run scripts/bench-init.sh"
