import api from "./axios";

export interface Institution {
  id: string;
  name: string;
  type: string;
  naac_id: string | null;
  created_at: string;
}

export interface InstitutionCreate {
  name: string;
  type: string;
  naac_id?: string;
}

export const institutionApi = {
  list: () => api.get<Institution[]>("/institutions"),
  get: (id: string) => api.get<Institution>(`/institutions/${id}`),
  create: (data: InstitutionCreate) => api.post<Institution>("/institutions", data),
};
