'use strict';
/* Appli Courses — V1 (local, hors ligne). La synchronisation viendra se brancher dans save(). */

const KEY = 'courses.v1';
const APP_VERSION = '1.3 (25/11/2026)';
const DEFAULT_CATS = ['Fruits et légumes', 'Boucherie / poisson', 'Crèmerie / frais', 'Boulangerie',
  'Épicerie', 'Boissons', 'Surgelés', 'Hygiène / entretien', 'Autre'];

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, r = document) => r.querySelector(s);

/* ---------- Données ---------- */
function fresh() {
  const l = { id: uid(), name: 'Courses', items: [], createdAt: Date.now() };
  return { schema: 1, categories: [...DEFAULT_CATS], products: [], lists: [l], currentList: l.id, history: [], tickets: [], labelMap: {}, updatedAt: Date.now() };
}
function migrate(d) {
  const s = Object.assign(fresh(), d);
  if (!Array.isArray(s.lists) || !s.lists.length) { const f = fresh(); s.lists = f.lists; s.currentList = f.currentList; }
  if (!s.lists.some(l => l.id === s.currentList)) s.currentList = s.lists[0].id;
  if (!Array.isArray(s.categories) || !s.categories.length) s.categories = [...DEFAULT_CATS];
  if (!s.categories.includes('Autre')) s.categories.push('Autre');
  if (!Array.isArray(s.products)) s.products = [];
  if (!Array.isArray(s.history)) s.history = [];
  if (!Array.isArray(s.tickets)) s.tickets = [];
  if (!s.labelMap || typeof s.labelMap !== 'object') s.labelMap = {};
  return s;
}
function load() {
  try { const r = localStorage.getItem(KEY); if (r) return migrate(JSON.parse(r)); } catch (e) { console.error(e); }
  return fresh();
}
let S = load();
let tab = 'lists';
let catQuery = '';

function save() {
  S.updatedAt = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Stockage plein : exporte tes données'); }
}

const curList = () => S.lists.find(l => l.id === S.currentList) || S.lists[0];
const prodById = id => S.products.find(p => p.id === id);
const prodByName = n => S.products.find(p => p.name.toLowerCase() === n.trim().toLowerCase());
const orderedCats = used => [...S.categories, ...used.filter(c => !S.categories.includes(c))];

function addItem(pid, qty) {
  const L = curList();
  const ex = L.items.find(i => i.productId === pid && i.status !== 'cart');
  if (ex) { ex.qty += qty; if (ex.status === 'unavailable') ex.status = 'todo'; }
  else L.items.push({ id: uid(), productId: pid, qty, note: '', status: 'todo' });
  save();
}

function suggestions() {
  const on = new Set(curList().items.map(i => i.productId));
  const m = {};
  S.history.forEach(h => { const e = (m[h.productId] = m[h.productId] || { n: 0, last: 0 }); e.n++; e.last = Math.max(e.last, h.date); });
  return Object.entries(m)
    .filter(([id, v]) => v.n >= 2 && !on.has(id) && prodById(id))
    .sort((a, b) => b[1].n - a[1].n || b[1].last - a[1].last)
    .slice(0, 12).map(([id, v]) => ({ id, n: v.n }));
}

