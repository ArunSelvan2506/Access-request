import { useState, useEffect, useCallback } from 'react'
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { firebaseAuth } from '../firebase'
import { ALLOWED_EMAIL_DOMAIN, isFirebase } from '../config'

// Google sign-in, restricted to the allowed company email domain. In the local
// build this is inert (returns a null user and ready=true immediately).
export function useAuth() {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(!isFirebase)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isFirebase) return
    const unsub = onAuthStateChanged(firebaseAuth(), (u) => {
      // Defend in depth: reject anyone off-domain even if they got a token.
      if (u && ALLOWED_EMAIL_DOMAIN && !u.email?.endsWith('@' + ALLOWED_EMAIL_DOMAIN)) {
        fbSignOut(firebaseAuth())
        setUser(null)
        setError(`Only @${ALLOWED_EMAIL_DOMAIN} accounts can use this tool.`)
      } else {
        setUser(u)
        setError(null)
      }
      setReady(true)
    })
    return unsub
  }, [])

  const signIn = useCallback(async () => {
    setError(null)
    const provider = new GoogleAuthProvider()
    if (ALLOWED_EMAIL_DOMAIN) provider.setCustomParameters({ hd: ALLOWED_EMAIL_DOMAIN })
    try {
      await signInWithPopup(firebaseAuth(), provider)
    } catch (e) {
      setError(e.message || 'Sign-in failed.')
    }
  }, [])

  const signOut = useCallback(() => fbSignOut(firebaseAuth()), [])

  return { user, ready, error, signIn, signOut }
}
