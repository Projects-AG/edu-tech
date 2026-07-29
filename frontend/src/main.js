import router from "./router";
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import {
	Button,
	Badge,
	Card,
	setConfig,
	frappeRequest,
	resourcesPlugin,
} from "frappe-ui";
import "./index.css";

setConfig("resourceFetcher", frappeRequest);

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(resourcesPlugin);
app.component("Button", Button);
app.component("Badge", Badge);
app.component("Card", Card);

router.isReady().then(() => app.mount("#app"));
