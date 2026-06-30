import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from './useAuth'
import { buildTicket } from '../data/ticketOps'

// Firestore-backed ticket store. Tickets live in the `tickets` collection and
// are shared across the whole company in real time. New ticket numbers are
// allocated atomically from a `meta/counter` document so there are no races.
//
// On every create / status change the server-side grounding builder
// (Cloud Function) regenerates the AI knowledge base — no client involvement.
export function useFirebaseTickets() {
  const [tickets, setTickets] = useState([])
  const { user } = useAuth()

  // Live subscription to all tickets, newest first.
  useEffect(() => {
    const q = query(collection(db(), 'tickets'), orderBy('created', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setTickets(snap.docs.map((d) => ({ ...d.data(), key: d.id })))
    })
    return unsub
  }, [])

  const createTicket = useCallback(
    async (app, summary, data, sessionUser = {}, meta = {}) => {
      const u = {
        name: sessionUser.name || user?.displayName || user?.email || 'Unknown',
        email: sessionUser.email || user?.email || null,
      }

      const ticket = await runTransaction(db(), async (tx) => {
        const counterRef = doc(db(), 'meta', 'counter')
        const counterSnap = await tx.get(counterRef)
        const last = counterSnap.exists() ? counterSnap.data().seq || 140 : 140
        const num = Math.max(last, 140) + 1

        // Same pure builder every backend uses — priority-driven SLA, approvals,
        // department/role and validation activity stay identical everywhere.
        const t = { ...buildTicket({ num, app, summary, data, user: u, meta }), rejectReason: null }

        tx.set(counterRef, { seq: num }, { merge: true })
        tx.set(doc(db(), 'tickets', t.key), t)
        return t
      })

      return ticket
    },
    [user]
  )

  const transitionTicket = useCallback(
    async (key, to) => {
      const actor = user?.displayName || user?.email || 'Unknown'
      await runTransaction(db(), async (tx) => {
        const ref = doc(db(), 'tickets', key)
        const snap = await tx.get(ref)
        if (!snap.exists()) return
        const t = snap.data()
        const activity = [...(t.activity || []), { who: actor, tm: Date.now(), tx: 'Status changed to ' + to + '.' }]
        let rejectReason = t.rejectReason || null
        if (to === 'Rejected' && !rejectReason) rejectReason = 'Manually rejected'
        if (to !== 'Rejected') rejectReason = null
        tx.update(ref, { status: to, activity, rejectReason })
      })
    },
    [user]
  )

  return { tickets, createTicket, transitionTicket }
}
