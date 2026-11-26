'use strict';
/* Appli Courses — V1 (local, hors ligne). La synchronisation viendra se brancher dans save(). */

const KEY = 'courses.v1';
const APP_VERSION = '3.4';
const DEFAULT_CATS = ['Fruits et légumes', 'Boucherie / volaille', 'Poissonnerie', 'Charcuterie / traiteur', 'Crèmerie / frais',
  'Boulangerie / viennoiserie', 'Épicerie salée', 'Épicerie sucrée', 'Surgelés', 'Boissons sans alcool', 'Alcools', 'Bébé / enfant',
  'Hygiène / beauté', 'Entretien / ménage', 'Maison / bazar', 'Bricolage / outillage', 'Textile', 'Animaux', 'Autre'];
// Liste des versions 1 et 2 : reconnue à la migration pour reporter les produits dans les nouvelles catégories.
const OLD_DEFAULT_CATS = ['Fruits et légumes', 'Boucherie / poisson', 'Crèmerie / frais', 'Boulangerie',
  'Épicerie', 'Boissons', 'Surgelés', 'Hygiène / entretien', 'Autre'];
const OLD_TO_NEW = { 'Boucherie / poisson': 'Boucherie / volaille', 'Boulangerie': 'Boulangerie / viennoiserie', 'Épicerie': 'Épicerie salée', 'Boissons': 'Boissons sans alcool', 'Hygiène / entretien': 'Hygiène / beauté' };

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const CAT_RULES = [
  [/vetement|textile|chaussette|chaussure|maillot|shorty|lingerie/, 'Textile'],
  [/bebe|puericult|couche|enfant|infantile/, 'Bébé / enfant'],
  [/hygiene|beaute|\bsoin|toilette|coton|shampo|savon|dentifrice|deodorant|douche|feminin|rasoir/, 'Hygiène / beauté'],
  [/entretien|menage|vaisselle|lessive|nettoy|adoucissant|essuie|sac poubelle|droguerie/, 'Entretien / ménage'],
  [/alcool|\bvins?\b|biere|spiritueux|whisky|rhum|apero|champagne|cidre/, 'Alcools'],
  [/\beaux?\b|\bjus\b|soda|sirop|boisson|limonade|\bthe\b|\bcafe\b/, 'Boissons sans alcool'],
  [/surgel|\bglaces?\b/, 'Surgelés'],
  [/charc|traiteur|saucisson|jambon|pate de foie|rillette|\bfoie\b/, 'Charcuterie / traiteur'],
  [/poisson|maree|crevette|saumon|surimi/, 'Poissonnerie'],
  [/boucher|viande|volaille|poulet|boeuf|\bporc\b|steak|nugget/, 'Boucherie / volaille'],
  [/fruit|legume|salade|tomate|pomme|banane/, 'Fruits et légumes'],
  [/boulang|viennois|\bpain\b|baguette|brioche/, 'Boulangerie / viennoiserie'],
  [/cremerie|laitier|fromage|yaourt|ultra frais|\bfrais\b|beurre|oeuf|creme|dessert|\blait\b/, 'Crèmerie / frais'],
  [/biscuit|chocolat|confiserie|bonbon|sucre|confiture|petit.?dej|cereale|gateau|patisserie/, 'Épicerie sucrée'],
  [/epicerie|conserve|\bpates?\b|\briz\b|sauce|huile|condiment|\bplats?\b|farine|chips/, 'Épicerie salée'],
  [/bricolage|outil|jardin|quincaillerie|peinture/, 'Bricolage / outillage'],
  [/animaux|chien|\bchat\b|croquette/, 'Animaux'],
  [/bazar|maison|jouet|papeterie|cuisine|decoration/, 'Maison / bazar'],
];
// Devine une catégorie à partir d'un texte (titre de ticket, libellé…), parmi celles qui existent.
function guessCategory(text, cats) {
  const k = norm(text); if (!k) return '';
  const r = CAT_RULES.find(([re, c]) => re.test(k) && cats.includes(c));
  return r ? r[1] : '';
}
const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const pretty = s => { s = String(s || '').trim(); return (s && s === s.toUpperCase() && s !== s.toLowerCase()) ? s.charAt(0) + s.slice(1).toLowerCase() : s; };

/* ---------- Données ---------- */
function fresh() {
  const l = { id: uid(), name: 'Courses', items: [], storeId: null, createdAt: Date.now() };
  return { schema: 3, categories: [...DEFAULT_CATS], stores: [], products: [], lists: [l], currentList: l.id, history: [], tickets: [], labelMap: {}, updatedAt: Date.now() };
}
function migrate(d) {
  const from = Number(d && d.schema) || 1;
  const s = Object.assign(fresh(), d);
  if (!Array.isArray(s.lists) || !s.lists.length) { const f = fresh(); s.lists = f.lists; s.currentList = f.currentList; }
  if (!s.lists.some(l => l.id === s.currentList)) s.currentList = s.lists[0].id;
  if (!Array.isArray(s.categories) || !s.categories.length) s.categories = [...DEFAULT_CATS];
  if (!s.categories.includes('Autre')) s.categories.push('Autre');
  if (!Array.isArray(s.products)) s.products = [];
  if (!Array.isArray(s.history)) s.history = [];
  if (!Array.isArray(s.tickets)) s.tickets = [];
  if (!Array.isArray(s.stores)) s.stores = [];
  if (!s.labelMap || typeof s.labelMap !== 'object') s.labelMap = {};
  s.products.forEach(p => { if (!p.place || typeof p.place !== 'object') p.place = {}; });
  s.tickets.forEach(t => {
    let st = t.storeId && s.stores.find(x => x.id === t.storeId);
    if (!st && t.store) {
      const k = norm(t.store); st = s.stores.find(x => norm(x.name) === k);
      if (!st) { st = { id: uid(), name: t.store, aliases: [] }; s.stores.push(st); }
      t.storeId = st.id;
    }
  });
  // v3 : catégories communes à tous les magasins. Les catégories par magasin de la v2 sont abandonnées ;
  // le rayon réel (place[storeId].aisle) est conservé, vide, pour le futur plan du magasin.
  if (from < 3) {
    if (sameList(s.categories, OLD_DEFAULT_CATS)) {
      s.products.forEach(p => { if (OLD_TO_NEW[p.category]) p.category = OLD_TO_NEW[p.category]; });
      s.categories = [...DEFAULT_CATS];
    }
    s.products.forEach(p => {
      if (!p.category || p.category === 'Autre') {
        const old = Object.values(p.place || {}).map(x => x && x.cat).find(Boolean);
        const g = old && guessCategory(old, s.categories); if (g) p.category = g;
      }
      Object.keys(p.place).forEach(k => { const a = p.place[k] && p.place[k].aisle; p.place[k] = { aisle: a || '' }; });
    });
  }
  s.stores.forEach(st => { delete st.cats; if (!Array.isArray(st.aliases)) st.aliases = []; });
  s.lists.forEach(l => { if (!l.storeId || !s.stores.some(x => x.id === l.storeId)) l.storeId = null; });
  s.schema = 3;
  return s;
}
function load() {
  try { const r = localStorage.getItem(KEY); if (r) return migrate(JSON.parse(r)); } catch (e) { console.error(e); }
  return fresh();
}
let S = load();
let tab = 'lists';
let catQuery = '';
let catStoreF = '';   // filtre « enseigne » du catalogue (jusqu'au rechargement)
let suggOpen = false; // bloc Suggestions replié au chargement
let stEdit = null;

