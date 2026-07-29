<script setup>
defineProps({
	criterion: { type: String, required: true },
	metrics: { type: Number, default: 0 },
	evidence: { type: Number, default: 0 },
});

const labels = {
	"Criterion 1": "Curricular Aspects",
	"Criterion 2": "Teaching-Learning",
	"Criterion 3": "Research & Innovation",
	"Criterion 4": "Infrastructure",
	"Criterion 5": "Student Support",
	"Criterion 6": "Governance",
	"Criterion 7": "Institutional Values",
};
</script>

<template>
	<Card class="p-4 hover:shadow-md transition-shadow">
		<p class="text-xs font-medium text-naac-600 uppercase tracking-wide">{{ criterion }}</p>
		<p class="font-semibold text-gray-900 mt-1">{{ labels[criterion] || criterion }}</p>
		<div class="mt-4 flex gap-4 text-sm text-gray-600">
			<span><strong class="text-gray-900">{{ metrics }}</strong> metrics</span>
			<span><strong class="text-gray-900">{{ evidence }}</strong> evidence</span>
		</div>
	</Card>
</template>
