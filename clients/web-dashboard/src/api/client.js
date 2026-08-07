import axios from "axios";
import { clearToken, getToken } from "./auth";

// Toutes les requetes transitent par sm-gateway-service (API Gateway), jamais directement
// vers un micro-service (cf. document de conception, section 5.1 - S3).
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8888",
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Un 401 signifie un token absent/expire/revoque : on efface la session locale et on
// laisse le composant appelant (ou la garde de route) rediriger vers /login.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
