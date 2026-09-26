import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT to every protected request
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem(
        "accessToken"
      );

    console.log(
      "API REQUEST:",
      config.method?.toUpperCase(),
      config.url
    );

    console.log(
      "TOKEN ATTACHED:",
      token
        ? `${token.substring(
            0,
            25
          )}...`
        : "NO TOKEN"
    );

    // ----------------------------------------------------------
    // IMPORTANT:
    // Let the browser/Axios create the multipart boundary
    // for FormData uploads.
    // ----------------------------------------------------------

    if (
      typeof FormData !==
        "undefined" &&
      config.data instanceof
        FormData
    ) {
      if (
        config.headers &&
        typeof config.headers.delete ===
          "function"
      ) {
        config.headers.delete(
          "Content-Type"
        );
      } else if (
        config.headers
      ) {
        delete config.headers[
          "Content-Type"
        ];
      }
    }

    // ----------------------------------------------------------
    // JWT
    // ----------------------------------------------------------

    if (token) {
      config.headers =
        config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(
      error
    );
  }
);

export default api;