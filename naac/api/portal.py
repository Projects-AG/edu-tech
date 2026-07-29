# Copyright (c) 2026, Aplia and contributors
# For license information, please see license.txt

import frappe

CRITERIA = [f"Criterion {i}" for i in range(1, 8)]


@frappe.whitelist()
def get_dashboard():
	"""Summary stats for the NAAC portal dashboard."""
	criteria = []
	for criterion in CRITERIA:
		criteria.append(
			{
				"criterion": criterion,
				"metrics": frappe.db.count("NAAC Metric", {"criterion": criterion}),
				"evidence": frappe.db.count(
					"NAAC Evidence Document",
					filters=[
						["NAAC Evidence Document", "metric", "in", _metrics_for_criterion(criterion)],
					],
				)
				if _metrics_for_criterion(criterion)
				else 0,
			}
		)

	return {
		"cycles": frappe.db.count("NAAC Accreditation Cycle"),
		"metrics": frappe.db.count("NAAC Metric"),
		"evidence": frappe.db.count("NAAC Evidence Document"),
		"criteria": criteria,
	}


@frappe.whitelist()
def get_cycles():
	return frappe.get_all(
		"NAAC Accreditation Cycle",
		fields=["name", "cycle_name", "assessment_year", "framework", "status"],
		order_by="modified desc",
	)


@frappe.whitelist()
def get_metrics(criterion=None):
	filters = {}
	if criterion:
		filters["criterion"] = criterion
	return frappe.get_all(
		"NAAC Metric",
		fields=["name", "metric_id", "metric_title", "criterion", "dcf_mapping"],
		filters=filters,
		order_by="metric_id asc",
	)


@frappe.whitelist()
def get_evidence(limit=50):
	return frappe.get_all(
		"NAAC Evidence Document",
		fields=["name", "title", "metric", "department", "verification_status", "modified"],
		limit=int(limit),
		order_by="modified desc",
	)


def _metrics_for_criterion(criterion):
	return frappe.get_all("NAAC Metric", filters={"criterion": criterion}, pluck="name")
