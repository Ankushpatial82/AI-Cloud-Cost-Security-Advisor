import axios from "axios";

let envApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";
envApiUrl = envApiUrl.trim().replace(/\/+$/, "");
if (!envApiUrl.endsWith("/api")) {
  envApiUrl += "/api";
}
const API_URL = envApiUrl;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach access token and organization ID headers
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      const orgId = localStorage.getItem("activeOrganizationId");
      if (orgId) {
        config.headers["x-organization-id"] = orgId;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle sliding sessions / token refreshing
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Prevent infinite loops on auth endpoints
    if (originalRequest.url?.includes("/auth/refresh") || originalRequest.url?.includes("/auth/login")) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        
        if (res.data?.success && res.data?.data?.accessToken) {
          const newToken = res.data.data.accessToken;
          localStorage.setItem("accessToken", newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Clear local storage and redirect if token refresh fails
        if (typeof window !== "undefined") {
          localStorage.clear();
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
