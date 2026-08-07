// Libelles et couleurs de badge par statut, un objet par domaine backend. Centralise ici pour
// eviter que chaque page reimplemente sa propre traduction ad hoc (ce qui menait a des enums
// bruts affiches tels quels sur certaines pages, ou a un statut PENDING affiche en rouge comme
// un echec sur NotificationsPage.jsx).

export const PAYMENT_STATUS = {
  COMPLETED: { label: "Terminé", variant: "success" },
  PENDING: { label: "En attente", variant: "warning" },
  FAILED: { label: "Échoué", variant: "destructive" },
};

export const PRESENCE_STATUS = {
  PRESENT: { label: "Présent", variant: "success" },
};

export const USER_STATUS = {
  ACTIVE: { label: "Actif", variant: "success" },
  SUSPENDED: { label: "Suspendu", variant: "destructive" },
  INACTIVE: { label: "Inactif", variant: "secondary" },
};

export const NOTIFICATION_STATUS = {
  PENDING: { label: "En attente", variant: "warning" },
  SENT: { label: "Envoyée", variant: "success" },
  FAILED: { label: "Échouée", variant: "destructive" },
};

export const REGISTRATION_STATUS = {
  PENDING: { label: "En attente", variant: "warning" },
  VALIDATED: { label: "Validé", variant: "success" },
};

export const ESTABLISHMENT_STATUS = {
  ACTIVE: { label: "Actif", variant: "success" },
  INACTIVE: { label: "Inactif", variant: "secondary" },
};

export function statusOf(map, value) {
  return map[value] ?? { label: value, variant: "secondary" };
}
