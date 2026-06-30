import { useState, useCallback, useEffect } from 'react'
import TopNav from './components/TopNav'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Queue from './components/Queue'
import Board from './components/Board'
import Automations from './components/Automations'
import Catalog from './components/Catalog'
import CreateModal from './components/CreateModal'
import TicketDrawer from './components/TicketDrawer'
import Chatbot from './components/Chatbot'
import SignIn from './components/SignIn'
import AdminSettings from './components/AdminSettings'
import { ToastProvider } from './components/common/Toast'
import { useLocalTickets } from './hooks/useTickets'
import { useNow } from './hooks/useNow'
import { useSession } from './hooks/useSession'
import { displayName } from './auth/session'
import { isOpen, isBreaching } from './utils/sla'

function AppInner({ session }) {
  const { email, role, isAdmin, isOwner } = session
  const { tickets, createTicket, transitionTicket } = useLocalTickets()
  const now = useNow() // ticks every 30s to refresh SLA timers

  const [nav, setNav] = useState({ view: isAdmin ? 'dashboard' : 'queue', q: null })
  const [createOpen, setCreateOpen] = useState(false)
  const [openKey, setOpenKey] = useState(null)

  // Admins see everything; users see only their own requests.
  const visibleTickets = isAdmin ? tickets : tickets.filter((t) => t.requesterEmail === email)

  // Keep the user out of admin-only views (e.g. after a role change).
  const allowedViews = isAdmin
    ? ['dashboard', 'queue', 'board', 'autos', 'catalog', ...(isOwner ? ['admins'] : [])]
    : ['queue', 'catalog']
  useEffect(() => {
    if (!allowedViews.includes(nav.view)) {
      setNav({ view: isAdmin ? 'dashboard' : 'queue', q: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isOwner])

  const counts = {
    all: tickets.length,
    open: tickets.filter(isOpen).length,
    breach: tickets.filter(isBreaching).length,
    mine: visibleTickets.length,
  }

  const selectNav = useCallback((view, q) => setNav({ view, q: q || null }), [])
  const openTicket = useCallback((key) => setOpenKey(key), [])

  const activeTicket = openKey ? visibleTickets.find((t) => t.key === openKey) : null

  const handleCreate = (app, summary, data, meta) => {
    const ticket = createTicket(app, summary, data, { email, name: displayName(email) }, meta)
    setNav({ view: 'queue', q: null })
    setOpenKey(ticket.key)
    return ticket
  }

  const handleTransition = (key, to, opts) => {
    if (!isAdmin) return // only admins/owner can change status
    transitionTicket(key, to, { actor: displayName(email), ...opts })
  }

  return (
    <>
      <TopNav onCreate={() => setCreateOpen(true)} email={email} role={role} onSignOut={session.signOut} />
      <div className="shell">
        <Sidebar active={nav} counts={counts} onSelect={selectNav} isAdmin={isAdmin} isOwner={isOwner} />
        <main className="main">
          {nav.view === 'dashboard' && isAdmin && (
            <Dashboard tickets={tickets} now={now} onOpen={openTicket} />
          )}
          {nav.view === 'queue' && (
            <Queue
              tickets={visibleTickets}
              queueFilter={isAdmin ? nav.q : null}
              title={isAdmin ? undefined : 'My requests'}
              subtitle={isAdmin ? undefined : 'The access requests you have submitted, with live SLA timers.'}
              now={now}
              onOpen={openTicket}
            />
          )}
          {nav.view === 'board' && isAdmin && <Board tickets={tickets} onOpen={openTicket} />}
          {nav.view === 'autos' && isAdmin && <Automations />}
          {nav.view === 'catalog' && <Catalog />}
          {nav.view === 'admins' && isOwner && <AdminSettings session={session} />}
        </main>
      </div>

      <CreateModal
        open={createOpen}
        presetApp={null}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />

      {/* Scrim behind the drawer (the modal renders its own scrim). */}
      {activeTicket && <div className="scrim show" onClick={() => setOpenKey(null)} />}
      <TicketDrawer
        ticket={activeTicket}
        now={now}
        canTransition={isAdmin}
        onClose={() => setOpenKey(null)}
        onTransition={handleTransition}
      />

      <Chatbot />
    </>
  )
}

export default function App() {
  const session = useSession()
  return (
    <ToastProvider>
      {session.email ? <AppInner session={session} /> : <SignIn session={session} />}
    </ToastProvider>
  )
}
