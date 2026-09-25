import api from "./api";

export const authService = {
  login: async (email, password, role) => {
    const response = await api.post("/auth/login", { email, password, role });
    return response.data;
  },

  getCurrentUserPermissions: async () => {
    try {
      const response = await api.get("/auth/me");
      return response.data;
    } catch (error) {
      console.warn("authService.getCurrentUserPermissions API call failed, using local context fallback", error);
      return null;
    }
  },
};

export default authService;