function save() {
  S.updatedAt = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Stockage plein : exporte tes données'); }
}

const curList = () => S.lists.find(l => l.id === S.currentList) || S.lists[0];
const prodById = id => S.products.find(p => p.id === id);
const prodByName = n => S.products.find(p => p.name.toLowerCase() === n.trim().toLowerCase());
const orderedCats = used => [...S.categories, ...used.filter(c => !S.categories.includes(c))];

/* Magasins : nom + alias (noms imprimés sur les tickets). Les rayons de chaque magasin (product.place[storeId].aisle) viendront avec le plan. */
const storeById = id => (id && S.stores.find(s => s.id === id)) || null;
const storeByName = n => { const k = norm(n); if (!k) return null; return S.stores.find(s => norm(s.name) === k) || S.stores.find(s => (s.aliases || []).some(a => norm(a) === k)) || null; };
function ensureStore(name) { let s = storeByName(name); if (!s) { s = { id: uid(), name: String(name).trim(), aliases: [] }; S.stores.push(s); } return s; }
const activeStore = () => { const l = curList(); return l && l.storeId && storeById(l.storeId) ? l.storeId : null; };
const groupOf = p => p.category || 'Autre';

function addItem(pid, qty) {
  const L = curList();
  const ex = L.items.find(i => i.productId === pid && i.status !== 'cart');
  if (ex) { ex.qty += qty; if (ex.status === 'unavailable') ex.status = 'todo'; }
  else L.items.push({ id: uid(), productId: pid, qty, note: '', status: 'todo' });
  const pr = prodById(pid); if (pr && typeof openCats !== 'undefined') openCats.lists.add(groupOf(pr));
  save();
}

function suggestions(sid) {
  const on = new Set(curList().items.map(i => i.productId));
  const m = {};
  S.history.filter(h => !sid || h.storeId === sid).forEach(h => { const e = (m[h.productId] = m[h.productId] || { n: 0, last: 0 }); e.n++; e.last = Math.max(e.last, h.date); });
  return Object.entries(m)
    .filter(([id, v]) => v.n >= 2 && !on.has(id) && prodById(id))
    .sort((a, b) => b[1].n - a[1].n || b[1].last - a[1].last)
    .slice(0, 80).map(([id, v]) => ({ id, n: v.n }));
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
const num = v => { if (v == null || v === '') return 0; const n = parseFloat(String(v).replace(',', '.').replace(/[^\d.\-]/g, '')); return isFinite(n) ? n : 0; };
const r2 = n => Math.round(n * 100) / 100;
const fmt = n => r2(n).toFixed(2).replace('.', ',');
const today = () => new Date().toLocaleDateString('sv-SE');
const prodByNorm = n => { const k = norm(n); return k ? S.products.find(p => norm(p.name) === k) : null; };
const mapGet = (store, label) => { const m = S.labelMap[norm(store)]; const id = m && m[norm(label)]; return id && prodById(id) ? id : null; };
const mapSet = (store, label, pid) => { const s = norm(store), l = norm(label); if (!s || !l) return; (S.labelMap[s] = S.labelMap[s] || {})[l] = pid; };
function matchCat(r) {
  const k = norm(r); if (!k) return 'Autre';
  return S.categories.find(c => norm(c) === k) || S.categories.find(c => norm(c).includes(k) || k.includes(norm(c))) || guessCategory(r, S.categories) || 'Autre';
}
// Magasins où chaque produit a été acheté (tickets importés et courses terminées avec un magasin choisi).
function storeIndex() {
  const m = {};
  S.history.forEach(h => { if (h.storeId) (m[h.productId] = m[h.productId] || new Set()).add(h.storeId); });
  return m;
}
function lastPrices(sid) {
  const out = {};
  S.tickets.filter(t => !sid || t.storeId === sid).sort((a, b) => a.date.localeCompare(b.date)).forEach(t => t.lines.forEach(l => { out[l.productId] = { price: l.unitPrice, store: t.store }; }));
  return out;
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch (e) { /* repli ci-dessous */ }
  const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (e) { } ta.remove(); return ok;
}

// Consignes à donner à l'IA (Gemini ou Claude) avec la photo du ticket.
function parseDate(v) {
  const t = String(v || '').trim(); let m, y, mo, d;
  if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) { y = m[1]; mo = m[2]; d = m[3]; }
  else if ((m = t.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4}|\d{2})(?!\d)/))) { d = m[1]; mo = m[2]; y = m[3].length === 2 ? '20' + m[3] : m[3]; }
  else return '';
  if (+mo < 1 || +mo > 12 || +d < 1 || +d > 31) return '';
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
// Les eTickets téléchargés portent souvent la date dans le nom du fichier (ex. Ticket_de_caisse_27072026-185033.pdf).
function fileDate(name) {
  const m = String(name || '').match(/(?<!\d)(\d{2})[-_.]?(\d{2})[-_.]?(20\d{2})(?!\d)/);
  return m ? parseDate(`${m[1]}/${m[2]}/${m[3]}`) : '';
}

