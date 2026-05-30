// ═══════════════════════════════════════════════════════════════════
// UTILS — escapeHTML · log · API key local
// ═══════════════════════════════════════════════════════════════════
function escapeHTML(str) {
  const d = document.createElement('div');
  d.textContent = String(str ?? '');
  return d.innerHTML;
}
const log = (...a) => { if (localStorage.getItem('debug')) console.log(...a); };

function saveAnthropicKey(key) {
  localStorage.setItem('anthropic_api_key', key.trim());
}
function getAnthropicKey() {
  return localStorage.getItem('anthropic_api_key') || '';
}

// ═══════════════════════════════════════════════════════════════════
// TEMA OSCURO / CLARO
// ═══════════════════════════════════════════════════════════════════
function initTheme() {
  const saved = localStorage.getItem('gp_theme');
  if (saved) {
    // User has a manual preference — use it
    applyTheme(saved);
  } else {
    // No manual preference — follow system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }
  // Keep listening to system changes (only if no manual override)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('gp_theme')) applyTheme(e.matches ? 'dark' : 'light');
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = theme === 'dark' ? '🌙' : '☀️';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem('gp_theme', next);
  applyTheme(next);
}




// ═══════════════════════════════════════════════════════════════════
// FETCH API KEY FROM FIRESTORE (never hardcoded)
// ═══════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════
// COLOR THEMES
// ═══════════════════════════════════════════════════════════════════
const COLOR_THEMES = {
  teal:   { label:'Teal',   accent:'#7DBFBF', bg:'#0E1C1C' },
  amber:  { label:'Ámbar',  accent:'#F5A623', bg:'#1C0F00' },
  green:  { label:'Green',  accent:'#8EB69B', bg:'#051F20' },
  purple: { label:'Púrpura',accent:'#DFB6B2', bg:'#190019' },
  coral:  { label:'Coral',  accent:'#FFA586', bg:'#161E2F' },
};

function initColorTheme() {
  const saved = localStorage.getItem('gp_color_theme') || 'amber';
  applyColorTheme(saved);
}

function applyColorTheme(name) {
  document.documentElement.setAttribute('data-color', name);
  localStorage.setItem('gp_color_theme', name);
  // Update splash icon
    const splashImg = document.querySelector('#splashScreen img');
  if (splashImg) splashImg.src = './icon-192.png';
  // Update app icons
  const appIcons = document.querySelectorAll('.app-icon-img');
  appIcons.forEach(el => { el.src = './icon-192.png'; });
  renderThemeSwatches();
}

function guardarAnthropicKey() {
  const key = document.getElementById('anthropicKeyInput').value.trim();
  if (!key.startsWith('sk-ant-')) {
    alert('La clave debe empezar por sk-ant-');
    return;
  }
  saveAnthropicKey(key);
  document.getElementById('anthropicKeyInput').value = '';
  loadAnthropicKeyToInput();
  alert('✅ Clave guardada correctamente');
}

function loadAnthropicKeyToInput() {
  const input = document.getElementById('anthropicKeyInput');
  if (!input) return;
  const saved = getAnthropicKey();
  input.placeholder = saved ? saved.slice(0, 8) + '••••••••' : 'sk-ant-...';
}

function renderThemeSwatches() {
  const wrap = document.getElementById('themeSwatches');
  if (!wrap) return;
  const current = localStorage.getItem('gp_color_theme') || 'amber';
  wrap.innerHTML = Object.entries(COLOR_THEMES).map(([key, t]) => `
    <button onclick="applyColorTheme('${key}')" title="${t.label}"
      style="display:flex;flex-direction:column;align-items:center;gap:.35rem;
        background:${current===key ? 'rgba(255,255,255,0.1)' : 'transparent'};
        border:2px solid ${current===key ? t.accent : 'rgba(255,255,255,0.08)'};
        border-radius:.75rem;padding:.5rem .25rem;cursor:pointer;transition:all .2s">
      <span style="width:28px;height:28px;border-radius:50%;background:${t.accent};
        display:block;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></span>
      <span style="font-size:.6rem;color:${current===key ? t.accent : 'rgba(255,255,255,0.4)'};
        font-family:Sora,sans-serif;font-weight:${current===key?'600':'400'}">${t.label}</span>
    </button>`).join('');
}

// ═══════════════════════════════════════════════════════════════════
// FIREBASE CONFIG & INIT
// ═══════════════════════════════════════════════════════════════════
// TODO: Move to environment variables / config.local.js (see .env.example)
// SECURITY: Do not commit real keys to version control
const firebaseConfig = {
  apiKey: "AIzaSyANlZleUp1jS1iT9QpDKgVQvMk76zVKnJo",
  authDomain: "gastos-en-pareja-e2f3c.firebaseapp.com",
  projectId: "gastos-en-pareja-e2f3c",
  storageBucket: "gastos-en-pareja-e2f3c.firebasestorage.app",
  messagingSenderId: "134933655955",
  appId: "1:134933655955:web:06777421bd1fa4ba777866"
};

// Firebase instances — initialized lazily inside initFirebase()
let db   = null;
let auth = null;
const SHARED_DOC = () => db.collection('parejas').doc('shared');

function initFirebase() {
  if (typeof firebase === 'undefined') {
    setTimeout(initFirebase, 100); // retry until SDK is ready
    return;
  }
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  db   = firebase.firestore();
  auth = firebase.auth();

  // Auth state listener — set up after SDK ready
  auth.onAuthStateChanged(user => {
    const loginScreen = document.getElementById('loginScreen');
    const logoutBtn   = document.getElementById('logoutBtn');
    if (user) {
      loginScreen.style.display = 'none';
      logoutBtn.style.display = 'block';
      updateLoginNames();
      // Show splash for 3 seconds
      const splash = document.getElementById('splashScreen');
      splash.style.display = 'flex';
      requestAnimationFrame(() => setTimeout(() => {
        const bar = document.getElementById('splashProgressBar');
        if (bar) bar.style.width = '100%';
      }, 50));
      setTimeout(() => {
        splash.style.opacity = '0';
        splash.style.transition = 'opacity .6s ease';
        setTimeout(() => { splash.style.display = 'none'; }, 600);
      }, 3000);
      initFirestoreSync();
    } else {
      loginScreen.style.display = 'flex';
      logoutBtn.style.display = 'none';
      if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
      setSyncStatus('offline');
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════

function showEmailLogin() {
  document.getElementById('emailLoginWrap').style.display = 'block';
}

function loginAs(role) {
  // Sign in anonymously then store which person they are
  auth.signInAnonymously()
    .then(result => {
      localStorage.setItem('gp_current_role', role);
    })
    .catch(e => {
      // If anonymous not enabled, fall back to showing email login
      showEmailLogin();
      setLoginErr('Usa email para acceder');
    });
}

function updateLoginNames() {
  const p1 = state.config.p1 || 'Persona 1';
  const p2 = state.config.p2 || 'Persona 2';
  const lbl1 = document.getElementById('lblP1');
  const lbl2 = document.getElementById('lblP2');
  if (lbl1) lbl1.textContent = p1;
  if (lbl2) lbl2.textContent = p2;
}

function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPassword').value;
  setLoginErr('');
  auth.signInWithEmailAndPassword(email, pass)
    .catch(e => setLoginErr(friendlyAuthError(e.code)));
}

function doRegister() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPassword').value;
  if (pass.length < 6) return setLoginErr('La contraseña debe tener al menos 6 caracteres');
  setLoginErr('');
  auth.createUserWithEmailAndPassword(email, pass)
    .catch(e => setLoginErr(friendlyAuthError(e.code)));
}

function doGoogleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(e => setLoginErr(friendlyAuthError(e.code)));
}

function doLogout() {
  if (confirm('¿Cerrar sesión?')) auth.signOut();
}

function setLoginErr(msg) {
  document.getElementById('loginErr').textContent = msg;
}

function friendlyAuthError(code) {
  const msgs = {
    'auth/user-not-found':    'No existe cuenta con ese email',
    'auth/wrong-password':    'Contraseña incorrecta',
    'auth/invalid-email':     'Email no válido',
    'auth/email-already-in-use': 'Ese email ya tiene cuenta — inicia sesión',
    'auth/weak-password':     'Contraseña demasiado corta',
    'auth/invalid-credential':'Email o contraseña incorrectos',
  };
  return msgs[code] || 'Error: ' + code;
}

// Auth listener is inside initFirebase()

// ═══════════════════════════════════════════════════════════════════
// FIRESTORE SYNC
// ═══════════════════════════════════════════════════════════════════
let _unsubscribe = null;
let _isSaving = false;

function initFirestoreSync() {
  setSyncStatus('syncing');
  // Real-time listener — updates app whenever cloud data changes
  _unsubscribe = SHARED_DOC().onSnapshot(doc => {
    if (_isSaving) return; // ignore our own writes
    if (doc.exists) {
      const data = doc.data();
      // Fix any bad dates in existing data
      state.gastos       = (data.gastos || []).map(g => ({ ...g, date: fixDate(g.date) }));
      state.ingresos     = data.ingresos     || [];
      state.presupuestos = data.presupuestos || [];
      state.cats         = data.cats         || DEFAULT_CATS;
      state.config       = data.config       || { p1: '', p2: '' };
      updateLoginNames();
      // Refresh UI
      populateSelects();
      populatePayers();
      applyConfig();
      renderDashboard();
      renderLista();
      renderIngresos();
      setSyncStatus('online');
    } else {
      // First time — push local state to cloud
      cloudSave();
    }
  }, err => {
    console.error('Firestore error:', err);
    setSyncStatus('offline');
  });
}

async function cloudSave() {
  _isSaving = true;
  setSyncStatus('syncing');
  try {
    await SHARED_DOC().set({
      gastos:       state.gastos,
      ingresos:     state.ingresos,
      presupuestos: state.presupuestos || [],
      cats:         state.cats || DEFAULT_CATS,
      config:       state.config,
      updatedAt:    firebase.firestore.FieldValue.serverTimestamp(),
    });
    setSyncStatus('online');
  } catch(e) {
    console.error('Save error:', e);
    setSyncStatus('offline');
    showToast('Error al sincronizar', 'err');
  } finally {
    setTimeout(() => { _isSaving = false; }, 500);
  }
}

function setSyncStatus(status) {
  const dot   = document.getElementById('syncDot');
  const label = document.getElementById('syncLabel');
  if (!dot) return;
  dot.className = 'sync-dot' + (status === 'offline' ? ' offline' : status === 'syncing' ? ' syncing' : '');
  label.textContent = status === 'online' ? 'sync ✓' : status === 'syncing' ? 'guardando…' : 'sin conexión';
}

// ═══════════════════════════════════════════════════════════════════
// STATE — now backed by Firestore
// ═══════════════════════════════════════════════════════════════════

const DEFAULT_CATS = [
  { name:'Alimentación', color:'#3A8A5A' }, { name:'Restaurante',  color:'#207060' },
  { name:'Vivienda',     color:'#2D6A6A' }, { name:'Transporte',   color:'#C06030' },
  { name:'Salud',        color:'#4080A0' }, { name:'Ocio',         color:'#806030' },
  { name:'Ropa',         color:'#A04070' }, { name:'Facturas',     color:'#6040A0' },
  { name:'Electrónica',  color:'#304080' }, { name:'Otros',        color:'#607070' },
];
function getCats()      { return (state && state.cats ? state.cats : DEFAULT_CATS).map(c => c.name); }
function getCatColor(n) { const list = state && state.cats ? state.cats : DEFAULT_CATS; const c = list.find(x=>x.name===n); return c ? c.color : '#607070'; }
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

let state = load();

function load() {
  const def = {
    gastos: [], ingresos: [], presupuestos: [],
    config: { p1: '', p2: '' },
    cats: DEFAULT_CATS.map(c=>({...c})),
  };
  try { return { ...def, ...JSON.parse(localStorage.getItem('gp_data') || '{}') }; }
  catch { return def; }
}
function save() {
  localStorage.setItem('gp_data', JSON.stringify(state)); // local backup
  if (auth.currentUser) cloudSave(); // sync to cloud
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function fmt(n, decimals=2) {
  return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',minimumFractionDigits:decimals}).format(n||0);
}
function fmtDate(iso) {
  if (!iso) return '—';
  // Fix any bad date before displaying
  const fixed = fixDate(iso);
  if (!fixed || fixed === todayIso() && iso !== todayIso()) return iso; // show as-is if unfixable
  const [y,m,d] = fixed.split('-');
  if (!y || !m || !d || y === 'undefined') return iso;
  return `${d}/${m}/${y}`;
}
function monthKey(iso) {
  if (!iso) return '';
  const fixed = fixDate(iso);
  if (!fixed || fixed.includes('undefined')) return '';
  return fixed.slice(0,7);
}
function todayIso() { return new Date().toISOString().slice(0,10); }

// ═══════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════
window.addEventListener('load', () => {
  initTheme();
  initColorTheme();
  initFirebase();
  populateSelects();
  applyConfig();
  renderDashboard();
  renderLista();
  renderIngresos();

  // Set today on date inputs
  document.getElementById('gDate').value = todayIso();

  // Scanner drag
  const drop = document.getElementById('scanDrop');
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
  drop.addEventListener('drop', e => {
    e.preventDefault(); drop.classList.remove('drag');
    addScanFilesRaw([...e.dataTransfer.files]);
  });

  // Load api key into scanner field

  // Restore tab from URL hash
  const initialTab = location.hash.slice(1) || 'dashboard';
  const validTabs = ['dashboard','gastos','ingresos','lista','scanner','presupuesto','config'];
  switchTab(validTabs.includes(initialTab) ? initialTab : 'dashboard');
});

function populateSelects() {
  // Categories
  populateCatSelects();

  // Payers
  populatePayers();

  // Month inputs: free input via <input type="month">, set current month as default
  const now = new Date();
  const curKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const now2 = new Date();
  const curDate = now2.toISOString().slice(0,10);
  const dEl = document.getElementById('dashMonthSel'); if(dEl) dEl.value = curDate;
  const iEl = document.getElementById('iMonth');       if(iEl) iEl.value = curDate;
  // filterMonth left blank
  const bEl = document.getElementById('budgetMonth'); if(bEl) bEl.value = curDate;
}

function populatePayers() {
  const { p1, p2 } = state.config;
  ['gPayer','ePayer','filterPayer','iPerson'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const isFilter = id === 'filterPayer';
    sel.innerHTML = isFilter ? '<option value="">Todos</option>' : '';
    [p1, p2, 'Conjunto'].forEach(n => {
      const o = document.createElement('option'); o.value = n; o.textContent = n;
      sel.appendChild(o);
    });
  });
}

function applyConfig() {
  document.getElementById('p1name').value = state.config.p1;
  document.getElementById('p2name').value = state.config.p2;
  renderCatsConfigList();
}

// ═══════════════════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════════════════
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach((b,i) => {
    const panels = ['dashboard','gastos','ingresos','lista','scanner','presupuesto','config'];
    b.classList.toggle('active', panels[i] === name);
  });
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-'+name).classList.add('active');
  history.replaceState(null, '', '#' + name);
  if (name==='dashboard') renderDashboard();
  if (name==='lista') renderLista();
  if (name==='ingresos') renderIngresos();
  if (name==='presupuesto') { onBudgetTypeChange(); renderBudgetRows(); renderSavedBudgets(); }
  if (name==='config') { renderThemeSwatches(); loadAnthropicKeyToInput(); }
  // Show API key warning banner in scanner tab if key is set
  if (name==='scanner') {
    const warn = document.getElementById('scanner-api-warning');
    if (warn) warn.style.display = getAnthropicKey() ? 'block' : 'none';
  }
}

// ═══════════════════════════════════════════════════════════════════
// GASTOS CRUD
// ═══════════════════════════════════════════════════════════════════
function addGasto() {
  const date  = document.getElementById('gDate').value;
  const store = document.getElementById('gStore').value.trim();
  const cat   = document.getElementById('gCat').value;
  const amt   = parseFloat(document.getElementById('gAmt').value);
  const desc  = document.getElementById('gDesc').value.trim();
  const payer = document.getElementById('gPayer').value;
  const type  = document.getElementById('gType').value;

  if (!date || !store || !cat || !amt || amt <= 0 || !payer) {
    return showToast(!cat ? 'Selecciona una categoría' : 'Rellena los campos obligatorios *', 'err');
  }

  // ── Budget check ──
  const mk = monthKey(date);
  const budget = getBudgetForMonth(mk);
  const presupCat = budget?.entries.find(e => e.cat === cat)?.importe || 0;
  const gastadoCat = state.gastos
    .filter(g => g.cat === cat && monthKey(g.date) === mk)
    .reduce((s, g) => s + g.amt, 0);
  const nuevoTotal = gastadoCat + amt;
  const overBudget = presupCat > 0 && nuevoTotal > presupCat;
  const nearBudget = presupCat > 0 && !overBudget && nuevoTotal >= presupCat * 0.85;

  const gasto = { id: uid(), date, store, cat, amt, desc, payer, type };
  state.gastos.push(gasto);
  _lastGasto = gasto;
  save();

  // ── Reset form ──
  document.getElementById('gStore').value = '';
  document.getElementById('gAmt').value = '';
  document.getElementById('gDesc').value = '';
  document.getElementById('gDate').value = todayIso();
  document.getElementById('gCat').value = '';
  const catList2 = state && state.cats ? state.cats : DEFAULT_CATS;
  renderCatChips('gCat', 'gCatChips', catList2);
  renderDashboard();
  renderLista();

  // ── Show banner ──
  let sub = `${fmt(amt)} · ${cat} · ${payer}`;
  if (overBudget) {
    sub += ` · ⚠ Excedido (${fmt(nuevoTotal)} / ${fmt(presupCat)})`;
    showSuccessBanner('Gasto añadido — ⚠ Presupuesto excedido', sub, '#C94040');
  } else if (nearBudget) {
    sub += ` · ⚡ Cerca del límite (${Math.round(nuevoTotal/presupCat*100)}%)`;
    showSuccessBanner('Gasto añadido — Cerca del límite', sub, '#C87820');
  } else {
    showSuccessBanner('Gasto añadido', sub, null);
  }
}

let _lastGasto = null;
let _bannerTimer = null;

function showSuccessBanner(title, sub, color) {
  const banner = document.getElementById('successBanner');
  document.getElementById('bannerTitle').textContent = title;
  document.getElementById('bannerSub').textContent = sub;
  banner.style.background = color
    ? `linear-gradient(135deg, ${color}, #2D6A6A)`
    : 'linear-gradient(135deg, #2A7A5A, #2D6A6A)';
  banner.classList.add('show');
  clearTimeout(_bannerTimer);
  _bannerTimer = setTimeout(() => banner.classList.remove('show'), 4500);
}

function undoLastGasto() {
  if (!_lastGasto) return;
  state.gastos = state.gastos.filter(g => g.id !== _lastGasto.id);
  _lastGasto = null;
  save();
  document.getElementById('successBanner').classList.remove('show');
  renderDashboard(); renderLista();
  showToast('Gasto deshecho');
}

function deleteGasto(id) {
  state.gastos = state.gastos.filter(g => g.id !== id);
  save(); renderLista(); renderDashboard();
  showToast('Gasto eliminado');
}

function openEdit(id) {
  const g = state.gastos.find(g => g.id === id);
  if (!g) return;
  document.getElementById('editId').value = id;
  document.getElementById('eDate').value = g.date;
  document.getElementById('eStore').value = g.store;
  document.getElementById('eDesc').value = g.desc || '';
  document.getElementById('eAmt').value = g.amt;

  // Populate selects
  const eCat = document.getElementById('eCat');
  eCat.innerHTML = '';
  getCats().forEach(c => { const o=document.createElement('option'); o.value=c; o.textContent=c; eCat.appendChild(o); });
  eCat.value = g.cat;

  const ePayer = document.getElementById('ePayer');
  ePayer.innerHTML = '';
  [state.config.p1, state.config.p2, 'Conjunto'].forEach(n => {
    const o=document.createElement('option'); o.value=n; o.textContent=n; ePayer.appendChild(o);
  });
  ePayer.value = g.payer;

  openModal('editModal');
}

function saveEdit() {
  const id = document.getElementById('editId').value;
  const g = state.gastos.find(g => g.id === id);
  if (!g) return;
  g.date  = document.getElementById('eDate').value;
  g.store = document.getElementById('eStore').value.trim();
  g.cat   = document.getElementById('eCat').value;
  g.amt   = parseFloat(document.getElementById('eAmt').value);
  g.desc  = document.getElementById('eDesc').value.trim();
  g.payer = document.getElementById('ePayer').value;
  save();
  closeModal('editModal');
  renderLista(); renderDashboard();
  showToast('✓ Cambios guardados');
}

// ═══════════════════════════════════════════════════════════════════
// INGRESOS CRUD
// ═══════════════════════════════════════════════════════════════════
function addIngreso() {
  const month = (document.getElementById('iMonth')?.value || '').slice(0,7);
  const person = document.getElementById('iPerson').value;
  const type   = document.getElementById('iType').value;
  const amt    = parseFloat(document.getElementById('iAmt').value);
  if (!month || !person || !amt || amt <= 0) return showToast('Rellena todos los campos', 'err');
  state.ingresos.push({ id: uid(), month, person, type, amt });
  save();
  showToast('✓ Ingreso añadido');
  document.getElementById('iAmt').value = '';
  renderIngresos();
  renderDashboard();
}

function deleteIngreso(id) {
  state.ingresos = state.ingresos.filter(i => i.id !== id);
  save(); renderIngresos(); renderDashboard();
}

function renderIngresos() {
  // Resumen
  const { p1, p2 } = state.config;
  const totP1 = state.ingresos.filter(i=>i.person===p1).reduce((s,i)=>s+i.amt,0);
  const totP2 = state.ingresos.filter(i=>i.person===p2).reduce((s,i)=>s+i.amt,0);
  const tot   = totP1 + totP2;
  document.getElementById('ingresosResumen').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:.75rem">
      ${[{n:p1,v:totP1},{n:p2,v:totP2},{n:'Total',v:tot}].map(x=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:.6rem .8rem;background:rgba(255,255,255,0.04);border-radius:.6rem">
          <span style="font-size:.85rem;color:var(--white)">${x.n}</span>
          <span class="mono" style="color:var(--teal-light)">${fmt(x.v)}</span>
        </div>`).join('')}
      ${tot>0 ? `
        <div style="font-size:.75rem;color:var(--gray);text-align:center;margin-top:.25rem">
          ${p1}: ${(totP1/tot*100).toFixed(1)}% · ${p2}: ${(totP2/tot*100).toFixed(1)}%
        </div>` : ''}
    </div>`;

  // Table
  const tbody = document.getElementById('ingresosBody');
  const rows = [...state.ingresos].sort((a,b)=>b.month.localeCompare(a.month));
  tbody.innerHTML = rows.length ? rows.map(i=>`
    <tr>
      <td>${MONTHS_ES[parseInt(i.month.slice(5))-1]} ${i.month.slice(0,4)}</td>
      <td style="font-weight:500">${i.person}</td>
      <td><span class="chip" style="background:rgba(45,106,106,0.2);color:var(--teal-light)">${i.type}</span></td>
      <td class="mono" style="color:#5ABEA0">${fmt(i.amt)}</td>
      <td><button class="del-btn" onclick="deleteIngreso('${i.id}')">✕</button></td>
    </tr>`).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--gray);padding:2rem">Sin ingresos registrados</td></tr>';
}

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════
function renderDashboard() {
  const mk = (document.getElementById('dashMonthSel')?.value || '').slice(0,7);
  if (!mk) return;

  const [y,m] = mk.split('-');
  document.getElementById('dashMonth').textContent = `${MONTHS_ES[parseInt(m)-1]} ${y}`;

  const gastosMes = state.gastos.filter(g => monthKey(g.date) === mk);
  const ingresosMes = state.ingresos.filter(i => i.month === mk);

  const totalGastos   = gastosMes.reduce((s,g)=>s+g.amt, 0);
  const totalIngresos = ingresosMes.reduce((s,i)=>s+i.amt, 0);
  const disponible    = totalIngresos - totalGastos;
  const { p1, p2 }   = state.config;
  const gastoP1 = gastosMes.filter(g=>g.payer===p1).reduce((s,g)=>s+g.amt,0);
  const gastoP2 = gastosMes.filter(g=>g.payer===p2).reduce((s,g)=>s+g.amt,0);

  // KPIs
  document.getElementById('kpiRow').innerHTML = `
    <div class="kpi highlight">
      <div class="kpi-label">Total gastos</div>
      <div class="kpi-value">${fmt(totalGastos)}</div>
      <div class="kpi-sub">${gastosMes.length} transacciones</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Ingresos</div>
      <div class="kpi-value">${fmt(totalIngresos)}</div>
      <div class="kpi-sub">${ingresosMes.length} registros</div>
    </div>
    <div class="kpi ${disponible>=0?'pos':'neg'}">
      <div class="kpi-label">Disponible</div>
      <div class="kpi-value">${fmt(disponible)}</div>
      <div class="kpi-sub">${disponible>=0?'Superávit':'Déficit'}</div>
    </div>
  `;

  // ── Gráfica presupuesto vs gasto real por categoría ──
  const budget = getBudgetForMonth(mk);
  const byCat = {};
  gastosMes.forEach(g => byCat[g.cat] = (byCat[g.cat]||0) + g.amt);

  const pieWrap = document.getElementById('catPieWrap');

  // Reúne todas las categorías con presupuesto o con gasto
  const allCatNames = new Set([
    ...Object.keys(byCat),
    ...(budget ? budget.entries.map(e => e.cat) : [])
  ]);

  if (!allCatNames.size) {
    pieWrap.innerHTML = '<p style="color:var(--gray);font-size:.85rem;padding:1rem 0">Sin gastos ni presupuesto este mes</p>';
  } else {
    const catItems = [...allCatNames].map(cat => ({
      cat,
      color:   getCatColor(cat) || '#607070',
      gastado: byCat[cat] || 0,
      presup:  budget?.entries.find(e => e.cat === cat)?.importe || 0,
    })).sort((a,b) => (b.presup || b.gastado) - (a.presup || a.gastado));

    const maxVal = Math.max(...catItems.map(i => Math.max(i.gastado, i.presup)), 1);
    const hasBudget = catItems.some(i => i.presup > 0);

    const rows = catItems.map(item => {
      const over    = item.presup > 0 && item.gastado > item.presup;
      const barColor = over ? '#C94040' : item.color;
      const gastPct  = (item.gastado / maxVal * 100).toFixed(1);
      const presPct  = item.presup > 0 ? (item.presup / maxVal * 100).toFixed(1) : 0;
      const usoPct   = item.presup > 0 ? (item.gastado / item.presup * 100).toFixed(0) : null;

      return `
      <div style="margin-bottom:.85rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.3rem">
          <div style="display:flex;align-items:center;gap:.45rem">
            <span style="width:9px;height:9px;border-radius:50%;background:${over?'#C94040':item.color};flex-shrink:0"></span>
            <span style="font-size:.82rem;font-weight:500;color:var(--white)">${item.cat}</span>
            ${over ? '<span style="font-size:.68rem;color:#E07070">▲ excedido</span>' : ''}
          </div>
          <div style="display:flex;align-items:center;gap:.6rem">
            <span class="mono" style="font-size:.75rem;color:${over?'#E07070':'var(--teal-light)'}">${fmt(item.gastado,0)}</span>
            ${item.presup > 0 ? `<span style="font-size:.7rem;color:var(--gray)">/ ${fmt(item.presup,0)}</span>` : ''}
            ${usoPct !== null ? `<span style="font-size:.68rem;color:${over?'#E07070':'var(--gray)'};min-width:32px;text-align:right">${usoPct}%</span>` : ''}
          </div>
        </div>
        <div style="position:relative;height:10px;background:rgba(255,255,255,0.07);border-radius:999px;overflow:hidden">
          ${item.presup > 0 ? `<div style="position:absolute;top:0;left:0;height:100%;width:${presPct}%;background:rgba(255,255,255,0.1);border-right:2px dashed rgba(255,255,255,0.3);border-radius:999px 0 0 999px"></div>` : ''}
          <div style="position:absolute;top:0;left:0;height:100%;width:${gastPct}%;background:${barColor};border-radius:999px;transition:width .8s cubic-bezier(.4,0,.2,1)"></div>
        </div>
      </div>`;
    }).join('');

    const legend = hasBudget ? `
      <div style="display:flex;align-items:center;gap:1.5rem;margin-top:.25rem;padding-top:.75rem;border-top:1px solid rgba(125,191,191,0.1)">
        <div style="display:flex;align-items:center;gap:.4rem;font-size:.72rem;color:var(--gray)">
          <span style="width:20px;height:3px;background:rgba(255,255,255,0.25);border-right:2px dashed rgba(255,255,255,0.4);display:inline-block"></span> Presupuesto
        </div>
        <div style="display:flex;align-items:center;gap:.4rem;font-size:.72rem;color:var(--gray)">
          <span style="width:20px;height:6px;background:var(--teal-light);border-radius:3px;display:inline-block"></span> Gasto real
        </div>
        <div style="display:flex;align-items:center;gap:.4rem;font-size:.72rem;color:var(--gray)">
          <span style="width:20px;height:6px;background:#C94040;border-radius:3px;display:inline-block"></span> Excedido
        </div>
      </div>` : '';

    pieWrap.innerHTML = `<div style="width:100%">${rows}${legend}</div>`;
  }

  // Recent 5
  const recent = [...gastosMes].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  document.getElementById('recentBody').innerHTML = recent.length
    ? recent.map(g=>{
        const color = getCatColor(g.cat)||'#607070';
        return `<tr>
          <td class="mono" style="color:var(--gray)">${fmtDate(g.date)}</td>
          <td style="font-weight:500">${escapeHTML(g.store)}</td>
          <td><span class="chip" style="background:${color}22;color:${color}">${escapeHTML(g.cat)}</span></td>
          <td style="font-size:.82rem;color:var(--gray)">${g.payer}</td>
          <td class="mono" style="color:var(--teal-light)">${fmt(g.amt)}</td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="5" style="text-align:center;color:var(--gray);padding:2rem">Sin gastos este mes</td></tr>';
}

// ═══════════════════════════════════════════════════════════════════
// LISTA
// ═══════════════════════════════════════════════════════════════════
function renderLista() {
  const q   = document.getElementById('searchInput').value.toLowerCase();
  const cat = document.getElementById('filterCat').value;
  const pay = document.getElementById('filterPayer').value;
  const mon = (document.getElementById('filterMonth')?.value || '').slice(0,7);

  let rows = [...state.gastos].sort((a,b)=>b.date.localeCompare(a.date));
  if (q)   rows = rows.filter(g => (g.store+g.desc+g.cat).toLowerCase().includes(q));
  if (cat) rows = rows.filter(g => g.cat === cat);
  if (pay) rows = rows.filter(g => g.payer === pay);
  if (mon) rows = rows.filter(g => monthKey(g.date) === mon);

  document.getElementById('listaBody').innerHTML = rows.length
    ? rows.map(g=>{
        const color = getCatColor(g.cat)||'#607070';
        return `<tr>
          <td class="mono" style="color:var(--gray)">${fmtDate(g.date)}</td>
          <td style="font-weight:500">${escapeHTML(g.store)}</td>
          <td style="font-size:.82rem;color:var(--gray);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(g.desc)||'—'}</td>
          <td><span class="chip" style="background:${color}22;color:${color}">${escapeHTML(g.cat)}</span></td>
          <td style="font-size:.82rem;color:var(--gray)">${g.payer}</td>
          <td class="mono" style="color:var(--teal-light)">${fmt(g.amt)}</td>
          <td style="display:flex;gap:.35rem">
            <button class="edit-btn" onclick="openEdit('${g.id}')">✏</button>
            <button class="del-btn" onclick="deleteGasto('${g.id}')">✕</button>
          </td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="7" style="text-align:center;color:var(--gray);padding:2.5rem">Sin resultados</td></tr>';
}

// ═══════════════════════════════════════════════════════════════════
// SCANNER
// ═══════════════════════════════════════════════════════════════════
let scanFiles = [];

document.getElementById('scanInput').addEventListener('change', function() {
  addScanFilesRaw([...this.files]);
  this.value = '';
});

function addScanFilesRaw(newFiles) {
  newFiles.forEach(f => {
    if (!f.type.startsWith('image/')) { showToast(f.name+': solo imágenes','err'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      scanFiles.push({ id: uid(), file: f, dataUrl: ev.target.result, name: f.name, status: 'pending' });
      renderQueue();
      document.getElementById('scanBtn').disabled = false;
    };
    reader.readAsDataURL(f);
  });
}

function addScanFiles() {} // triggered by input onchange above

function removeScanFile(id) {
  scanFiles = scanFiles.filter(f=>f.id!==id);
  renderQueue();
  document.getElementById('scanBtn').disabled = scanFiles.length === 0;
}

function renderQueue() {
  const q = document.getElementById('scanQueue');
  q.innerHTML = scanFiles.map(f=>`
    <div class="queue-item">
      <div class="queue-thumb"><img src="${f.dataUrl}" alt=""></div>
      <span class="queue-name">${f.name}</span>
      <span class="queue-status">${f.status==='done'?'<span style="color:#5ABEA0">✓</span>':f.status==='error'?'<span style="color:#E07070">✗</span>':'⏳'}</span>
      <button class="queue-rm" onclick="removeScanFile('${f.id}')">✕</button>
    </div>`).join('');
}

async function runScan() {
  const key = getAnthropicKey();
  if (!key) {
    showToast('Escáner no disponible — configura tu clave API en Config', 'err');
    return;
  }
  if (scanFiles.length === 0) return;



  const btn = document.getElementById('scanBtn');
  const log = document.getElementById('scanLog');
  btn.disabled = true;
  document.getElementById('scanSpinner').style.display = 'block';
  document.getElementById('scanBtnTxt').textContent = 'Analizando…';
  log.innerHTML = ''; log.classList.add('show');

  let added = 0;
  for (const sf of scanFiles) {
    addScanLog(`📄 ${sf.name}…`);
    try {
      const results = await callClaudeReceipt(sf.dataUrl, key);
      results.forEach(r => {
        state.gastos.push({
          id: uid(),
          date: r.fecha || todayIso(),
          store: r.establecimiento || 'Desconocido',
          cat: r.categoria || 'Otros',
          amt: parseFloat(r.importe) || 0,
          desc: r.descripcion || '',
          payer: 'Conjunto',   // default — user can edit in lista
          type: 'variable',
        });
        added++;
      });
      sf.status = 'done';
      addScanLog(`✓ ${results.length} gasto(s) extraídos (pagador: Conjunto — edítalo en la lista)`, 'ok');
    } catch(err) {
      sf.status = 'error';
      addScanLog(`✗ ${err.message}`, 'err');
    }
    renderQueue();
  }

  save();
  addScanLog(`\n✦ Listo. ${added} gastos añadidos a la lista.`, 'ok');
  btn.disabled = false;
  document.getElementById('scanSpinner').style.display = 'none';
  document.getElementById('scanBtnTxt').textContent = '✦ Analizar recibos';
  renderDashboard(); renderLista();
  if (added > 0) showToast(`✓ ${added} gastos importados`, 'ok');
}

async function callClaudeReceipt(dataUrl, key) {
  const [meta, b64] = dataUrl.split(',');
  const mtype = meta.match(/:(.*?);/)[1];
  const catNames = getCats().map(cat => cat.name);

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mtype, data: b64 } },
          { type: 'text', text: `Analiza este recibo y devuelve SOLO un JSON array sin markdown, sin texto extra.
Cada objeto debe tener exactamente estas claves:
- "fecha": formato YYYY-MM-DD (ejemplo: 2026-05-12). Si no se ve la fecha usa la de hoy: ${todayIso()}.
- "establecimiento": nombre del comercio
- "descripcion": resumen breve máx 60 chars
- "categoria": DEBE ser exactamente una de estas opciones (copia exacta): ${catNames.join(' | ')}
- "importe": número decimal sin símbolo de moneda (ejemplo: 45.50)
Si la imagen no es un recibo devuelve [].
Responde ÚNICAMENTE con el JSON array, sin explicaciones ni markdown.` }
        ]
      }]
    })
  });
  if (!r.ok) {
    const e = await r.json();
    throw new Error(e.error?.message || `HTTP ${r.status}`);
  }
  const data = await r.json();
  const text = data.content.map(b => b.text || '').join('').trim()
    .replace(/^```json\s*/,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim();
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) return [];

  // Validate and fix each result
  return parsed.map(item => ({
    ...item,
    // Ensure date is YYYY-MM-DD format
    fecha: fixDate(item.fecha),
    // Ensure category exactly matches one of ours
    categoria: (item.categoria && catNames.includes(item.categoria))
      ? item.categoria
      : findClosestCat(item.categoria || '', catNames),
    importe: parseFloat(item.importe) || 0,
  })).filter(item => item.importe > 0);
}

// Convert any date format to YYYY-MM-DD
function fixDate(dateStr) {
  if (!dateStr) return todayIso();
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // DD/MM/YYYY
  const m1 = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`;
  // DD-MM-YYYY
  const m2 = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m2) return `${m2[3]}-${m2[2].padStart(2,'0')}-${m2[1].padStart(2,'0')}`;
  return todayIso();
}

