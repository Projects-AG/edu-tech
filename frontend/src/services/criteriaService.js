import api from "./api";

const criteriaService = {
  // ==========================================
  // GET ALL CRITERIA
  // ==========================================
  getCriteria: async () => {
    const response = await api.get("/criteria");
    return response.data;
  },

  // ==========================================
  // GET SINGLE CRITERION
  // ==========================================
  getCriterion: async (criterionId) => {
    const response = await api.get(`/criteria/${criterionId}`);
    return response.data;
  },

  // ==========================================
  // GET SECTIONS
  // Optional criterionId filter
  // ==========================================
  getSections: async (criterionId) => {
    const response = await api.get("/sections", {
      params: criterionId
        ? {
            criterion_id: criterionId,
          }
        : {},
    });

    return response.data;
  },

  // ==========================================
  // GET ALL METRICS
  // ==========================================
  getMetrics: async () => {
    const response = await api.get("/metrics");
    return response.data;
  },

  // ==========================================
  // GET EVIDENCE REQUIREMENTS
  // ==========================================
  getEvidenceRequirements: async () => {
    const response = await api.get("/evidence-requirements");
    return response.data;
  },
};

export default criteriaService;