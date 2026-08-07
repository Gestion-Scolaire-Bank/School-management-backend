const TOKEN_KEY = "sm_access_token";

function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized));
  } catch {
    return null;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// La validation d'integrite du token reste du ressort du serveur (signature, blacklist) ;
// ici on ne fait qu'un controle cote client pour l'UX (afficher /login sans attendre un 401).
export function isAuthenticated() {
  const token = getToken();
  if (!token) return false;
  const claims = decodeToken(token);
  if (!claims?.exp) return false;
  return claims.exp * 1000 > Date.now();
}

export function getUser() {
  const token = getToken();
  if (!token) return null;
  const claims = decodeToken(token);
  if (!claims) return null;
  return { id: claims.sub, email: claims.email, role: claims.role };
}

const DEFAULT_ROUTE_BY_ROLE = {
  ADMINISTRATEUR: "/",
  DIRECTEUR: "/",
  ENSEIGNANT: "/grades",
  PARENT: "/child",
};

// Page d'accueil apres connexion : "/" (tableau de bord analytics) n'est accessible qu'a
// ADMINISTRATEUR/DIRECTEUR cote Gateway - un Enseignant y arriverait sur un ecran en erreur.
export function getDefaultRouteForRole(role) {
  return DEFAULT_ROUTE_BY_ROLE[role] || "/";
}
