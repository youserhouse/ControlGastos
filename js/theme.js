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

