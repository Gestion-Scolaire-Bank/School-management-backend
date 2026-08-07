import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAuthenticated } from "@/api/auth";

// Garde de route (cf. README - "A completer") : redirige vers /login si le token JWT est
// absent ou expire. La validation forte (signature, blacklist) reste faite par le Gateway.
export default function RequireAuth() {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