// Find closest matching category name (case-insensitive)
function findClosestCat(catFromClaude, catNames) {
  if (!catFromClaude || typeof catFromClaude !== 'string') return catNames[0] || 'Otros';
  const lower = catFromClaude.toLowerCase();
  const exact = catNames.find(n => n && n.toLowerCase() === lower);
  if (exact) return exact;
  const partial = catNames.find(n => n && (lower.includes(n.toLowerCase()) || n.toLowerCase().includes(lower)));
  if (partial) return partial;
  return catNames[0] || 'Otros';
}

function addScanLog(msg, type='') {
  const log = document.getElementById('scanLog');
  const d = document.createElement('div');
  d.style.color = type==='ok'?'#5ABEA0':type==='err'?'#E07070':'var(--teal-light)';
  d.textContent = '> '+msg;
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
}

// ═══════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════
function saveConfig() {
  state.config.p1 = document.getElementById('p1name').value.trim();
  state.config.p2 = document.getElementById('p2name').value.trim();
  save(); populatePayers(); renderDashboard(); renderIngresos();
  showToast('✓ Configuración guardada');
}

function clearData() {
  if (!confirm('⚠️ ¿Estás seguro de que quieres borrar TODOS los datos? Esta acción no se puede deshacer.')) return;
  const typed = prompt('Escribe BORRAR para confirmar:');
  if (typed !== 'BORRAR') { alert('Cancelado. No se borró nada.'); return; }
  state = { gastos:[], ingresos:[], presupuestos:[], config:{ p1:'', p2:'' } };
  save();
  if (auth.currentUser) {
    SHARED_DOC().delete().then(() => location.reload());
  } else {
    location.reload();
  }
}

