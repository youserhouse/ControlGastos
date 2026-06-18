// ═══════════════════════════════════════════════════════════════════
// FIREBASE CONFIG & INIT
// ═══════════════════════════════════════════════════════════════════
// Config is loaded from js/firebase.config.js (excluded from git).
// Copy js/firebase.config.example.js → js/firebase.config.js and fill in your values.
// SECURITY: Rotate the keys below in Firebase Console if they were ever committed publicly.
const firebaseConfig = (typeof FIREBASE_CONFIG !== 'undefined')
  ? FIREBASE_CONFIG
  : {
    // ⚠ FALLBACK — these keys are public; restrict them in Firebase Console:
    // https://console.firebase.google.com → Project Settings → API key restrictions
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

// Each user's data is stored under their own UID to prevent cross-user data leakage.
// SECURITY: Pair with Firestore rules — see SECURITY.md.
const SHARED_DOC = () => {
  const user = auth && auth.currentUser;
  if (!user) throw new Error('SHARED_DOC called before authentication');
  return db.collection('parejas').doc(user.uid);
};

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

