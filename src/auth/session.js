// ================= ROLES & SESSION (client-side) =================
// Models a Jira-style permission hierarchy for the demo:
//   owner  — the primary owner (you). Full control, immutable, manages admins.
//   admin  — can see all tickets and change their status (workflow transitions).
//   user   — can only submit requests and see their own.
//
// NOTE: this is enforced in the browser (no backend yet), which is right for a
// project demo but not real security. Server-enforced roles come with the
// parked Firebase backend (real Google login + Firestore rules).

export const OWNER_EMAIL = 'arun@fuseenergy.com' // primary owner — shown in the UI
// Full-access owners (can't be removed as admins). The primary owner above is
// listed first; add more owner emails here.
export const OWNERS = ['arun@fuseenergy.com', 'davidnoonan@fuseenergy.com']
export const isOwnerEmail = (email) => OWNERS.includes((email || '').toLowerCase())
export const ALLOWED_DOMAIN = 'fuseenergy.com'

// Temporary shared site password (demo gate). NOTE: because this is a static
// site, the password ships in the built JS — it's a deterrent, not real
// security. Change it by setting VITE_SITE_PASSWORD at build time, or edit the
// default below. Replace with Firebase Auth for genuine security.
export const SITE_PASSWORD = import.meta.env.VITE_SITE_PASSWORD || 'fuse-access-2026'

const ADMINS_KEY = 'acc_sd_admins_v1'
const USER_KEY = 'acc_sd_current_user_v1'

export function loadAdmins() {
  try {
    return JSON.parse(localStorage.getItem(ADMINS_KEY)) || []
  } catch (e) {
    return []
  }
}
export function saveAdmins(list) {
  try {
    localStorage.setItem(ADMINS_KEY, JSON.stringify(list))
  } catch (e) {
    /* ignore */
  }
}
export function loadCurrentUser() {
  try {
    return localStorage.getItem(USER_KEY) || null
  } catch (e) {
    return null
  }
}
export function saveCurrentUser(email) {
  try {
    if (email) localStorage.setItem(USER_KEY, email)
    else localStorage.removeItem(USER_KEY)
  } catch (e) {
    /* ignore */
  }
}

// 'owner' | 'admin' | 'user' | null
export function roleOf(email, admins) {
  if (!email) return null
  const e = email.toLowerCase()
  if (isOwnerEmail(e)) return 'owner'
  if ((admins || []).map((a) => a.toLowerCase()).includes(e)) return 'admin'
  return 'user'
}

export const isAdminRole = (r) => r === 'owner' || r === 'admin'

export const isCompanyEmail = (email) =>
  !!email && email.toLowerCase().endsWith('@' + ALLOWED_DOMAIN)

// "arun@fuseenergy.com" -> "Arun", "priya.nair@..." -> "Priya Nair"
export function displayName(email) {
  if (!email) return 'Unknown'
  const local = email.split('@')[0]
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}