// ═══════════════════════════════════════════════════════════════════
// API KEY MODAL
// ═══════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════
// EXPORT CSV
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// CATEGORY EDITOR
// ═══════════════════════════════════════════════════════════════════
function renderCatsConfigList() {
  const list = document.getElementById('catsConfigList');
  if (!list) return;
  if (!state.cats) state.cats = DEFAULT_CATS.map(c=>({...c}));
  const usedCats = new Set(state.gastos.map(g => g.cat));

  list.innerHTML = state.cats.map((c, i) => `
    <div class="cat-edit-row">
      <input type="color" value="${c.color}" id="catColor_${i}" oninput="state.cats[${i}].color=this.value">
      <input type="text"  value="${c.name}"  id="catName_${i}"  placeholder="Nombre">
      <button class="cat-rm-btn" onclick="removeCat(${i})"
        ${usedCats.has(c.name) ? 'disabled title="Tiene gastos"' : ''}>✕</button>
    </div>`).join('');
}

function removeCat(i) {
  const usedCats = new Set(state.gastos.map(g => g.cat));
  if (usedCats.has(state.cats[i].name)) return showToast('Categoría con gastos: no se puede borrar','err');
  state.cats.splice(i, 1);
  renderCatsConfigList();
}

function addCatRow() {
  if (!state.cats) state.cats = DEFAULT_CATS.map(c=>({...c}));
  const palette = ['#5A8A6A','#3A7080','#A06040','#7040A0','#40809A','#8A5A30'];
  state.cats.push({ name: '', color: palette[state.cats.length % palette.length] });
  renderCatsConfigList();
  setTimeout(() => {
    const rows = document.querySelectorAll('#catsConfigList .cat-edit-row input[type=text]');
    rows[rows.length - 1]?.focus();
  }, 40);
}

