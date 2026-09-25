import api from "./api";
import { MOCK_DEPARTMENTS } from "./mockData";

export const departmentService = {
  getDepartments: async () => {
    try {
      const response = await api.get("/departments");
      return response.data;
    } catch {
      return MOCK_DEPARTMENTS;
    }
  },
};

export default departmentService;
