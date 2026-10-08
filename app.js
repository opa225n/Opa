// Kitsune VF — catalogue AniList + lecteur avec lecture automatique.
// Aucune vidéo n'est fournie : l'utilisateur renseigne ses propres sources légales.

const $ = (s, r = document) => r.querySelector(s);
const view = $('#view');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Stockage ---------- */
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem('kvf.' + k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('kvf.' + k, JSON.stringify(v)); } catch { toast('Stockage local indisponible'); } },
};
const DEFAULTS = { autoplay: true, autonext: true, autoskip: false, skipSec: 85, countdown: 8, autolaunch: true, speed: 1 };
const settings = () => ({ ...DEFAULTS, ...store.get('settings', {}) });
const sources = () => store.get('sources', {});
const progress = () => store.get('progress', {});

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ---------- AniList ---------- */
const GQL = 'https://graphql.anilist.co';
const FIELDS = `id title{romaji english} coverImage{extraLarge large color} bannerImage description(asHtml:false)
  episodes genres averageScore seasonYear format status nextAiringEpisode{episode}`;
const cache = new Map();
async function gql(query, variables) {
  const key = JSON.stringify([query, variables]);
  if (cache.has(key)) return cache.get(key);
  const r = await fetch(GQL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  if (!r.ok) throw new Error('AniList ' + r.status);
  const j = await r.json(); if (j.errors) throw new Error(j.errors[0].message);
  cache.set(key, j.data); return j.data;
}
const list = (sort, extra = '', vars = {}) => gql(
  `query($p:Int,$g:String,$s:String){Page(page:$p,perPage:24){media(type:ANIME,sort:${sort},isAdult:false,genre:$g,search:$s${extra}){${FIELDS}}}}`,
  { p: 1, ...vars }).then(d => d.Page.media);
const one = id => gql(`query($id:Int){Media(id:$id,type:ANIME){${FIELDS} externalLinks{site url type language} }}`, { id }).then(d => d.Media);
const name = m => m.title.english || m.title.romaji;
const stripHtml = s => (s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');

/* ---------- Composants ---------- */
function card(m) {
  const src = sources()[m.id], pr = progress()[m.id];
  const pct = pr && pr.d ? Math.min(100, (pr.t / pr.d) * 100) : 0;
  return `<a class="card" href="#/anime/${m.id}">
    ${src ? '<span class="badge">VF</span>' : ''}
    <img loading="lazy" src="${esc(m.coverImage.large)}" alt="" style="background:${esc(m.coverImage.color || '')}">
    <div class="meta"><div class="t">${esc(name(m))}</div>
    <div class="s">${[m.format, m.seasonYear, m.averageScore ? '★ ' + m.averageScore / 10 : ''].filter(Boolean).join(' · ')}</div></div>
    ${pr ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ''}</a>`;
}
const gridHtml = ms => `<div class="grid">${ms.map(card).join('')}</div>`;
const skeletons = n => `<div class="grid">${'<div class="skeleton"></div>'.repeat(n)}</div>`;

/* ---------- Routeur ---------- */
let teardown = null;
async function route() {
  teardown?.(); teardown = null;
  const [, page, a, b] = location.hash.slice(1).split('/');
  document.querySelectorAll('nav a').forEach(l => l.classList.toggle('on', l.dataset.nav === (page || 'home') || (!page && l.dataset.nav === 'home')));
  try {
    if (page === 'anime') await pageAnime(+a);
    else if (page === 'watch') await pageWatch(+a, +b || 1);
    else if (page === 'library') await pageLibrary();
    else if (page === 'settings') pageSettings();
    else if (page === 'search') await pageSearch(decodeURIComponent(a || ''));
    else await pageHome();
  } catch (e) {
    view.innerHTML = `<div class="empty"><h3>Oups, chargement impossible</h3><p>${esc(e.message)}</p><p><button class="btn" onclick="location.reload()">Réessayer</button></p></div>`;
  }
  if (page !== 'watch') window.scrollTo(0, 0);
}
addEventListener('hashchange', route);

/* ---------- Accueil ---------- */
const GENRES = ['Action', 'Aventure', 'Comédie', 'Drame', 'Fantasy', 'Romance', 'Science-Fiction', 'Slice of Life', 'Sports', 'Surnaturel'];
const GENRE_EN = { 'Science-Fiction': 'Sci-Fi', 'Comédie': 'Comedy', 'Aventure': 'Adventure', 'Drame': 'Drama', 'Surnaturel': 'Supernatural', 'Sports': 'Sports' };
let genre = '';

async function pageHome() {
  view.innerHTML = skeletons(12);
  const trending = await list('TRENDING_DESC');
  const hero = trending.find(m => m.bannerImage) || trending[0];
  const resume = continueList();
  view.innerHTML = `
    <section class="hero" style="background-image:url('${esc(hero.bannerImage || hero.coverImage.extraLarge)}')">
      <div><span class="tag">À la une</span><h1>${esc(name(hero))}</h1>
      <p>${esc(stripHtml(hero.description))}</p>
      <div class="btns"><a class="btn primary" href="#/anime/${hero.id}">Voir la fiche</a></div></div>
    </section>
    ${resume.length ? `<h2>Reprendre</h2><div class="grid" id="resume"></div>` : ''}
    <h2>Tendances</h2>
    <div class="chips" id="chips">${['Tout', ...GENRES].map(g => `<button class="chip ${g === 'Tout' && !genre || g === genre ? 'on' : ''}">${g}</button>`).join('')}</div>
    <div id="trend" style="margin-top:16px">${gridHtml(trending)}</div>
    <h2>Populaires de tous les temps</h2><div id="pop">${skeletons(6)}</div>`;
  if (resume.length) loadResume(resume);
  $('#chips').onclick = async e => {
    const b = e.target.closest('.chip'); if (!b) return;
    genre = b.textContent === 'Tout' ? '' : b.textContent;
    document.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b));
    $('#trend').innerHTML = skeletons(12);
    $('#trend').innerHTML = gridHtml(await list('TRENDING_DESC', '', { g: genre ? (GENRE_EN[genre] || genre) : null }));
  };
  list('POPULARITY_DESC').then(ms => { const el = $('#pop'); if (el) el.innerHTML = gridHtml(ms); }).catch(() => {});
}
const continueList = () => Object.entries(progress()).filter(([, p]) => p.ep).sort((a, b) => b[1].updated - a[1].updated).slice(0, 8);
async function loadResume(items) {
  const data = await gql(`query($ids:[Int]){Page{media(id_in:$ids){${FIELDS}}}}`, { ids: items.map(([id]) => +id) }).catch(() => null);
  const el = $('#resume'); if (!el || !data) return;
  el.innerHTML = items.map(([id, p]) => {
    const m = data.Page.media.find(x => x.id == id); if (!m) return '';
    const pct = p.d ? (p.t / p.d) * 100 : 0;
    return `<a class="card" href="#/watch/${id}/${p.ep}"><span class="badge">EP ${p.ep}</span>
      <img loading="lazy" src="${esc(m.coverImage.large)}" alt=""><div class="meta"><div class="t">${esc(name(m))}</div><div class="s">Reprendre l'épisode ${p.ep}</div></div>
      <div class="bar"><i style="width:${pct}%"></i></div></a>`;
  }).join('');
}