function saveCats() {
  if (!state.cats) state.cats = DEFAULT_CATS.map(c=>({...c}));
  // Read current names from inputs
  state.cats.forEach((c, i) => {
    const inp = document.getElementById(`catName_${i}`);
    if (inp) c.name = inp.value.trim();
  });
  state.cats = state.cats.filter(c => c.name);
  if (!state.cats.length) return showToast('Necesitas al menos una categoría','err');
  save();
  renderCatsConfigList();
  populateCatSelects();
  showToast('✓ Categorías guardadas');
}

function populateCatSelects() {
  const cats = getCats();
  ['gCat','eCat','filterCat'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value;
    const isFilter = id === 'filterCat';
    sel.innerHTML = (isFilter ? '<option value="">Todas las categorías</option>' : '') +
      cats.map(c => `<option value="${c}">${c}</option>`).join('');
    if (cats.includes(cur)) sel.value = cur;
  });
}



// ═══════════════════════════════════════════════════════════════════
// TREND CHART — últimos 6 meses
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// PRESUPUESTOS
// ═══════════════════════════════════════════════════════════════════
function onBudgetTypeChange() {
  const tipo = document.getElementById('budgetType')?.value;
  const wrap = document.getElementById('budgetMonthWrap');
  if (wrap) wrap.style.display = tipo === 'fijo' ? 'none' : '';
  renderBudgetRows();
}

