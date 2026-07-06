// ================= RUNTIME CONFIG =================
// The app has two backends, chosen at build time by VITE_BACKEND:
//   - "local" (default) — tickets live in localStorage, no auth, no server.
//                 This is the current static GitHub Pages build.
//   - "api"   — shared tickets, Google SSO, email/Slack/AI via the Node +
//                 DynamoDB server in server/ (deployed on AWS).
//
// Going live is a matter of setting VITE_BACKEND=api plus VITE_API_BASE and
// (optionally) VITE_GOOGLE_CLIENT_ID below (see .env.example).
const _b = import.meta.env.VITE_BACKEND
export const BACKEND = _b === 'api' ? 'api' : 'local'

// Base URL of the API server (api mode). e.g. https://acc-api.example.com
export const API_BASE = import.meta.env.VITE_API_BASE || ''
// Optional shared key the API expects (sent as x-api-key).
export const API_KEY = import.meta.env.VITE_API_KEY || ''

// Only emails on this domain may sign in (enforced again server-side).
export const ALLOWED_EMAIL_DOMAIN = import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN || 'fuseenergy.com'

// Google SSO client ID (public — safe in the bundle). When set, the sign-in
// screen shows "Sign in with Google"; the server verifies the token and
// enforces the domain. Empty → fall back to the shared-password gate.
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export const isApi = BACKEND === 'api'
