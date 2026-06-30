// ================= RUNTIME CONFIG =================
// The app has two backends, chosen at build time by VITE_BACKEND:
//   - "local"    (default) — tickets live in localStorage, no auth, no server.
//                 This is the current static GitHub Pages build.
//   - "firebase" — shared tickets in Firestore, Google SSO, and an AI assistant
//                 grounded in live ticket data via Cloud Functions.
//
// Flipping to Firebase is a matter of setting VITE_BACKEND=firebase plus the
// VITE_FIREBASE_* values below (see .env.example). Until then nothing changes.
export const BACKEND = import.meta.env.VITE_BACKEND === 'firebase' ? 'firebase' : 'local'

// Only emails on this domain may sign in (enforced again server-side).
export const ALLOWED_EMAIL_DOMAIN = import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN || 'fuseenergy.com'

export const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Region the Cloud Functions are deployed to.
export const FUNCTIONS_REGION = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1'

export const isFirebase = BACKEND === 'firebase'