function renderBudgetRows() {
  const wrap = document.getElementById('budgetRows');
  if (!wrap) return;
  const catList = state.cats || DEFAULT_CATS;
  const tipo = document.getElementById('budgetType')?.value || 'mensual';
  const mk   = (document.getElementById('budgetMonth')?.value || '').slice(0,7);
  const existing = getBudgetForContext(tipo, mk);

  wrap.innerHTML = catList.map((cat, idx) => {
    const amt = existing?.entries?.find(e => e.cat === cat.name)?.importe || '';
    return `
    <div style="display:flex;align-items:center;gap:.5rem;padding:.5rem .6rem;background:rgba(255,255,255,0.03);border-radius:.65rem;border:1px solid rgba(125,191,191,0.08)">
      <label style="flex-shrink:0;cursor:pointer;position:relative" title="Cambiar color">
        <span style="display:block;width:26px;height:26px;border-radius:6px;background:${cat.color};border:2px solid rgba(255,255,255,0.15)"></span>
        <input type="color" value="${cat.color}" data-idx="${idx}"
          oninput="updateCatColor(${idx}, this.value)"
          style="position:absolute;opacity:0;width:0;height:0;top:0;left:0">
      </label>
      <input type="text" value="${cat.name}" data-idx="${idx}"
        oninput="updateCatName(${idx}, this.value)"
        style="flex:1;min-width:80px;font-family:Sora,sans-serif;font-size:.82rem;background:transparent;border:none;border-bottom:1px solid rgba(125,191,191,0.2);color:var(--text);outline:none;padding:.2rem .1rem">
      <div style="position:relative;width:100px;flex-shrink:0">
        <span style="position:absolute;left:.6rem;top:50%;transform:translateY(-50%);color:var(--teal-light);font-family:JetBrains Mono,monospace;font-size:.8rem;pointer-events:none">€</span>
        <input type="number" min="0" step="0.01" placeholder="0,00" value="${amt}"
          data-cat="${cat.name}" class="budget-input" oninput="updateBudgetTotal()"
          style="width:100%;padding:.45rem .4rem .45rem 1.5rem;font-family:JetBrains Mono,monospace;font-size:.8rem;background:var(--input-bg);border:1px solid var(--input-border);border-radius:.55rem;color:var(--text);outline:none">
      </div>
      <button onclick="deleteCatRow(${idx})" title="Eliminar categoría"
        style="flex-shrink:0;width:26px;height:26px;border-radius:6px;border:none;background:rgba(201,64,64,0.2);color:#E07070;cursor:pointer;font-size:.75rem;display:flex;align-items:center;justify-content:center;transition:background .15s"
        onmouseenter="this.style.background='rgba(201,64,64,0.4)'"
        onmouseleave="this.style.background='rgba(201,64,64,0.2)'">✕</button>
    </div>`;
  }).join('');
  updateBudgetTotal();
}


