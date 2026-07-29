<script setup>
import { createResource } from "frappe-ui";

const cycles = createResource({
	url: "naac.api.portal.get_cycles",
	auto: true,
});

const statusColor = {
	Draft: "gray",
	"In Progress": "blue",
	Submitted: "orange",
	Completed: "green",
	Review: "orange",
	Approved: "green",
	Finalized: "green",
};
</script>

<template>
	<div class="space-y-4">
		<div>
			<h1 class="text-2xl font-bold">Accreditation Cycles</h1>
			<p class="text-gray-500 mt-1">Active and past NAAC assessment cycles</p>
		</div>

		<Card class="overflow-hidden">
			<div v-if="cycles.loading" class="p-6 text-gray-500">Loading...</div>
			<div v-else-if="!cycles.data?.length" class="p-8 text-center text-gray-500">
				No accreditation cycles yet.
				<a href="/app/naac-accreditation-cycle" class="text-naac-600 underline ml-1">Create in Desk</a>
			</div>
			<table v-else class="w-full text-sm">
				<thead class="bg-gray-50 border-b">
					<tr>
						<th class="text-left p-3 font-medium text-gray-600">Cycle</th>
						<th class="text-left p-3 font-medium text-gray-600">Year</th>
						<th class="text-left p-3 font-medium text-gray-600">Framework</th>
						<th class="text-left p-3 font-medium text-gray-600">Status</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="row in cycles.data" :key="row.name" class="border-b last:border-0 hover:bg-gray-50">
						<td class="p-3 font-medium">{{ row.cycle_name }}</td>
						<td class="p-3">{{ row.assessment_year }}</td>
						<td class="p-3">{{ row.framework }}</td>
						<td class="p-3">
							<Badge :theme="statusColor[row.status] || 'gray'">{{ row.status }}</Badge>
						</td>
					</tr>
				</tbody>
			</table>
		</Card>
	</div>
</template>
