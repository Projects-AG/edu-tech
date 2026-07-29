app_name = "naac"
app_title = "NAAC"
app_publisher = "Aplia"
app_description = "NAAC accreditation modules for Indian higher education institutions"
app_email = "dev@aplia.ai"
app_license = "GNU GPL v3"

required_apps = ["erpnext", "education"]

add_to_apps_screen = [
	{
		"name": "naac",
		"logo": "/assets/naac/images/naac-logo.svg",
		"title": "NAAC",
		"route": "/app/naac",
	},
	{
		"name": "naac-portal",
		"logo": "/assets/naac/images/naac-logo.svg",
		"title": "NAAC Portal",
		"route": "/naac-portal",
	},
]

website_route_rules = [
	{"from_route": "/naac-portal", "to_route": "naac-portal"},
	{"from_route": "/naac-portal/<path:app_path>", "to_route": "naac-portal"},
]