function updateCatColor(idx, color) {
  if (!state.cats) state.cats = [...DEFAULT_CATS];
  if (state.cats[idx]) {
    state.cats[idx].color = color;
    // Update the color swatch live
    const swatches = document.querySelectorAll('#budgetRows label span');
    if (swatches[idx]) swatches[idx].style.background = color;
  }
}

function updateCatName(idx, name) {
  if (!state.cats) state.cats = [...DEFAULT_CATS];
  if (state.cats[idx]) {
    // Update budget-input data-cat for existing rows
    const inputs = document.querySelectorAll('#budgetRows .budget-input');
    if (inputs[idx]) inputs[idx].dataset.cat = name;
    state.cats[idx].name = name;
  }
}

function deleteCatRow(idx) {
  if (!state.cats) state.cats = [...DEFAULT_CATS];
  const cat = state.cats[idx];
  if (!cat) return;
  const gastosAfectados = state.gastos.filter(g => g.cat === cat.name).length;
  state.cats.splice(idx, 1);
  renderBudgetRows();
  if (gastosAfectados > 0) {
    showToast(`Categoría eliminada · ${gastosAfectados} gasto(s) conservan el nombre antiguo`);
  } else {
    showToast('Categoría eliminada');
  }
}

function addCatAndRefresh() {
  if (!state.cats) state.cats = [...DEFAULT_CATS];
  state.cats.push({ name: 'Nueva categoría', color: '#607070' });
  renderBudgetRows();
  // Focus last name input
  const inputs = document.querySelectorAll('#budgetRows input[type=text]');
  if (inputs.length) inputs[inputs.length-1].focus();
}

