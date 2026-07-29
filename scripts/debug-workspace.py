import json
import os

import frappe
from frappe.desk.desktop import Workspace

bench_path = "/workspace/development/frappe-bench"
os.chdir(bench_path)
frappe.init(site="development.localhost", sites_path=os.path.join(bench_path, "sites"))
frappe.connect()
frappe.set_user("Administrator")

doc = frappe.get_doc("Workspace", "NAAC")
page = json.dumps({"name": "NAAC", "title": "NAAC", "public": 1})
ws = Workspace(json.loads(page))
ws.build_workspace()
print("shortcuts:", len(ws.shortcuts["items"]), [s["label"] for s in ws.shortcuts["items"]])
print("cards:", len(ws.cards["items"]))
for c in ws.cards["items"]:
	print(" card:", c.get("label"), "links:", len(c.get("links", [])))