/* ---------- Recherche ---------- */
$('#searchForm').addEventListener('submit', e => {
  e.preventDefault(); const q = $('#q').value.trim();
  if (q) location.hash = '#/search/' + encodeURIComponent(q);
});
async function pageSearch(q) {
  view.innerHTML = `<h1>Résultats pour « ${esc(q)} »</h1><div style="margin-top:18px">${skeletons(12)}</div>`;
  const ms = await list('SEARCH_MATCH', '', { s: q });
  view.innerHTML = `<h1>Résultats pour « ${esc(q)} »</h1><div style="margin-top:18px">${ms.length ? gridHtml(ms) : '<div class="empty"><h3>Aucun résultat</h3><p>Essayez le titre original (romaji).</p></div>'}</div>`;
}

/* ---------- Fiche animé ---------- */
const PLATFORMS = [
  ['Crunchyroll', q => `https://www.crunchyroll.com/fr/search?q=${q}`],
  ['ADN', q => `https://animedigitalnetwork.com/search?search=${q}`],
  ['Netflix', q => `https://www.netflix.com/search?q=${q}`],
  ['Prime Video', q => `https://www.primevideo.com/search/?phrase=${q}`],
  ['Disney+', q => `https://www.disneyplus.com/fr-fr/search/${q}`],
];
async function pageAnime(id) {
  view.innerHTML = skeletons(1);
  const m = await one(id);
  const src = sources()[id], pr = progress()[id] || {}, seen = new Set(pr.seen || []);
  const total = m.episodes || src?.eps || m.nextAiringEpisode?.episode - 1 || 12;
  const q = encodeURIComponent(m.title.romaji);
  const official = (m.externalLinks || []).filter(l => l.type === 'STREAMING');
  view.innerHTML = `
  <div class="detail">
    <img class="cover" src="${esc(m.coverImage.extraLarge)}" alt="Affiche de ${esc(name(m))}">
    <div>
      <h1>${esc(name(m))}</h1>
      <div class="muted">${esc(m.title.romaji)}</div>
      <div class="tags">${[m.format, m.seasonYear, m.episodes ? m.episodes + ' épisodes' : '', m.averageScore ? '★ ' + m.averageScore / 10 : '', ...(m.genres || [])].filter(Boolean).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
      <p class="synopsis">${esc(stripHtml(m.description)).replace(/\n/g, '<br>')}</p>
      <div class="btns">
        ${src ? `<a class="btn primary" href="#/watch/${id}/${pr.ep || 1}">▶ ${pr.ep ? 'Reprendre l\'épisode ' + pr.ep : 'Regarder'}</a>` : ''}
        <a class="btn" href="#/library">Ma bibliothèque</a>
      </div>

      <div class="panel"><h3>Où regarder en VF (offres officielles)</h3>
        <div class="where">${official.map(l => `<a class="btn small" target="_blank" rel="noopener noreferrer" href="${esc(l.url)}">${esc(l.site)}</a>`).join('')}
        ${PLATFORMS.map(([n, f]) => `<a class="btn small" target="_blank" rel="noopener noreferrer" href="${esc(f(q))}">${n} ↗</a>`).join('')}</div>
        <p class="hint" style="margin-top:8px">Les liens ouvrent les plateformes légales. La disponibilité de la VF dépend de l'éditeur.</p>
      </div>

      <div class="panel"><h3>${src ? 'Source de lecture' : 'Ajouter une source de lecture'}</h3>
        <form class="form" id="srcForm">
          <label>URL de l'épisode (utilisez <code>{ep}</code> pour le numéro)
            <input name="url" required placeholder="https://mon-serveur.tld/anime/vf/episode-{ep}.mp4 ou .m3u8" value="${esc(src?.url || '')}"></label>
          <div class="row">
            <label>Premier épisode<input name="start" type="number" min="0" value="${src?.start ?? 1}"></label>
            <label>Nombre d'épisodes<input name="eps" type="number" min="1" value="${src?.eps || m.episodes || ''}"></label>
          </div>
          <label>Type<select name="kind"><option value="video" ${src?.kind !== 'embed' ? 'selected' : ''}>Fichier vidéo / HLS (lecture auto complète)</option><option value="embed" ${src?.kind === 'embed' ? 'selected' : ''}>Lecteur intégré (iframe)</option></select></label>
          <p class="hint">Ne renseignez que des contenus dont vous détenez les droits ou librement diffusables (serveur personnel, Jellyfin/Plex, domaine public…).</p>
          <div class="btns"><button class="btn primary" type="submit">Enregistrer</button>${src ? '<button class="btn" type="button" id="rmSrc">Supprimer</button>' : ''}</div>
        </form>
      </div>

      ${src ? `<h2>Épisodes</h2><div class="eps">${Array.from({ length: src.eps || total }, (_, i) => i + (src.start ?? 1)).map(n =>
        `<a class="ep ${seen.has(n) ? 'seen' : ''} ${pr.ep === n ? 'cur' : ''}" href="#/watch/${id}/${n}">${n}</a>`).join('')}</div>` : ''}
    </div>
  </div>`;
  $('#srcForm').onsubmit = e => {
    e.preventDefault(); const f = new FormData(e.target);
    const url = String(f.get('url')).trim();
    if (!/^https?:\/\//i.test(url)) return toast('L\'URL doit commencer par http(s)://');
    const all = sources();
    all[id] = { title: name(m), cover: m.coverImage.large, url, kind: f.get('kind'), start: +f.get('start'), eps: +f.get('eps') || total };
    store.set('sources', all); toast('Source enregistrée'); pageAnime(id);
  };
  $('#rmSrc')?.addEventListener('click', () => { const all = sources(); delete all[id]; store.set('sources', all); pageAnime(id); });
}

/* ---------- Lecteur ---------- */
let hlsLoader;
const loadHls = () => hlsLoader ||= new Promise((res, rej) => {
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js';
  s.onload = () => res(window.Hls); s.onerror = rej; document.head.append(s);
});

async function pageWatch(id, ep) {
  const src = sources()[id];
  if (!src) { location.hash = '#/anime/' + id; return; }
  const cfg = settings();
  const last = (src.start ?? 1) + (src.eps || 1) - 1;
  const url = src.url.replaceAll('{ep}', ep).replaceAll('{ep2}', String(ep).padStart(2, '0'));
  const prog = progress();
  const p = prog[id] || { seen: [] };
  const resumeAt = p.ep === ep && cfg.autolaunch ? p.t : 0;

  view.innerHTML = `<div class="player-wrap">
    <div class="stage" id="stage">
      ${src.kind === 'embed' ? `<iframe src="${esc(url)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-presentation"></iframe>`
        : `<video id="v" controls playsinline preload="auto"></video>
           <button class="btn skip" id="skip">Passer l'intro ⏭</button>
           <div class="next-card" id="next"><div><div class="hint" style="color:#aaa">Épisode suivant dans</div><b id="cd"></b></div>
             <button class="btn primary small" id="goNext">Lire</button><button class="btn small" id="cancel">Annuler</button></div>`}
    </div>
    <div class="player-bar">
      <div><h1>${esc(src.title)}</h1><div class="muted">Épisode ${ep} / ${last}</div></div>
      <div class="btns">
        <a class="btn small" href="#/anime/${id}">Fiche</a>
        <a class="btn small" ${ep > (src.start ?? 1) ? `href="#/watch/${id}/${ep - 1}"` : 'aria-disabled="true"'}>⏮ Précédent</a>
        <a class="btn small primary" ${ep < last ? `href="#/watch/${id}/${ep + 1}"` : 'aria-disabled="true"'}>Suivant ⏭</a>
      </div>
    </div>
    ${src.kind === 'embed' ? '<p class="hint">Mode lecteur intégré : la lecture automatique de l\'épisode suivant n\'est pas possible, utilisez « Suivant ».</p>'
      : '<p class="hint">Raccourcis : Espace lecture · ←/→ ±10 s · N suivant · S passer l\'intro · F plein écran</p>'}
  </div>`;

  const save = patch => {
    const all = progress(); all[id] = { ...(all[id] || { seen: [] }), ep, updated: Date.now(), ...patch };
    store.set('progress', all);
  };
  save({});
  if (src.kind === 'embed') { save({ seen: [...new Set([...(p.seen || []), ep])] }); return; }

  const v = $('#v'); let hls, timer, nextTimer, done = false;
  v.playbackRate = cfg.speed;
  try {
    if (/\.m3u8(\?|$)/i.test(url) && !v.canPlayType('application/vnd.apple.mpegurl')) {
      const Hls = await loadHls();
      if (Hls.isSupported()) { hls = new Hls(); hls.loadSource(url); hls.attachMedia(v); }
      else v.src = url;
    } else v.src = url;
  } catch { v.src = url; }

  v.addEventListener('loadedmetadata', () => { if (resumeAt > 5 && resumeAt < v.duration - 20) v.currentTime = resumeAt; });
  v.addEventListener('error', () => toast('Lecture impossible : vérifiez l\'URL de la source'));
  const play = () => v.play().catch(() => { v.muted = true; return v.play().then(() => toast('Lecture muette (autoplay bloqué) — touchez pour activer le son')).catch(() => toast('Appuyez sur lecture pour démarrer')); });
  if (cfg.autoplay) play();

  const skip = $('#skip');
  v.addEventListener('timeupdate', () => {
    const inIntro = v.currentTime > 5 && v.currentTime < cfg.skipSec + 5 && v.duration > 600;
    if (inIntro && cfg.autoskip && !skip.dataset.done) { v.currentTime = cfg.skipSec; skip.dataset.done = 1; }
    skip.classList.toggle('show', inIntro && !skip.dataset.done);
    if (v.duration && v.duration - v.currentTime < 90 && !done) { done = true; save({ seen: [...new Set([...(prog[id]?.seen || []), ep])] }); }
  });
  skip.onclick = () => { v.currentTime = cfg.skipSec; skip.dataset.done = 1; };
  timer = setInterval(() => { if (!v.paused && v.duration) save({ t: v.currentTime, d: v.duration }); }, 5000);

  const goNext = () => { location.hash = `#/watch/${id}/${ep + 1}`; };
  v.addEventListener('ended', () => {
    save({ t: 0, d: v.duration, seen: [...new Set([...(progress()[id]?.seen || []), ep])] });
    if (!cfg.autonext || ep >= last) { if (ep >= last) toast('Dernier épisode terminé 🎉'); return; }
    let n = cfg.countdown; $('#next').classList.add('show'); $('#cd').textContent = n + ' s';
    if (document.fullscreenElement) document.fullscreenElement.classList?.add('fs');
    nextTimer = setInterval(() => { $('#cd').textContent = --n + ' s'; if (n <= 0) { clearInterval(nextTimer); goNext(); } }, 1000);
    $('#goNext').onclick = () => { clearInterval(nextTimer); goNext(); };
    $('#cancel').onclick = () => { clearInterval(nextTimer); $('#next').classList.remove('show'); };
  });

  const keys = e => {
    if (/input|textarea|select/i.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); v.paused ? v.play() : v.pause(); }
    else if (k === 'arrowright') v.currentTime += 10;
    else if (k === 'arrowleft') v.currentTime -= 10;
    else if (k === 'n' && ep < last) goNext();
    else if (k === 's') skip.click();
    else if (k === 'f') document.fullscreenElement ? document.exitFullscreen() : $('#stage').requestFullscreen?.();
  };
  addEventListener('keydown', keys);

  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: `Épisode ${ep}`, artist: src.title, artwork: [{ src: src.cover }] });
    navigator.mediaSession.setActionHandler('nexttrack', ep < last ? goNext : null);
    navigator.mediaSession.setActionHandler('previoustrack', ep > (src.start ?? 1) ? () => location.hash = `#/watch/${id}/${ep - 1}` : null);
  }
  teardown = () => {
    clearInterval(timer); clearInterval(nextTimer); removeEventListener('keydown', keys);
    if (v.duration && !v.ended) save({ t: v.currentTime, d: v.duration });
    hls?.destroy(); v.removeAttribute('src'); v.load();
    if ('mediaSession' in navigator) { navigator.mediaSession.setActionHandler('nexttrack', null); navigator.mediaSession.setActionHandler('previoustrack', null); }
  };
}

