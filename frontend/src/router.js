import { createRouter, createWebHistory } from "vue-router";
import { useSession } from "@/stores/session";

const routes = [
	{ path: "/", name: "Dashboard", component: () => import("@/pages/Dashboard.vue") },
	{ path: "/cycles", name: "Cycles", component: () => import("@/pages/Cycles.vue") },
	{ path: "/metrics", name: "Metrics", component: () => import("@/pages/Metrics.vue") },
	{ path: "/evidence", name: "Evidence", component: () => import("@/pages/Evidence.vue") },
	{ path: "/:pathMatch(.*)*", redirect: "/" },
];

const router = createRouter({
	history: createWebHistory("/naac-portal"),
	routes,
});

router.beforeEach(() => {
	const session = useSession();
	if (!session.isLoggedIn) {
		window.location.href = "/login?redirect-to=/naac-portal";
		return false;
	}
});

export default router;
