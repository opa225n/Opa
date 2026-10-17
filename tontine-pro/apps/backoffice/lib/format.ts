export function formatFcfa(amount: number | string | null | undefined): string {
  const n = Number(amount) || 0;
  return `${n.toLocaleString("fr-FR")} FCFA`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export const STATUS_LABEL: Record<string, string> = {
  active: "Actif",
  suspended: "Suspendu",
  draft: "Brouillon",
  completed: "Terminée",
  cancelled: "Annulée",
  open: "Ouvert",
  pending: "En attente",
  succeeded: "Réussi",
  failed: "Échoué",
  initiated: "Initié",
  sent: "Envoyé",
  confirmed: "Confirmé",
  approved: "Approuvée",
  rejected: "Rejetée",
  resolved: "Résolu",
  dismissed: "Rejeté",
};

export function statusBadgeClass(status: string): string {
  if (["active", "succeeded", "confirmed", "approved", "resolved"].includes(status)) return "badge-success";
  if (["pending", "sent", "initiated", "open", "draft"].includes(status)) return "badge-warning";
  if (["suspended", "failed", "rejected", "cancelled"].includes(status)) return "badge-error";
  return "badge-neutral";
}