/* ---------- UI utilitaires ---------- */
let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}
function modal(html) { const m = $('#modal'); m.innerHTML = `<div class="sheet">${html}</div>`; m.hidden = false; }
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }
const catSelect = (id, sel) => `<select id="${id}">${S.categories.map(c => `<option ${c === sel ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>`;

/* ---------- Tickets de caisse : outils ---------- */
const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const num = v => { if (v == null || v === '') return 0; const n = parseFloat(String(v).replace(',', '.').replace(/[^\d.\-]/g, '')); return isFinite(n) ? n : 0; };
const r2 = n => Math.round(n * 100) / 100;
const fmt = n => r2(n).toFixed(2).replace('.', ',');
const today = () => new Date().toLocaleDateString('sv-SE');
const prodByNorm = n => { const k = norm(n); return k ? S.products.find(p => norm(p.name) === k) : null; };
const mapGet = (store, label) => { const m = S.labelMap[norm(store)]; const id = m && m[norm(label)]; return id && prodById(id) ? id : null; };
const mapSet = (store, label, pid) => { const s = norm(store), l = norm(label); if (!s || !l) return; (S.labelMap[s] = S.labelMap[s] || {})[l] = pid; };
function matchCat(r) {
  const k = norm(r); if (!k) return 'Autre';
  return S.categories.find(c => norm(c) === k) || S.categories.find(c => norm(c).includes(k) || k.includes(norm(c))) || 'Autre';
}
function lastPrices() {
  const out = {};
  S.tickets.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(t => t.lines.forEach(l => { out[l.productId] = { price: l.unitPrice, store: t.store }; }));
  return out;
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch (e) { /* repli ci-dessous */ }
  const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (e) { } ta.remove(); return ok;
}

// Consignes à donner à l'IA (Gemini ou Claude) avec la photo du ticket.
function buildPrompt() {
  return `Tu reçois la photo ou le PDF d'un ticket de caisse. Extrais-en les informations et réponds UNIQUEMENT avec un JSON valide (sans texte autour, sans balises de code), de cette forme :
{
  "magasin": "nom de l'enseigne",
  "date": "AAAA-MM-JJ",
  "total": 0.00,
  "lignes": [
    {
      "designation": "libellé exact imprimé sur le ticket",
      "nom": "nom court et lisible du produit (ex. Lait demi-écrémé 1L)",
      "quantite": 1,
      "unite": "",
      "prix_unitaire": 0.00,
      "remise": 0.00,
      "rayon": "un rayon de la liste ci-dessous"
    }
  ]
}
Règles :
- Une entrée par produit acheté. Ignore les lignes de total, TVA, paiement et points fidélité.
- "quantite" : nombre d'articles, ou poids en kg si le produit est vendu au poids (alors "unite" vaut "kg"). Sinon laisse "unite" vide.
- "prix_unitaire" : prix TTC d'une unité (ou du kilo), avant remise, en euros, avec un point décimal.
- "remise" : avantage carte, promotion ou réduction liée à ce produit, en nombre positif (0 s'il n'y en a pas). Si la remise est imprimée sur une ligne séparée, rattache-la au produit concerné.
- "rayon" : choisis exactement UNE valeur parmi : ${S.categories.join(' | ')}
- "total" : le montant total payé inscrit sur le ticket.
- Si une information est illisible, mets null plutôt que d'inventer.`;
}

function parseTicket(txt) {
  const t = String(txt || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  if (t.includes('libellé exact imprimé')) throw new Error("c'est la consigne, pas la réponse de l'IA");
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('aucun JSON trouvé');
  const d = JSON.parse(t.slice(a, b + 1));
  if (!d || !Array.isArray(d.lignes) || !d.lignes.length) throw new Error('aucune ligne de produit');
  return d;
}

function buildReview(d) {
  const store = String(d.magasin || '').trim();
  const lines = d.lignes.map(l => {
    const label = String(l.designation || l.nom || '').trim();
    const nom = String(l.nom || l.designation || '').trim();
    const mapped = mapGet(store, label);
    const p = (mapped && prodById(mapped)) || prodByNorm(nom);
    return {
      on: true, label, nom: p ? p.name : nom, cat: p ? p.category : matchCat(l.rayon),
      qty: num(l.quantite) || 1, unit: String(l.unite || '').trim(), price: num(l.prix_unitaire), disc: Math.abs(num(l.remise)),
    };
  });
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(d.date || '')) ? d.date : today();
  return { store, date, total: num(d.total), lines };
}

function shrinkImage(file, max = 2200) {
  return new Promise(res => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(b => { URL.revokeObjectURL(url); res(b ? new File([b], 'ticket.jpg', { type: 'image/jpeg' }) : file); }, 'image/jpeg', 0.85);
      } catch (e) { URL.revokeObjectURL(url); res(file); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); res(file); };
    img.src = url;
  });
}
async function loadPhoto(f) {
  const pdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name || '');
  if (!pdf && !/^image\//.test(f.type || '') && !/\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(f.name || '')) { toast('Fichier non pris en charge : choisis un PDF ou une image'); return; }
  const out = pdf ? f : await shrinkImage(f);
  if (imp.photo) URL.revokeObjectURL(imp.photo);
  imp.photoFile = out; imp.photo = pdf ? null : URL.createObjectURL(out); imp.isPdf = pdf; imp.fileName = f.name || 'ticket.pdf';
  render();
}

// Au retour depuis Claude ou Gemini : si le presse-papiers contient la réponse, on remplit le formulaire.
async function checkClipboardForTicket() {
  if (!imp.waiting || imp.review) return;
  try {
    const t = await navigator.clipboard.readText();
    if (!/"lignes"/.test(t)) return;
    const review = buildReview(parseTicket(t));
    imp.json = t; imp.review = review; imp.error = ''; imp.waiting = false; tab = 'tickets';
    render(); window.scrollTo(0, 0); toast('Ticket reconnu');
  } catch (e) { /* pas de droit de lecture ou pas encore la réponse : l'utilisateur colle à la main */ }
}

