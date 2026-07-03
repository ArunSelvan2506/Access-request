import { useState, useEffect, useCallback } from 'react'
import {
  isOwnerEmail,
  loadAdmins,
  saveAdmins,
  loadCurrentUser,
  saveCurrentUser,
  roleOf,
  isAdminRole,
} from '../auth/session'

// Session state: who's signed in (demo identity) and the admin list the owner
// manages. Persisted to localStorage so it survives refreshes.
export function useSession() {
  const [email, setEmail] = useState(loadCurrentUser)
  const [admins, setAdmins] = useState(loadAdmins)

  useEffect(() => saveCurrentUser(email), [email])
  useEffect(() => saveAdmins(admins), [admins])

  const role = roleOf(email, admins)

  const signIn = useCallback((e) => setEmail((e || '').trim().toLowerCase()), [])
  const signOut = useCallback(() => setEmail(null), [])

  // Owner-only operations (guarded again in the UI).
  const addAdmin = useCallback((e) => {
    const v = (e || '').trim().toLowerCase()
    if (!v || isOwnerEmail(v)) return
    setAdmins((prev) => (prev.includes(v) ? prev : [...prev, v]))
  }, [])
  const removeAdmin = useCallback(
    (e) => setAdmins((prev) => prev.filter((a) => a !== (e || '').toLowerCase())),
    []
  )

  return {
    email,
    role,
    isAdmin: isAdminRole(role),
    isOwner: role === 'owner',
    admins,
    signIn,
    signOut,
    addAdmin,
    removeAdmin,
  }
}
