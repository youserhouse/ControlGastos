# Security Notes — ControlGastos

## Fixes applied (security audit)

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | 🔴 Critical | Hardcoded Firebase API key committed to repo | Mitigated — `js/firebase.config.js` pattern added; rotate keys in Firebase Console |
| 2 | 🔴 Critical | Single global Firestore document (`parejas/shared`) — any authenticated user could read/write everyone's data | **Fixed** — `SHARED_DOC` now uses `auth.currentUser.uid`; each user has isolated data |
| 3 | 🟠 High | XSS in `scanner.js renderQueue()` — file name injected raw into `innerHTML` | **Fixed** — wrapped with `escapeHTML()` |
| 4 | 🟠 High | XSS in `ingresos.js renderIngresos()` — person name and type injected raw into `innerHTML` | **Fixed** — wrapped with `escapeHTML()` |
| 5 | 🟡 Medium | No Content Security Policy | **Fixed** — CSP meta tag added to `index.html` |
| 6 | 🟡 Medium | Anthropic API key stored in `localStorage` (visible in DevTools) | Documented below — server-side proxy recommended |
| 7 | 🟡 Medium | SheetJS loaded from CDN without Subresource Integrity | Documented below |
| 8 | 🔵 Low | `app.js` (unused monolith in repo root) also contains hardcoded Firebase key | Remove or keep for reference; not loaded by `index.html` |

---

## 1. Firebase API Key

### What was done
- Added `js/firebase.config.js` (gitignored) as the canonical place for real keys.
- `js/firebase.js` now reads `window.FIREBASE_CONFIG` (from that file) and falls back to the previously hardcoded values.
- Added `js/firebase.config.example.js` as a template.

### What you MUST do now
1. **Rotate / restrict the exposed key** in [Firebase Console → Project Settings → API key restrictions](https://console.firebase.google.com).
   Set the allowed HTTP referrers to your production domain only (e.g. `youserhouse.github.io/*`).
2. Copy `js/firebase.config.example.js` → `js/firebase.config.js` and fill in your values.
3. Since the old key was committed to git history, it should be considered compromised. Regenerate it in the Firebase Console.

---

## 2. Firestore Data Isolation

### What was done
`SHARED_DOC` now points to `parejas/{uid}` (each authenticated user's own document) instead of the global `parejas/shared`.

### Firestore Security Rules (REQUIRED)

Apply these rules in [Firebase Console → Firestore → Rules](https://console.firebase.google.com):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Each user can only read/write their own document
    match /parejas/{docId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == docId;
    }
    // Deny everything else by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Couple-sharing note
The new UID-based path means each person has their own separate data. If both partners previously shared data on one device using anonymous login, this continues to work (the device has one anonymous UID). If partners use separate devices with separate email accounts, they would need a sharing mechanism (invite code / shared email). Implementing a shared-access model is a future enhancement.

---

## 3. Anthropic API Key — HIGH RISK

### The Problem

`callClaudeReceipt()` and `_detectMappingWithAI()` call the Anthropic API **directly from the browser**, so the API key is visible to anyone who opens DevTools. The key is stored in `localStorage`.

### Recommended Solution

Replace the direct client call with a **server-side proxy**. Two lightweight options:

#### Option A — Firebase Cloud Function (recommended if you already use Firebase)

```js
// functions/index.js
const { onCall } = require('firebase-functions/v2/https');
const Anthropic = require('@anthropic-ai/sdk');

exports.analyzeReceipt = onCall(async (request) => {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: request.data.messages }]
  });
  return response.content[0].text;
});
```

Store the key with: `firebase functions:secrets:set ANTHROPIC_API_KEY`

#### Option B — Cloudflare Worker (zero-cost tier)

```js
// worker.js
export default {
  async fetch(request, env) {
    const body = await request.json();
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    return new Response(await res.text(), {
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': 'https://youserhouse.github.io'
      }
    });
  }
};
```

Set the key in: Cloudflare Dashboard → Worker → Settings → Variables → Secrets

---

## 4. Subresource Integrity (SRI) for SheetJS

`bank-import.js` dynamically loads SheetJS from `cdn.sheetjs.com`. Without an `integrity` attribute, a compromised CDN could serve malicious code.

**Fix:** Compute the hash and add it when injecting the script:

```js
// In _loadSheetJS():
s.integrity = 'sha384-<hash-here>';
s.crossOrigin = 'anonymous';
```

To get the hash:
```bash
curl -s "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js" \
  | openssl dgst -sha384 -binary | openssl enc -base64 -A
```

Alternatively, host a copy of xlsx.full.min.js in your own repo to eliminate the CDN dependency entirely.

---

## 5. Content Security Policy

A `Content-Security-Policy` meta tag has been added to `index.html`. It restricts:
- `connect-src` to known Firebase/Anthropic domains, preventing data exfiltration
- `script-src` to `self`, `gstatic.com`, and `cdn.sheetjs.com`
- Framing (`frame-ancestors 'none'`), preventing clickjacking

**Known limitation:** `'unsafe-inline'` is still required for `script-src` because the app uses inline `onclick=` handlers. Future improvement: refactor to `addEventListener()` calls and remove `'unsafe-inline'`.

---

## 6. Recommended additional steps

- Enable [Firebase App Check](https://firebase.google.com/docs/app-check) to ensure only your app can access your Firebase project.
- Restrict the Firebase API key in Google Cloud Console to only the APIs you use (Cloud Firestore API, Identity Toolkit API).
- Add rate limiting to any Anthropic proxy to prevent cost abuse.
- Periodically review Firebase auth users in the Firebase Console to remove stale anonymous accounts.
