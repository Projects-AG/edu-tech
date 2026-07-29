import { createResource } from "frappe-ui";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

export const useSession = defineStore("naac-session", () => {
	function sessionUser() {
		const cookies = new URLSearchParams(document.cookie.split("; ").join("&"));
		const user = cookies.get("user_id");
		return user && user !== "Guest" ? user : null;
	}

	const user = ref(sessionUser());
	const isLoggedIn = computed(() => !!user.value);

	const logout = createResource({
		url: "logout",
		onSuccess() {
			window.location.href = "/login?redirect-to=/naac-portal";
		},
	});

	return { user, isLoggedIn, logout };
});
