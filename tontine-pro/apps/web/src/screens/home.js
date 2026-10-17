import { api } from "../api.js";
import { navigate } from "../router.js";
import { bottomNav, formatFcfa, escapeHtml, initials, toast, errorMessage } from "../ui.js";

const view = () => document.getElementById("view");
const ROLE_LABEL = { president: "Président", treasurer: "Trésorier", member: "Membre" };

export async function renderHome() {
  view().innerHTML = `<div class="screen center" style="padding-top:80px;"><div class="spinner" style="margin:0 auto;"></div></div>`;
  let tontines = [];
  let unread = 0;
  try {
    [tontines, unread] = await Promise.all([api.get("/tontines"), unreadCount()]);
  } catch (err) {
    view().innerHTML = `<div class="screen"><p class="text-body">${errorMessage(err)}</p></div>`;
    return;
  }

  view().innerHTML = `
    <header class="top-bar">
      <span class="logo" style="font-size:20px;">🤝</span>
      <div class="title">Mes tontines</div>
      <button class="icon-btn" id="add" aria-label="Ajouter">+</button>
    </header>
    <div class="screen">
      ${
        tontines.length === 0
          ? `<div class="empty-state">
              <div class="icon">🤝</div>
              <h2 class="text-section-title">Aucune tontine pour l'instant</h2>
              <p class="text-body muted">Créez votre première tontine ou rejoignez-en une grâce à un lien d'invitation.</p>
              <button class="btn btn-primary" data-nav="/create">Créer une tontine</button>
              <button class="btn btn-secondary" id="join-btn">Rejoindre avec un code</button>
            </div>`
          : `<div class="stack-md">
              ${tontines.map(cardTemplate).join("")}
            </div>`
      }
    </div>
    ${bottomNav("home", unread)}
  `;

  view().querySelector("#add")?.addEventListener("click", () => showAddMenu());
  view().querySelector("#join-btn")?.addEventListener("click", () => promptJoinCode());
  view().querySelectorAll("[data-tontine]").forEach((el) => {
    el.addEventListener("click", () => navigate(`/tontine/${el.getAttribute("data-tontine")}`));
  });
}

async function unreadCount() {
  try {
    const notifications = await api.get("/notifications");
    return notifications.filter((n) => !n.readAt).length;
  } catch {
    return 0;
  }
}

function cardTemplate(t) {
  const progress = t.maxMembers ? Math.round((t.memberCount / t.maxMembers) * 100) : 0;
  return `
    <div class="card pressable" data-tontine="${t.id}">
      <div class="row-between">
        <h3 class="text-section-title">${escapeHtml(t.name)}</h3>
        <span class="badge badge-neutral">${ROLE_LABEL[t.role] || t.role}</span>
      </div>
      <div class="text-caption">${t.memberCount}/${t.maxMembers} membres · ${formatFcfa(t.contributionAmount)} / ${freqLabel(t.frequency)}</div>
      ${
        t.status === "draft"
          ? `<div class="banner banner-info">En préparation — invitez vos membres pour démarrer.</div>`
          : t.currentRound
          ? `<div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>`
          : `<div class="text-caption">Statut : ${t.status === "completed" ? "Terminée" : t.status}</div>`
      }
    </div>`;
}

function freqLabel(f) {
  return { weekly: "semaine", biweekly: "15 jours", monthly: "mois" }[f] || f;
}

function showAddMenu() {
  const backdrop = document.createElement("div");
  backdrop.className = "confirm-sheet-backdrop";
  backdrop.innerHTML = `
    <div class="confirm-sheet">
      <button class="btn btn-primary" data-nav="/create" id="create-opt">Créer une nouvelle tontine</button>
      <button class="btn btn-secondary" id="join-opt">Rejoindre avec un code</button>
      <button class="btn btn-ghost full" id="cancel-opt">Annuler</button>
    </div>`;
  document.body.appendChild(backdrop);
  backdrop.querySelector("#create-opt").onclick = () => backdrop.remove();
  backdrop.querySelector("#cancel-opt").onclick = () => backdrop.remove();
  backdrop.querySelector("#join-opt").onclick = () => {
    backdrop.remove();
    promptJoinCode();
  };
}

function promptJoinCode() {
  const backdrop = document.createElement("div");
  backdrop.className = "confirm-sheet-backdrop";
  backdrop.innerHTML = `
    <div class="confirm-sheet">
      <h2 class="text-section-title">Rejoindre une tontine</h2>
      <div class="field"><label>Lien ou code d'invitation</label><input id="code" placeholder="Collez le lien reçu" /></div>
      <button class="btn btn-primary" id="go">Continuer</button>
      <button class="btn btn-ghost full" id="cancel">Annuler</button>
    </div>`;
  document.body.appendChild(backdrop);
  backdrop.querySelector("#cancel").onclick = () => backdrop.remove();
  backdrop.querySelector("#go").onclick = () => {
    const raw = backdrop.querySelector("#code").value.trim();
    const token = raw.includes("/") ? raw.split("/").pop() : raw;
    if (!token) {
      toast("Entrez un code valide.", { error: true });
      return;
    }
    backdrop.remove();
    navigate(`/join/${token}`);
  };
}