function saveBudgetAndCats() {
  // 1. Save cats
  if (!state.cats) state.cats = [...DEFAULT_CATS];
  // Names already updated live via updateCatName
  // 2. Save budget
  const tipo = document.getElementById('budgetType').value;
  const mk   = (document.getElementById('budgetMonth')?.value || '').slice(0,7);
  if (tipo === 'mensual' && !mk) return showToast('Selecciona un mes', 'err');
  const entries = [...document.querySelectorAll('.budget-input')]
    .map(i => ({ cat: i.dataset.cat, importe: parseFloat(i.value)||0 }))
    .filter(e => e.importe > 0);
  if (!state.presupuestos) state.presupuestos = [];
  state.presupuestos = state.presupuestos.filter(p => !(p.tipo === tipo && (tipo === 'fijo' || p.mes === mk)));
  if (entries.length) state.presupuestos.push({ id: uid(), tipo, mes: tipo === 'fijo' ? null : mk, entries });
  save();
  populateCatSelects();
  populatePayers();
  renderSavedBudgets();
  renderDashboard();
  showToast('✓ Categorías y presupuesto guardados');
}

function updateBudgetTotal() {
  const total = [...document.querySelectorAll('.budget-input')].reduce((s,i) => s+(parseFloat(i.value)||0), 0);
  const el = document.getElementById('budgetTotal');
  if (el) el.textContent = fmt(total);
}

function getBudgetForContext(tipo, mk) {
  return (state.presupuestos||[]).find(p => p.tipo === tipo && (tipo === 'fijo' || p.mes === mk)) || null;
}

function getBudgetForMonth(mk) {
  if (!(state.presupuestos||[]).length) return null;
  return (state.presupuestos.find(p => p.tipo === 'mensual' && p.mes === mk))
      || (state.presupuestos.find(p => p.tipo === 'fijo'))
      || null;
}

function saveBudget() {
  const tipo = document.getElementById('budgetType').value;
  const mk   = (document.getElementById('budgetMonth')?.value || '').slice(0,7);
  if (tipo === 'mensual' && !mk) return showToast('Selecciona un mes', 'err');
  const entries = [...document.querySelectorAll('.budget-input')]
    .map(i => ({ cat: i.dataset.cat, importe: parseFloat(i.value)||0 }))
    .filter(e => e.importe > 0);
  if (!entries.length) return showToast('Introduce al menos un importe', 'err');
  if (!state.presupuestos) state.presupuestos = [];
  state.presupuestos = state.presupuestos.filter(p => !(p.tipo === tipo && (tipo === 'fijo' || p.mes === mk)));
  state.presupuestos.push({ id: uid(), tipo, mes: tipo === 'fijo' ? null : mk, entries });
  save(); renderSavedBudgets(); renderDashboard();
  showToast('✓ Presupuesto guardado');
}

function deleteBudget(id) {
  state.presupuestos = (state.presupuestos||[]).filter(p => p.id !== id);
  save(); renderSavedBudgets(); renderDashboard();
  showToast('Presupuesto eliminado');
}

