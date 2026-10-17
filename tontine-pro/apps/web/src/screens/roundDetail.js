import { api } from "../api.js";
import { navigate } from "../router.js";
import { formatFcfa, formatDate, escapeHtml, badge, toast, errorMessage, showConfirmSheet } from "../ui.js";

const view = () => document.getElementById("view");

export async function renderRoundDetail({ params }) {
  const roundId = params.roundId;
  let data;
  try {
    data = await api.get(`/rounds/${roundId}/contributions`);
  } catch (err) {
    toast(errorMessage(err), { error: true });
    return navigate("/home");
  }
  const { round, contributions, viewerRole } = data;
  const self = contributions.find((c) => c.isSelf);
  const isPresident = viewerRole === "president";

  view().innerHTML = `
    <header class="top-bar">
      <button class="icon-btn" data-nav="#" aria-label="Retour" id="back">←</button>
      <div class="title">Tour ${round.roundNumber}</div>
    </header>
    <div class="screen">
      <div class="card">
        <div class="row-between"><span class="text-caption">Échéance</span><span class="text-body-strong">${formatDate(round.dueDate)}</span></div>
        <div class="row-between"><span class="text-caption">Pot</span><span class="text-body-strong">${formatFcfa(round.potAmount)}</span></div>
        <div class="row-between"><span class="text-caption">Statut</span>${badge(round.status)}</div>
      </div>

      ${
        self && self.status !== "paid" && self.status !== "waived"
          ? `<button class="btn btn-accent" id="pay">Payer ma cotisation — ${formatFcfa(self.amountDue + self.penaltyAmount)}</button>`
          : self && self.status === "paid"
          ? `<button class="btn btn-secondary" id="receipt">Voir mon reçu</button>`
          : ""
      }
      ${
        (round.status === "payout_pending" || round.status === "paid_out") && contributions.every((c) => c.status === "paid" || c.status === "waived")
          ? `<button class="btn btn-secondary" id="payout">Voir le versement du pot</button>`
          : ""
      }

      <div class="card">
        <h3 class="text-section-title">Cotisations</h3>
        <div class="list-divided">
          ${contributions
            .map(
              (c) => `<div class="member-row">
                <div class="avatar">${(c.memberName || "?")[0]}</div>
                <div class="name">${escapeHtml(c.memberName)}${c.isSelf ? " (vous)" : ""}</div>
                ${badge(c.status)}
              </div>`,
            )
            .join("")}
        </div>
      </div>
      ${isPresident ? `<button class="btn btn-secondary" data-nav="/round/${round.id}/decisions">Gérer les retards</button>` : ""}
    </div>`;

  view().querySelector("#back").onclick = () => history.back();
  view().querySelector("#pay")?.addEventListener("click", () => navigate(`/pay/${self.id}`));
  view().querySelector("#receipt")?.addEventListener("click", () => navigate(`/receipt/${self.id}`));
  view().querySelector("#payout")?.addEventListener("click", () => navigate(`/payout/${round.id}`));
}

