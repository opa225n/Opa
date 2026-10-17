import { api } from "../api.js";
import { navigate } from "../router.js";
import { formatFcfa, escapeHtml, toast, errorMessage } from "../ui.js";

const view = () => document.getElementById("view");
let draft = { maxMembers: 5, frequency: "weekly", penaltyType: "fixed", penaltyValue: 1000, gracePeriodHours: 24, solidarityFeePct: 0 };

function wizardHeader(step) {
  return `
    <div class="screen" style="padding-bottom:0;">
      <button class="btn-ghost" data-nav="${step === 1 ? "/home" : step === 2 ? "/create" : "/create/rules"}">← Retour</button>
      <h1 class="text-screen-title">Nouvelle tontine</h1>
      <div class="stepper">
        <div class="dot ${step >= 1 ? (step === 1 ? "active" : "done") : ""}"></div>
        <div class="dot ${step >= 2 ? (step === 2 ? "active" : "done") : ""}"></div>
        <div class="dot ${step >= 3 ? "active" : ""}"></div>
      </div>
    </div>`;
}

export function renderCreateInfo() {
  view().innerHTML = `
    ${wizardHeader(1)}
    <div class="screen" style="padding-top:0;">
      <div class="field"><label>Nom de la tontine</label><input id="name" placeholder="Tontine des Amies" value="${escapeHtml(draft.name || "")}" /></div>
      <div class="field"><label>Description (optionnelle)</label><textarea id="description">${escapeHtml(draft.description || "")}</textarea></div>
      <div class="field"><label>Montant de la cotisation (FCFA)</label><input id="amount" type="number" min="1" value="${draft.contributionAmount || ""}" /></div>
      <div class="field">
        <label>Fréquence</label>
        <select id="frequency">
          <option value="weekly" ${draft.frequency === "weekly" ? "selected" : ""}>Hebdomadaire</option>
          <option value="biweekly" ${draft.frequency === "biweekly" ? "selected" : ""}>Toutes les 2 semaines</option>
          <option value="monthly" ${draft.frequency === "monthly" ? "selected" : ""}>Mensuelle</option>
        </select>
      </div>
      <div class="field"><label>Date du premier tour</label><input id="startDate" type="date" value="${draft.startDate || ""}" /></div>
      <div class="field"><label>Nombre de membres (3 à 50)</label><input id="maxMembers" type="number" min="3" max="50" value="${draft.maxMembers}" /></div>
      <div class="error" id="err" hidden></div>
      <button class="btn btn-primary" id="next">Continuer</button>
    </div>`;

  view().querySelector("#next").onclick = () => {
    const name = view().querySelector("#name").value.trim();
    const amount = Number(view().querySelector("#amount").value);
    const startDate = view().querySelector("#startDate").value;
    const maxMembers = Number(view().querySelector("#maxMembers").value);
    const errorEl = view().querySelector("#err");
    if (!name || !amount || amount <= 0 || !startDate || maxMembers < 3 || maxMembers > 50) {
      errorEl.textContent = "Merci de compléter tous les champs correctement.";
      errorEl.hidden = false;
      return;
    }
    draft = {
      ...draft,
      name,
      description: view().querySelector("#description").value.trim(),
      contributionAmount: amount,
      frequency: view().querySelector("#frequency").value,
      startDate,
      maxMembers,
    };
    navigate("/create/rules");
  };
}

export function renderCreateRules() {
  if (!draft.name) return navigate("/create");
  view().innerHTML = `
    ${wizardHeader(2)}
    <div class="screen" style="padding-top:0;">
      <div class="field">
        <label>Délai de grâce après l'échéance (heures)</label>
        <input id="grace" type="number" min="0" max="240" value="${draft.gracePeriodHours}" />
      </div>
      <div class="field">
        <label>Type de pénalité de retard</label>
        <select id="penaltyType">
          <option value="fixed" ${draft.penaltyType === "fixed" ? "selected" : ""}>Montant fixe (FCFA)</option>
          <option value="percent" ${draft.penaltyType === "percent" ? "selected" : ""}>Pourcentage de la cotisation</option>
        </select>
      </div>
      <div class="field"><label>Valeur de la pénalité</label><input id="penaltyValue" type="number" min="0" value="${draft.penaltyValue}" /></div>
      <div class="field">
        <label>Frais de solidarité (% du pot, optionnel)</label>
        <input id="fee" type="number" min="0" max="20" value="${draft.solidarityFeePct}" />
      </div>
      <button class="btn btn-primary" id="next">Continuer</button>
    </div>`;

  view().querySelector("#next").onclick = () => {
    draft = {
      ...draft,
      gracePeriodHours: Number(view().querySelector("#grace").value),
      penaltyType: view().querySelector("#penaltyType").value,
      penaltyValue: Number(view().querySelector("#penaltyValue").value),
      solidarityFeePct: Number(view().querySelector("#fee").value),
    };
    navigate("/create/review");
  };
}

