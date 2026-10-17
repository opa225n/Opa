// Routeur par hash minimal : pas de dépendance, cohérent avec le reste du dépôt (cf. tontine/app.js existant).
const routes = [];

export function route(pattern, handler) {
  const paramNames = [];
  const regex = new RegExp(
    "^" +
      pattern.replace(/:[^/]+/g, (m) => {
        paramNames.push(m.slice(1));
        return "([^/]+)";
      }) +
      "$",
  );
  routes.push({ regex, paramNames, handler });
}

async function resolve() {
  const hash = location.hash.replace(/^#/, "") || "/";
  const [pathPart] = hash.split("?");
  for (const r of routes) {
    const match = pathPart.match(r.regex);
    if (match) {
      const params = {};
      r.paramNames.forEach((name, i) => (params[name] = decodeURIComponent(match[i + 1])));
      const query = Object.fromEntries(new URLSearchParams(hash.split("?")[1] || ""));
      const main = document.getElementById("view");
      main.setAttribute("aria-busy", "true");
      try {
        await r.handler({ params, query });
      } catch (err) {
        console.error(err);
        main.innerHTML = `<div class="screen center"><p class="text-body">Une erreur est survenue.</p><p class="text-caption">${err?.message || ""}</p></div>`;
      }
      main.setAttribute("aria-busy", "false");
      window.scrollTo(0, 0);
      return;
    }
  }
  location.hash = "#/";
}

export function navigate(path) {
  location.hash = `#${path}`;
}

export function startRouter() {
  window.addEventListener("hashchange", resolve);
  window.addEventListener("click", (e) => {
    const target = e.target.closest("[data-nav]");
    if (target) navigate(target.getAttribute("data-nav"));
  });
  resolve();
}
