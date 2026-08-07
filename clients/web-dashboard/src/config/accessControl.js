// Source unique de verite pour les permissions par page - reprend exactement les regles
// RBAC du Gateway (sm-gateway-service/application.yml) pour l'endpoint principal de chaque
// page. Utilise a la fois par Layout.jsx (visibilite des liens du menu) et par RequireRole.jsx
// (blocage reel de la route) : avant ce fichier, seul le menu masquait les liens, mais rien
// n'empechait un utilisateur d'atteindre une page non autorisee via une URL directe ou un
// favori - il tombait alors sur une page cassee/vide au lieu d'etre redirige proprement.
export const ROUTE_ACCESS = {
  "/": ["ADMINISTRATEUR", "DIRECTEUR"],
  "/registrations": ["ADMINISTRATEUR"],
  "/users": ["ADMINISTRATEUR"],
  "/establishments": ["ADMINISTRATEUR"],
  "/classes": ["ADMINISTRATEUR", "DIRECTEUR", "ENSEIGNANT"],
  "/payments": ["ADMINISTRATEUR", "DIRECTEUR"],
  "/grades": ["ENSEIGNANT", "ADMINISTRATEUR"],
  "/presence": ["ENSEIGNANT", "ADMINISTRATEUR"],
  "/resources": ["ENSEIGNANT"],
  "/announcements": ["ENSEIGNANT", "ADMINISTRATEUR"],
  "/notifications": ["ADMINISTRATEUR"],
  "/status": ["ADMINISTRATEUR", "DIRECTEUR", "ENSEIGNANT"],
  "/child": ["PARENT"],
  "/fees": ["PARENT"],
};
