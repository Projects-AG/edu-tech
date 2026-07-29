#!/usr/bin/env bash
# Start bench dev server, ensuring portal assets exist first.
# Run inside Docker:
#   docker compose exec frappe bash /workspace/scripts/start-dev.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BENCH_DIR="${PROJECT_ROOT}/development/frappe-bench"
ASSETS_NAAC="${BENCH_DIR}/sites/assets/naac"
PUBLIC_NAAC="${PROJECT_ROOT}/naac/public"

if [ ! -d "${ASSETS_NAAC}/frontend/assets" ]; then
	echo "==> NAAC portal assets missing; building..."
	bash "${SCRIPT_DIR}/portal-build.sh"
elif [ -L "${ASSETS_NAAC}" ]; then
	echo "==> Replacing NAAC asset symlink with copied files..."
	rm -rf "${ASSETS_NAAC}"
	cp -a "${PUBLIC_NAAC}" "${ASSETS_NAAC}"
fi

cd "${BENCH_DIR}"
echo "==> Starting bench..."
exec bench start
