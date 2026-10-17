import { api } from "../api.js";
import { formatFcfa, formatDateTime, escapeHtml, toast, errorMessage } from "../ui.js";

const view = () => document.getElementById("view");
const OPERATORS = [
  { id: "orange", label: "Orange" },
  { id: "mtn", label: "MTN" },
  { id: "moov", label: "Moov" },
  { id: "wave", label: "Wave" },
];

export async function renderPay({ params }) {
  const contributionId = params.contributionId;
  let me;
  try {
    me = await api.get("/me");
  } catch (err) {
    toast(errorMessage(err), { error: true });
  }
  let selected = me?.momoOperator || "orange";

  view().innerHTML = `
    <header class="top-bar"><button class="icon-btn" id="back">←</button><div class="title">Payer ma cotisation</div></header>
    <div class="screen">
      <div class="card">
        <h3 class="text-section-title">Choisissez votre opérateur</h3>
        <div class="operator-grid" id="operators">
          ${OPERATORS.map((o) => `<div class="operator-chip ${o.id === selected ? "selected" : ""}" data-op="${o.id}">${o.label}</div>`).join("")}
        </div>
      </div>
      <div class="field">
        <label>Numéro Mobile Money</label>
        <input id="momoNumber" value="${escapeHtml(me?.momoNumber || "")}" />
        <div class="hint">Astuce démo : un numéro terminant par 0000 simule un paiement échoué.</div>
      </div>
      <div class="error" id="err" hidden></div>
      <button class="btn btn-primary" id="confirm">Confirmer le paiement</button>
    </div>`;

  view().querySelector("#back").onclick = () => history.back();
  view().querySelectorAll("[data-op]").forEach((chip) => {
    chip.addEventListener("click", () => {
      selected = chip.getAttribute("data-op");
      view().querySelectorAll("[data-op]").forEach((c) => c.classList.toggle("selected", c === chip));
    });
  });

  view().querySelector("#confirm").onclick = async () => {
    const momoNumber = view().querySelector("#momoNumber").value.trim();
    const errorEl = view().querySelector("#err");
    if (momoNumber.length < 8) {
      errorEl.textContent = "Entrez un numéro Mobile Money valide.";
      errorEl.hidden = false;
      return;
    }
    const btn = view().querySelector("#confirm");
    btn.disabled = true;
    btn.textContent = "Envoi…";
    try {
      const payment = await api.post(`/contributions/${contributionId}/pay`, { operator: selected, momoNumber });
      renderTracking(payment.id, contributionId);
    } catch (err) {
      errorEl.textContent = errorMessage(err);
      errorEl.hidden = false;
      btn.disabled = false;
      btn.textContent = "Confirmer le paiement";
    }
  };
}

function renderTracking(paymentId, contributionId) {
  view().innerHTML = `
    <div class="screen center" style="min-height:100vh; justify-content:center;">
      <div class="spinner" style="width:36px;height:36px;"></div>
      <h1 class="text-screen-title" id="status-title">Paiement envoyé</h1>
      <p class="text-body muted" id="status-body">Validez la demande sur votre téléphone…</p>
      <div class="stack-sm full" id="steps">
        ${step("Envoyé à l'opérateur", true)}
        ${step("En attente de confirmation", false, true)}
        ${step("Confirmé", false)}
      </div>
    </div>`;

  let attempts = 0;
  const poll = async () => {
    attempts += 1;
    try {
      const payment = await api.get(`/payments/${paymentId}`);
      if (payment.status === "succeeded") {
        view().innerHTML = `
          <div class="screen center" style="min-height:100vh; justify-content:center;">
            <div style="font-size:56px;">✅</div>
            <h1 class="text-screen-title">Paiement confirmé</h1>
            <p class="text-body muted">Merci ! Votre cotisation a bien été reçue.</p>
            <button class="btn btn-primary" id="receipt">Voir mon reçu</button>
            <button class="btn btn-secondary" id="done">Retour à la tontine</button>
          </div>`;
        view().querySelector("#receipt").onclick = () => (location.hash = `#/receipt/${contributionId}`);
        view().querySelector("#done").onclick = () => history.go(-2);
        return;
      }
      if (payment.status === "failed") {
        view().innerHTML = `
          <div class="screen center" style="min-height:100vh; justify-content:center;">
            <div style="font-size:56px;">❌</div>
            <h1 class="text-screen-title">Paiement échoué</h1>
            <p class="text-body muted">Le paiement n'a pas pu être confirmé. Vous pouvez réessayer.</p>
            <button class="btn btn-primary" id="retry">Réessayer</button>
          </div>`;
        view().querySelector("#retry").onclick = () => (location.hash = `#/pay/${contributionId}`);
        return;
      }
      if (attempts > 30) {
        view().querySelector("#status-body").textContent = "Cela prend plus de temps que prévu, vérifiez vos notifications.";
        return;
      }
      setTimeout(poll, 1000);
    } catch (err) {
      toast(errorMessage(err), { error: true });
    }
  };
  poll();
}

function step(label, done, active = false) {
  return `<div class="row-between"><span class="${done ? "" : "muted"}">${done ? "✓" : active ? "…" : "○"} ${label}</span></div>`;
}

export async function renderReceipt({ params }) {
  let receipt;
  try {
    receipt = await api.get(`/contributions/${params.contributionId}/receipt`);
  } catch (err) {
    view().innerHTML = `<div class="screen"><p class="text-body">${errorMessage(err)}</p></div>`;
    return;
  }
  view().innerHTML = `
    <header class="top-bar"><button class="icon-btn" id="back">←</button><div class="title">Reçu de paiement</div></header>
    <div class="screen center">
      <div style="font-size:48px;">🧾</div>
      <h1 class="text-screen-title">${formatFcfa(receipt.total)}</h1>
      <div class="card full list-divided">
        <div class="row-between"><span class="text-caption">Tontine</span><span class="text-body-strong">${escapeHtml(receipt.tontineName)}</span></div>
        <div class="row-between"><span class="text-caption">Membre</span><span class="text-body-strong">${escapeHtml(receipt.memberName)}</span></div>
        <div class="row-between"><span class="text-caption">Tour</span><span class="text-body-strong">${receipt.roundNumber}</span></div>
        <div class="row-between"><span class="text-caption">Cotisation</span><span class="text-body-strong">${formatFcfa(receipt.amountDue)}</span></div>
        ${receipt.penaltyAmount > 0 ? `<div class="row-between"><span class="text-caption">Pénalité</span><span class="text-body-strong">${formatFcfa(receipt.penaltyAmount)}</span></div>` : ""}
        <div class="row-between"><span class="text-caption">Méthode</span><span class="text-body-strong">${receipt.method}</span></div>
        <div class="row-between"><span class="text-caption">Date</span><span class="text-body-strong">${formatDateTime(receipt.paidAt)}</span></div>
        <div class="row-between"><span class="text-caption">Référence</span><span class="text-body-strong" style="word-break:break-all;">${receipt.reference}</span></div>
      </div>
      <button class="btn btn-secondary full" id="share">Partager</button>
    </div>`;
  view().querySelector("#back").onclick = () => history.back();
  view().querySelector("#share").onclick = async () => {
    const text = `Reçu Tontine — ${receipt.tontineName} — Tour ${receipt.roundNumber} — ${formatFcfa(receipt.total)} — Réf. ${receipt.reference}`;
    if (navigator.share) await navigator.share({ text }).catch(() => {});
    else {
      await navigator.clipboard?.writeText(text).catch(() => {});
      toast("Reçu copié !");
    }
  };
}
