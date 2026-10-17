// Tontine Manager — app vanilla, sans build, données 100% locales (localStorage).
const LS_KEY = 'tontines_v1';

// ---------- Utils ----------
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
function toISO(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function todayISO() { return toISO(new Date()); }
function addInterval(dateISO, freq, n) {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (freq === 'weekly') dt.setDate(dt.getDate() + 7 * n);
  else if (freq === 'biweekly') dt.setDate(dt.getDate() + 14 * n);
  else dt.setMonth(dt.getMonth() + n);
  return toISO(dt);
}
function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtMoney(n, cur) {
  const v = Math.round((n + Number.EPSILON) * 100) / 100;
  return v.toLocaleString('fr-FR') + ' ' + (cur || '');
}
function freqLabel(f) {
  return { weekly: 'Hebdomadaire', biweekly: 'Toutes les 2 semaines', monthly: 'Mensuelle' }[f] || f;
}
function csvEsc(s) {
  s = String(s ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ---------- Stockage ----------
function loadAll() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
  catch { return []; }
}
function saveAll(list) { localStorage.setItem(LS_KEY, JSON.stringify(list)); }

// ---------- Modèle tontine ----------
function parseMembers(text) {
  return String(text || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const [name, phone] = l.split(',').map(s => s && s.trim());
    return { id: uid(), name: name || l, phone: phone || '' };
  });
}
function buildRounds(t) {
  const total = t.members.length * (t.cycles || 1);
  const rounds = [];
  for (let i = 0; i < total; i++) {
    rounds.push({ index: i, date: addInterval(t.startDate, t.frequency, i), recipientId: t.order[i % t.order.length] });
  }
  return rounds;
}
function currentRoundIndex(rounds) {
  const today = todayISO();
  let idx = -1;
  rounds.forEach((r, i) => { if (r.date <= today) idx = i; });
  return idx;
}
function getPayment(t, roundIdx, memberId) {
  return (t.payments[roundIdx] && t.payments[roundIdx][memberId]) || { paid: false };
}
function setPayment(t, roundIdx, memberId, paid) {
  t.payments[roundIdx] = t.payments[roundIdx] || {};
  t.payments[roundIdx][memberId] = { paid, date: paid ? todayISO() : null, amount: t.amount };
}
function computeStats(t) {
  const rounds = buildRounds(t);
  const curIdx = currentRoundIndex(rounds);
  const roundsSoFar = curIdx + 1;
  let totalCollected = 0;
  const totalExpected = roundsSoFar * t.members.length * t.amount;
  const perMember = {};
  t.members.forEach(m => { perMember[m.id] = { paid: 0, due: roundsSoFar * t.amount, name: m.name }; });
  rounds.forEach((r, i) => {
    if (i > curIdx) return;
    t.members.forEach(m => {
      const p = getPayment(t, i, m.id);
      if (p.paid) { perMember[m.id].paid += t.amount; totalCollected += t.amount; }
    });
  });
  return { rounds, curIdx, totalCollected, totalExpected, perMember };
}
function roundBadge(t, i, curIdx, paidCount) {
  const allPaid = paidCount === t.members.length;
  if (i < curIdx) return allPaid ? { cls: 'ok', label: 'Terminé' } : { cls: 'warn', label: 'Incomplet' };
  if (i === curIdx) return allPaid ? { cls: 'ok', label: 'Terminé' } : { cls: 'current', label: 'En cours' };
  return { cls: 'future', label: 'À venir' };
}

function updateTontine(id, fn) {
  const list = loadAll();
  const t = list.find(x => x.id === id);
  if (!t) return null;
  fn(t);
  saveAll(list);
  return t;
}

// ---------- Rendu ----------
const view = () => document.getElementById('view');

function renderHome() {
  const list = loadAll();
  if (!list.length) {
    view().innerHTML = `<div class="empty">
      <div class="empty-icon">🤝</div>
      <h2>Aucune tontine pour le moment</h2>
      <p>Créez votre première tontine pour suivre les membres, les cotisations et les tours de versement.</p>
      <a class="btn primary" href="#/new">+ Créer une tontine</a>
    </div>`;
    return;
  }
  view().innerHTML = `<div class="page">
    <h1>Mes tontines</h1>
    <div class="cards">${list.map(cardHtml).join('')}</div>
  </div>`;
}

function cardHtml(t) {
  const { rounds, curIdx, totalCollected, totalExpected } = computeStats(t);
  const next = rounds[curIdx + 1] || rounds[rounds.length - 1];
  const recipient = next && t.members.find(m => m.id === next.recipientId);
  const pct = totalExpected ? Math.min(100, Math.round(totalCollected / totalExpected * 100)) : 0;
  return `<a class="card" href="#/t/${t.id}">
    <div class="card-head"><h3>${esc(t.name)}</h3><span class="badge">${freqLabel(t.frequency)}</span></div>
    <div class="card-body">
      <div class="row"><span>Cotisation</span><b>${fmtMoney(t.amount, t.currency)}</b></div>
      <div class="row"><span>Membres</span><b>${t.members.length}</b></div>
      ${next ? `<div class="row"><span>Prochain tour</span><b>${fmtDate(next.date)} · ${esc(recipient ? recipient.name : '?')}</b></div>` : ''}
    </div>
    <div class="progress"><div class="progress-bar" style="width:${pct}%"></div></div>
    <div class="progress-label">${pct}% collecté sur la période écoulée</div>
  </a>`;
}

function renderNew() {
  view().innerHTML = `<div class="page">
    <a class="back" href="#/">← Mes tontines</a>
    <h1>Nouvelle tontine</h1>
    <form data-form="new-tontine" class="tontine-form">
      <label>Nom de la tontine<input name="name" placeholder="Ex: Tontine des collègues" required></label>
      <div class="grid2">
        <label>Devise<input name="currency" value="FCFA" required></label>
        <label>Montant de la cotisation<input type="number" min="0" step="any" name="amount" placeholder="10000" required></label>
      </div>
      <div class="grid2">
        <label>Fréquence
          <select name="frequency">
            <option value="monthly" selected>Mensuelle</option>
            <option value="biweekly">Toutes les 2 semaines</option>
            <option value="weekly">Hebdomadaire</option>
          </select>
        </label>
        <label>Date de début<input type="date" name="startDate" value="${todayISO()}" required></label>
      </div>
      <label>Membres (un par ligne, "Nom, téléphone")
        <textarea name="members" rows="6" placeholder="Awa Diallo, 07 00 00 00 00&#10;Moussa Koné&#10;Fatou Sow, 05 11 22 33 44" required></textarea>
      </label>
      <button type="submit" class="btn primary">Créer la tontine</button>
    </form>
  </div>`;
}

function tabNav(t, tab) {
  const tabs = [['rounds', 'Tours'], ['members', 'Membres'], ['summary', 'Résumé'], ['settings', 'Réglages']];
  return `<div class="tabs">${tabs.map(([k, label]) => `<a class="${tab === k ? 'active' : ''}" href="#/t/${t.id}/${k}">${label}</a>`).join('')}</div>`;
}

function roundsTab(t) {
  const { rounds, curIdx } = computeStats(t);
  const openIdx = Math.max(curIdx, 0);
  return `<div class="rounds">
    ${rounds.map((r, i) => {
      const recipient = t.members.find(m => m.id === r.recipientId);
      const paidCount = t.members.filter(m => getPayment(t, i, m.id).paid).length;
      const badge = roundBadge(t, i, curIdx, paidCount);
      return `<details ${i === openIdx ? 'open' : ''}>
        <summary>
          <span class="round-num">Tour ${i + 1}</span>
          <span class="round-date">${fmtDate(r.date)}</span>
          <span class="round-recipient">→ ${esc(recipient ? recipient.name : '?')}</span>
          <span class="badge ${badge.cls}">${badge.label}</span>
          <span class="round-count">${paidCount}/${t.members.length}</span>
        </summary>
        <ul class="pay-list">
          ${t.members.map(m => {
            const p = getPayment(t, i, m.id);
            const isRecipient = m.id === r.recipientId;
            return `<li class="${isRecipient ? 'is-recipient' : ''}">
              <label>
                <input type="checkbox" data-action="toggle-pay" data-tontine="${t.id}" data-round="${i}" data-member="${m.id}" ${p.paid ? 'checked' : ''}>
                <span>${esc(m.name)}${isRecipient ? ' <em>(bénéficiaire)</em>' : ''}</span>
              </label>
              <span class="pay-amount">${p.paid ? fmtMoney(t.amount, t.currency) : '—'}</span>
            </li>`;
          }).join('')}
        </ul>
      </details>`;
    }).join('')}
    <button data-action="add-cycle" data-tontine="${t.id}" class="btn">+ Ajouter un cycle complet (${t.members.length} tours)</button>
  </div>`;
}

function membersTab(t) {
  return `<div class="members">
    <p class="hint">L'ordre ci-dessous définit l'ordre de réception de la cagnotte à chaque tour.</p>
    <ul class="member-list">
      ${t.order.map((mid, i) => {
        const m = t.members.find(x => x.id === mid);
        if (!m) return '';
        return `<li>
          <span class="order-num">${i + 1}</span>
          <span class="member-name">${esc(m.name)}${m.phone ? ` <small>${esc(m.phone)}</small>` : ''}</span>
          <span class="member-actions">
            <button data-action="move-up" data-tontine="${t.id}" data-member="${mid}" ${i === 0 ? 'disabled' : ''} aria-label="Monter">↑</button>
            <button data-action="move-down" data-tontine="${t.id}" data-member="${mid}" ${i === t.order.length - 1 ? 'disabled' : ''} aria-label="Descendre">↓</button>
            <button data-action="remove-member" data-tontine="${t.id}" data-member="${mid}" class="danger" aria-label="Retirer">✕</button>
          </span>
        </li>`;
      }).join('')}
    </ul>
    <form data-form="add-member" data-tontine="${t.id}" class="add-member-form">
      <input name="name" placeholder="Nom" required>
      <input name="phone" placeholder="Téléphone (optionnel)">
      <button type="submit" class="btn">+ Ajouter</button>
    </form>
  </div>`;
}

function summaryTab(t) {
  const { curIdx, totalCollected, totalExpected, perMember } = computeStats(t);
  const pct = totalExpected ? Math.round(totalCollected / totalExpected * 100) : 0;
  return `<div class="summary">
    <div class="stat-cards">
      <div class="stat"><span>Total collecté</span><b>${fmtMoney(totalCollected, t.currency)}</b></div>
      <div class="stat"><span>Total attendu</span><b>${fmtMoney(totalExpected, t.currency)}</b></div>
      <div class="stat"><span>Progression</span><b>${pct}%</b></div>
    </div>
    <div class="progress big"><div class="progress-bar" style="width:${Math.min(100, pct)}%"></div></div>
    <table class="tbl">
      <thead><tr><th>Membre</th><th>Dû</th><th>Payé</th><th>Solde</th></tr></thead>
      <tbody>
        ${t.order.map(mid => {
          const m = t.members.find(x => x.id === mid);
          if (!m) return '';
          const s = perMember[mid] || { due: 0, paid: 0 };
          const balance = s.paid - s.due;
          return `<tr>
            <td>${esc(m.name)}</td>
            <td>${fmtMoney(s.due, t.currency)}</td>
            <td>${fmtMoney(s.paid, t.currency)}</td>
            <td class="${balance < 0 ? 'neg' : 'pos'}">${balance >= 0 ? '+' : ''}${fmtMoney(balance, t.currency)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    ${curIdx < 0 ? '<p class="hint">Le premier tour n\'a pas encore commencé.</p>' : ''}
  </div>`;
}

function settingsTab(t) {
  return `<form data-form="edit-settings" data-tontine="${t.id}" class="settings-form">
    <label>Nom<input name="name" value="${esc(t.name)}" required></label>
    <div class="grid2">
      <label>Devise<input name="currency" value="${esc(t.currency)}" required></label>
      <label>Montant de la cotisation<input type="number" min="0" step="any" name="amount" value="${t.amount}" required></label>
    </div>
    <div class="grid2">
      <label>Fréquence
        <select name="frequency">
          <option value="monthly" ${t.frequency === 'monthly' ? 'selected' : ''}>Mensuelle</option>
          <option value="biweekly" ${t.frequency === 'biweekly' ? 'selected' : ''}>Toutes les 2 semaines</option>
          <option value="weekly" ${t.frequency === 'weekly' ? 'selected' : ''}>Hebdomadaire</option>
        </select>
      </label>
      <label>Date de début<input type="date" name="startDate" value="${t.startDate}" required></label>
    </div>
    <button type="submit" class="btn primary">Enregistrer</button>
  </form>
  <div class="danger-zone">
    <button data-action="export-csv" data-tontine="${t.id}" class="btn">⬇️ Exporter en CSV</button>
    <button data-action="delete-tontine" data-tontine="${t.id}" class="btn danger">🗑️ Supprimer la tontine</button>
  </div>`;
}

function renderDetail(id, tab) {
  const list = loadAll();
  const t = list.find(x => x.id === id);
  if (!t) { location.hash = '#/'; return; }
  let body;
  if (tab === 'members') body = membersTab(t);
  else if (tab === 'summary') body = summaryTab(t);
  else if (tab === 'settings') body = settingsTab(t);
  else { tab = 'rounds'; body = roundsTab(t); }
  view().innerHTML = `<div class="page">
    <a class="back" href="#/">← Mes tontines</a>
    <h1>${esc(t.name)}</h1>
    ${tabNav(t, tab)}
    <div class="tab-body">${body}</div>
  </div>`;
}

// ---------- Actions ----------
function handleNewTontine(form) {
  const data = new FormData(form);
  const name = (data.get('name') || '').trim();
  const currency = (data.get('currency') || 'FCFA').trim() || 'FCFA';
  const amount = parseFloat(data.get('amount'));
  const frequency = data.get('frequency');
  const startDate = data.get('startDate') || todayISO();
  const members = parseMembers(data.get('members'));
  if (!name) return toast('Donnez un nom à la tontine');
  if (!amount || amount <= 0) return toast('Montant de cotisation invalide');
  if (members.length < 2) return toast('Ajoutez au moins 2 membres');
  const t = { id: uid(), name, currency, amount, frequency, startDate, members, order: members.map(m => m.id), payments: {}, cycles: 1, createdAt: Date.now() };
  const list = loadAll();
  list.push(t);
  saveAll(list);
  location.hash = '#/t/' + t.id;
  toast('Tontine créée !');
}

function handleAddMember(form) {
  const tid = form.dataset.tontine;
  const name = (form.name.value || '').trim();
  const phone = (form.phone.value || '').trim();
  if (!name) return toast('Nom requis');
  updateTontine(tid, t => {
    const m = { id: uid(), name, phone };
    t.members.push(m);
    t.order.push(m.id);
  });
  form.reset();
  renderDetail(tid, 'members');
  toast('Membre ajouté');
}

function handleEditSettings(form) {
  const tid = form.dataset.tontine;
  const data = new FormData(form);
  updateTontine(tid, t => {
    t.name = (data.get('name') || t.name).trim();
    t.currency = (data.get('currency') || t.currency).trim();
    const amount = parseFloat(data.get('amount'));
    if (amount > 0) t.amount = amount;
    t.frequency = data.get('frequency') || t.frequency;
    t.startDate = data.get('startDate') || t.startDate;
  });
  renderDetail(tid, 'settings');
  toast('Modifications enregistrées');
}

function exportCsv(t) {
  const { rounds } = computeStats(t);
  const lines = [['Tour', 'Date', 'Bénéficiaire', 'Membre', 'Payé', 'Montant', 'Date de paiement'].join(',')];
  rounds.forEach((r, i) => {
    const recipient = t.members.find(m => m.id === r.recipientId);
    t.members.forEach(m => {
      const p = getPayment(t, i, m.id);
      lines.push([i + 1, r.date, csvEsc(recipient ? recipient.name : ''), csvEsc(m.name), p.paid ? 'Oui' : 'Non', p.paid ? t.amount : '', p.date || ''].join(','));
    });
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${t.name.replace(/[^a-z0-9]+/gi, '_')}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast('Export CSV lancé');
}

function onSubmit(e) {
  const form = e.target;
  if (!(form instanceof HTMLFormElement)) return;
  const kind = form.dataset.form;
  if (!kind) return;
  e.preventDefault();
  if (kind === 'new-tontine') handleNewTontine(form);
  else if (kind === 'add-member') handleAddMember(form);
  else if (kind === 'edit-settings') handleEditSettings(form);
}

function onClick(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  if (action === 'toggle-pay') return;
  const tid = el.dataset.tontine;
  const list = loadAll();
  const t = list.find(x => x.id === tid);
  if (!t) return;

  if (action === 'move-up' || action === 'move-down') {
    const mid = el.dataset.member;
    const idx = t.order.indexOf(mid);
    const j = idx + (action === 'move-up' ? -1 : 1);
    if (idx < 0 || j < 0 || j >= t.order.length) return;
    [t.order[idx], t.order[j]] = [t.order[j], t.order[idx]];
    saveAll(list);
    renderDetail(t.id, 'members');
  } else if (action === 'remove-member') {
    if (t.members.length <= 2) return toast('Minimum 2 membres requis');
    if (!confirm('Retirer ce membre ? Son historique de paiement sera supprimé.')) return;
    const mid = el.dataset.member;
    t.members = t.members.filter(m => m.id !== mid);
    t.order = t.order.filter(id => id !== mid);
    Object.values(t.payments).forEach(p => { delete p[mid]; });
    saveAll(list);
    renderDetail(t.id, 'members');
    toast('Membre retiré');
  } else if (action === 'add-cycle') {
    t.cycles = (t.cycles || 1) + 1;
    saveAll(list);
    renderDetail(t.id, 'rounds');
    toast('Nouveau cycle ajouté');
  } else if (action === 'delete-tontine') {
    if (!confirm(`Supprimer définitivement "${t.name}" ? Cette action est irréversible.`)) return;
    saveAll(list.filter(x => x.id !== tid));
    location.hash = '#/';
    toast('Tontine supprimée');
  } else if (action === 'export-csv') {
    exportCsv(t);
  }
}

function onChange(e) {
  if (!e.target.matches('[data-action="toggle-pay"]')) return;
  const el = e.target;
  const tid = el.dataset.tontine, ridx = +el.dataset.round, mid = el.dataset.member;
  updateTontine(tid, t => setPayment(t, ridx, mid, el.checked));
  renderDetail(tid, 'rounds');
}

// ---------- Router ----------
function parseHash() {
  return (location.hash || '#/').slice(1).split('/').filter(Boolean);
}
function router() {
  const parts = parseHash();
  if (parts[0] === 'new') renderNew();
  else if (parts[0] === 't' && parts[1]) renderDetail(parts[1], parts[2] || 'rounds');
  else renderHome();
  view().focus();
}

document.addEventListener('submit', onSubmit);
document.addEventListener('click', onClick);
document.addEventListener('change', onChange);
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);
if (document.readyState !== 'loading') router();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
