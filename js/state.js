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

