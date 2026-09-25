import api from "./api";
import { MOCK_USERS } from "./mockData";

export const userService = {
  getUsers: async () => {
    try {
      const response = await api.get("/users");
      return response.data;
    } catch {
      return MOCK_USERS;
    }
  },
  createUser: async (userData) => {
    try {
      const response = await api.post("/users", userData);
      return response.data;
    } catch {
      return { id: `u_${Date.now()}`, ...userData, status: "Active" };
    }
  },
};

export default userService;
