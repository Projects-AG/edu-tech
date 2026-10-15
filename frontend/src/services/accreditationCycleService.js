import api from "./api";

export {
  OFFICIAL_WORKING_CATALOGUE_MESSAGE,
  isOfficialCycleCatalog,
  pickActiveCycle,
} from "./cycleCatalog.js";

const accreditationCycleService = {
  getCycles: async () => {
    const response = await api.get("/accreditation-cycles");
    return Array.isArray(response.data) ? response.data : [];
  },

  getCycle: async (cycleId) => {
    const response = await api.get(`/accreditation-cycles/${cycleId}`);
    return response.data;
  },

  createCycle: async (payload) => {
    const response = await api.post("/accreditation-cycles", payload);
    return response.data;
  },

  updateCycle: async (cycleId, payload) => {
    const response = await api.put(`/accreditation-cycles/${cycleId}`, payload);
    return response.data;
  },

  getApplicableMetrics: async (cycleId) => {
    const response = await api.get(
      `/accreditation-cycles/${cycleId}/applicable-metrics`
    );
    return response.data;
  },

  getCycleMetrics: async (cycleId) => {
    const response = await api.get(
      `/accreditation-cycles/${cycleId}/metrics`
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  replaceApplicableMetrics: async (cycleId, metrics) => {
    const response = await api.put(
      `/accreditation-cycles/${cycleId}/applicable-metrics`,
      { metrics }
    );
    return response.data;
  },
};

export default accreditationCycleService;