export function renderCreateReview() {
  if (!draft.name) return navigate("/create");
  const pot = draft.contributionAmount * draft.maxMembers;
  view().innerHTML = `
    ${wizardHeader(3)}
    <div class="screen" style="padding-top:0;">
      <div class="card">
        <h3 class="text-section-title">${escapeHtml(draft.name)}</h3>
        ${draft.description ? `<p class="text-caption">${escapeHtml(draft.description)}</p>` : ""}
      </div>
      <div class="pot-card">
        <div class="label">Pot estimé par tour (${draft.maxMembers} membres)</div>
        <div class="amount text-amount">${formatFcfa(pot)}</div>
      </div>
      <div class="card list-divided">
        ${row("Cotisation", formatFcfa(draft.contributionAmount))}
        ${row("Fréquence", { weekly: "Hebdomadaire", biweekly: "Toutes les 2 semaines", monthly: "Mensuelle" }[draft.frequency])}
        ${row("Premier tour", draft.startDate)}
        ${row("Délai de grâce", `${draft.gracePeriodHours} h`)}
        ${row("Pénalité", draft.penaltyType === "fixed" ? formatFcfa(draft.penaltyValue) : `${draft.penaltyValue}%`)}
        ${row("Frais de solidarité", `${draft.solidarityFeePct}%`)}
      </div>
      <p class="text-legal">Ces règles seront visibles par tous les membres et ne pourront plus être modifiées une fois le cycle lancé.</p>
      <div class="error" id="err" hidden></div>
      <button class="btn btn-primary" id="create">Créer la tontine</button>
    </div>`;

  view().querySelector("#create").onclick = async () => {
    const btn = view().querySelector("#create");
    btn.disabled = true;
    btn.textContent = "Création…";
    try {
      const tontine = await api.post("/tontines", draft);
      draft = { maxMembers: 5, frequency: "weekly", penaltyType: "fixed", penaltyValue: 1000, gracePeriodHours: 24, solidarityFeePct: 0 };
      navigate(`/tontine/${tontine.id}/invite`);
    } catch (err) {
      view().querySelector("#err").textContent = errorMessage(err);
      view().querySelector("#err").hidden = false;
      btn.disabled = false;
      btn.textContent = "Créer la tontine";
    }
  };
}

function row(label, value) {
  return `<div class="row-between"><span class="text-caption">${label}</span><span class="text-body-strong">${value}</span></div>`;
}

