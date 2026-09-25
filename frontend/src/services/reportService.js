import api from "./api";
import { MOCK_REPORTS } from "./mockData";

export const reportService = {
  getReports: async () => {
    try {
      const response = await api.get("/reports/summary");
      return response.data;
    } catch {
      return MOCK_REPORTS;
    }
  },
  getAQARReport: async () => {
    try {
      const response = await api.get("/reports/aqar");
      return response.data;
    } catch {
      return { report_type: "AQAR", data: MOCK_REPORTS };
    }
  },
  getSSRReport: async () => {
    try {
      const response = await api.get("/reports/ssr");
      return response.data;
    } catch {
      return { report_type: "SSR", data: MOCK_REPORTS };
    }
  },
  generateReport: async (type) => {
    try {
      const endpoint = type === "aqar" ? "/reports/aqar" : "/reports/ssr";
      const response = await api.get(endpoint);
      return response.data;
    } catch {
      return { id: `rep_${Date.now()}`, name: `Generated SSR Dossier (${type})`, generatedDate: new Date().toISOString().split("T")[0] };
    }
  },
};

export default reportService;
