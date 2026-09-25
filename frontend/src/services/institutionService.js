import api from "./api";
import { MOCK_INSTITUTIONS } from "./mockData";

export const institutionService = {
  getInstitutions: async () => {
    try {
      const response = await api.get("/institutions");
      return response.data;
    } catch (err) {
      console.warn("institutionService API failed, returning mock institutions", err);
      return MOCK_INSTITUTIONS;
    }
  },
  createInstitution: async (data) => {
    try {
      const response = await api.post("/institutions", data);
      return response.data;
    } catch {
      return { id: `inst_${Date.now()}`, ...data, status: "Verified" };
    }
  },
};

export default institutionService;
