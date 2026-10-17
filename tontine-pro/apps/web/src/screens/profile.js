import { api } from "../api.js";
import { logout } from "../store.js";
import { navigate } from "../router.js";
import { bottomNav, escapeHtml, toast, errorMessage } from "../ui.js";

const view = () => document.getElementById("view");

export async function renderProfile() {
  let me;
  try {
    me = await api.get("/me");
  } catch (err) {
    toast(errorMessage(err), { error: true });
    return;
  }
  view().innerHTML = `
    <header class="top-bar"><div class="title">Profil</div></header>
    <div class="screen">
      <div class="card center">
        <div class="avatar" style="width:64px;height:64px;font-size:24px;margin:0 auto;">${(me.fullName || "?")[0]}</div>
        <h3 class="text-section-title">${escapeHtml(me.fullName)}</h3>
        <p class="text-caption">${escapeHtml(me.phone)}</p>
      </div>
      <div class="field"><label>Nom complet</label><input id="fullName" value="${escapeHtml(me.fullName)}" /></div>
      <div class="field"><label>Numéro Mobile Money</label><input id="momoNumber" value="${escapeHtml(me.momoNumber || "")}" /></div>
      <div class="field">
        <label>Opérateur</label>
        <select id="momoOperator">
          ${["orange", "mtn", "moov", "wave"].map((o) => `<option value="${o}" ${me.momoOperator === o ? "selected" : ""}>${o}</option>`).join("")}
        </select>
      </div>
      <button class="btn btn-primary" id="save">Enregistrer</button>
      <button class="btn btn-danger" id="logout">Se déconnecter</button>
      <p class="text-legal center">Tontine est un outil de gestion entre membres. L'équipe ne détient aucun fonds : tout passe par les opérateurs Mobile Money agréés.</p>
    </div>
    ${bottomNav("profile")}`;

  view().querySelector("#save").onclick = async () => {
    try {
      await api.patch("/me", {
        fullName: view().querySelector("#fullName").value.trim(),
        momoNumber: view().querySelector("#momoNumber").value.trim(),
        momoOperator: view().querySelector("#momoOperator").value,
      });
      toast("Profil mis à jour.");
    } catch (err) {
      toast(errorMessage(err), { error: true });
    }
  };

  view().querySelector("#logout").onclick = () => {
    logout();
    sessionStorage.clear();
    navigate("/");
  };
}
