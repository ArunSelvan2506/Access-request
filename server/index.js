// Tiny SQLite-backed API for the Access Service Desk.
// Stores each ticket as a JSON document keyed by its ACC-### key. Works with a
// local file (file:access.db) for dev, or a Turso/libSQL URL + token in prod.
import express from 'express'
import cors from 'cors'
import { createClient } from '@libsql/client'
import Anthropic from '@anthropic-ai/sdk'

const PORT = process.env.PORT || 8787
const API_KEY = process.env.API_KEY || '' // optional shared key (x-api-key)
const ORIGIN = process.env.CORS_ORIGIN || '*'

// AI triage (optional). The Anthropic key lives ONLY here, server-side — never
// in the client bundle or the repo. If it's unset, the AI endpoints report
// disabled and the UI hides the feature.
const AI_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8'
const aiEnabled = !!process.env.ANTHROPIC_API_KEY
const anthropic = aiEnabled ? new Anthropic() : null // reads ANTHROPIC_API_KEY from env

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:access.db',
  authToken: process.env.TURSO_AUTH_TOKEN, // undefined for local file — fine
})

await db.execute(`CREATE TABLE IF NOT EXISTS tickets (
  key TEXT PRIMARY KEY,
  num INTEGER,
  data TEXT NOT NULL,
  updated_at INTEGER
)`)

const app = express()
app.use(cors({ origin: ORIGIN }))
app.use(express.json({ limit: '1mb' }))

// Optional shared-key gate. Not strong auth — a deterrent until real auth.
app.use((req, res, next) => {
  if (API_KEY && req.headers['x-api-key'] !== API_KEY) return res.status(401).json({ error: 'unauthorized' })
  next()
})

app.get('/health', (_req, res) => res.json({ ok: true }))

app.get('/api/tickets', async (_req, res) => {
  const r = await db.execute('SELECT data FROM tickets ORDER BY num DESC')
  res.json(r.rows.map((row) => JSON.parse(row.data)))
})

app.post('/api/tickets', async (req, res) => {
  const t = req.body
  if (!t || !t.key) return res.status(400).json({ error: 'ticket.key required' })
  await db.execute({
    sql: 'INSERT OR REPLACE INTO tickets (key, num, data, updated_at) VALUES (?, ?, ?, ?)',
    args: [t.key, t.num || 0, JSON.stringify(t), Date.now()],
  })
  res.status(201).json(t)
})

app.put('/api/tickets/:key', async (req, res) => {
  const t = req.body
  if (!t) return res.status(400).json({ error: 'ticket body required' })
  await db.execute({
    sql: 'INSERT OR REPLACE INTO tickets (key, num, data, updated_at) VALUES (?, ?, ?, ?)',
    args: [req.params.key, t.num || 0, JSON.stringify(t), Date.now()],
  })
  res.json(t)
})

// ---- AI triage assistant (admin-facing, advisory) ----

// Lets the client hide the feature when no key is configured.
app.get('/api/ai/status', (_req, res) => res.json({ enabled: aiEnabled, model: aiEnabled ? AI_MODEL : null }))

// Structured-output schema — the model is forced to return exactly this shape.
const TRIAGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    suggestedPriority: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] },
    priorityRationale: { type: 'string' },
    fieldChecks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          field: { type: 'string' },
          status: { type: 'string', enum: ['ok', 'missing', 'unclear'] },
          note: { type: 'string' },
        },
        required: ['field', 'status', 'note'],
      },
    },
    recommendation: { type: 'string', enum: ['Proceed', 'Request more info', 'Reject', 'Escalate to approver'] },
    recommendationRationale: { type: 'string' },
    draftReply: { type: 'string' },
  },
  required: ['suggestedPriority', 'priorityRationale', 'fieldChecks', 'recommendation', 'recommendationRationale', 'draftReply'],
}

const TRIAGE_SYSTEM = `You are a triage assistant for the IT Access Service Desk at Fuse Energy.
An administrator reviews each access request before acting; your job is to give them a fast, accurate first read — never the final decision.

You receive a single ticket plus the catalogue rule for the requested application (its required fields, any callout/policy note, and the auto-reject trigger). Using ONLY that information:
- Suggest a priority (Critical/High/Medium/Low). Offboarding/leaver and security/MFA issues are time-sensitive; routine licence or access-tidy requests are lower.
- Check each required field against what the requester supplied: "ok" if present and plausible, "missing" if absent/empty, "unclear" if present but vague or likely invalid.
- Recommend a next step: Proceed, Request more info, Reject, or Escalate to approver.
- Write a short, professional draftReply addressed to the requester that the admin can edit and send. The draft must NOT reveal internal scoring, auto-reject rules, or this triage process — it should read as a normal service-desk reply (e.g. ask for the missing detail, confirm it's being actioned, or politely explain what's needed).

Do not invent policy beyond the supplied rule. Be concise and factual. Base every field check on the data given.`

app.post('/api/ai/triage', async (req, res) => {
  if (!aiEnabled) return res.status(503).json({ error: 'ai_disabled' })
  const { ticket, rule } = req.body || {}
  if (!ticket || !ticket.app) return res.status(400).json({ error: 'ticket required' })
  try {
    const payload = {
      ticket: {
        app: ticket.app,
        summary: ticket.summary,
        status: ticket.status,
        urgency: ticket.urgency,
        department: ticket.department,
        role: ticket.role,
        duration: ticket.duration,
        fields: ticket.fields || {},
      },
      catalogueRule: rule || null,
    }
    const msg = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      output_config: { format: { type: 'json_schema', schema: TRIAGE_SCHEMA } },
      messages: [{ role: 'user', content: 'Triage this access request:\n\n' + JSON.stringify(payload, null, 2) }],
      system: TRIAGE_SYSTEM,
    })
    const text = (msg.content || []).find((b) => b.type === 'text')?.text || ''
    let result
    try {
      result = JSON.parse(text)
    } catch {
      return res.status(502).json({ error: 'ai_bad_output' })
    }
    res.json(result)
  } catch (e) {
    const status = e?.status === 429 ? 429 : 502
    console.error('AI triage failed:', e?.status || '', e?.message || e)
    res.status(status).json({ error: 'ai_error' })
  }
})

app.listen(PORT, () => console.log('Access Service Desk API on :' + PORT + (aiEnabled ? ' (AI triage on, ' + AI_MODEL + ')' : ' (AI triage off — set ANTHROPIC_API_KEY)')))
