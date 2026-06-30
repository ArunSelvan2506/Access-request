import { useState, useCallback } from 'react'
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
import LoginGate from './components/LoginGate'
import { ToastProvider } from './components/common/Toast'
import { useTicketStore } from './hooks/useTicketStore'
import { useAuth } from './hooks/useAuth'
import { useNow } from './hooks/useNow'
import { isOpen, isBreaching } from './utils/sla'
import { isFirebase } from './config'

function AppInner({ user, onSignOut }) {
  const { tickets, createTicket, transitionTicket } = useTicketStore()
  const now = useNow() // ticks every 30s to refresh SLA timers

  const [nav, setNav] = useState({ view: 'dashboard', q: null })
  const [createOpen, setCreateOpen] = useState(false)
  const [openKey, setOpenKey] = useState(null)

  const counts = {
    all: tickets.length,
    open: tickets.filter(isOpen).length,
    breach: tickets.filter(isBreaching).length,
  }

  const selectNav = useCallback((view, q) => setNav({ view, q: q || null }), [])
  const openTicket = useCallback((key) => setOpenKey(key), [])

  const activeTicket = openKey ? tickets.find((t) => t.key === openKey) : null

  const handleCreate = async (app, summary, data) => {
    const ticket = await createTicket(app, summary, data)
    // Jump to the All requests queue and open the new ticket, mirroring the original.
    setNav({ view: 'queue', q: null })
    setOpenKey(ticket.key)
    return ticket
  }

  const handleTransition = (key, to) => {
    transitionTicket(key, to)
  }

  return (
    <>
      <TopNav onCreate={() => setCreateOpen(true)} user={user} onSignOut={onSignOut} />
      <div className="shell">
        <Sidebar active={nav} counts={counts} onSelect={selectNav} />
        <main className="main">
          {nav.view === 'dashboard' && <Dashboard tickets={tickets} now={now} onOpen={openTicket} />}
          {nav.view === 'queue' && (
            <Queue tickets={tickets} queueFilter={nav.q} now={now} onOpen={openTicket} />
          )}
          {nav.view === 'board' && <Board tickets={tickets} onOpen={openTicket} />}
          {nav.view === 'autos' && <Automations />}
          {nav.view === 'catalog' && <Catalog />}
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
        onClose={() => setOpenKey(null)}
        onTransition={handleTransition}
      />

      <Chatbot />
    </>
  )
}

// In Firebase mode, require a signed-in company user before mounting the app
// (so the Firestore subscription only runs once authenticated). In local mode
// this passes straight through.
function AuthGate() {
  const { user, ready, error, signIn, signOut } = useAuth()

  if (!isFirebase) return <AppInner />
  if (!ready) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--faint)' }}>Loading…</div>
  }
  if (!user) return <LoginGate onSignIn={signIn} error={error} />
  return <AppInner user={user} onSignOut={signOut} />
}

export default function App() {
  return (
    <ToastProvider>
      <AuthGate />
    </ToastProvider>
  )
}
