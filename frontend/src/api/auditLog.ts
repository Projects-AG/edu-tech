import api from "./axios";

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
}

export const auditLogApi = {
  listByInstitution: (institutionId: string) =>
    api.get<AuditLog[]>(`/audit-logs/institution/${institutionId}`),
};
