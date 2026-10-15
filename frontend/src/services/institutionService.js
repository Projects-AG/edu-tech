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

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.institutions)) {
    return data.institutions;
  }

  return [];
};

export const institutionService = {
  getInstitutions: async () => {
    try {
      const response = await api.get("/institutions");
      return parseList(response.data);
    } catch (error) {
      throw new Error(apiError(error, "Unable to load institutions."));
    }
  },

  getMyInstitution: async () => {
    try {
      const response = await api.get("/institutions/me");
      return response.data;
    } catch (error) {
      throw new Error(apiError(error, "Unable to load institution."));
    }
  },

  getInstitution: async (id) => {
    try {
      const response = await api.get(`/institutions/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(apiError(error, "Unable to load institution."));
    }
  },

  createInstitution: async (data) => {
    try {
      const response = await api.post("/institutions", data);
      return response.data;
    } catch (error) {
      throw new Error(apiError(error, "Unable to create institution."));
    }
  },

  updateInstitution: async (id, data) => {
    try {
      const response = await api.put(`/institutions/${id}`, data);
      return response.data;
    } catch (error) {
      throw new Error(apiError(error, "Unable to update institution."));
    }
  },

  deleteInstitution: async (id) => {
    try {
      const response = await api.delete(`/institutions/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(apiError(error, "Unable to delete institution."));
    }
  },
};

export default institutionService;