function buildPrompt(n) {
  n = n || 1;
  const multi = n > 1;
  const head = multi
    ? `Tu reçois ${n} photos ou PDF : chacun est un ticket de caisse de supermarché distinct (enseignes et dates peuvent différer). Extrais les informations de CHAQUE ticket, dans l'ordre où ils te sont donnés, et réponds UNIQUEMENT avec un bloc de code \`\`\`json contenant un JSON valide, sans aucun texte avant ni après (le bloc de code est indispensable : il permet de copier la réponse en un clic). Ce JSON est de la forme { "tickets": [ … ] } avec exactement un objet par ticket (${n} au total), chacun de cette forme :`
    : `Tu reçois la photo ou le PDF d'un ticket de caisse de supermarché. Extrais-en les informations et réponds UNIQUEMENT avec un bloc de code \`\`\`json contenant un JSON valide, sans aucun texte avant ni après (le bloc de code est indispensable : il permet de copier la réponse en un clic), de cette forme :`;
  return `${head}
{
  "magasin": "enseigne du supermarché",
  "magasin_imprime": "nom imprimé en texte en haut du ticket",
  "date": "AAAA-MM-JJ",
  "total": 0.00,
  "nb_lignes": 0,
  "lignes": [
    {
      "designation": "libellé exact imprimé sur le ticket",
      "nom": "nom court et lisible du produit (ex. Lait demi-écrémé 1L)",
      "quantite": 1,
      "unite": "",
      "prix_unitaire": 0.00,
      "montant_ligne": 0.00,
      "remise": 0.00,
      "categorie": "une catégorie de la liste ci-dessous"
    }
  ]
}
Règles :
- "magasin" : la marque de l'enseigne (ex. U, Leclerc, Intermarché, Carrefour). Elle est souvent seulement dans le logo ou dans les marques maison : déduis-la, ne recopie pas le nom de la ville ni de la société. "magasin_imprime" : le nom imprimé en texte en haut du ticket (ville, société…), recopié tel quel.
- "date" : la date de l'achat, au format AAAA-MM-JJ. Elle est souvent en petits caractères tout en bas du ticket, avec l'heure (ex. 27/07/26 18:50:28). Ignore les périodes de promotion ou de validité (« Du … au … »). Si elle est introuvable, mets null.
- Une entrée par produit acheté. Ignore : totaux, TVA, moyens de paiement, rendu monnaie, vignettes ou points de fidélité, éco-participations, lignes d'information.
- Si le même produit apparaît sur plusieurs lignes, regroupe-les en une seule entrée avec la quantité totale.
- "nom" : nom lisible du produit, abréviations développées quand tu en es sûr. "designation" : le libellé abrégé exact du ticket.
- "quantite" : nombre d'articles, ou poids en kg si le produit est vendu au poids (alors "unite" vaut "kg"). Sinon laisse "unite" vide.
- "prix_unitaire" : le montant imprimé à droite d'une ligne est le TOTAL de la ligne. Donne le prix d'UNE unité TTC (ex. « 2 x 1,19 » → 1,19 ; au poids : le prix au kilo, ex. « 0,158 kg x 17,49 €/kg » → quantité 0,158 et prix 17,49), avant remise, avec un point décimal.
- "remise" : réduction liée à ce produit, en nombre positif (0 s'il n'y en a pas). Les remises sont souvent imprimées sur des lignes séparées, parfois à la fin du ticket (ex. « 2EME A -50% MARQUE ») : rattache-les au produit concerné.
- "categorie" : choisis exactement UNE valeur parmi cette liste : ${S.categories.join(' | ')}. Classe chaque produit selon sa nature (ex. « Mousse de foie » → Charcuterie / traiteur). Les titres imprimés sur certains tickets (rayons, familles de produits) peuvent t'aider à choisir, mais ne les recopie pas. En cas de vrai doute, choisis Autre.
- "montant_ligne" : le montant imprimé à droite de la ligne du produit, avant remise (c'est quantité × prix unitaire). Chaque produit a UN libellé, UN montant à droite sur la même ligne et, juste dessous, le détail « N x prix EUR ». Ne décale jamais un montant vers le produit voisin. Un libellé peut contenir plusieurs morceaux abrégés (ex. « KNACK.ORIG.PRC CSN HER.X4 140G » est UN seul produit). Les titres seuls sur une ligne (ex. « FROMAGE LS », « SURGELE SALE ») ne sont pas des produits.
- "nb_lignes" : le nombre indiqué sur le ticket après « Nombre de lignes d'article » (null s'il n'est pas imprimé).
- "total" : le total TTC du ticket après remises (ex. « TOTAL », « MONTANT DU », « TOTAL À PAYER »). Ce n'est ni le montant d'un seul moyen de paiement (CB, titres-restaurant, espèces) ni le nombre d'articles.
- Contrôle avant de répondre, pour chaque ticket : (1) le nombre de lignes lues (avant tout regroupement de doublons) est égal à "nb_lignes" ; (2) pour chaque ligne, quantite × prix_unitaire = montant_ligne ; (3) la somme des montant_ligne moins les remises est égale à "total". Si un contrôle échoue, relis le ticket ligne par ligne et corrige avant de répondre.
- Si une information est illisible, mets null plutôt que d'inventer.`;
}

