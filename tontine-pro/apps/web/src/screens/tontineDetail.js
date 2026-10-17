import { api } from "../api.js";
import { navigate } from "../router.js";
import { formatFcfa, formatDate, escapeHtml, badge, toast, errorMessage } from "../ui.js";

const view = () => document.getElementById("view");
const ROLE_LABEL = { president: "Président", treasurer: "Trésorier", member: "Membre" };

export async function renderTontineDetail({ params }) {
  const id = params.id;
  let detail, contributions = null;
  try {
    detail = await api.get(`/tontines/${id}`);
    if (detail.currentRound) {
      const r = await api.get(`/rounds/${detail.currentRound.id}/contributions`);
      contributions = r;
    }
  } catch (err) {
    toast(errorMessage(err), { error: true });
    return navigate("/home");
  }

  const { tontine, activeCount } = detail;
  const isPresident = contributions?.viewerRole === "president";
  const myContribution = contributions?.contributions.find((c) => c.isSelf);
  const paidCount = contributions?.contributions.filter((c) => c.status === "paid" || c.status === "waived").length ?? 0;
  const total = contributions?.contributions.length ?? 0;

  view().innerHTML = `
    <header class="top-bar">
      <button class="icon-btn" data-nav="/home" aria-label="Retour">←</button>
      <div class="title">${escapeHtml(tontine.name)}</div>
    </header>
    <div class="screen">
      ${
        tontine.status === "draft"
          ? `<div class="banner banner-info">Tontine en préparation.</div>
             <button class="btn btn-primary" data-nav="/tontine/${id}/invite">Inviter des membres</button>`
          : ""
      }
      ${
        detail.currentRound
          ? `<div class="pot-card">
              <div class="label">Pot du tour ${detail.currentRound.roundNumber}</div>
              <div class="amount text-amount">${formatFcfa(detail.currentRound.potAmount)}</div>
              <div class="text-caption" style="color:var(--color-primary-dark)">Bénéficiaire : ${escapeHtml(detail.currentRound.beneficiary.user.fullName || detail.currentRound.beneficiary.user.phone)}</div>
            </div>
            <div class="card">
              <div class="row-between"><span class="text-caption">Cotisations reçues</span><span class="text-body-strong">${paidCount}/${total}</span></div>
              <div class="progress-track"><div class="progress-fill" style="width:${total ? Math.round((paidCount / total) * 100) : 0}%"></div></div>
            </div>`
          : tontine.status === "completed"
          ? `<div class="banner banner-info">🎉 Ce cycle est terminé. Tous les membres ont reçu leur tour.</div>`
          : ""
      }

      ${
        myContribution && myContribution.status !== "paid" && myContribution.status !== "waived"
          ? `<button class="btn btn-accent" id="pay-cta">Payer ma cotisation — ${formatFcfa(myContribution.amountDue + myContribution.penaltyAmount)}</button>`
          : ""
      }
      ${
        isPresident && contributions?.contributions.some((c) => c.status === "late")
          ? `<button class="btn btn-secondary" data-nav="/round/${detail.currentRound.id}/decisions">Gérer les retards</button>`
          : ""
      }

      <div class="card">
        <div class="row-between"><h3 class="text-section-title">Membres</h3><span class="text-caption">${activeCount}/${tontine.maxMembers}</span></div>
        <div class="list-divided">
          ${tontine.memberships
            .filter((m) => m.status === "active")
            .map((m) => {
              const c = contributions?.contributions.find((cc) => cc.membershipId === m.id);
              return `<div class="member-row">
                <div class="avatar">${(m.user.fullName || "?")[0]}</div>
                <div class="name">${escapeHtml(m.user.fullName || m.user.phone)}</div>
                <span class="text-caption">${ROLE_LABEL[m.role]}</span>
                ${c ? badge(c.status) : ""}
              </div>`;
            })
            .join("")}
        </div>
      </div>

      <div class="stack-sm">
        <button class="btn btn-secondary" data-nav="/tontine/${id}/calendar">📅 Calendrier des tours</button>
        <button class="btn btn-secondary" data-nav="/tontine/${id}/history">🧾 Historique</button>
      </div>
    </div>`;

  view().querySelector("#pay-cta")?.addEventListener("click", () => navigate(`/pay/${myContribution.id}`));
}

export async function renderCalendar({ params }) {
  const id = params.id;
  let rounds;
  try {
    rounds = await api.get(`/tontines/${id}/rounds`);
  } catch (err) {
    toast(errorMessage(err), { error: true });
    return navigate(`/tontine/${id}`);
  }
  view().innerHTML = `
    <header class="top-bar">
      <button class="icon-btn" data-nav="/tontine/${id}" aria-label="Retour">←</button>
      <div class="title">Calendrier des tours</div>
    </header>
    <div class="screen">
      <div class="card list-divided">
        ${rounds
          .map(
            (r) => `<div class="member-row pressable" data-round="${r.id}" style="cursor:pointer;">
              <div class="avatar">${r.roundNumber}</div>
              <div class="name">${escapeHtml(r.beneficiaryName)}<div class="text-caption">${formatDate(r.dueDate)} · ${formatFcfa(r.potAmount)}</div></div>
              ${badge(r.status)}
            </div>`,
          )
          .join("")}
      </div>
    </div>`;
  view().querySelectorAll("[data-round]").forEach((el) => {
    el.addEventListener("click", () => navigate(`/round/${el.getAttribute("data-round")}`));
  });
}
