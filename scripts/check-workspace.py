import frappe

w = frappe.get_doc("Workspace", "NAAC")
print("shortcuts:", len(w.shortcuts), [s.label for s in w.shortcuts])
print("links:", len(w.links), [l.label for l in w.links])

for dt in [
	"NAAC Accreditation Cycle",
	"NAAC Metric",
	"NAAC Evidence Document",
]:
	print(dt, "exists:", frappe.db.exists("DocType", dt))
