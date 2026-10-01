import api from "./axios";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  institution_id: string;
  name: string;
  email: string;
  password: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export const authApi = {
  login: (data: LoginPayload) => api.post<TokenPair>("/auth/login", data),
  register: (data: RegisterPayload) =>
    api.post<TokenPair>("/auth/register", data),
  refresh: (refresh_token: string) =>
    api.post<{ access_token: string }>("/auth/refresh", { refresh_token }),
};
