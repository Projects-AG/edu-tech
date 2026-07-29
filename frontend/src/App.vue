<script setup>
import NaacLayout from "@/components/NaacLayout.vue";
import { RouterView } from "vue-router";
import { Toasts } from "frappe-ui";
</script>

<template>
	<NaacLayout>
		<RouterView />
	</NaacLayout>
	<Toasts />
</template>
