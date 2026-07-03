import { useState, useCallback, useEffect } from 'react'

const THEME_KEY = 'acc_theme'
function loadTheme() {
  try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light' } catch (e) { return 'light' }
}
import TopNav from './components/TopNav'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Queue from './components/Queue'
import Board from './components/Board'
import Catalog from './components/Catalog'
import CreateModal from './components/CreateModal'
import TicketDrawer from './components/TicketDrawer'
import SignIn from './components/SignIn'
import AdminSettings from './components/AdminSettings'
import Reports from './components/Reports'
import GlobalSearch from './components/GlobalSearch'
import HelpPanel from './components/HelpPanel'
import { ToastProvider } from './components/common/Toast'
import { useTicketStore } from './hooks/useTicketStore'
import { useNow } from './hooks/useNow'
import { useSession } from './hooks/useSession'
import { displayName, OWNER_EMAIL } from './auth/session'
import { isApi } from './config'
import { extractMentions } from './utils/mentions'
import { notifyMention, notifyAssignment } from './api/notify'
import { isOpen, isBreaching } from './utils/sla'

const isPendingApproval = (t) => t.status === 'Pending Approval'

function AppInner({ session }) {
  const { email, role, isAdmin, isOwner, admins } = session
  const { tickets, createTicket, transitionTicket, decideApproval, assignTicket, addComment } =
    useTicketStore()
  const now = useNow() // ticks every 30s to refresh SLA timers

  const [nav, setNav] = useState({ view: isAdmin ? 'dashboard' : 'queue', q: null })
  const [createOpen, setCreateOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [openKey, setOpenKey] = useState(null)
  const [navOpen, setNavOpen] = useState(true)
  const [theme, setTheme] = useState(loadTheme)

  // Apply + persist theme on <html data-theme>.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem(THEME_KEY, theme) } catch (e) { /* ignore */ }
  }, [theme])

  // Admins see everything; everyone else sees their own requests AND requests
  // where they are the line manager (so they can approve).
  const visibleTickets = isAdmin
    ? tickets
    : tickets.filter((t) => t.requesterEmail === email || t.manager === email)

  // Approvals queue: admins see all pending approvals; a manager sees the ones
  // awaiting their decision.
  const approvalsList = isAdmin
    ? tickets.filter(isPendingApproval)
    : tickets.filter((t) => t.manager === email && isPendingApproval(t))

  // Keep people out of views they shouldn't see (e.g. after a role change).
  const allowedViews = isAdmin
    ? ['dashboard', 'queue', 'board', 'approvals', 'reports', 'catalog', ...(isOwner ? ['admins'] : [])]
    : ['queue', 'catalog', ...(approvalsList.length ? ['approvals'] : [])]
  useEffect(() => {
    if (!allowedViews.includes(nav.view)) {
      setNav({ view: isAdmin ? 'dashboard' : 'queue', q: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isOwner, approvalsList.length])

  const counts = {
    all: tickets.length,
    open: tickets.filter(isOpen).length,
    breach: tickets.filter(isBreaching).length,
    mine: visibleTickets.length,
    approvals: approvalsList.length,
  }

  const selectNav = useCallback((view, q) => setNav({ view, q: q || null }), [])
  const openTicket = useCallback((key) => setOpenKey(key), [])

  const activeTicket = openKey ? visibleTickets.find((t) => t.key === openKey) : null
  // Who can approve the open ticket: an admin, or its named line manager.
  const canApprove = !!activeTicket && (isAdmin || activeTicket.manager === email)

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

  const handleApprove = (key, decision, note, channel) => {
    decideApproval(key, decision, displayName(email), note, channel)
  }
  // The admin team — the people a ticket can be assigned to.
  const adminPeople = [...new Set([OWNER_EMAIL, ...admins].map((e) => e.toLowerCase()))].map((e) => ({
    email: e,
    name: displayName(e),
  }))

  const handleAssign = (key, assignee) => {
    if (!isAdmin) return
    assignTicket(key, assignee, displayName(email))
    // Let the assignee know by email — unless you assigned it to yourself.
    if (isApi && assignee && assignee !== email) {
      const t = tickets.find((x) => x.key === key)
      notifyAssignment({ ticketKey: key, summary: t?.summary, actor: displayName(email), assignee })
    }
  }
  // People who can be @mentioned on a ticket: its participants + the admin team.
  const taggablePeople = (ticket) => {
    if (!ticket) return []
    const raw = [ticket.requesterEmail, ticket.manager, ticket.assignee, OWNER_EMAIL, ...admins].filter(Boolean)
    const uniq = [...new Set(raw.map((e) => e.toLowerCase()))]
    return uniq.map((e) => ({ email: e, name: displayName(e) }))
  }

  const handleComment = (key, text, internal) => {
    addComment(key, displayName(email), text, internal)
    // Email anyone tagged in the comment (server holds the SES creds). Internal
    // notes only notify the admin team, so they stay hidden from requesters.
    if (!isApi) return
    const t = tickets.find((x) => x.key === key)
    if (!t) return
    let recipients = extractMentions(text, taggablePeople(t).map((p) => p.email)).filter((e) => e !== email)
    if (internal) {
      const adminSet = new Set([OWNER_EMAIL, ...admins].map((e) => e.toLowerCase()))
      recipients = recipients.filter((e) => adminSet.has(e))
    }
    if (recipients.length) {
      notifyMention({ ticketKey: key, summary: t.summary, actor: displayName(email), text, recipients })
    }
  }

  return (
    <>
      <TopNav
        onCreate={() => setCreateOpen(true)}
        email={email}
        role={role}
        onSignOut={session.signOut}
        onHelp={() => setHelpOpen(true)}
        search={<GlobalSearch tickets={visibleTickets} onOpen={openTicket} />}
        onToggleSidebar={() => setNavOpen((v) => !v)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />
      <div className="shell">
        {navOpen && (
          <Sidebar active={nav} counts={counts} onSelect={selectNav} isAdmin={isAdmin} isOwner={isOwner} />
        )}
        <main className="main">
          {nav.view === 'dashboard' && isAdmin && (
            <Dashboard tickets={tickets} now={now} onOpen={openTicket} onNavigate={selectNav} />
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
          {nav.view === 'approvals' && (
            <Queue
              tickets={approvalsList}
              queueFilter={null}
              title="Approvals"
              subtitle="Requests awaiting a line-manager decision. Open one to approve or decline."
              now={now}
              onOpen={openTicket}
            />
          )}
          {nav.view === 'board' && isAdmin && <Board tickets={tickets} now={now} onOpen={openTicket} />}
          {nav.view === 'reports' && isAdmin && <Reports tickets={tickets} now={now} />}
          {nav.view === 'catalog' && <Catalog />}
          {nav.view === 'admins' && isOwner && <AdminSettings session={session} />}
        </main>
      </div>

      <CreateModal
        open={createOpen}
        presetApp={null}
        existing={tickets.filter((t) => t.requesterEmail === email)}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />

      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* Scrim behind the drawer (the modal renders its own scrim). */}
      {activeTicket && <div className="scrim show" onClick={() => setOpenKey(null)} />}
      <TicketDrawer
        ticket={activeTicket}
        now={now}
        canTransition={isAdmin}
        canApprove={canApprove}
        canAssign={isAdmin}
        isAdmin={isAdmin}
        currentEmail={email}
        people={taggablePeople(activeTicket)}
        assignees={adminPeople}
        onClose={() => setOpenKey(null)}
        onTransition={handleTransition}
        onApprove={handleApprove}
        onAssign={handleAssign}
        onComment={handleComment}
      />
    </>
  )
}

export default function App() {
  const session = useSession()
  // Apply the saved theme on mount so the sign-in screen matches it too
  // (the toggle itself lives in the post-login top nav).
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', loadTheme())
  }, [])
  return (
    <ToastProvider>
      {session.email ? <AppInner session={session} /> : <SignIn session={session} />}
    </ToastProvider>
  )
}
