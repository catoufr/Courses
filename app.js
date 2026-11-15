'use strict';
/* Appli Courses — V1 (local, hors ligne). La synchronisation viendra se brancher dans save(). */

const KEY = 'courses.v1';
const DEFAULT_CATS = ['Fruits et légumes', 'Boucherie / poisson', 'Crèmerie / frais', 'Boulangerie',
  'Épicerie', 'Boissons', 'Surgelés', 'Hygiène / entretien', 'Autre'];

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, r = document) => r.querySelector(s);

/* ---------- Données ---------- */
function fresh() {
  const l = { id: uid(), name: 'Courses', items: [], createdAt: Date.now() };
  return { schema: 1, categories: [...DEFAULT_CATS], products: [], lists: [l], currentList: l.id, history: [], updatedAt: Date.now() };
}
function migrate(d) {
  const s = Object.assign(fresh(), d);
  if (!Array.isArray(s.lists) || !s.lists.length) { const f = fresh(); s.lists = f.lists; s.currentList = f.currentList; }
  if (!s.lists.some(l => l.id === s.currentList)) s.currentList = s.lists[0].id;
  if (!Array.isArray(s.categories) || !s.categories.length) s.categories = [...DEFAULT_CATS];
  if (!s.categories.includes('Autre')) s.categories.push('Autre');
  if (!Array.isArray(s.products)) s.products = [];
  if (!Array.isArray(s.history)) s.history = [];
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

/* ---------- Vues ---------- */
function render() {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const v = $('#view');
  v.innerHTML = tab === 'lists' ? viewLists() : tab === 'catalog' ? viewCatalog() : viewData();
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
  return orderedCats(Object.keys(g)).filter(c => g[c]).map(c =>
    `<section><h2>${esc(c)}</h2>` + g[c].map(p =>
      `<div class="item"><div class="txt" data-act="editProd" data-id="${p.id}"><b>${esc(p.name)}</b><span>${p.unit ? esc(p.unit) : 'sans unité'}</span></div>
       <button class="ic sm" data-act="prodToList" data-id="${p.id}" title="Ajouter à la liste" aria-label="Ajouter à la liste">＋</button></div>`).join('') + '</section>').join('');
}
function viewCatalog() {
  return `<div class="bar"><input id="catSearch" type="search" placeholder="Rechercher un produit…" value="${esc(catQuery)}">
    <button class="pri" data-act="addProd">＋ Produit</button></div><div id="catList">${catListHtml(catQuery)}</div>`;
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
    <p class="empty">${S.products.length} produits · ${S.history.length} achats archivés</p>`;
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
  if (e.target.id === 'addName') {
    const p = prodByName(e.target.value);
    if (p) { const s = $('#addCat'); if (s) s.value = p.category; }
  } else if (e.target.id === 'catSearch') {
    catQuery = e.target.value; $('#catList').innerHTML = catListHtml(catQuery);
  }
});

document.addEventListener('change', e => {
  if (e.target.id === 'listSel') { S.currentList = e.target.value; save(); render(); }
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

render();
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => { });
}
