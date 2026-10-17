// Petits utilitaires DOM/format partagés par tous les écrans (pas de framework, cohérent avec le dépôt).
export function formatFcfa(amount) {
  const n = Number(amount) || 0;
  return `${n.toLocaleString("fr-FR")} FCFA`;
}

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

let toastTimer = null;
export function toast(message, { error = false } = {}) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.style.background = error ? "var(--color-error)" : "var(--color-text)";
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
}

export function errorMessage(err) {
  return err?.message || "Une erreur est survenue.";
}

export const STATUS_LABEL = {
  due: "À payer",
  pending: "En attente",
  paid: "Payé",
  late: "En retard",
  waived: "Dispensé",
  planned: "À venir",
  open: "Ouvert",
  complete: "Complet",
  closed: "Clôturé",
  payout_pending: "Versement en attente",
  paid_out: "Versé",
  draft: "Brouillon",
  active: "Active",
  completed: "Terminée",
  cancelled: "Annulée",
};

export function statusBadgeClass(status) {
  if (["paid", "paid_out", "active", "complete"].includes(status)) return "badge-paid";
  if (["pending", "open", "payout_pending", "draft"].includes(status)) return "badge-pending";
  if (status === "late") return "badge-late";
  if (status === "waived" || status === "cancelled") return "badge-waived";
  return "badge-neutral";
}

export function badge(status) {
  const icon = { paid: "✓", paid_out: "✓", late: "!", pending: "…", open: "…", waived: "–" }[status] || "•";
  return `<span class="badge ${statusBadgeClass(status)}">${icon} ${escapeHtml(STATUS_LABEL[status] || status)}</span>`;
}

export function showConfirmSheet({ title, body, confirmLabel = "Confirmer", danger = false, requireReason = false }) {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "confirm-sheet-backdrop";
    backdrop.innerHTML = `
      <div class="confirm-sheet">
        <h2 class="text-section-title">${escapeHtml(title)}</h2>
        <p class="text-body muted">${escapeHtml(body)}</p>
        ${requireReason ? `<div class="field"><label>Motif (obligatoire)</label><textarea id="sheet-reason" placeholder="Expliquez votre décision…"></textarea></div>` : ""}
        <button class="btn ${danger ? "btn-danger" : "btn-primary"}" id="sheet-confirm">${escapeHtml(confirmLabel)}</button>
        <button class="btn btn-ghost full" id="sheet-cancel">Annuler</button>
      </div>`;
    document.body.appendChild(backdrop);
    backdrop.querySelector("#sheet-cancel").onclick = () => {
      backdrop.remove();
      resolve(null);
    };
    backdrop.querySelector("#sheet-confirm").onclick = () => {
      const reason = requireReason ? backdrop.querySelector("#sheet-reason").value.trim() : undefined;
      if (requireReason && !reason) {
        toast("Un motif est requis.", { error: true });
        return;
      }
      backdrop.remove();
      resolve({ reason });
    };
  });
}

export function bottomNav(active, unreadCount = 0) {
  const items = [
    { href: "#/home", icon: "🏠", label: "Accueil", key: "home" },
    { href: "#/home", icon: "🤝", label: "Tontines", key: "tontines" },
    { href: "#/notifications", icon: "🔔", label: "Notifications", key: "notifications" },
    { href: "#/profile", icon: "👤", label: "Profil", key: "profile" },
  ];
  return `<nav class="bottom-nav">${items
    .map(
      (i) => `<a href="${i.href}" class="${active === i.key ? "active" : ""}">
        ${i.key === "notifications" && unreadCount > 0 ? '<span class="nav-dot"></span>' : ""}
        <span class="nav-icon">${i.icon}</span><span>${i.label}</span>
      </a>`,
    )
    .join("")}</nav>`;
}

export function topBar(title, { back = null, action = null } = {}) {
  return `<header class="top-bar">
    ${back ? `<button class="icon-btn" data-nav="${back}" aria-label="Retour">←</button>` : ""}
    <div class="title">${escapeHtml(title)}</div>
    ${action ? action : ""}
  </header>`;
}