function loadBudgetIntoForm(id) {
  const b = (state.presupuestos||[]).find(p => p.id === id);
  if (!b) return;
  document.getElementById('budgetType').value = b.tipo;
  onBudgetTypeChange();
  if (b.tipo === 'mensual' && b.mes) document.getElementById('budgetMonth').value = b.mes + '-01';
  renderBudgetRows();
  b.entries.forEach(e => {
    const inp = document.querySelector(`.budget-input[data-cat="${e.cat}"]`);
    if (inp) inp.value = e.importe;
  });
  updateBudgetTotal();
  showToast('Presupuesto cargado para editar');
}

function renderSavedBudgets() {
  const el = document.getElementById('savedBudgetsList');
  if (!el) return;
  const list = state.presupuestos || [];
  if (!list.length) {
    el.innerHTML = '<p style="color:var(--gray);font-size:.85rem;padding:.5rem 0">Sin presupuestos guardados aún.</p>';
    return;
  }
  el.innerHTML = [...list].reverse().map(b => {
    const total = b.entries.reduce((s,e)=>s+e.importe, 0);
    const label = b.tipo === 'fijo'
      ? '🔒 Fijo (todos los meses)'
      : `📅 ${MONTHS_ES[parseInt(b.mes.slice(5))-1]} ${b.mes.slice(0,4)}`;
    return `
    <div style="display:flex;align-items:center;gap:.75rem;padding:.75rem;background:rgba(255,255,255,0.03);border-radius:.75rem;border:1px solid rgba(125,191,191,0.1);margin-bottom:.5rem">
      <div style="flex:1">
        <div style="font-size:.85rem;font-weight:600;color:var(--white);margin-bottom:.2rem">${label}</div>
        <div style="font-size:.75rem;color:var(--gray)">${b.entries.length} categorías · Total: <span style="color:var(--teal-light)">${fmt(total)}</span></div>
      </div>
      <button class="edit-btn" onclick="loadBudgetIntoForm('${b.id}')">✏</button>
      <button class="del-btn" onclick="deleteBudget('${b.id}')">✕</button>
    </div>`;
  }).join('');
}

function exportCSV() {
  const esc = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const row = (...cols) => cols.map(esc).join(',');
  const rows = [];

  // Header + meta
  rows.push(row('_tipo','_v','c1','c2','c3','c4','c5','c6','c7','c8'));
  rows.push(row('META','2','gastos_pareja_export', new Date().toISOString()));

  // Config
  rows.push(row('CONFIG','2','p1', state.config.p1, 'p2', state.config.p2));

  // Categorías
  (state.cats || DEFAULT_CATS).forEach(cat => {
    rows.push(row('CATEGORIA','2', cat.name, cat.color));
  });

  // Gastos
  state.gastos.forEach(g => {
    rows.push(row('GASTO','2', g.id, g.date, g.store, g.cat, g.amt, g.payer, g.type, g.desc||''));
  });

  // Ingresos
  state.ingresos.forEach(i => {
    rows.push(row('INGRESO','2', i.id, i.month, i.person, i.type, i.amt));
  });

  // Presupuestos (one row per entry)
  (state.presupuestos || []).forEach(b => {
    b.entries.forEach(e => {
      rows.push(row('PRESUPUESTO','2', b.id, b.tipo, b.mes || 'fijo', e.cat, e.importe));
    });
  });

  const csv = rows.join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
  a.download = `gastos_pareja_${todayIso()}.csv`;
  a.click();
  showToast('✓ CSV exportado completo');
}

function importCSV(inputEl) {
  const file = inputEl.files[0];
  if (!file) return;
  inputEl.value = '';

  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const text = ev.target.result.replace(/^\uFEFF/, '');
      const rows = parseCSVRows(text);
      if (!rows.length) return showToast('CSV vacío', 'err');

      const hasMeta = rows.find(r => r[0] === 'META');
      if (!hasMeta) return showToast('Formato no reconocido. Exporta primero desde esta app.', 'err');

      const added = { gastos:0, ingresos:0, presupuestos:0, cats:0 };
      const budgetMap = {};

      rows.forEach(r => {
        const tipo = r[0];

        if (tipo === 'CONFIG') {
          if (r[2] === 'p1' && r[3]) state.config.p1 = r[3];
          if (r[4] === 'p2' && r[5]) state.config.p2 = r[5];
        }

        else if (tipo === 'CATEGORIA') {
          if (!state.cats) state.cats = [];
          const name = r[2], color = r[3] || '#607070';
          if (name && !state.cats.find(cat => cat.name === name)) {
            state.cats.push({ name, color });
            added.cats++;
          }
        }

        else if (tipo === 'GASTO') {
          const id = r[2];
          if (id && !state.gastos.find(g => g.id === id)) {
            state.gastos.push({
              id,
              date:  fixDate(r[3]),
              store: r[4], cat: r[5],
              amt:   parseFloat(r[6]) || 0,
              payer: r[7], type: r[8] || 'variable', desc: r[9] || ''
            });
            added.gastos++;
          }
        }

        else if (tipo === 'INGRESO') {
          const id = r[2];
          if (id && !state.ingresos.find(i => i.id === id)) {
            state.ingresos.push({
              id, month: r[3], person: r[4],
              type: r[5] || 'salario', amt: parseFloat(r[6]) || 0
            });
            added.ingresos++;
          }
        }

        else if (tipo === 'PRESUPUESTO') {
          const bid = r[2], btipo = r[3], bmes = r[4] === 'fijo' ? null : r[4];
          const cat = r[5], importe = parseFloat(r[6]) || 0;
          if (!budgetMap[bid]) budgetMap[bid] = { id: bid, tipo: btipo, mes: bmes, entries: [] };
          if (cat && importe > 0) budgetMap[bid].entries.push({ cat, importe });
        }
      });

      // Merge presupuestos
      if (!state.presupuestos) state.presupuestos = [];
      Object.values(budgetMap).forEach(b => {
        if (b.entries.length && !state.presupuestos.find(p => p.id === b.id)) {
          state.presupuestos.push(b);
          added.presupuestos++;
        }
      });

      save();
      populateSelects();
      populatePayers();
      applyConfig();
      renderDashboard();
      renderLista();
      renderIngresos();

      const msg = `✓ ${added.gastos} gastos · ${added.ingresos} ingresos · ${added.presupuestos} presupuestos · ${added.cats} categorías importados`;
      showToast(msg);

    } catch(e) {
      console.error(e);
      showToast('Error al leer el CSV: ' + e.message, 'err');
    }
  };
  reader.readAsText(file, 'UTF-8');
}

// Robust CSV parser — handles quoted fields with commas inside
function parseCSVRows(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], nx = text[i + 1];
    if (inQ) {
      if (ch === '"' && nx === '"') { field += '"'; i++; }
      else if (ch === '"') { inQ = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQ = true; }
      else if (ch === ',') { row.push(field.trim()); field = ''; }
      else if (ch === '\n' || (ch === '\r' && nx === '\n')) {
        if (ch === '\r') i++;
        row.push(field.trim()); field = '';
        if (row.some(v => v !== '')) rows.push(row);
        row = [];
      } else { field += ch; }
    }
  }
  if (field || row.length) { row.push(field.trim()); if (row.some(v => v !== '')) rows.push(row); }
  return rows;
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-bg').forEach(m => {
  m.addEventListener('click', e => { if(e.target===m) m.classList.remove('open'); });
});
function showToast(msg, type='ok') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(t._t);
  t._t = setTimeout(()=>t.className='toast', 3000);
}