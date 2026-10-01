import api from "./axios";

export interface Department {
  id: string;
  institution_id: string;
  name: string;
  code: string;
}

export interface DepartmentCreate {
  institution_id: string;
  name: string;
  code: string;
}

export const departmentApi = {
  listByInstitution: (institutionId: string) =>
    api.get<Department[]>(`/departments/institution/${institutionId}`),
  create: (data: DepartmentCreate) =>
    api.post<Department>("/departments", data),
};
