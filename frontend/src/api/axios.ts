import axios from "axios";

const api = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const tokens = JSON.parse(localStorage.getItem("tokens") || "null");
  if (tokens?.access_token) {
    config.headers.Authorization = `Bearer ${tokens.access_token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const tokens = JSON.parse(localStorage.getItem("tokens") || "null");
      if (tokens?.refresh_token) {
        try {
          const { data } = await axios.post("/api/v1/auth/refresh", {
            refresh_token: tokens.refresh_token,
          });
          const newTokens = { ...tokens, access_token: data.access_token };
          localStorage.setItem("tokens", JSON.stringify(newTokens));
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem("tokens");
          window.location.href = "/login";
        }
      } else {
        localStorage.removeItem("tokens");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
