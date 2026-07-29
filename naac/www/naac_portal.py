import frappe


def get_context(context):
	context.title = "NAAC Portal"
	context.logo = "/assets/naac/images/naac-logo.svg"
	context.no_cache = 1
