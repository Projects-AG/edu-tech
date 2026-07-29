<script setup>
import { createResource } from "frappe-ui";

const evidence = createResource({
	url: "naac.api.portal.get_evidence",
	auto: true,
});

const statusColor = {
	Pending: "orange",
	Verified: "green",
	Rejected: "red",
};
</script>

<template>
	<div class="space-y-4">
		<div>
			<h1 class="text-2xl font-bold">Evidence Documents</h1>
			<p class="text-gray-500 mt-1">DVV-defensible evidence linked to metrics and departments</p>
		</div>

		<Card class="overflow-hidden">
			<div v-if="evidence.loading" class="p-6 text-gray-500">Loading...</div>
			<div v-else-if="!evidence.data?.length" class="p-8 text-center text-gray-500">
				No evidence documents uploaded yet.
			</div>
			<table v-else class="w-full text-sm">
				<thead class="bg-gray-50 border-b">
					<tr>
						<th class="text-left p-3 font-medium text-gray-600">Title</th>
						<th class="text-left p-3 font-medium text-gray-600">Metric</th>
						<th class="text-left p-3 font-medium text-gray-600">Department</th>
						<th class="text-left p-3 font-medium text-gray-600">Status</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="row in evidence.data" :key="row.name" class="border-b last:border-0 hover:bg-gray-50">
						<td class="p-3 font-medium">{{ row.title }}</td>
						<td class="p-3">{{ row.metric }}</td>
						<td class="p-3">{{ row.department || "—" }}</td>
						<td class="p-3">
							<Badge :theme="statusColor[row.verification_status] || 'gray'">
								{{ row.verification_status }}
							</Badge>
						</td>
					</tr>
				</tbody>
			</table>
		</Card>
	</div>
</template>
