#!/usr/bin/env bash
cd /workspace/development/frappe-bench
bench --site development.localhost mariadb <<'SQL'
SELECT LEFT(content, 500) AS content_preview FROM tabWorkspace WHERE name='NAAC';
SQL
