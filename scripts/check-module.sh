#!/usr/bin/env bash
cd /workspace/development/frappe-bench
bench --site development.localhost mariadb <<'SQL'
SELECT name FROM `tabModule Def` WHERE name='NAAC Core';
SELECT parent, module FROM `tabBlock Module` WHERE parent='Administrator';
SQL
