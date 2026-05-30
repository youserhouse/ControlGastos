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

