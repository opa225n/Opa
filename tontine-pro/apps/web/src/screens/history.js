import { api, API_BASE, getTokens } from "../api.js";
import { formatFcfa, formatDateTime, escapeHtml, toast, errorMessage } from "../ui.js";

const view = () => document.getElementById("view");

export async function renderHistory({ params }) {
  const id = params.id;
  let data;
  try {
    data = await api.get(`/tontines/${id}/history`);
  } catch (err) {
    toast(errorMessage(err), { error: true });
    return;
  }
  view().innerHTML = `
    <header class="top-bar"><button class="icon-btn" id="back">←</button><div class="title">Historique</div></header>
    <div class="screen">
      <button class="btn btn-secondary" id="export">⬇️ Exporter en CSV</button>
      ${
        data.events.length === 0
          ? `<div class="empty-state"><div class="icon">🧾</div><p class="text-body">Aucun événement pour l'instant.</p></div>`
          : `<div class="card list-divided">
              ${data.events
                .map(
                  (e) => `<div class="row-between" style="padding:8px 0;">
                    <div>
                      <div class="text-body-strong">${escapeHtml(e.label)}</div>
                      <div class="text-caption">${formatDateTime(e.date)}</div>
                    </div>
                    <div class="text-body-strong">${formatFcfa(e.amount)}</div>
                  </div>`,
                )
                .join("")}
            </div>`
      }
    </div>`;
  view().querySelector("#back").onclick = () => history.back();
  view().querySelector("#export").onclick = async () => {
    const tokens = getTokens();
    try {
      const res = await fetch(`${API_BASE}/tontines/${id}/history/export.csv`, {
        headers: { Authorization: `Bearer ${tokens?.accessToken}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "historique.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast("Export impossible pour le moment.", { error: true });
    }
  };
}
