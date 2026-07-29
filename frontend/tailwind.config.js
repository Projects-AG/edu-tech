module.exports = {
	presets: [require("frappe-ui/src/utils/tailwind.config")],
	content: [
		"./index.html",
		"./src/**/*.{vue,js,ts,jsx,tsx}",
		"./node_modules/frappe-ui/src/components/**/*.{vue,js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			colors: {
				naac: {
					50: "#eff6ff",
					100: "#dbeafe",
					600: "#1e40af",
					700: "#1e3a8a",
					800: "#1e3a8a",
				},
			},
		},
	},
	plugins: [],
};
