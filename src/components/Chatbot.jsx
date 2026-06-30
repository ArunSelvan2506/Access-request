import { useState, useRef, useEffect } from 'react'
import { CATALOG } from '../data/catalog'

const SUGGESTS = [
  'What do I need for GitHub access?',
  'How do I get Figma?',
  'Why was my Cursor ticket rejected?',
  "What's the SLA for AWS?",
]

// Knowledge base string fed to the model as grounding context.
function buildKB() {
  return CATALOG.map((a) => {
    if (a.group === 'red')
      return `${a.name}: NOT IT-managed — do not raise a Jira ticket (auto-rejected). How to request: ${a.route}`
    const req = a.fields.filter((f) => f.req).map((f) => f.label).join('; ')
    return `${a.name}: IT-managed, raise a Jira ticket. SLA target ${a.sla}h. Required fields: ${req}. Auto-reject trigger: ${a.reject}.${a.callout ? ' Note: ' + a.callout.x : ''}`
  }).join('\n')
}

const SYSTEM_PROMPT = `You are the Access Assistant, an AI help bot embedded in a company IT Access Service Desk (a Jira Service Management replica). Answer staff questions about how to request access to applications, what fields are required, SLA targets, and why tickets get auto-rejected.

Rules:
- Answer ONLY from the knowledge base below. If something isn't covered, say you don't have that info and suggest posting in #access-request.
- Be concise and practical. Use short paragraphs or tight bullet lists.
- If an application is NOT IT-managed, make clear they must NOT raise a Jira ticket and tell them the correct channel.
- If asked "why was my ticket rejected", explain the likely auto-reject trigger for that application.
- Never invent fields, SLAs, contacts, or approval steps that aren't in the knowledge base.

KNOWLEDGE BASE:
${buildKB()}`

// Chat endpoint. Point this at your own backend proxy that forwards to the
// Claude API (the browser must never hold an API key). The endpoint should
// accept { system, messages } and return { content: [...] } or { text }.
const CHAT_ENDPOINT = import.meta.env.VITE_CHAT_ENDPOINT || ''

export default function Chatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([]) // { role: 'user'|'assistant', content }
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [greeted, setGreeted] = useState(false)
  const bodyRef = useRef(null)

  useEffect(() => {
    if (open && !greeted) {
      setMessages([
        {
          role: 'assistant',
          content:
            "Hi! I'm the Access Assistant 👋 I can tell you exactly what you need to request access to any application — required fields, SLA, and whether to raise a Jira ticket at all. What do you need access to?",
        },
      ])
      setGreeted(true)
    }
  }, [open, greeted])

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, busy])

  const send = async (text) => {
    const q = (text ?? input).trim()
    if (!q || busy) return
    setInput('')
    const history = [...messages.filter((m) => m.role !== 'system'), { role: 'user', content: q }]
    setMessages(history)
    setBusy(true)

    try {
      if (!CHAT_ENDPOINT) {
        throw new Error('No chat endpoint configured')
      }
      const res = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
      })
      const data = await res.json()
      const txt =
        (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim() ||
        data.text ||
        "Sorry, I couldn't generate a response. Try posting in #access-request."
      setMessages((prev) => [...prev, { role: 'assistant', content: txt }])
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "I'm having trouble reaching the AI service right now. You can still check the Catalog & rules tab, or post in #access-request for help.",
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  const showChips = messages.length <= 1 && !busy

  return (
    <>
      <button className="fab" title="Ask the Access Assistant" onClick={() => setOpen(true)}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a10 10 0 0 0-8.94 14.46L2 22l5.54-1.06A10 10 0 1 0 12 2z" />
          <circle cx="8.5" cy="12" r="1" fill="currentColor" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
          <circle cx="15.5" cy="12" r="1" fill="currentColor" />
        </svg>
      </button>

      <div className={'chat' + (open ? ' show' : '')}>
        <div className="ch">
          <div className="bot">🤖</div>
          <div>
            <h3>Access Assistant</h3>
            <div className="st">AI · grounded in your access rules</div>
          </div>
          <button className="x" onClick={() => setOpen(false)}>
            ×
          </button>
        </div>
        <div className="cbody" ref={bodyRef}>
          {messages.map((m, i) => (
            <div key={i} className={'msg ' + (m.role === 'user' ? 'me' : 'bot')}>
              {m.content}
            </div>
          ))}
          {busy && (
            <div className="typing">
              <span />
              <span />
              <span />
            </div>
          )}
        </div>
        {showChips && (
          <div className="chips">
            {SUGGESTS.map((s) => (
              <span key={s} className="chip" onClick={() => send(s)}>
                {s}
              </span>
            ))}
          </div>
        )}
        <div className="cfoot">
          <input
            type="text"
            placeholder="Ask about access requirements…"
            autoComplete="off"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <button onClick={() => send()} disabled={busy}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="m22 2-7 20-4-9-9-4z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}