export async function renderInviteMembers({ params }) {
  const tontineId = params.id;
  let detail;
  try {
    detail = await api.get(`/tontines/${tontineId}`);
  } catch (err) {
    toast(errorMessage(err), { error: true });
    return navigate("/home");
  }
  const { tontine, activeCount } = detail;
  const canLaunch = activeCount >= 3;

  view().innerHTML = `
    <div class="screen">
      <button class="btn-ghost" data-nav="/home">← Mes tontines</button>
      <h1 class="text-screen-title">${escapeHtml(tontine.name)} créée 🎉</h1>
      <p class="text-body muted">Invitez vos membres (3 à ${tontine.maxMembers}) avant de lancer le cycle.</p>
      <div class="card">
        <div class="row-between"><span class="text-caption">Membres</span><span class="text-body-strong">${activeCount} / ${tontine.maxMembers}</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${Math.round((activeCount / tontine.maxMembers) * 100)}%"></div></div>
      </div>
      <button class="btn btn-accent" id="invite">+ Générer un lien d'invitation</button>
      <div id="links" class="stack-sm"></div>
      <div class="card list-divided">
        ${tontine.memberships
          .filter((m) => m.status === "active")
          .map((m) => `<div class="member-row"><div class="avatar">${(m.user.fullName || "?")[0]}</div><div class="name">${escapeHtml(m.user.fullName || m.user.phone)}</div><span class="badge badge-neutral">${m.role === "president" ? "Président" : "Membre"}</span></div>`)
          .join("")}
      </div>
      <button class="btn btn-primary" id="next" ${canLaunch ? "" : "disabled"}>Définir l'ordre des tours</button>
      ${!canLaunch ? `<p class="text-caption center">Il faut au moins 3 membres actifs pour continuer.</p>` : ""}
    </div>`;

  view().querySelector("#invite").onclick = async () => {
    try {
      const inv = await api.post(`/tontines/${tontineId}/invitations`, {});
      const link = `${location.origin}${location.pathname}#/join/${inv.token}`;
      const box = document.createElement("div");
      box.className = "card";
      box.innerHTML = `
        <div class="text-caption">Lien d'invitation (valable 7 jours)</div>
        <div class="text-body-strong" style="word-break:break-all;">${link}</div>
        <div class="row-between">
          <button class="btn btn-secondary btn-sm" data-copy="${link}">Copier</button>
          <a class="btn btn-secondary btn-sm" href="https://wa.me/?text=${encodeURIComponent("Rejoins ma tontine : " + link)}" target="_blank" rel="noopener">Partager via WhatsApp</a>
        </div>`;
      view().querySelector("#links").prepend(box);
      box.querySelector("[data-copy]").onclick = async (e) => {
        await navigator.clipboard?.writeText(e.target.getAttribute("data-copy")).catch(() => {});
        toast("Lien copié !");
      };
    } catch (err) {
      toast(errorMessage(err), { error: true });
    }
  };

  view().querySelector("#next").onclick = () => navigate(`/tontine/${tontineId}/order`);
}

export async function renderRotationOrder({ params }) {
  const tontineId = params.id;
  let detail;
  try {
    detail = await api.get(`/tontines/${tontineId}`);
  } catch (err) {
    toast(errorMessage(err), { error: true });
    return navigate("/home");
  }
  const members = detail.tontine.memberships.filter((m) => m.status === "active");

  view().innerHTML = `
    <div class="screen">
      <button class="btn-ghost" data-nav="/tontine/${tontineId}/invite">← Retour</button>
      <h1 class="text-screen-title">Ordre des tours</h1>
      <p class="text-body muted">Déterminez qui reçoit le pot à chaque tour.</p>
      <button class="btn btn-accent" id="lottery">🎲 Tirage au sort</button>
      <div class="card list-divided" id="order-list">
        ${members.map((m, i) => `<div class="member-row"><div class="avatar">${i + 1}</div><div class="name">${escapeHtml(m.user.fullName || m.user.phone)}</div></div>`).join("")}
      </div>
      <p class="text-caption center">Le tirage au sort est aléatoire et visible de tous une fois effectué.</p>
      <button class="btn btn-primary" id="launch" disabled>Lancer le cycle</button>
    </div>`;

  let ordered = null;
  view().querySelector("#lottery").onclick = async () => {
    try {
      ordered = await api.post(`/tontines/${tontineId}/rotation-order`, { mode: "lottery" });
      const list = view().querySelector("#order-list");
      list.innerHTML = ordered
        .map((m, i) => `<div class="member-row"><div class="avatar">${i + 1}</div><div class="name">${escapeHtml(m.user.fullName || m.user.phone)}</div>${i === 0 ? '<span class="badge badge-neutral">1er tour</span>' : ""}</div>`)
        .join("");
      view().querySelector("#launch").disabled = false;
      toast("Ordre tiré au sort !");
    } catch (err) {
      toast(errorMessage(err), { error: true });
    }
  };

  view().querySelector("#launch").onclick = async () => {
    const btn = view().querySelector("#launch");
    btn.disabled = true;
    btn.textContent = "Lancement…";
    try {
      await api.post(`/tontines/${tontineId}/start`, {});
      toast("Le cycle est lancé 🚀");
      navigate(`/tontine/${tontineId}`);
    } catch (err) {
      toast(errorMessage(err), { error: true });
      btn.disabled = false;
      btn.textContent = "Lancer le cycle";
    }
  };
}
