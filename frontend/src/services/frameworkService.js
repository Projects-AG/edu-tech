import api from "./api";

const frameworkService = {
  getCategories: async () => {
    const response = await api.get("/public/institution-categories");
    return Array.isArray(response.data) ? response.data : [];
  },

  recommend: async (payload) => {
    const response = await api.post(
      "/public/framework-recommendation",
      payload
    );
    return response.data;
  },

  listFrameworks: async () => {
    const response = await api.get("/naac-frameworks");
    return Array.isArray(response.data) ? response.data : [];
  },
};

export default frameworkService;
