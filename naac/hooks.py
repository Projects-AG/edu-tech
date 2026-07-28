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
	}
]