/* ---------- Vues ---------- */
let imp = { photo: null, photoFile: null, isPdf: false, fileName: '', review: null, json: '', error: '', waiting: false };
function resetImp() { if (imp.photo) URL.revokeObjectURL(imp.photo); imp = { photo: null, photoFile: null, isPdf: false, fileName: '', review: null, json: '', error: '', waiting: false }; }

function render() {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const v = $('#view');
  v.innerHTML = tab === 'lists' ? viewLists() : tab === 'catalog' ? viewCatalog() : tab === 'tickets' ? viewTickets() : viewData();
}

function itemRow(i) {
  const p = prodById(i.productId);
  const u = p && p.unit ? ' ' + esc(p.unit) : '';
  const sub = '× ' + i.qty + u + (i.note ? ' · ' + esc(i.note) : '') + (i.status === 'unavailable' ? ' · indisponible' : '');
  const mark = i.status === 'cart' ? '✔' : i.status === 'unavailable' ? '✖' : '';
  return `<div class="item ${i.status}">
    <button class="chk" data-act="toggle" data-id="${i.id}" aria-label="Dans le caddie">${mark}</button>
    <div class="txt" data-act="edit" data-id="${i.id}"><b>${esc(p ? p.name : '?')}</b><span>${sub}</span></div>
    <button class="ic sm" data-act="unavail" data-id="${i.id}" title="Indisponible" aria-label="Indisponible">⊘</button>
  </div>`;
}