// Accepte un ticket seul, { "tickets": [...] } ou une liste de tickets : renvoie toujours une liste.
function parseTickets(txt) {
  const t = String(txt || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  if (t.includes('libellé exact imprimé')) throw new Error("c'est la consigne, pas la réponse de l'IA");
  const a = t.search(/[\[{]/), b = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  if (a < 0 || b < a) throw new Error('aucun JSON trouvé');
  const d = JSON.parse(t.slice(a, b + 1));
  const arr = Array.isArray(d) ? d : Array.isArray(d && d.tickets) ? d.tickets : [d];
  const ok = arr.filter(x => x && Array.isArray(x.lignes) && x.lignes.length);
  if (!ok.length) throw new Error('aucune ligne de produit');
  return ok;
}
function parseTicket(txt) { return parseTickets(txt)[0]; }

function buildReview(d, fd) {
  const m1 = String(d.magasin || '').trim(), m2 = String(d.magasin_imprime || '').trim();
  const st = storeByName(m1) || storeByName(m2);
  const store = st ? st.name : (m1 || m2);
  const printed = [m1, m2].filter(Boolean);
  const raw = d.lignes.map(l => {
    const label = String(l.designation || l.nom || '').trim();
    const nom = String(l.nom || l.designation || '').trim();
    const mapped = mapGet(store, label);
    const p = (mapped && prodById(mapped)) || prodByNorm(nom);
    const rc = String(l.categorie ?? l.rayon ?? '').trim();
    const ai = rc && !/^(null|undefined|-)$/i.test(rc) ? matchCat(rc) : '';
    // Produit déjà classé : on garde sa catégorie. Produit nouveau, ou resté dans « Autre » : catégorie proposée par l'IA.
    const known = p && p.category && p.category !== 'Autre';
    const cat = known ? p.category : (ai || (p && p.category) || 'Autre');
    return {
      on: true, label, nom: p ? p.name : nom, cat,
      qty: num(l.quantite) || 1, unit: String(l.unite || '').trim(), price: num(l.prix_unitaire), disc: Math.abs(num(l.remise)),
      amt: l.montant_ligne == null || l.montant_ligne === '' ? null : num(l.montant_ligne),
    };
  });
  // Un même produit imprimé sur plusieurs lignes est regroupé (quantités et remises additionnées).
  const lines = [], idx = {};
  raw.forEach(l => {
    const k = norm(l.label || l.nom) + '|' + l.price + '|' + norm(l.unit);
    if (idx[k] != null) { const m = lines[idx[k]]; m.qty = Math.round((m.qty + l.qty) * 1000) / 1000; m.disc = r2(m.disc + l.disc); if (m.amt != null && l.amt != null) m.amt = r2(m.amt + l.amt); else m.amt = null; if (m.cat === 'Autre' && l.cat !== 'Autre') m.cat = l.cat; }
    else { idx[k] = lines.length; lines.push(l); }
  });
  const date = parseDate(d.date) || fd || today();
  const nb = d.nb_lignes == null ? 0 : Math.round(num(d.nb_lignes));
  return { store, printed, date, total: num(d.total), lines, nb, rawCount: raw.length };
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
  if (!pdf && !/^image\//.test(f.type || '') && !/\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(f.name || '')) { toast('Fichier non pris en charge : choisis un PDF ou une image'); return false; }
  const out = pdf ? f : await shrinkImage(f);
  imp.photos.push({ file: out, url: pdf ? null : URL.createObjectURL(out), isPdf: pdf, name: f.name || (pdf ? 'ticket.pdf' : 'ticket.jpg'), fileDate: fileDate(f.name) });
  return true;
}
async function loadPhotos(files) { for (const f of files) await loadPhoto(f); render(); }

// Au retour depuis Claude ou Gemini : si le presse-papiers contient la réponse, on remplit le formulaire.
async function checkClipboardForTicket() {
  if (!imp.waiting || imp.review) return;
  try {
    const t = await navigator.clipboard.readText();
    if (!/"lignes"/.test(t)) return;
    const list = parseTickets(t);
    imp.json = t; startQueue(list); tab = 'tickets';
    render(); window.scrollTo(0, 0); toast(list.length > 1 ? list.length + ' tickets reconnus' : 'Ticket reconnu');
  } catch (e) { /* pas de droit de lecture ou pas encore la réponse : l'utilisateur colle à la main */ }
}

/* ---------- Vues ---------- */
const newImp = () => ({ photos: [], queue: [], pos: 0, total: 0, review: null, json: '', error: '', waiting: false });
let imp = newImp();
// Charge le ticket suivant de la file (construit à ce moment pour tenir compte des produits déjà créés).
function showNext() { const q = imp.queue[0]; imp.review = q ? buildReview(q.d, q.fd) : null; }
function startQueue(list) {
  const n = imp.photos.length;
  imp.queue = list.map((d, i) => ({ d, fd: n === list.length && imp.photos[i] ? imp.photos[i].fileDate : (n === 1 && imp.photos[0] ? imp.photos[0].fileDate : '') }));
  imp.total = list.length; imp.error = ''; imp.waiting = false; showNext();
}
function resetImp() { imp.photos.forEach(p => { if (p.url) URL.revokeObjectURL(p.url); }); imp = newImp(); }

function render() {
  const av = $('#appVer'); if (av) av.textContent = 'v' + APP_VERSION;
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const v = $('#view');
  v.innerHTML = tab === 'lists' ? viewLists() : tab === 'catalog' ? viewCatalog() : tab === 'tickets' ? viewTickets() : viewData();
}

// Catégories repliées au chargement ; l'état (ouvert/fermé) dure jusqu'au rechargement de l'appli.
const openCats = { lists: new Set(), catalog: new Set(), sugg: new Set() };
function catSection(view, c, count, body, force) {
  const open = force || openCats[view].has(c);
  return `<section><button class="cath" data-act="toggleCat" data-v="${view}" data-c="${esc(c)}" aria-expanded="${open}"><span>${open ? '▾' : '▸'} ${esc(c)}</span><em>${count}</em></button>${open ? body : ''}</section>`;
}
function catsOf(view) {
  const set = new Set();
  if (view === 'lists') curList().items.forEach(i => { const p = prodById(i.productId); set.add(p ? groupOf(p) : 'Autre'); });
  else if (view === 'sugg') suggestions(activeStore()).forEach(x => set.add(groupOf(prodById(x.id))));
  else { const idx = storeIndex(); S.products.forEach(p => { if (!catStoreF || (idx[p.id] && idx[p.id].has(catStoreF))) set.add(groupOf(p)); }); }
  return [...set];
}
function expandBar(view) {
  const names = catsOf(view); if (names.length < 2) return '';
  const all = names.every(c => openCats[view].has(c));
  return `<div class="expbar"><button class="sec sm" data-act="expandAll" data-v="${view}">${all ? 'Tout réduire' : 'Tout développer'}</button></div>`;
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
  const idx0 = storeIndex(), sid0 = activeStore();
  // Avec un magasin choisi : produits qu'on y a achetés + produits jamais achetés avec un magasin connu. Sans magasin : tout le catalogue.
  const dl = S.products.filter(p => !sid0 || !idx0[p.id] || idx0[p.id].has(sid0)).map(p => `<option value="${esc(p.name)}">`).join('');
  const total = L.items.length;
  const done = L.items.filter(i => i.status === 'cart').length;
  const sid = activeStore();
  const storeOpts = '<option value="">🏬 Aucun magasin</option>' + S.stores.map(s => `<option value="${s.id}" ${s.id === sid ? 'selected' : ''}>🏬 ${esc(s.name)}</option>`).join('');
  let h = `<div class="bar"><select id="listSel">${opts}</select>
    <button class="ic" data-act="newList" aria-label="Nouvelle liste">＋</button>
    <button class="ic" data-act="listMenu" aria-label="Menu de la liste">⋯</button></div>
    <div class="bar"><select id="storeSel" aria-label="Magasin">${storeOpts}</select></div>
    ${sid ? '<p class="hint">Articles rangés par catégorie. L\'ordre par rayon du magasin viendra avec le plan.</p>' : ''}
    <form id="addForm" class="add" autocomplete="off">
      <input id="addName" list="prodList" placeholder="Ajouter un article…" required>
      <datalist id="prodList">${dl}</datalist>
      <input id="addQty" type="number" min="1" value="1" inputmode="numeric" aria-label="Quantité">
      ${catSelect('addCat', 'Autre')}
      <button class="pri">Ajouter</button>
    </form>`;

  const sug = suggestions(sid);
  if (sug.length) {
    const sg = {}; sug.forEach(x => { const c = groupOf(prodById(x.id)); (sg[c] = sg[c] || []).push(x); });
    h += `<div class="card"><button class="cath" data-act="toggleSugg" aria-expanded="${suggOpen}"><span>${suggOpen ? '▾' : '▸'} Suggestions${sid ? ' · ' + esc(storeById(sid).name) : ''}</span><em>${sug.length}</em></button>`;
    if (suggOpen) {
      h += `<p>Tes achats habituels${sid ? ' dans ce magasin' : ''}, pas encore sur la liste :</p>` + expandBar('sugg') +
        orderedCats(Object.keys(sg)).filter(c => sg[c]).map(c => catSection('sugg', c, sg[c].length,
          `<div class="chips">` + sg[c].map(x => `<button class="chip" data-act="addSug" data-id="${x.id}">+ ${esc(prodById(x.id).name)}</button>`).join('') + `</div>`)).join('');
    }
    h += `</div>`;
  }

  if (total) h += `<div class="progress">${done} / ${total} dans le caddie</div>`;
  const groups = {};
  L.items.forEach(i => { const p = prodById(i.productId); const c = p ? groupOf(p) : 'Autre'; (groups[c] = groups[c] || []).push(i); });
  const rank = { todo: 0, cart: 1, unavailable: 2 };
  let secs = '';
  orderedCats(Object.keys(groups)).forEach(c => {
    const arr = groups[c]; if (!arr) return;
    arr.sort((a, b) => rank[a.status] - rank[b.status]);
    secs += catSection('lists', c, arr.length, arr.map(itemRow).join(''));
  });
  h += expandBar('lists') + secs;
  if (!total) h += `<p class="empty">Liste vide. Ajoute un article ci-dessus.</p>`;
  if (done) h += `<button class="sec finish" data-act="finish">Terminer les courses (${done} article${done > 1 ? 's' : ''} pris)</button>`;
  return h;
}

function catListHtml(q) {
  q = q.toLowerCase();
  const idx = storeIndex();
  const ps = S.products.filter(p => p.name.toLowerCase().includes(q) && (!catStoreF || (idx[p.id] && idx[p.id].has(catStoreF)))).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  if (!ps.length) return `<p class="empty">${catStoreF ? 'Aucun produit acheté dans cette enseigne.' : S.products.length ? 'Aucun résultat.' : 'Catalogue vide. Il se remplit tout seul quand tu ajoutes des articles aux listes.'}</p>`;
  const g = {}; ps.forEach(p => { const k = groupOf(p); (g[k] = g[k] || []).push(p); });
  const lp = lastPrices(catStoreF);
  return orderedCats(Object.keys(g)).filter(c => g[c]).map(c => catSection('catalog', c, g[c].length,
    g[c].map(p =>
      `<div class="item"><div class="txt" data-act="editProd" data-id="${p.id}"><b>${esc(p.name)}</b><span>${p.unit ? esc(p.unit) : 'sans unité'}${lp[p.id] ? ' · ' + fmt(lp[p.id].price) + ' € · ' + esc(lp[p.id].store) : ''}</span></div>
       <button class="ic sm" data-act="prodToList" data-id="${p.id}" title="Ajouter à la liste" aria-label="Ajouter à la liste">＋</button></div>`).join(''), !!q)).join('');
}
function viewCatalog() {
  const so = '<option value="">🏬 Toutes les enseignes</option>' + S.stores.map(x => `<option value="${x.id}" ${x.id === catStoreF ? 'selected' : ''}>🏬 ${esc(x.name)}</option>`).join('');
  return `<div class="bar"><input id="catSearch" type="search" placeholder="Rechercher un produit…" value="${esc(catQuery)}">
    <button class="pri" data-act="addProd">＋ Produit</button></div>
    <div class="bar"><select id="catStoreSel" aria-label="Enseigne">${so}</select></div>${expandBar('catalog')}<div id="catList">${catListHtml(catQuery)}</div>`;
}

function viewTickets() {
  if (imp.review) return viewReview();
  const tl = S.tickets.slice().sort((a, b) => b.date.localeCompare(a.date)).map(t =>
    `<div class="item"><div class="txt"><b>${esc(t.store)} · ${esc(t.date)}</b><span>${t.lines.length} article${t.lines.length > 1 ? 's' : ''} · ${fmt(t.total)} €</span></div>
     <button class="ic sm" data-act="tkDel" data-id="${t.id}" aria-label="Supprimer le ticket">✕</button></div>`).join('')
    || '<p class="empty">Aucun ticket importé.</p>';
  return `<div class="card"><h2>Ticket de caisse</h2>
      <p>Prends un ticket en photo, ou choisis un ou plusieurs fichiers : images ou PDF (eTickets). Tu peux mélanger des tickets de dates et de magasins différents : l'IA les lit tous d'un coup. Les images sont réduites avant l'envoi.</p>
      <input type="file" id="tkCam" accept="image/*" capture="environment" hidden>
      <input type="file" id="tkFile" multiple hidden>
      <div class="row"><button class="pri" data-act="tkCam">📷 Photo</button><button class="sec" data-act="tkFile">📄 Fichiers (PDF, images)</button></div>
      ${imp.photos.map((ph, i) => `<div class="tkph">${ph.url ? `<img src="${ph.url}" alt="Ticket ${i + 1}">` : '<span class="pdf">📄</span>'}<span class="nm">${esc(ph.name)}</span><button class="ic sm" data-act="tkRemove" data-id="${i}" aria-label="Retirer">✕</button></div>`).join('')}
      ${imp.photos.length > 1 ? `<p class="hint">${imp.photos.length} tickets prêts à analyser ensemble.</p>` : ''}</div>
    <div class="card"><h2>Lire le ticket avec une IA</h2>
      <p>Ajoute d'abord les tickets ci-dessus. Puis :<br>
      <b>1.</b> « Analyser avec Claude ou Gemini » copie la consigne et envoie les tickets vers l'appli que tu choisis.
      <b>2.</b> Dans l'appli, colle la consigne si elle n'apparaît pas, puis touche « copier » sur la réponse.
      <b>3.</b> Reviens ici : le formulaire se remplit tout seul (sinon, touche « Coller la réponse »). Vérifie, corrige, valide : les tickets s'enchaînent un par un.</p>
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

// Ligne suspecte : quantité × prix ne donne pas le montant imprimé sur le ticket (décalage de lecture de l'IA).
const lineWarn = l => l.amt != null && Math.abs(l.qty * l.price - l.amt) > 0.03;
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
  const stores = S.stores.map(x => `<option value="${esc(x.name)}">`).join('');
  const st = storeByName(R.store);
  const rows = R.lines.map((l, i) => {
    const p = prodByNorm(l.nom);
    const cats = (S.categories.includes(l.cat) ? S.categories : [...S.categories, l.cat]).map(c => `<option ${c === l.cat ? 'selected' : ''}>${esc(c)}</option>`).join('');
    return `<div class="rl ${l.on ? '' : 'off'}">
      <label class="rhead"><input type="checkbox" data-rf="on" data-i="${i}" ${l.on ? 'checked' : ''}><span class="lab">${esc(l.label)}</span><span class="badge bad" id="lw${i}" ${lineWarn(l) ? '' : 'hidden'} title="quantité × prix ≠ montant du ticket">⚠ montant</span>${l.cat === 'Autre' ? '<span class="badge prop">à classer</span>' : ''}<span class="badge ${p ? 'ok' : 'new'}">${p ? 'existe' : 'nouveau'}</span></label>
      <div class="rgrid">
        <input class="full" data-rf="nom" data-i="${i}" value="${esc(l.nom)}" placeholder="Nom du produit">
        <select class="full" data-rf="cat" data-i="${i}" aria-label="Catégorie">${cats}</select>
        <label>Qté<input type="number" step="any" min="0" inputmode="decimal" data-rf="qty" data-i="${i}" value="${l.qty}"></label>
        <label>Prix €<input type="number" step="0.01" min="0" inputmode="decimal" data-rf="price" data-i="${i}" value="${l.price}"></label>
        <label>Remise €<input type="number" step="0.01" min="0" inputmode="decimal" data-rf="disc" data-i="${i}" value="${l.disc}"></label>
        <b class="lt" id="lt${i}">${fmt(l.qty * l.price - l.disc)} €</b>
      </div></div>`;
  }).join('');
  const many = imp.total > 1; const nth = imp.total - imp.queue.length + 1;
  return `<div class="card"><h2>Vérifier le ticket${many ? ` ${nth} / ${imp.total}` : ''}</h2>
      <label class="fl">Magasin<input id="tkStore" list="storeList" value="${esc(R.store)}"></label><datalist id="storeList">${stores}</datalist>
      <div class="two"><label class="fl">Date<input id="tkDate" type="date" value="${esc(R.date)}"></label>
      <label class="fl">Total ticket €<input id="tkTotal" type="number" step="0.01" inputmode="decimal" value="${R.total || ''}"></label></div>
      <p id="tkSum">${sumHtml()}</p>
      ${R.nb && R.rawCount > R.nb ? `<p class="err">L'IA a renvoyé ${R.rawCount} lignes, le ticket en indique ${R.nb} : une ligne est probablement en trop ou coupée en deux.</p>` : ''}
      ${R.lines.some(lineWarn) ? '<p class="err">⚠ Des lignes ont un montant différent du ticket : prix ou nom décalé. Compare avec le ticket.</p>' : ''}
      <p>${st ? 'Magasin connu.' : 'Nouveau magasin : il sera créé à la validation.'} Les produits déjà classés gardent leur catégorie.</p></div>${rows}
    <div class="row"><button class="sec" data-act="tkCancel">${many ? 'Tout annuler' : 'Annuler'}</button>${many ? '<button class="sec" data-act="tkSkip">Ignorer</button>' : ''}<button class="pri" data-act="tkValidate">Valider (${R.lines.filter(l => l.on).length})</button></div>`;
}

function reviewInput(t) {
  const R = imp.review; if (!R) return;
  if (t.id === 'tkStore') R.store = t.value;
  else if (t.id === 'tkDate') R.date = t.value;
  else if (t.id === 'tkTotal') R.total = num(t.value);
  else {
    const i = +t.dataset.i, l = R.lines[i], f = t.dataset.rf; if (!l) return;
    if (f === 'on') l.on = t.checked; else if (f === 'nom' || f === 'cat') l[f] = t.value; else l[f] = num(t.value);
    if (f === 'nom') { const p2 = prodByNorm(t.value); if (p2 && p2.category && p2.category !== 'Autre') l.cat = p2.category; }
    const lt = $('#lt' + i); if (lt) lt.textContent = fmt(l.qty * l.price - l.disc) + ' €';
    const lw = $('#lw' + i); if (lw) lw.hidden = !lineWarn(l);
  }
  const s = $('#tkSum'); if (s) s.innerHTML = sumHtml();
}

function storeModalHtml(s) {
  const al = (s.aliases || []).length ? esc(s.aliases.join(', ')) : 'aucun';
  return `<h3>🏬 ${esc(s.name)}</h3>
    <p class="note">Noms reconnus sur les tickets : ${al}</p>
    <div class="row"><button class="sec" data-act="stRen">Renommer</button><button class="sec" data-act="stAlias">Noms reconnus</button></div>
    <div class="row"><button class="sec danger" data-act="stDel">Supprimer le magasin</button></div>
    <div class="row"><button class="pri" data-act="close">Fermer</button></div>`;
}
const stRefresh = () => { const s = storeById(stEdit); if (s) modal(storeModalHtml(s)); };

function viewData() {
  const stores = S.stores.map(s => `<div class="cat"><span>🏬 ${esc(s.name)}${(s.aliases || []).length ? ' · ' + esc(s.aliases.join(', ')) : ''}</span>
    <button class="ic sm" data-act="storeEdit" data-id="${s.id}" aria-label="Gérer">✎</button></div>`).join('') || '<p class="empty">Aucun magasin : ils se créent à l\'import du premier ticket.</p>';
  const cats = S.categories.map((c, i) => `<div class="cat"><span>${esc(c)}</span>
    <button class="ic sm" data-act="catUp" data-id="${i}" aria-label="Monter">↑</button>
    <button class="ic sm" data-act="catDown" data-id="${i}" aria-label="Descendre">↓</button>
    <button class="ic sm" data-act="catRen" data-id="${i}" aria-label="Renommer">✎</button>
    ${c === 'Autre' ? '' : `<button class="ic sm" data-act="catDel" data-id="${i}" aria-label="Supprimer">✕</button>`}</div>`).join('');
  return `<div class="card"><h2>Sauvegarde</h2>
      <p>Exporte tes données (listes, catalogue, historique) dans un fichier à ranger sur ton Drive. Import : remplace tout le contenu.</p>
      <div class="row"><button class="pri" data-act="export">Exporter</button><button class="sec" data-act="import">Importer</button></div>
      <input type="file" id="impFile" accept="application/json,.json" hidden></div>
    <div class="card"><h2>Magasins</h2><p>Créés automatiquement à l'import des tickets. Le nom imprimé sur le ticket (ville, société) est mémorisé pour reconnaître le magasin. Les rayons de chaque magasin viendront plus tard.</p>${stores}
      <div class="row"><button class="sec" data-act="storeAdd">＋ Ajouter un magasin</button></div></div>
    <div class="card"><h2>Catégories</h2><p>Communes à tous les magasins. L'ordre ici est l'ordre d'affichage. L'IA classe les produits dans cette liste : après un changement, recopie la consigne.</p>${cats}
      <div class="row"><button class="sec" data-act="catAdd">＋ Ajouter une catégorie</button></div></div>
    <div class="card"><h2>Partage à plusieurs</h2><p>Pas encore activé : la synchronisation en temps réel sera branchée à l'étape suivante.</p></div>
    <div class="card"><h2>Zone sensible</h2><div class="row"><button class="sec danger" data-act="reset">Tout effacer</button></div></div>
    <p class="empty">${S.products.length} produits · ${S.history.length} achats archivés<br>Version de l'appli : v${APP_VERSION}</p>`;
}

/* ---------- Actions ---------- */
const ACT = {
  toggle(id) { const i = curList().items.find(x => x.id === id); if (!i) return; i.status = i.status === 'cart' ? 'todo' : 'cart'; save(); render(); },
  unavail(id) { const i = curList().items.find(x => x.id === id); if (!i) return; i.status = i.status === 'unavailable' ? 'todo' : 'unavailable'; save(); render(); },
  toggleSugg() { suggOpen = !suggOpen; render(); },
  toggleCat(_, t) { const set = openCats[t.dataset.v]; const c = t.dataset.c; if (set.has(c)) set.delete(c); else set.add(c); render(); },
  expandAll(_, t) {
    const v = t.dataset.v, set = openCats[v], names = catsOf(v);
    if (names.every(c => set.has(c))) set.clear(); else names.forEach(c => set.add(c));
    render();
  },
  addSug(pid) { addItem(pid, 1); render(); },

  newList() {
    const n = (prompt('Nom de la nouvelle liste ?') || '').trim(); if (!n) return;
    const l = { id: uid(), name: n, items: [], storeId: curList().storeId || null, createdAt: Date.now() };
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
    got.forEach(i => { const p = prodById(i.productId); S.history.push({ id: uid(), date: d, productId: i.productId, name: p ? p.name : '?', qty: i.qty, listName: L.name, storeId: L.storeId || null }); });
    L.items = L.items.filter(i => i.status !== 'cart'); save(); render(); toast('Courses archivées');
  },

  edit(id) {
    const i = curList().items.find(x => x.id === id); if (!i) return; const p = prodById(i.productId);
    modal(`<h3>${esc(p ? p.name : '?')}</h3>
      <form id="itemForm" data-id="${i.id}">
        <label>Quantité</label><input id="eQty" type="number" min="1" value="${i.qty}" inputmode="numeric">
        <label>Note (marque, taille…)</label><input id="eNote" value="${esc(i.note)}">
        <label>Catégorie</label>${catSelect('eCat', p ? p.category : 'Autre')}
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

  catAdd() { const n = (prompt('Nom de la catégorie ?') || '').trim(); if (!n || S.categories.includes(n)) return; S.categories.splice(S.categories.length - 1, 0, n); save(); render(); },
  catRen(i) {
    i = +i; const old = S.categories[i]; const n = (prompt('Nouveau nom ?', old) || '').trim();
    if (!n || n === old) return;
    if (S.categories.includes(n)) {
      if (!confirm(`« ${n} » existe déjà : fusionner « ${old} » dedans ?`)) return;
      S.products.forEach(p => { if (p.category === old) p.category = n; }); S.categories.splice(i, 1);
    } else { S.categories[i] = n; S.products.forEach(p => { if (p.category === old) p.category = n; }); }
    save(); render();
  },
  catDel(i) {
    i = +i; const c = S.categories[i]; if (c === 'Autre') return;
    if (!confirm(`Supprimer la catégorie « ${c} » ? Ses produits passent dans « Autre ».`)) return;
    S.products.forEach(p => { if (p.category === c) p.category = 'Autre'; }); S.categories.splice(i, 1); save(); render();
  },
  catUp(i) { i = +i; if (i < 1) return; [S.categories[i - 1], S.categories[i]] = [S.categories[i], S.categories[i - 1]]; save(); render(); },
  catDown(i) { i = +i; if (i >= S.categories.length - 1) return; [S.categories[i + 1], S.categories[i]] = [S.categories[i], S.categories[i + 1]]; save(); render(); },

  tkCam() { $('#tkCam').click(); },
  tkFile() { $('#tkFile').click(); },
  async tkCopy() { toast((await copyText(buildPrompt(imp.photos.length))) ? 'Consigne copiée' : 'Copie impossible'); },
  async tkAnalyze() {
    if (!imp.photos.length) { toast("Ajoute d'abord un ticket (photo ou fichier)"); return; }
    const pr = buildPrompt(imp.photos.length);
    const copied = await copyText(pr); imp.waiting = true;
    const data = { files: imp.photos.map(x => x.file), text: pr, title: 'Tickets de caisse' };
    if (navigator.canShare && navigator.canShare(data)) { try { await navigator.share(data); } catch (e) { /* annulé */ } }
    else toast(copied ? 'Consigne copiée : ouvre Claude ou Gemini et joins les tickets' : 'Partage indisponible');
  },
  async tkOpenClaude() { await copyText(buildPrompt(imp.photos.length)); imp.waiting = true; toast('Consigne copiée : colle-la et joins les tickets'); window.open('https://claude.ai/new', '_blank'); },
  async tkOpenGemini() { await copyText(buildPrompt(imp.photos.length)); imp.waiting = true; toast('Consigne copiée : colle-la et joins les tickets'); window.open('https://gemini.google.com/app', '_blank'); },
  async tkPaste() {
    try { imp.json = await navigator.clipboard.readText(); }
    catch (e) { imp.error = 'Lecture du presse-papiers impossible : colle la réponse à la main ci-dessous.'; render(); return; }
    ACT.tkParse();
  },
  tkParse() {
    try { startQueue(parseTickets(imp.json)); }
    catch (e) { imp.error = 'Réponse non reconnue : ' + e.message; }
    render(); window.scrollTo(0, 0);
  },
  tkRemove(i) { const ph = imp.photos[+i]; if (!ph) return; if (ph.url) URL.revokeObjectURL(ph.url); imp.photos.splice(+i, 1); render(); },
  tkSkip() { imp.queue.shift(); showNext(); if (!imp.review) { resetImp(); tab = 'tickets'; } render(); window.scrollTo(0, 0); },
  tkCancel() { imp.review = null; imp.queue = []; imp.total = 0; render(); },
  tkValidate() {
    const R = imp.review; if (!R) return;
    const storeName = R.store.trim(); if (!storeName) { toast('Indique le magasin'); return; }
    const on = R.lines.filter(l => l.on && l.nom.trim()); if (!on.length) { toast('Aucune ligne sélectionnée'); return; }
    const st = ensureStore(storeName);
    st.aliases = st.aliases || [];
    (R.printed || []).forEach(n => { const o = storeByName(n); if (norm(n) && norm(n) !== norm(st.name) && !o) st.aliases.push(n.trim()); });
    const tid = uid(); const dateMs = new Date(R.date + 'T12:00:00').getTime() || Date.now();
    const lines = []; let created = 0, reclassed = 0;
    on.forEach(l => {
      let p = prodByNorm(l.nom);
      const cat = l.cat && S.categories.includes(l.cat) ? l.cat : (l.cat ? matchCat(l.cat) : 'Autre');
      if (!p) { p = { id: uid(), name: l.nom.trim(), category: cat, unit: l.unit || '', place: {} }; S.products.push(p); created++; }
      else { if (!p.unit && l.unit) p.unit = l.unit; if (p.category !== cat) { p.category = cat; reclassed++; } }
      mapSet(st.name, l.label, p.id);
      lines.push({ label: l.label, productId: p.id, qty: l.qty, unitPrice: l.price, discount: l.disc, lineTotal: r2(l.qty * l.price - l.disc) });
      S.history.push({ id: uid(), date: dateMs, productId: p.id, name: p.name, qty: l.qty, listName: 'Ticket ' + st.name, ticketId: tid, storeId: st.id });
    });
    const sum = r2(lines.reduce((s, l) => s + l.lineTotal, 0));
    S.tickets.push({ id: tid, store: st.name, storeId: st.id, date: R.date, total: R.total || sum, lines });
    save();
    const msg = `${created} produit${created > 1 ? 's' : ''} créé${created > 1 ? 's' : ''}` + (reclassed ? `, ${reclassed} reclassé${reclassed > 1 ? 's' : ''}` : '');
    imp.queue.shift(); showNext();
    if (imp.review) { render(); window.scrollTo(0, 0); toast(`Ticket enregistré (${msg}). Suivant : ${imp.total - imp.queue.length + 1} / ${imp.total}`); }
    else { resetImp(); tab = 'catalog'; render(); toast(msg); }
  },
  tkDel(id) {
    if (!confirm('Supprimer ce ticket et ses achats archivés ? Les produits du catalogue sont conservés.')) return;
    S.tickets = S.tickets.filter(t => t.id !== id); S.history = S.history.filter(h => h.ticketId !== id); save(); render();
  },

  storeEdit(id) { if (!storeById(id)) return; stEdit = id; stRefresh(); },
  storeAdd() {
    const n = (prompt('Nom du magasin ?') || '').trim(); if (!n) return;
    const s = ensureStore(n); save(); render(); ACT.storeEdit(s.id);
  },
  stRen() {
    const s = storeById(stEdit); if (!s) return;
    const n = (prompt('Nouveau nom ?', s.name) || '').trim(); if (!n || n === s.name) return;
    const dup = storeByName(n); if (dup && dup.id !== s.id) { toast('Ce magasin existe déjà'); return; }
    const ok = norm(s.name), nk = norm(n);
    if (ok !== nk && S.labelMap[ok]) { S.labelMap[nk] = Object.assign({}, S.labelMap[nk] || {}, S.labelMap[ok]); delete S.labelMap[ok]; }
    s.name = n; S.tickets.forEach(t => { if (t.storeId === s.id) t.store = n; });
    save(); render(); stRefresh();
  },
  stDel() {
    const s = storeById(stEdit); if (!s) return;
    if (!confirm(`Supprimer le magasin « ${s.name} » ? Les tickets et les produits sont conservés.`)) return;
    S.stores = S.stores.filter(x => x.id !== s.id);
    S.lists.forEach(l => { if (l.storeId === s.id) l.storeId = null; });
    S.products.forEach(p => { if (p.place) delete p.place[s.id]; });
    save(); closeModal(); render();
  },
  stAlias() {
    const s = storeById(stEdit); if (!s) return;
    const v = prompt('Noms imprimés sur les tickets de ce magasin (séparés par une virgule) ?', (s.aliases || []).join(', ')); if (v == null) return;
    s.aliases = v.split(',').map(x => x.trim()).filter(x => x && norm(x) !== norm(s.name) && !(storeByName(x) && storeByName(x).id !== s.id));
    save(); render(); stRefresh();
  },

  close() { closeModal(); render(); },
};

function prodForm(p) {
  modal(`<h3>${p ? 'Modifier le produit' : 'Nouveau produit'}</h3>
    <form id="prodForm" data-id="${p ? p.id : ''}">
      <label>Nom</label><input id="pName" value="${esc(p ? p.name : '')}" required>
      <label>Catégorie</label>${catSelect('pCat', p ? p.category : 'Autre')}
      <label>Unité (facultatif : kg, L, boîte…)</label><input id="pUnit" value="${esc(p ? p.unit : '')}">
      <div class="row">${p ? `<button type="button" class="sec danger" data-act="delProd" data-id="${p.id}">Supprimer</button>` : '<button type="button" class="sec" data-act="close">Annuler</button>'}<button class="pri">Enregistrer</button></div>
    </form>`);
}

/* ---------- Événements ---------- */
document.addEventListener('click', e => {
  if (e.target.id === 'modal') { closeModal(); return; }
  const t = e.target.closest('[data-act],[data-tab]'); if (!t) return;
  if (t.dataset.tab) { tab = t.dataset.tab; render(); window.scrollTo(0, 0); return; }
  const fn = ACT[t.dataset.act]; if (fn) fn(t.dataset.id, t);
});

document.addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target;
  if (f.id === 'addForm') {
    const name = $('#addName').value.trim(); if (!name) return;
    const qty = Math.max(1, parseInt($('#addQty').value, 10) || 1);
    let p = prodByName(name);
    if (!p) { p = { id: uid(), name, category: $('#addCat').value, unit: '', place: {} }; S.products.push(p); }
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
    if (!p) { p = { id: uid(), name, category: 'Autre', unit: '', place: {} }; S.products.push(p); }
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
  else if (e.target.id === 'catStoreSel') { catStoreF = e.target.value; render(); }
  else if (e.target.id === 'storeSel') { curList().storeId = e.target.value || null; save(); render(); }
  else if (e.target.id === 'tkCam' || e.target.id === 'tkFile') {
    const fs = [...e.target.files]; if (!fs.length) return;
    e.target.value = ''; loadPhotos(fs);
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
