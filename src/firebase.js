// Lazy Firebase initialization. Nothing here runs in the default "local" build —
// the getters are only ever called by the Firebase-mode hooks, so the static
// site never touches Firebase and never needs config.
import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'
import { FIREBASE_CONFIG, FUNCTIONS_REGION } from './config'

let app

function ensureApp() {
  if (!FIREBASE_CONFIG.projectId) {
    throw new Error(
      'Firebase backend selected (VITE_BACKEND=firebase) but VITE_FIREBASE_* config is missing.'
    )
  }
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG)
  }
  return app
}

export const firebaseAuth = () => getAuth(ensureApp())
export const db = () => getFirestore(ensureApp())
export const functions = () => getFunctions(ensureApp(), FUNCTIONS_REGION)
