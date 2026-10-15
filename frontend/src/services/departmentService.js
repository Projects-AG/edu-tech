import api from "./api";

const apiError = (error, fallback) => {
  const detail = error?.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item.msg || item)
      .join(", ");
  }

  return detail || error?.message || fallback;
};

const parseList = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.departments)) {
    return data.departments;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

export const departmentService = {
  getDepartments: async (institutionId) => {
    try {
      const response = await api.get("/departments", {
        params: institutionId
          ? { institution_id: institutionId }
          : undefined,
      });
      return parseList(response.data);
    } catch (error) {
      throw new Error(apiError(error, "Unable to load departments."));
    }
  },

  createDepartment: async (data) => {
    try {
      const response = await api.post("/departments", data);
      return response.data;
    } catch (error) {
      throw new Error(apiError(error, "Unable to create department."));
    }
  },

  updateDepartment: async (id, data) => {
    try {
      const response = await api.put(`/departments/${id}`, data);
      return response.data;
    } catch (error) {
      throw new Error(apiError(error, "Unable to update department."));
    }
  },

  deleteDepartment: async (id) => {
    try {
      const response = await api.delete(`/departments/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(apiError(error, "Unable to delete department."));
    }
  },
};

export default departmentService;
