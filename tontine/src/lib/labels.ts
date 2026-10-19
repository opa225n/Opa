export const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "Quotidienne",
  WEEKLY: "Hebdomadaire",
  MONTHLY: "Mensuelle",
};

export const TONTINE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  ACTIVE: "Active",
  PAUSED: "En pause",
  COMPLETED: "Terminée",
  ARCHIVED: "Archivée",
};

export const MEMBER_ROLE_LABELS: Record<string, string> = {
  RESPONSABLE: "Responsable",
  TRESORIER: "Trésorier",
  SECRETAIRE: "Secrétaire",
  MEMBRE: "Membre",
};

export const CONTRIBUTION_STATUS_LABELS: Record<string, string> = {
  DUE: "À payer",
  PARTIAL: "Partiellement payé",
  DECLARED: "Déclaré",
  PENDING_VERIFICATION: "En attente de vérification",
  CONFIRMED: "Confirmé",
  REJECTED: "Rejeté",
  REFUNDED: "Remboursé",
  CANCELLED: "Annulé",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Espèces",
  BANK_TRANSFER: "Virement bancaire",
  MOBILE_MONEY: "Mobile Money",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  DECLARED: "Déclaré",
  PENDING_VERIFICATION: "En attente de vérification",
  CONFIRMED: "Confirmé",
  REJECTED: "Rejeté",
  REFUNDED: "Remboursé",
  CANCELLED: "Annulé",
};

export const PAYOUT_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  CONFIRMED: "Versé",
  CANCELLED: "Annulé",
};

export const CYCLE_STATUS_LABELS: Record<string, string> = {
  PENDING: "À venir",
  ACTIVE: "En cours",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
};
