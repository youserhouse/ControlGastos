// ═══════════════════════════════════════════════════════════════════
// FIREBASE CONFIG & INIT
// ═══════════════════════════════════════════════════════════════════
// Config is loaded from js/firebase.config.js (excluded from git).
// Copy js/firebase.config.example.js → js/firebase.config.js and fill in your values.
// SECURITY: Rotate the keys below in Firebase Console — they were publicly exposed.
const firebaseConfig = (typeof FIREBASE_CONFIG !== 'undefined')
  ? FIREBASE_CONFIG
  : {
    // ⚠ FALLBACK — restrict these in Firebase Console (API key restrictions → HTTP referrers)
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

// App for exactly two people (couple) sharing ONE document.
// Access is restricted server-side by Firestore rules — see SECURITY.md.
// Only the two allowlisted UIDs can read/write this document.
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

