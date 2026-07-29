<script setup>
import { useSession } from "@/stores/session";
import { RouterLink, useRoute } from "vue-router";
import {
	LayoutDashboard,
	RefreshCw,
	BarChart3,
	FileCheck,
	LogOut,
	ExternalLink,
} from "lucide-vue-next";

defineProps({
	/** @type {import('vue').Slot} */
	default: null,
});

const session = useSession();
const route = useRoute();

const navItems = [
	{ label: "Dashboard", to: "/", icon: LayoutDashboard },
	{ label: "Accreditation Cycles", to: "/cycles", icon: RefreshCw },
	{ label: "Metrics", to: "/metrics", icon: BarChart3 },
	{ label: "Evidence", to: "/evidence", icon: FileCheck },
];
</script>

<template>
	<div class="min-h-screen flex flex-col">
		<header class="bg-naac-700 text-white shadow-md">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center font-bold text-sm">
						NAAC
					</div>
					<div>
						<p class="font-semibold leading-tight">NAAC Portal</p>
						<p class="text-xs text-blue-100">Accreditation Management</p>
					</div>
				</div>
				<div class="flex items-center gap-3 text-sm">
					<a
						href="/app/naac"
						class="hidden sm:inline-flex items-center gap-1 text-blue-100 hover:text-white"
					>
						<ExternalLink class="w-4 h-4" />
						Desk
					</a>
					<span class="text-blue-100">{{ session.user }}</span>
					<button
						class="inline-flex items-center gap-1 rounded-md bg-white/10 px-3 py-1.5 hover:bg-white/20"
						@click="session.logout.submit()"
					>
						<LogOut class="w-4 h-4" />
						Logout
					</button>
				</div>
			</div>
		</header>

		<div class="flex flex-1 max-w-7xl mx-auto w-full">
			<aside class="hidden md:block w-56 shrink-0 border-r bg-white p-4">
				<nav class="space-y-1">
					<RouterLink
						v-for="item in navItems"
						:key="item.to"
						:to="item.to"
						class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
						:class="
							route.path === item.to
								? 'bg-naac-50 text-naac-700'
								: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
						"
					>
						<component :is="item.icon" class="w-4 h-4" />
						{{ item.label }}
					</RouterLink>
				</nav>
			</aside>

			<main class="flex-1 p-4 sm:p-6 lg:p-8">
				<slot />
			</main>
		</div>
	</div>
</template>
