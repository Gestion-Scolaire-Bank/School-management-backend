import axios from "axios";

// Toutes les requetes transitent par sm-gateway-service (API Gateway), jamais directement
// vers un micro-service (cf. document de conception, section 5.1 - S3).
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8888",
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("sm_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
