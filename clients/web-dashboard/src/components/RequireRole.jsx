import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getUser, getDefaultRouteForRole } from "@/api/auth";
import { ROUTE_ACCESS } from "@/config/accessControl";

// Bloque reellement une page pour un role qui n'y a pas droit, au lieu de compter sur le
// menu pour cacher le lien : un parent qui tape /payments dans la barre d'adresse ou suit un
// favori ne doit pas atterrir sur une page cassee (le backend renverrait 403 sur chaque appel
// API) - il est redirige vers sa propre page d'accueil avec un message clair.
export default function RequireRole() {
  const location = useLocation();
  const user = getUser();
  const allowedRoles = ROUTE_ACCESS[location.pathname];

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace state={{ accessDenied: true }} />;
  }

  return <Outlet />;
}
