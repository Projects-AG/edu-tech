"""Force-sync NAAC workspace from app JSON into the site database."""

from __future__ import annotations

import json

import frappe


def sync():
	path = frappe.get_app_path("naac", "naac_core", "workspace", "naac", "naac.json")
	with open(path, encoding="utf-8") as handle:
		data = json.load(handle)

	doc = frappe.get_doc("Workspace", "NAAC")
	doc.content = data["content"]
	doc.title = data.get("title", doc.title)
	doc.label = data.get("label", doc.label)
	doc.icon = data.get("icon", doc.icon)
	doc.module = data.get("module", doc.module)
	doc.public = data.get("public", doc.public)

	doc.shortcuts = []
	for row in data.get("shortcuts", []):
		doc.append("shortcuts", row)

	doc.links = []
	for row in data.get("links", []):
		doc.append("links", row)

	doc.save(ignore_permissions=True)
	frappe.db.commit()
	return {"content_length": len(doc.content), "shortcuts": len(doc.shortcuts), "links": len(doc.links)}


if __name__ == "__main__":
	sync()
