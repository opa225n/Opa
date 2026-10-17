import { api } from "../api.js";
import { isAuthenticated } from "../store.js";
import { navigate } from "../router.js";
import { formatFcfa, escapeHtml, toast, errorMessage } from "../ui.js";

const view = () => document.getElementById("view");

export async function renderJoin({ params }) {
  const token = params.token;
  let preview;
  try {
    preview = await api.get(`/invitations/${token}`, { auth: false });
  } catch (err) {
    view().innerHTML = `
      <div class="screen center" style="min-height:100vh; justify-content:center;">
        <h1 class="text-screen-title">Invitation invalide</h1>
        <p class="text-body muted">${errorMessage(err)}</p>
        <button class="btn btn-secondary" data-nav="/home">Retour à l'accueil</button>
      </div>`;
    return;
  }

  view().innerHTML = `
    <div class="screen center" style="min-height:100vh; justify-content:center;">
      <div style="font-size:48px;" class="center">🤝</div>
      <h1 class="text-screen-title center">Invitation à rejoindre</h1>
      <div class="card">
        <h3 class="text-section-title">${escapeHtml(preview.tontineName)}</h3>
        ${preview.description ? `<p class="text-caption">${escapeHtml(preview.description)}</p>` : ""}
        <div class="row-between"><span class="text-caption">Cotisation</span><span class="text-body-strong">${formatFcfa(preview.contributionAmount)}</span></div>
        <div class="row-between"><span class="text-caption">Fréquence</span><span class="text-body-strong">${{ weekly: "Hebdomadaire", biweekly: "Toutes les 2 semaines", monthly: "Mensuelle" }[preview.frequency]}</span></div>
        <div class="row-between"><span class="text-caption">Membres</span><span class="text-body-strong">${preview.memberCount} / ${preview.maxMembers}</span></div>
      </div>
      <label class="text-caption" style="display:flex; gap:8px; align-items:flex-start;">
        <input type="checkbox" id="accept-rules" style="margin-top:4px;" />
        J'ai lu et j'accepte les règles de cette tontine. Je comprends que la cotisation reste due même après avoir reçu mon tour.
      </label>
      <div class="error" id="err" hidden></div>
      <button class="btn btn-primary" id="join">Rejoindre la tontine</button>
    </div>`;

  view().querySelector("#join").onclick = async () => {
    const errorEl = view().querySelector("#err");
    if (!view().querySelector("#accept-rules").checked) {
      errorEl.textContent = "Merci d'accepter les règles pour continuer.";
      errorEl.hidden = false;
      return;
    }
    if (!isAuthenticated()) {
      sessionStorage.setItem("tontine.pendingJoin", token);
      navigate("/phone");
      return;
    }
    try {
      const res = await api.post(`/invitations/${token}/accept`, {});
      toast("Vous avez rejoint la tontine !");
      navigate(`/tontine/${res.tontineId}`);
    } catch (err) {
      errorEl.textContent = errorMessage(err);
      errorEl.hidden = false;
    }
  };
}
