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

function openDeleteMonth() {
  const now = new Date();
  const cur = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  document.getElementById('deleteMonthInput').value = cur;
  _updateDeleteMonthPreview();
  openModal('deleteMonthModal');
}

function _updateDeleteMonthPreview() {
  const val = document.getElementById('deleteMonthInput').value;
  const el  = document.getElementById('deleteMonthPreview');
  if (!val) { el.textContent = ''; return; }
  const ng = state.gastos.filter(g => g.date && g.date.startsWith(val)).length;
  const ni = state.ingresos.filter(i => i.date && i.date.startsWith(val)).length;
  el.textContent = ng + ni === 0
    ? 'No hay datos en ese mes.'
    : `Se borrarán ${ng} gasto${ng!==1?'s':''} y ${ni} ingreso${ni!==1?'s':''}.`;
}

function confirmDeleteMonth() {
  const val = document.getElementById('deleteMonthInput').value;
  if (!val) { showToast('Selecciona un mes', 'err'); return; }
  const [y, m] = val.split('-');
  const label = new Date(+y, +m - 1, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' });
  if (!confirm(`¿Borrar todos los gastos e ingresos de ${label}? Esta acción no se puede deshacer.`)) return;
  state.gastos   = state.gastos.filter(g   => !(g.date   && g.date.startsWith(val)));
  state.ingresos = state.ingresos.filter(i => !(i.date   && i.date.startsWith(val)));
  save();
  closeModal('deleteMonthModal');
  renderDashboard(); renderLista(); renderIngresos();
  showToast(`✓ Datos de ${label} borrados`, 'ok');
}


// ═══════════════════════════════════════════════════════════════════
// API KEY MODAL
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