function viewLists() {
  const L = curList();
  const opts = S.lists.map(l => `<option value="${l.id}" ${l.id === L.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('');
  const dl = S.products.map(p => `<option value="${esc(p.name)}">`).join('');
  const total = L.items.length;
  const done = L.items.filter(i => i.status === 'cart').length;
  let h = `<div class="bar"><select id="listSel">${opts}</select>
    <button class="ic" data-act="newList" aria-label="Nouvelle liste">＋</button>
    <button class="ic" data-act="listMenu" aria-label="Menu de la liste">⋯</button></div>
    <form id="addForm" class="add" autocomplete="off">
      <input id="addName" list="prodList" placeholder="Ajouter un article…" required>
      <datalist id="prodList">${dl}</datalist>
      <input id="addQty" type="number" min="1" value="1" inputmode="numeric" aria-label="Quantité">
      ${catSelect('addCat', 'Autre')}
      <button class="pri">Ajouter</button>
    </form>`;

  const sug = suggestions();
  if (sug.length) {
    h += `<div class="card"><h2>Suggestions</h2><p>Tes achats habituels, pas encore sur la liste :</p><div class="chips">` +
      sug.map(s => `<button class="chip" data-act="addSug" data-id="${s.id}">+ ${esc(prodById(s.id).name)}</button>`).join('') + `</div></div>`;
  }

  if (total) h += `<div class="progress">${done} / ${total} dans le caddie</div>`;
  const groups = {};
  L.items.forEach(i => { const p = prodById(i.productId); const c = (p && p.category) || 'Autre'; (groups[c] = groups[c] || []).push(i); });
  const rank = { todo: 0, cart: 1, unavailable: 2 };
  orderedCats(Object.keys(groups)).forEach(c => {
    const arr = groups[c]; if (!arr) return;
    arr.sort((a, b) => rank[a.status] - rank[b.status]);
    h += `<section><h2>${esc(c)}</h2>${arr.map(itemRow).join('')}</section>`;
  });
  if (!total) h += `<p class="empty">Liste vide. Ajoute un article ci-dessus.</p>`;
  if (done) h += `<button class="sec finish" data-act="finish">Terminer les courses (${done} article${done > 1 ? 's' : ''} pris)</button>`;
  return h;
}

function catListHtml(q) {
  q = q.toLowerCase();
  const ps = S.products.filter(p => p.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  if (!ps.length) return `<p class="empty">${S.products.length ? 'Aucun résultat.' : 'Catalogue vide. Il se remplit tout seul quand tu ajoutes des articles aux listes.'}</p>`;
  const g = {}; ps.forEach(p => (g[p.category] = g[p.category] || []).push(p));
  const lp = lastPrices();
  return orderedCats(Object.keys(g)).filter(c => g[c]).map(c =>
    `<section><h2>${esc(c)}</h2>` + g[c].map(p =>
      `<div class="item"><div class="txt" data-act="editProd" data-id="${p.id}"><b>${esc(p.name)}</b><span>${p.unit ? esc(p.unit) : 'sans unité'}${lp[p.id] ? ' · ' + fmt(lp[p.id].price) + ' € · ' + esc(lp[p.id].store) : ''}</span></div>
       <button class="ic sm" data-act="prodToList" data-id="${p.id}" title="Ajouter à la liste" aria-label="Ajouter à la liste">＋</button></div>`).join('') + '</section>').join('');
}
function viewCatalog() {
  return `<div class="bar"><input id="catSearch" type="search" placeholder="Rechercher un produit…" value="${esc(catQuery)}">
    <button class="pri" data-act="addProd">＋ Produit</button></div><div id="catList">${catListHtml(catQuery)}</div>`;
}

function viewTickets() {
  if (imp.review) return viewReview();
  const tl = S.tickets.slice().sort((a, b) => b.date.localeCompare(a.date)).map(t =>
    `<div class="item"><div class="txt"><b>${esc(t.store)} · ${esc(t.date)}</b><span>${t.lines.length} article${t.lines.length > 1 ? 's' : ''} · ${fmt(t.total)} €</span></div>
     <button class="ic sm" data-act="tkDel" data-id="${t.id}" aria-label="Supprimer le ticket">✕</button></div>`).join('')
    || '<p class="empty">Aucun ticket importé.</p>';
  return `<div class="card"><h2>Ticket de caisse</h2>
      <p>Prends le ticket en photo, ou choisis un fichier : image ou PDF (eTicket téléchargé depuis l'appli du magasin). Les images sont réduites avant l'envoi à l'IA.</p>
      <input type="file" id="tkCam" accept="image/*" capture="environment" hidden>
      <input type="file" id="tkFile" hidden>
      <div class="row"><button class="pri" data-act="tkCam">📷 Photo</button><button class="sec" data-act="tkFile">📄 Fichier (PDF, image)</button></div>
      ${imp.isPdf ? `<p class="tkpdf">📄 ${esc(imp.fileName)}</p>` : imp.photo ? `<img class="tkimg" src="${imp.photo}" alt="Ticket">` : ''}</div>
    <div class="card"><h2>Lire le ticket avec une IA</h2>
      <p>Ajoute d'abord le ticket ci-dessus. Puis :<br>
      <b>1.</b> « Analyser avec Claude ou Gemini » copie la consigne et envoie le ticket vers l'appli que tu choisis.
      <b>2.</b> Dans l'appli, colle la consigne si elle n'apparaît pas, puis touche « copier » sur la réponse.
      <b>3.</b> Reviens ici : le formulaire se remplit tout seul (sinon, touche « Coller la réponse »). Vérifie, corrige, valide.</p>
      <button class="pri wide" data-act="tkAnalyze">Analyser avec Claude ou Gemini</button>
      <div class="two"><button class="sec" data-act="tkCopy">Copier la consigne</button><button class="sec" data-act="tkOpenClaude">Ouvrir Claude</button></div>
      <button class="sec wide" data-act="tkOpenGemini">Ouvrir Gemini</button>
      <button class="sec wide" data-act="tkPaste">Coller la réponse</button>
      <details ${imp.json || imp.error ? 'open' : ''}><summary>Coller la réponse à la main</summary>
        <textarea id="tkJson" rows="5" placeholder="Colle ici le JSON de l'IA">${esc(imp.json)}</textarea>
        <button class="sec wide" data-act="tkParse">Analyser cette réponse</button></details>
      ${imp.error ? `<p class="err">${esc(imp.error)}</p>` : ''}</div>
    <div class="card"><h2>Tickets importés</h2>${tl}</div>`;
}

function reviewTotals() {
  const sum = r2(imp.review.lines.filter(l => l.on).reduce((s, l) => s + (l.qty * l.price - l.disc), 0));
  return { sum, diff: r2(sum - (imp.review.total || 0)) };
}
function sumHtml() {
  const { sum, diff } = reviewTotals(); const R = imp.review;
  if (!R.total) return `Somme des lignes : ${fmt(sum)} €`;
  return `Somme des lignes : ${fmt(sum)} € · ticket : ${fmt(R.total)} € ` + (Math.abs(diff) <= 0.05 ? '✔' : `<b class="warn">écart ${fmt(diff)} €</b>`);
}
function viewReview() {
  const R = imp.review;
  const stores = [...new Set(S.tickets.map(t => t.store))].map(s => `<option value="${esc(s)}">`).join('');
  const rows = R.lines.map((l, i) => {
    const p = prodByNorm(l.nom);
    const cats = S.categories.map(c => `<option ${c === (p ? p.category : l.cat) ? 'selected' : ''}>${esc(c)}</option>`).join('');
    return `<div class="rl ${l.on ? '' : 'off'}">
      <label class="rhead"><input type="checkbox" data-rf="on" data-i="${i}" ${l.on ? 'checked' : ''}><span class="lab">${esc(l.label)}</span><span class="badge ${p ? 'ok' : 'new'}">${p ? 'existe' : 'nouveau'}</span></label>
      <div class="rgrid">
        <input class="full" data-rf="nom" data-i="${i}" value="${esc(l.nom)}" placeholder="Nom du produit">
        <select class="full" data-rf="cat" data-i="${i}" ${p ? 'disabled' : ''}>${cats}</select>
        <label>Qté<input type="number" step="any" min="0" inputmode="decimal" data-rf="qty" data-i="${i}" value="${l.qty}"></label>
        <label>Prix €<input type="number" step="0.01" min="0" inputmode="decimal" data-rf="price" data-i="${i}" value="${l.price}"></label>
        <label>Remise €<input type="number" step="0.01" min="0" inputmode="decimal" data-rf="disc" data-i="${i}" value="${l.disc}"></label>
        <b class="lt" id="lt${i}">${fmt(l.qty * l.price - l.disc)} €</b>
      </div></div>`;
  }).join('');
  return `<div class="card"><h2>Vérifier le ticket</h2>
      <label class="fl">Magasin<input id="tkStore" list="storeList" value="${esc(R.store)}"></label><datalist id="storeList">${stores}</datalist>
      <div class="two"><label class="fl">Date<input id="tkDate" type="date" value="${esc(R.date)}"></label>
      <label class="fl">Total ticket €<input id="tkTotal" type="number" step="0.01" inputmode="decimal" value="${R.total || ''}"></label></div>
      <p id="tkSum">${sumHtml()}</p></div>${rows}
    <div class="row"><button class="sec" data-act="tkCancel">Annuler</button><button class="pri" data-act="tkValidate">Valider (${R.lines.filter(l => l.on).length})</button></div>`;
}

function reviewInput(t) {
  const R = imp.review; if (!R) return;
  if (t.id === 'tkStore') R.store = t.value;
  else if (t.id === 'tkDate') R.date = t.value;
  else if (t.id === 'tkTotal') R.total = num(t.value);
  else {
    const i = +t.dataset.i, l = R.lines[i], f = t.dataset.rf; if (!l) return;
    if (f === 'on') l.on = t.checked; else if (f === 'nom' || f === 'cat') l[f] = t.value; else l[f] = num(t.value);
    const lt = $('#lt' + i); if (lt) lt.textContent = fmt(l.qty * l.price - l.disc) + ' €';
  }
  const s = $('#tkSum'); if (s) s.innerHTML = sumHtml();
}

function viewData() {
  const cats = S.categories.map((c, i) => `<div class="cat"><span>${esc(c)}</span>
    <button class="ic sm" data-act="catUp" data-id="${i}" aria-label="Monter">↑</button>
    <button class="ic sm" data-act="catDown" data-id="${i}" aria-label="Descendre">↓</button>
    <button class="ic sm" data-act="catRen" data-id="${i}" aria-label="Renommer">✎</button>
    ${c === 'Autre' ? '' : `<button class="ic sm" data-act="catDel" data-id="${i}" aria-label="Supprimer">✕</button>`}</div>`).join('');
  return `<div class="card"><h2>Sauvegarde</h2>
      <p>Exporte tes données (listes, catalogue, historique) dans un fichier à ranger sur ton Drive. Import : remplace tout le contenu.</p>
      <div class="row"><button class="pri" data-act="export">Exporter</button><button class="sec" data-act="import">Importer</button></div>
      <input type="file" id="impFile" accept="application/json,.json" hidden></div>
    <div class="card"><h2>Rayons</h2><p>L'ordre ici est l'ordre d'affichage dans les listes.</p>${cats}
      <div class="row"><button class="sec" data-act="catAdd">＋ Ajouter un rayon</button></div></div>
    <div class="card"><h2>Partage à plusieurs</h2><p>Pas encore activé : la synchronisation en temps réel sera branchée à l'étape suivante.</p></div>
    <div class="card"><h2>Zone sensible</h2><div class="row"><button class="sec danger" data-act="reset">Tout effacer</button></div></div>
    <p class="empty">${S.products.length} produits · ${S.history.length} achats archivés<br>Version de l'appli : ${APP_VERSION}</p>`;
}

/* ---------- Actions ---------- */
const ACT = {
  toggle(id) { const i = curList().items.find(x => x.id === id); if (!i) return; i.status = i.status === 'cart' ? 'todo' : 'cart'; save(); render(); },
  unavail(id) { const i = curList().items.find(x => x.id === id); if (!i) return; i.status = i.status === 'unavailable' ? 'todo' : 'unavailable'; save(); render(); },
  addSug(pid) { addItem(pid, 1); render(); },

  newList() {
    const n = (prompt('Nom de la nouvelle liste ?') || '').trim(); if (!n) return;
    const l = { id: uid(), name: n, items: [], createdAt: Date.now() };
    S.lists.push(l); S.currentList = l.id; save(); render();
  },
  listMenu() {
    modal(`<h3>${esc(curList().name)}</h3>
      <div class="row"><button class="sec" data-act="listRen">Renommer</button></div>
      <div class="row"><button class="sec" data-act="listClear">Vider la liste</button></div>
      <div class="row"><button class="sec danger" data-act="listDel">Supprimer la liste</button></div>
      <div class="row"><button class="sec" data-act="close">Fermer</button></div>`);
  },
  listRen() {
    const L = curList(); const n = (prompt('Nouveau nom ?', L.name) || '').trim();
    if (n) { L.name = n; save(); } closeModal(); render();
  },
  listClear() {
    if (!confirm('Retirer tous les articles de cette liste ?')) return;
    curList().items = []; save(); closeModal(); render();
  },
  listDel() {
    const L = curList();
    if (S.lists.length === 1) { toast('Il faut garder au moins une liste'); return; }
    if (!confirm(`Supprimer la liste « ${L.name} » ?`)) return;
    S.lists = S.lists.filter(l => l.id !== L.id); S.currentList = S.lists[0].id; save(); closeModal(); render();
  },
  finish() {
    const L = curList(); const got = L.items.filter(i => i.status === 'cart'); if (!got.length) return;
    if (!confirm(`${got.length} article(s) pris seront archivés dans l'historique et retirés de la liste. Continuer ?`)) return;
    const d = Date.now();
    got.forEach(i => { const p = prodById(i.productId); S.history.push({ id: uid(), date: d, productId: i.productId, name: p ? p.name : '?', qty: i.qty, listName: L.name }); });
    L.items = L.items.filter(i => i.status !== 'cart'); save(); render(); toast('Courses archivées');
  },

  edit(id) {
    const i = curList().items.find(x => x.id === id); if (!i) return; const p = prodById(i.productId);
    modal(`<h3>${esc(p ? p.name : '?')}</h3>
      <form id="itemForm" data-id="${i.id}">
        <label>Quantité</label><input id="eQty" type="number" min="1" value="${i.qty}" inputmode="numeric">
        <label>Note (marque, taille…)</label><input id="eNote" value="${esc(i.note)}">
        <label>Rayon</label>${catSelect('eCat', p ? p.category : 'Autre')}
        <div class="row"><button type="button" class="sec danger" data-act="delItem" data-id="${i.id}">Retirer</button><button class="pri">Enregistrer</button></div>
      </form>`);
  },
  delItem(id) { const L = curList(); L.items = L.items.filter(i => i.id !== id); save(); closeModal(); render(); },

  addProd() { prodForm(null); },
  editProd(id) { prodForm(prodById(id)); },
  prodToList(id) { addItem(id, 1); toast('Ajouté à « ' + curList().name + ' »'); },
  delProd(id) {
    const p = prodById(id); if (!p) return;
    if (!confirm(`Supprimer « ${p.name} » du catalogue ? Il sera aussi retiré des listes.`)) return;
    S.products = S.products.filter(x => x.id !== id);
    S.lists.forEach(l => { l.items = l.items.filter(i => i.productId !== id); });
    save(); closeModal(); render();
  },

  export() {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `courses-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  import() { $('#impFile').click(); },
  reset() {
    if (!confirm('Tout effacer (listes, catalogue, historique) ? Pense à exporter avant.')) return;
    S = fresh(); save(); render(); toast('Données effacées');
  },

  catAdd() { const n = (prompt('Nom du rayon ?') || '').trim(); if (!n || S.categories.includes(n)) return; S.categories.splice(S.categories.length - 1, 0, n); save(); render(); },
  catRen(i) {
    i = +i; const old = S.categories[i]; const n = (prompt('Nouveau nom ?', old) || '').trim();
    if (!n || n === old || S.categories.includes(n)) return;
    S.categories[i] = n; S.products.forEach(p => { if (p.category === old) p.category = n; }); save(); render();
  },
  catDel(i) {
    i = +i; const c = S.categories[i]; if (c === 'Autre') return;
    if (!confirm(`Supprimer le rayon « ${c} » ? Ses produits passent dans « Autre ».`)) return;
    S.products.forEach(p => { if (p.category === c) p.category = 'Autre'; }); S.categories.splice(i, 1); save(); render();
  },
  catUp(i) { i = +i; if (i < 1) return; [S.categories[i - 1], S.categories[i]] = [S.categories[i], S.categories[i - 1]]; save(); render(); },
  catDown(i) { i = +i; if (i >= S.categories.length - 1) return; [S.categories[i + 1], S.categories[i]] = [S.categories[i], S.categories[i + 1]]; save(); render(); },

  tkCam() { $('#tkCam').click(); },
  tkFile() { $('#tkFile').click(); },
  async tkCopy() { toast((await copyText(buildPrompt())) ? 'Consigne copiée' : 'Copie impossible'); },
  async tkAnalyze() {
    if (!imp.photoFile) { toast("Ajoute d'abord le ticket (photo ou fichier)"); return; }
    const copied = await copyText(buildPrompt()); imp.waiting = true;
    const data = { files: [imp.photoFile], text: buildPrompt(), title: 'Ticket de caisse' };
    if (navigator.canShare && navigator.canShare(data)) { try { await navigator.share(data); } catch (e) { /* annulé */ } }
    else toast(copied ? 'Consigne copiée : ouvre Claude ou Gemini et joins le ticket' : 'Partage indisponible');
  },
  async tkOpenClaude() { await copyText(buildPrompt()); imp.waiting = true; toast('Consigne copiée : colle-la et joins le ticket'); window.open('https://claude.ai/new', '_blank'); },
  async tkOpenGemini() { await copyText(buildPrompt()); imp.waiting = true; toast('Consigne copiée : colle-la et joins le ticket'); window.open('https://gemini.google.com/app', '_blank'); },
  async tkPaste() {
    try { imp.json = await navigator.clipboard.readText(); }
    catch (e) { imp.error = 'Lecture du presse-papiers impossible : colle la réponse à la main ci-dessous.'; render(); return; }
    ACT.tkParse();
  },
  tkParse() {
    try { imp.review = buildReview(parseTicket(imp.json)); imp.error = ''; imp.waiting = false; }
    catch (e) { imp.error = 'Réponse non reconnue : ' + e.message; }
    render(); window.scrollTo(0, 0);
  },
  tkCancel() { imp.review = null; render(); },
  tkValidate() {
    const R = imp.review; if (!R) return;
    const store = R.store.trim(); if (!store) { toast('Indique le magasin'); return; }
    const on = R.lines.filter(l => l.on && l.nom.trim()); if (!on.length) { toast('Aucune ligne sélectionnée'); return; }
    const tid = uid(); const dateMs = new Date(R.date + 'T12:00:00').getTime() || Date.now();
    const lines = []; let created = 0;
    on.forEach(l => {
      let p = prodByNorm(l.nom);
      if (!p) { p = { id: uid(), name: l.nom.trim(), category: l.cat || 'Autre', unit: l.unit || '' }; S.products.push(p); created++; }
      else if (!p.unit && l.unit) p.unit = l.unit;
      mapSet(store, l.label, p.id);
      lines.push({ label: l.label, productId: p.id, qty: l.qty, unitPrice: l.price, discount: l.disc, lineTotal: r2(l.qty * l.price - l.disc) });
      S.history.push({ id: uid(), date: dateMs, productId: p.id, name: p.name, qty: l.qty, listName: 'Ticket ' + store, ticketId: tid });
    });
    const sum = r2(lines.reduce((s, l) => s + l.lineTotal, 0));
    S.tickets.push({ id: tid, store, date: R.date, total: R.total || sum, lines });
    save(); resetImp(); tab = 'catalog'; render();
    toast(`${created} produit${created > 1 ? 's' : ''} créé${created > 1 ? 's' : ''}, ${lines.length} ligne${lines.length > 1 ? 's' : ''} enregistrée${lines.length > 1 ? 's' : ''}`);
  },
  tkDel(id) {
    if (!confirm('Supprimer ce ticket et ses achats archivés ? Les produits du catalogue sont conservés.')) return;
    S.tickets = S.tickets.filter(t => t.id !== id); S.history = S.history.filter(h => h.ticketId !== id); save(); render();
  },

  close() { closeModal(); },
};

function prodForm(p) {
  modal(`<h3>${p ? 'Modifier le produit' : 'Nouveau produit'}</h3>
    <form id="prodForm" data-id="${p ? p.id : ''}">
      <label>Nom</label><input id="pName" value="${esc(p ? p.name : '')}" required>
      <label>Rayon</label>${catSelect('pCat', p ? p.category : 'Autre')}
      <label>Unité (facultatif : kg, L, boîte…)</label><input id="pUnit" value="${esc(p ? p.unit : '')}">
      <div class="row">${p ? `<button type="button" class="sec danger" data-act="delProd" data-id="${p.id}">Supprimer</button>` : '<button type="button" class="sec" data-act="close">Annuler</button>'}<button class="pri">Enregistrer</button></div>
    </form>`);
}

/* ---------- Événements ---------- */
document.addEventListener('click', e => {
  if (e.target.id === 'modal') { closeModal(); return; }
  const t = e.target.closest('[data-act],[data-tab]'); if (!t) return;
  if (t.dataset.tab) { tab = t.dataset.tab; render(); window.scrollTo(0, 0); return; }
  const fn = ACT[t.dataset.act]; if (fn) fn(t.dataset.id);
});

document.addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target;
  if (f.id === 'addForm') {
    const name = $('#addName').value.trim(); if (!name) return;
    const qty = Math.max(1, parseInt($('#addQty').value, 10) || 1);
    let p = prodByName(name);
    if (!p) { p = { id: uid(), name, category: $('#addCat').value, unit: '' }; S.products.push(p); }
    addItem(p.id, qty); render(); $('#addName').focus();
  } else if (f.id === 'itemForm') {
    const i = curList().items.find(x => x.id === f.dataset.id); if (!i) return;
    i.qty = Math.max(1, parseInt($('#eQty').value, 10) || 1); i.note = $('#eNote').value.trim();
    const p = prodById(i.productId); if (p) p.category = $('#eCat').value;
    save(); closeModal(); render();
  } else if (f.id === 'prodForm') {
    const name = $('#pName').value.trim(); if (!name) return;
    const dup = prodByName(name);
    if (dup && dup.id !== f.dataset.id) { toast('Ce produit existe déjà'); return; }
    let p = f.dataset.id ? prodById(f.dataset.id) : null;
    if (!p) { p = { id: uid(), name, category: 'Autre', unit: '' }; S.products.push(p); }
    p.name = name; p.category = $('#pCat').value; p.unit = $('#pUnit').value.trim();
    save(); closeModal(); render();
  }
});

document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'addName') {
    const p = prodByName(t.value);
    if (p) { const s = $('#addCat'); if (s) s.value = p.category; }
  } else if (t.id === 'catSearch') {
    catQuery = t.value; $('#catList').innerHTML = catListHtml(catQuery);
  } else if (t.id === 'tkJson') {
    imp.json = t.value;
  } else if (imp.review && (t.dataset.rf || /^tk(Store|Date|Total)$/.test(t.id))) {
    reviewInput(t);
  }
});

document.addEventListener('change', e => {
  if (e.target.id === 'listSel') { S.currentList = e.target.value; save(); render(); }
  else if (e.target.id === 'tkCam' || e.target.id === 'tkFile') {
    const f = e.target.files[0]; if (!f) return;
    e.target.value = ''; loadPhoto(f);
  } else if (imp.review && e.target.dataset && (e.target.dataset.rf === 'on' || e.target.dataset.rf === 'nom')) {
    reviewInput(e.target); render();
  }
  else if (e.target.id === 'impFile') {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!d || !Array.isArray(d.lists) || !Array.isArray(d.products)) throw new Error('format');
        if (!confirm('Remplacer toutes les données actuelles par ce fichier ?')) return;
        S = migrate(d); save(); render(); toast('Import terminé');
      } catch (err) { toast('Fichier invalide'); }
    };
    r.readAsText(file); e.target.value = '';
  }
});

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkClipboardForTicket(); });
if (window.addEventListener) window.addEventListener('focus', checkClipboardForTicket);

render();
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => { });
}
