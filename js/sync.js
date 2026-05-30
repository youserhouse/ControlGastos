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

