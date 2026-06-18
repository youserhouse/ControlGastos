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
  // SECURITY: escapeHTML() prevents XSS from malicious filenames
  q.innerHTML = scanFiles.map(f=>`
    <div class="queue-item">
      <div class="queue-thumb"><img src="${f.dataUrl}" alt=""></div>
      <span class="queue-name">${escapeHTML(f.name)}</span>
      <span class="queue-status">${f.status==='done'?'<span style="color:#5ABEA0">✓</span>':f.status==='error'?'<span style="color:#E07070">✗</span>':'⏳'}</span>
      <button class="queue-rm" onclick="removeScanFile('${f.id}')">✕</button>
    </div>`).join('');
}

// Populate the category dropdown with current categories
function populateScanCategory() {
  const sel = document.getElementById('scanCategory');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">🔍 Detectar automáticamente</option>';
  getCats().forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    if (cat === current) opt.selected = true;
    sel.appendChild(opt);
  });
}

async function runScan() {
  const key = getAnthropicKey();
  if (!key) {
    showToast('Escáner no disponible — configura tu clave API en Config', 'err');
    return;
  }
  if (scanFiles.length === 0) return;

  // Category to force AFTER Claude reads the image (not sent to Claude)
  const forcedCat = document.getElementById('scanCategory')?.value || '';

  const btn = document.getElementById('scanBtn');
  const logEl = document.getElementById('scanLog');
  btn.disabled = true;
  document.getElementById('scanSpinner').style.display = 'block';
  document.getElementById('scanBtnTxt').textContent = 'Analizando…';
  logEl.innerHTML = ''; logEl.classList.add('show');

  if (forcedCat) addScanLog(`📂 Se asignará la categoría: ${forcedCat}`);

  let added = 0;
  for (const sf of scanFiles) {
    addScanLog(`📄 ${sf.name}…`);
    try {
      const results = await callClaudeReceipt(sf.dataUrl, key);
      results.forEach(r => {
        // Apply forced category after reading, or keep Claude's guess
        const cat = forcedCat || r.categoria || getCats()[0] || 'Otros';
        state.gastos.push({
          id: uid(),
          date: r.fecha || todayIso(),
          store: r.establecimiento || 'Desconocido',
          cat,
          amt: r.importe,
          desc: r.descripcion || '',
          payer: 'Conjunto',
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

// Claude solo extrae datos — la categoría se asigna en runScan() después
async function callClaudeReceipt(dataUrl, key) {
  const [meta, b64] = dataUrl.split(',');
  const mtype = meta.match(/:(.*?);/)[1];
  const catNames = getCats();
  const catList = catNames.length ? catNames.join(' | ') : 'Otros';

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
          { type: 'text', text: `Analiza este recibo o extracto bancario y devuelve SOLO un JSON array sin markdown, sin texto extra.
Cada objeto debe tener exactamente estas claves:
- "fecha": formato YYYY-MM-DD. Si no se ve usa la de hoy: ${todayIso()}.
- "establecimiento": nombre del comercio o entidad
- "descripcion": resumen breve máx 60 chars
- "categoria": una de estas (copia exacta): ${catList}
- "importe": número decimal POSITIVO sin símbolo de moneda (ejemplo: 45.50). Si aparece negativo en el extracto, conviértelo a positivo.
Si la imagen no contiene movimientos o gastos devuelve [].
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

  return parsed.map(item => ({
    ...item,
    fecha: fixDate(item.fecha),
    categoria: (item.categoria && catNames.includes(item.categoria))
      ? item.categoria
      : findClosestCat(item.categoria || '', catNames),
    // Always positive — expenses in bank statements come as negative
    importe: Math.abs(parseFloat(item.importe) || 0),
  })).filter(item => item.importe > 0);
}

// Convert any date format to YYYY-MM-DD
function fixDate(dateStr) {
  if (!dateStr) return todayIso();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const m1 = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`;
  const m2 = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m2) return `${m2[3]}-${m2[2].padStart(2,'0')}-${m2[1].padStart(2,'0')}`;
  return todayIso();
}

// Find closest matching category name (case-insensitive)
function findClosestCat(catFromClaude, catNames) {
  if (!catNames.length) return 'Otros';
  if (!catFromClaude || typeof catFromClaude !== 'string') return catNames[0];
  const lower = catFromClaude.toLowerCase();
  const exact = catNames.find(n => n && n.toLowerCase() === lower);
  if (exact) return exact;
  const partial = catNames.find(n => n && (lower.includes(n.toLowerCase()) || n.toLowerCase().includes(lower)));
  if (partial) return partial;
  return catNames[0];
}

function addScanLog(msg, type='') {
  const logEl = document.getElementById('scanLog');
  const d = document.createElement('div');
  d.style.color = type==='ok'?'#5ABEA0':type==='err'?'#E07070':'var(--teal-light)';
  d.textContent = '> '+msg;
  logEl.appendChild(d);
  logEl.scrollTop = logEl.scrollHeight;
}
