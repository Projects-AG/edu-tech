import api from "./api";

export const auditService = {
  getAuditLogs: async (filters = {}) => {
    const response = await api.get("/audit-logs", {
      params: {
        action: filters.action || undefined,
        entity_type: filters.entityType || undefined,
        user_id: filters.userId || undefined,
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
        limit: filters.limit || 100,
      },
    });
    return Array.isArray(response.data) ? response.data : [];
  },
};

export default auditService;
