import { api, setTokens } from "../api.js";
import { navigate } from "../router.js";
import { toast, errorMessage } from "../ui.js";

const view = () => document.getElementById("view");
let pendingPhone = "";
let resendAt = 0;

export function renderWelcome() {
  view().innerHTML = `
    <div class="screen center" style="justify-content:center; min-height:100vh; gap: var(--space-5);">
      <div style="font-size:64px;">🤝</div>
      <h1 class="text-screen-title">Gérez vos tontines simplement</h1>
      <p class="text-body muted">Cotisations, tours, rappels et versements suivis par tout le groupe — fini les carnets et les disputes.</p>
      <div class="stack-sm full">
        <button class="btn btn-primary" id="start">Continuer avec mon numéro</button>
      </div>
      <p class="text-legal">En continuant, vous acceptez que Tontine est un outil de gestion, et ne se substitue pas aux engagements entre membres.</p>
    </div>`;
  view().querySelector("#start").onclick = () => navigate("/phone");
}

export function renderPhone() {
  view().innerHTML = `
    <div class="screen">
      <button class="btn-ghost" data-nav="/">← Retour</button>
      <h1 class="text-screen-title">Votre numéro</h1>
      <p class="text-body muted">Nous vous envoyons un code par SMS pour vérifier votre identité.</p>
      <div class="field">
        <label>Numéro de téléphone</label>
        <input id="phone" type="tel" inputmode="tel" placeholder="+225 07 00 00 00 01" value="+225" />
        <div class="error" id="phone-error" hidden></div>
      </div>
      <button class="btn btn-primary" id="submit">Recevoir le code</button>
    </div>`;

  const submit = async () => {
    const phone = view().querySelector("#phone").value.trim();
    const errorEl = view().querySelector("#phone-error");
    errorEl.hidden = true;
    if (!/^\+?\d{8,15}$/.test(phone.replace(/\s/g, ""))) {
      errorEl.textContent = "Entrez un numéro valide, avec l'indicatif pays.";
      errorEl.hidden = false;
      return;
    }
    const clean = phone.replace(/\s/g, "");
    try {
      const res = await api.post("/auth/otp/request", { phone: clean }, { auth: false });
      pendingPhone = clean;
      resendAt = Date.now() + (res.expiresInSeconds ? 30_000 : 30_000);
      navigate(`/otp?devCode=${res.devCode || ""}`);
    } catch (err) {
      errorEl.textContent = errorMessage(err);
      errorEl.hidden = false;
    }
  };
  view().querySelector("#submit").onclick = submit;
  view().querySelector("#phone").addEventListener("keydown", (e) => e.key === "Enter" && submit());
}

export function renderOtp({ query }) {
  if (!pendingPhone) return navigate("/phone");
  view().innerHTML = `
    <div class="screen">
      <button class="btn-ghost" data-nav="/phone">← Retour</button>
      <h1 class="text-screen-title">Code de vérification</h1>
      <p class="text-body muted">Entrez le code à 6 chiffres envoyé au ${pendingPhone}.</p>
      ${query.devCode ? `<div class="banner banner-info">Mode démo (pas de SMS réel) : votre code est <strong>${query.devCode}</strong></div>` : ""}
      <div class="otp-inputs">
        ${Array.from({ length: 6 })
          .map((_, i) => `<input maxlength="1" inputmode="numeric" data-otp="${i}" />`)
          .join("")}
      </div>
      <div class="error" id="otp-error" hidden></div>
      <button class="btn btn-primary" id="verify">Vérifier</button>
      <button class="btn btn-ghost full" id="resend">Renvoyer le code</button>
    </div>`;

  const inputs = [...view().querySelectorAll("[data-otp]")];
  inputs[0].focus();
  inputs.forEach((input, i) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(0, 1);
      if (input.value && inputs[i + 1]) inputs[i + 1].focus();
      if (inputs.every((inp) => inp.value)) verify();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !input.value && inputs[i - 1]) inputs[i - 1].focus();
    });
  });

  const verify = async () => {
    const code = inputs.map((i) => i.value).join("");
    const errorEl = view().querySelector("#otp-error");
    errorEl.hidden = true;
    if (code.length !== 6) return;
    try {
      const res = await api.post("/auth/otp/verify", { phone: pendingPhone, code }, { auth: false });
      setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
      sessionStorage.setItem("tontine.unlocked", "1");
      if (!res.profileComplete) navigate("/setup-profile");
      else afterAuth();
    } catch (err) {
      errorEl.textContent = errorMessage(err);
      errorEl.hidden = false;
      inputs.forEach((i) => (i.value = ""));
      inputs[0].focus();
    }
  };
  view().querySelector("#verify").onclick = verify;

  view().querySelector("#resend").onclick = async () => {
    if (Date.now() < resendAt) {
      toast(`Patientez ${Math.ceil((resendAt - Date.now()) / 1000)}s avant de renvoyer.`);
      return;
    }
    try {
      const res = await api.post("/auth/otp/request", { phone: pendingPhone }, { auth: false });
      resendAt = Date.now() + 30_000;
      toast("Nouveau code envoyé.");
      if (res.devCode) toast(`Code démo : ${res.devCode}`);
    } catch (err) {
      toast(errorMessage(err), { error: true });
    }
  };
}

