import path from "path";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import frappeui from "frappe-ui/vite";

export default defineConfig({
	plugins: [frappeui(), vue()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
	server: {
		proxy: {
			"^/(app|api|assets|files|private)": {
				target: "http://development.localhost:8000",
				changeOrigin: true,
			},
		},
	},
	build: {
		outDir: "../naac/public/frontend",
		emptyOutDir: true,
		target: "es2015",
		rollupOptions: {
			output: {
				manualChunks: {
					"frappe-ui": ["frappe-ui"],
				},
			},
		},
	},
});
