#!/usr/bin/env bash
cd /workspace/development/frappe-bench
bench --site development.localhost execute frappe.client.get_count --kwargs "{'doctype': 'Workspace Shortcut', 'filters': {'parent': 'NAAC'}}"