/* ---------- Bibliothèque ---------- */
async function pageLibrary() {
  const src = sources(), ids = Object.keys(src);
  if (!ids.length) {
    view.innerHTML = `<div class="empty"><h3>Votre bibliothèque est vide</h3><p>Ouvrez la fiche d'un animé et ajoutez une source de lecture.</p><p><a class="btn primary" href="#/">Découvrir</a></p></div>`;
    return;
  }
  view.innerHTML = `<h1>Ma bibliothèque</h1><div class="grid" style="margin-top:18px">${ids.map(id => {
    const s = src[id], pr = progress()[id], pct = pr?.d ? (pr.t / pr.d) * 100 : 0;
    return `<a class="card" href="#/anime/${id}"><span class="badge">VF</span><img loading="lazy" src="${esc(s.cover)}" alt="">
      <div class="meta"><div class="t">${esc(s.title)}</div><div class="s">${pr?.ep ? 'Épisode ' + pr.ep : s.eps + ' épisodes'}</div></div>
      ${pr ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ''}</a>`;
  }).join('')}</div>`;
}

/* ---------- Réglages ---------- */
function pageSettings() {
  const c = settings();
  const sw = (k, label, hint) => `<label class="switch"><span>${label}<div class="hint">${hint}</div></span><input type="checkbox" data-k="${k}" ${c[k] ? 'checked' : ''}></label>`;
  view.innerHTML = `<h1>Réglages</h1><div class="panel" style="max-width:640px">
    ${sw('autoplay', 'Lecture automatique', 'Démarre la vidéo dès l\'ouverture d\'un épisode.')}
    ${sw('autonext', 'Épisode suivant automatique', 'Enchaîne après un compte à rebours, annulable.')}
    ${sw('autoskip', 'Passer l\'intro automatiquement', 'Saute l\'ouverture (durée réglable ci-dessous).')}
    ${sw('autolaunch', 'Reprise automatique', 'Relance la dernière lecture à l\'ouverture de l\'app et reprend où vous vous étiez arrêté.')}
    <div class="form" style="margin-top:16px"><div class="row">
      <label>Fin de l'intro (secondes)<input type="number" min="10" max="300" data-k="skipSec" value="${c.skipSec}"></label>
      <label>Compte à rebours (secondes)<input type="number" min="1" max="30" data-k="countdown" value="${c.countdown}"></label></div>
      <label>Vitesse<select data-k="speed">${[0.75, 1, 1.25, 1.5, 2].map(s => `<option ${s == c.speed ? 'selected' : ''}>${s}</option>`).join('')}</select></label></div>
    <div class="btns" style="margin-top:20px">
      <button class="btn small" id="exp">Exporter mes données</button>
      <label class="btn small">Importer<input id="imp" type="file" accept="application/json" hidden></label>
      <button class="btn small" id="reset">Effacer l'historique</button></div>
  </div>`;
  view.oninput = e => {
    const k = e.target.dataset.k; if (!k) return;
    const v = e.target.type === 'checkbox' ? e.target.checked : +e.target.value;
    store.set('settings', { ...settings(), [k]: v });
  };
  $('#exp').onclick = () => {
    const blob = new Blob([JSON.stringify({ sources: sources(), progress: progress(), settings: settings() }, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'kitsune-vf.json' }); a.click(); URL.revokeObjectURL(a.href);
  };
  $('#imp').onchange = async e => {
    try { const d = JSON.parse(await e.target.files[0].text()); ['sources', 'progress', 'settings'].forEach(k => d[k] && store.set(k, d[k])); toast('Import réussi'); pageSettings(); }
    catch { toast('Fichier invalide'); }
  };
  $('#reset').onclick = () => { if (confirm('Effacer tout l\'historique de lecture ?')) { store.set('progress', {}); toast('Historique effacé'); } };
}

/* ---------- Démarrage ---------- */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
// Reprise automatique de la dernière lecture à l'ouverture
if (!location.hash && settings().autolaunch) {
  const [id, p] = continueList()[0] || [];
  if (id && sources()[id]) location.hash = `#/watch/${id}/${p.ep}`;
}
route();
