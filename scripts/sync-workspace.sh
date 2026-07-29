#!/usr/bin/env bash
# Force-sync NAAC desk workspace from naac.json into the site database.
set -euo pipefail
cd /workspace/development/frappe-bench
bench --site development.localhost execute naac.naac_core.setup_workspace.sync
bench --site development.localhost clear-cache
echo "==> NAAC workspace synced. Hard refresh /app/naac (Ctrl+Shift+R)."
