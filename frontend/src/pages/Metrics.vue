<script setup>
import { createResource } from "frappe-ui";
import { ref, watch } from "vue";

const selectedCriterion = ref("");

const metrics = createResource({
	url: "naac.api.portal.get_metrics",
	makeParams() {
		return selectedCriterion.value ? { criterion: selectedCriterion.value } : {};
	},
	auto: true,
});

watch(selectedCriterion, () => metrics.reload());

const criteria = [
	"Criterion 1",
	"Criterion 2",
	"Criterion 3",
	"Criterion 4",
	"Criterion 5",
	"Criterion 6",
	"Criterion 7",
];
</script>

<template>
	<div class="space-y-4">
		<div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
			<div>
				<h1 class="text-2xl font-bold">NAAC Metrics</h1>
				<p class="text-gray-500 mt-1">KPI library mapped to NAAC criteria</p>
			</div>
			<select
				v-model="selectedCriterion"
				class="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
			>
				<option value="">All criteria</option>
				<option v-for="c in criteria" :key="c" :value="c">{{ c }}</option>
			</select>
		</div>

		<Card class="overflow-hidden">
			<div v-if="metrics.loading" class="p-6 text-gray-500">Loading...</div>
			<div v-else-if="!metrics.data?.length" class="p-8 text-center text-gray-500">
				No metrics defined yet.
			</div>
			<table v-else class="w-full text-sm">
				<thead class="bg-gray-50 border-b">
					<tr>
						<th class="text-left p-3 font-medium text-gray-600">Metric ID</th>
						<th class="text-left p-3 font-medium text-gray-600">Title</th>
						<th class="text-left p-3 font-medium text-gray-600">Criterion</th>
						<th class="text-left p-3 font-medium text-gray-600">DCF</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="row in metrics.data" :key="row.name" class="border-b last:border-0 hover:bg-gray-50">
						<td class="p-3 font-mono text-naac-700">{{ row.metric_id }}</td>
						<td class="p-3">{{ row.metric_title }}</td>
						<td class="p-3">{{ row.criterion }}</td>
						<td class="p-3 text-gray-500">{{ row.dcf_mapping || "—" }}</td>
					</tr>
				</tbody>
			</table>
		</Card>
	</div>
</template>
