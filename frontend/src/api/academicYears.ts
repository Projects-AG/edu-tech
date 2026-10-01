import api from "./axios";

export interface AcademicYear {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface AcademicYearCreate {
  institution_id: string;
  label: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export const academicYearApi = {
  listByInstitution: (institutionId: string) =>
    api.get<AcademicYear[]>(`/academic-years/institution/${institutionId}`),
  create: (data: AcademicYearCreate) =>
    api.post<AcademicYear>("/academic-years", data),
};
