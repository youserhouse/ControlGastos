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

