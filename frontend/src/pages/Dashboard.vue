<script setup>
import { createResource } from "frappe-ui";
import CriterionCard from "@/components/CriterionCard.vue";

const dashboard = createResource({
	url: "naac.api.portal.get_dashboard",
	auto: true,
});
</script>

<template>
	<div class="space-y-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">NAAC Dashboard</h1>
			<p class="text-gray-500 mt-1">Accreditation readiness across all seven criteria</p>
		</div>

		<div v-if="dashboard.loading" class="text-gray-500">Loading dashboard...</div>

		<template v-else-if="dashboard.data">
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<Card class="p-5">
					<p class="text-sm text-gray-500">Accreditation Cycles</p>
					<p class="text-3xl font-bold text-naac-700 mt-1">{{ dashboard.data.cycles }}</p>
				</Card>
				<Card class="p-5">
					<p class="text-sm text-gray-500">Metrics Tracked</p>
					<p class="text-3xl font-bold text-naac-700 mt-1">{{ dashboard.data.metrics }}</p>
				</Card>
				<Card class="p-5">
					<p class="text-sm text-gray-500">Evidence Documents</p>
					<p class="text-3xl font-bold text-naac-700 mt-1">{{ dashboard.data.evidence }}</p>
				</Card>
			</div>

			<div>
				<h2 class="text-lg font-semibold mb-3">Criteria Overview</h2>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					<CriterionCard
						v-for="item in dashboard.data.criteria"
						:key="item.criterion"
						:criterion="item.criterion"
						:metrics="item.metrics"
						:evidence="item.evidence"
					/>
				</div>
			</div>
		</template>
	</div>
</template>
