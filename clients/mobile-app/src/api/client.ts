import axios from "axios";

// Toutes les requetes transitent par sm-gateway-service (API Gateway), jamais directement
// vers un micro-service (cf. document de conception, section 5.1 - S3).
const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:8888",
});

export function setAuthToken(token: string | null) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
}

export default apiClient;
