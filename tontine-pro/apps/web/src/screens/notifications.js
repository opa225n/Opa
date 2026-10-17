import { api } from "../api.js";
import { bottomNav, formatDateTime, escapeHtml, toast, errorMessage } from "../ui.js";

const view = () => document.getElementById("view");
const ICONS = {
  invitation: "✉️", new_member: "👋", cycle_started: "🚀", round_open: "📅",
  payment_reminder: "⏰", payment_confirmed: "✅", payment_failed: "❌", late: "⚠️",
  president_decision: "⚖️", payout_sent: "💸", payout_received: "🎉", payout_failed: "⚠️", cycle_completed: "🏁",
};

export async function renderNotifications() {
  let notifications = [];
  try {
    notifications = await api.get("/notifications");
  } catch (err) {
    toast(errorMessage(err), { error: true });
  }
  view().innerHTML = `
    <header class="top-bar">
      <div class="title">Notifications</div>
      ${notifications.some((n) => !n.readAt) ? `<button class="icon-btn" id="read-all" style="font-size:14px;width:auto;">Tout lire</button>` : ""}
    </header>
    <div class="screen">
      ${
        notifications.length === 0
          ? `<div class="empty-state"><div class="icon">🔔</div><p class="text-body">Tout est à jour.</p></div>`
          : `<div class="card list-divided">
              ${notifications
                .map(
                  (n) => `<div class="row-between" style="padding:10px 0; ${n.readAt ? "" : "font-weight:600;"}">
                    <div style="display:flex; gap:10px;">
                      <span>${ICONS[n.type] || "🔔"}</span>
                      <div>
                        <div class="text-body-strong">${escapeHtml(n.title)}</div>
                        <div class="text-caption">${escapeHtml(n.body)}</div>
                        <div class="text-caption">${formatDateTime(n.createdAt)}</div>
                      </div>
                    </div>
                  </div>`,
                )
                .join("")}
            </div>`
      }
    </div>
    ${bottomNav("notifications")}`;

  view().querySelector("#read-all")?.addEventListener("click", async () => {
    try {
      await api.post("/notifications/read-all", {});
      renderNotifications();
    } catch (err) {
      toast(errorMessage(err), { error: true });
    }
  });
}
