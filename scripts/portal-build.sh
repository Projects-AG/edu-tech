#!/usr/bin/env bash
# Build NAAC portal SPA and publish assets into Frappe sites/assets.
# Run inside Docker:
#   docker compose exec frappe bash /workspace/scripts/portal-build.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BENCH_DIR="${PROJECT_ROOT}/development/frappe-bench"
ASSETS_NAAC="${BENCH_DIR}/sites/assets/naac"
PUBLIC_NAAC="${PROJECT_ROOT}/naac/public"

cd "${BENCH_DIR}"
echo "==> Building NAAC portal (links assets + compiles frontend)..."
bench build --app naac

echo "==> Publishing NAAC assets as real files (Docker/Windows symlink fix)..."
rm -rf "${ASSETS_NAAC}"
cp -a "${PUBLIC_NAAC}" "${ASSETS_NAAC}"

bench --site development.localhost clear-cache
echo "==> Portal ready at http://development.localhost:8000/naac-portal"
