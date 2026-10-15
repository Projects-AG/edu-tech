import api from "./api";

export const reportService = {
  getReports: async () => {
    const response = await api.get("/reports/summary");
    return response.data;
  },

  downloadFinalReport: async () => {
    const response = await api.get("/reports/final/download", {
      responseType: "blob",
    });
    return response;
  },

  finalizeAccreditationCycle: async () => {
    const response = await api.post("/reports/finalize");
    return response.data;
  },
};

export default reportService;
