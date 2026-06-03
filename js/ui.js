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

  // Scanner drag-and-drop
  const drop = document.getElementById('scanDrop');
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
  drop.addEventListener('drop', e => {
    e.preventDefault(); drop.classList.remove('drag');
    addScanFilesRaw([...e.dataTransfer.files]);
  });

  // Close FAB when clicking outside it
  document.addEventListener('click', e => {
    const fab = document.getElementById('fabWrap');
    if (fab && !fab.contains(e.target)) fab.classList.remove('expanded');
  });

  // Close drawer / FAB on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeDrawer(); closeFab(); }
  });

  // Restore tab from URL hash
  const initialTab = location.hash.slice(1) || 'dashboard';
  const validTabs = ['dashboard','gastos','ingresos','lista','scanner','presupuesto','config'];
  switchTab(validTabs.includes(initialTab) ? initialTab : 'dashboard');
});

function populateSelects() {
  populateCatSelects();
  populateScanCategory();
  populatePayers();

  const curDate = new Date().toISOString().slice(0, 10);
  const dEl = document.getElementById('dashMonthSel'); if(dEl) dEl.value = curDate;
  const iEl = document.getElementById('iMonth');       if(iEl) iEl.value = curDate;
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
// DRAWER + FAB
// ═══════════════════════════════════════════════════════════════════
function toggleDrawer() {
  const drawer = document.getElementById('drawer');
  if (drawer.classList.contains('open')) closeDrawer();
  else {
    drawer.classList.add('open');
    document.getElementById('drawerOverlay').classList.add('open');
  }
}
function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
}
function toggleFab() {
  document.getElementById('fabWrap').classList.toggle('expanded');
}
function closeFab() {
  document.getElementById('fabWrap').classList.remove('expanded');
}


// ═══════════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════════
function switchTab(name) {
  document.querySelectorAll('.drawer-item[data-panel]').forEach(b => {
    b.classList.toggle('active', b.dataset.panel === name);
  });
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  history.replaceState(null, '', '#' + name);
  if (name === 'dashboard') renderDashboard();
  if (name === 'lista') renderLista();
  if (name === 'ingresos') renderIngresos();
  if (name === 'presupuesto') { onBudgetTypeChange(); renderBudgetRows(); renderSavedBudgets(); }
  if (name === 'config') { renderThemeSwatches(); loadAnthropicKeyToInput(); }
  if (name === 'scanner') {
    const warn = document.getElementById('scanner-api-warning');
    if (warn) warn.style.display = getAnthropicKey() ? 'block' : 'none';
    populateScanCategory();
  }
}


// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-bg').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});
function showToast(msg, type='ok') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(t._t);
  t._t = setTimeout(() => t.className = 'toast', 3000);
}