export async function renderDecisions({ params }) {
  const roundId = params.roundId;
  let data;
  try {
    data = await api.get(`/rounds/${roundId}/contributions`);
  } catch (err) {
    toast(errorMessage(err), { error: true });
    return navigate("/home");
  }
  const { round, contributions } = data;
  const problematic = contributions.filter((c) => c.status === "late" || c.status === "due" || c.status === "pending");

  view().innerHTML = `
    <header class="top-bar">
      <button class="icon-btn" id="back" aria-label="Retour">←</button>
      <div class="title">Gérer les retards</div>
    </header>
    <div class="screen">
      ${
        problematic.length === 0
          ? `<div class="empty-state"><div class="icon">✅</div><p class="text-body">Tous les membres sont à jour.</p></div>`
          : problematic
              .map(
                (c) => `
        <div class="card">
          <div class="row-between"><span class="text-body-strong">${escapeHtml(c.memberName)}</span>${badge(c.status)}</div>
          <div class="text-caption">Dû : ${formatFcfa(c.amountDue)} ${c.penaltyAmount > 0 ? `+ pénalité ${formatFcfa(c.penaltyAmount)}` : ""}</div>
          <div class="stack-sm">
            <button class="btn btn-secondary btn-sm" data-action="grant_delay" data-id="${c.id}">Accorder un délai</button>
            <button class="btn btn-secondary btn-sm" data-action="waive_penalty" data-id="${c.id}">Annuler la pénalité</button>
            <button class="btn btn-secondary btn-sm" data-action="keep_penalty" data-id="${c.id}">Maintenir la pénalité</button>
          </div>
        </div>`,
              )
              .join("")
      }
      <button class="btn btn-danger" id="close-round">Clôturer le tour sans les membres en retard</button>
    </div>`;

  view().querySelector("#back").onclick = () => history.back();

  view().querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = btn.getAttribute("data-action");
      const contributionId = btn.getAttribute("data-id");
      const needsReason = action === "waive_penalty";
      let reason;
      if (needsReason) {
        const res = await showConfirmSheet({
          title: "Annuler la pénalité ?",
          body: "Cette décision sera visible de tout le groupe.",
          confirmLabel: "Confirmer",
          requireReason: true,
        });
        if (!res) return;
        reason = res.reason;
      }
      try {
        await api.post(`/rounds/${roundId}/decisions`, { action, contributionId, reason, extraHours: 24 });
        toast("Décision enregistrée.");
        renderDecisions({ params });
      } catch (err) {
        toast(errorMessage(err), { error: true });
      }
    });
  });

  view().querySelector("#close-round").onclick = async () => {
    const res = await showConfirmSheet({
      title: "Clôturer ce tour sans les membres en retard ?",
      body: "Le pot sera versé avec les cotisations déjà reçues. Cette action est irréversible.",
      confirmLabel: "Clôturer le tour",
      danger: true,
      requireReason: true,
    });
    if (!res) return;
    try {
      await api.post(`/rounds/${roundId}/decisions`, { action: "close_without_member", reason: res.reason });
      toast("Tour clôturé, le versement est en cours.");
      history.back();
    } catch (err) {
      toast(errorMessage(err), { error: true });
    }
  };
}

export async function renderPayout({ params }) {
  let data;
  try {
    data = await api.get(`/payouts/${params.roundId}`);
  } catch (err) {
    toast(errorMessage(err), { error: true });
    return navigate("/home");
  }
  const STATUS_TEXT = { pending: "En préparation", sent: "Envoyé, en attente de confirmation", confirmed: "Versé ✅", failed: "Échoué" };
  view().innerHTML = `
    <header class="top-bar">
      <button class="icon-btn" id="back" aria-label="Retour">←</button>
      <div class="title">Versement du pot</div>
    </header>
    <div class="screen center">
      <div class="pot-card">
        <div class="label">Tour ${data.roundNumber}</div>
        <div class="amount text-amount">${formatFcfa(data.amount)}</div>
      </div>
      <div class="card">
        <div class="row-between"><span class="text-caption">Bénéficiaire</span><span class="text-body-strong">${escapeHtml(data.beneficiaryName)}</span></div>
        <div class="row-between"><span class="text-caption">Statut</span><span class="text-body-strong">${STATUS_TEXT[data.status] || data.status}</span></div>
        ${data.isBeneficiary ? `<div class="row-between"><span class="text-caption">Vers le numéro</span><span class="text-body-strong">${escapeHtml(data.beneficiaryMomoNumber || "—")}</span></div>` : ""}
        ${data.reference ? `<div class="row-between"><span class="text-caption">Référence</span><span class="text-body-strong">${escapeHtml(data.reference)}</span></div>` : ""}
      </div>
      <p class="text-caption">Les montants sont toujours identiques pour tous les membres du groupe.</p>
    </div>`;
  view().querySelector("#back").onclick = () => history.back();
}