export function renderSetupProfile() {
  view().innerHTML = `
    <div class="screen">
      <h1 class="text-screen-title">Votre profil</h1>
      <p class="text-body muted">Ces informations servent à vous identifier et à recevoir vos versements.</p>
      <div class="field"><label>Nom complet</label><input id="fullName" placeholder="Aya Koné" /></div>
      <div class="field"><label>Numéro Mobile Money</label><input id="momoNumber" type="tel" placeholder="+225 07 00 00 00 01" /></div>
      <div class="field">
        <label>Opérateur</label>
        <select id="momoOperator">
          <option value="orange">Orange Money</option>
          <option value="mtn">MTN MoMo</option>
          <option value="moov">Moov Money</option>
          <option value="wave">Wave</option>
        </select>
      </div>
      <div class="error" id="err" hidden></div>
      <button class="btn btn-primary" id="submit">Continuer</button>
    </div>`;

  view().querySelector("#submit").onclick = async () => {
    const fullName = view().querySelector("#fullName").value.trim();
    const momoNumber = view().querySelector("#momoNumber").value.trim();
    const momoOperator = view().querySelector("#momoOperator").value;
    const errorEl = view().querySelector("#err");
    if (fullName.length < 2 || momoNumber.length < 8) {
      errorEl.textContent = "Merci de compléter tous les champs.";
      errorEl.hidden = false;
      return;
    }
    try {
      await api.patch("/me", { fullName, momoNumber, momoOperator });
      navigate("/setup-pin");
    } catch (err) {
      errorEl.textContent = errorMessage(err);
      errorEl.hidden = false;
    }
  };
}

function askFirstPin() {
  view().innerHTML = pinScreen("Créez un code PIN", "Ce code protège l'accès à l'application sur cet appareil.");
  wirePinInputs([...view().querySelectorAll("[data-pin]")], (pin) => askConfirmPin(pin));
}

function askConfirmPin(firstPin) {
  view().innerHTML = pinScreen("Confirmez votre code", "Entrez à nouveau le même code.");
  wirePinInputs([...view().querySelectorAll("[data-pin]")], async (pin2) => {
    if (pin2 !== firstPin) {
      toast("Les codes ne correspondent pas, recommencez.", { error: true });
      askFirstPin();
      return;
    }
    try {
      await api.patch("/me", { pin: pin2 });
      sessionStorage.setItem("tontine.unlocked", "1");
      toast("Profil créé ! Bienvenue 👋");
      afterAuth();
    } catch (err) {
      toast(errorMessage(err), { error: true });
    }
  });
}

export function renderSetupPin() {
  askFirstPin();
}

export function renderUnlock() {
  view().innerHTML = pinScreen("Entrez votre code PIN", "Déverrouillez l'application.");
  wirePinInputs([...view().querySelectorAll("[data-pin]")], async (pin) => {
    try {
      const res = await api.post("/me/verify-pin", { pin });
      if (res.valid) {
        sessionStorage.setItem("tontine.unlocked", "1");
        navigate(sessionStorage.getItem("tontine.afterUnlock") || "/home");
      } else {
        toast("Code incorrect.", { error: true });
        renderUnlock();
      }
    } catch (err) {
      toast(errorMessage(err), { error: true });
    }
  });
}

function pinScreen(title, subtitle) {
  return `
    <div class="screen center" style="justify-content:center; min-height:100vh;">
      <h1 class="text-screen-title">${title}</h1>
      <p class="text-body muted">${subtitle}</p>
      <div class="otp-inputs">
        ${Array.from({ length: 4 })
          .map((_, i) => `<input maxlength="1" inputmode="numeric" type="password" data-pin="${i}" />`)
          .join("")}
      </div>
    </div>`;
}

export function afterAuth() {
  const pending = sessionStorage.getItem("tontine.pendingJoin");
  if (pending) {
    sessionStorage.removeItem("tontine.pendingJoin");
    navigate(`/join/${pending}`);
  } else {
    navigate("/home");
  }
}

function wirePinInputs(inputs, onComplete) {
  inputs[0]?.focus();
  inputs.forEach((input, i) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(0, 1);
      if (input.value && inputs[i + 1]) inputs[i + 1].focus();
      if (inputs.every((inp) => inp.value)) onComplete(inputs.map((inp) => inp.value).join(""));
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !input.value && inputs[i - 1]) inputs[i - 1].focus();
    });
  });
}
