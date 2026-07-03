// AWS-native API for the Access Service Desk.
// Stores each ticket as a document in DynamoDB, keyed by its ACC-### key.
// Credentials come from the runtime IAM role (App Runner / ECS task role) — no
// AWS keys live in code or env. For local dev, point DDB_ENDPOINT at DynamoDB
// Local, or use a normal AWS profile.
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  waitUntilTableExists,
} from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { OAuth2Client } from 'google-auth-library'

const PORT = process.env.PORT || 8787
const API_KEY = process.env.API_KEY || '' // optional shared key (x-api-key)
const ORIGIN = process.env.CORS_ORIGIN || '*'
const TABLE = process.env.DDB_TABLE || 'access_desk_tickets'

// Google SSO (optional). Verifies Google ID tokens and enforces the company
// domain. Needs only the OAuth Client ID (public) — no client secret. Without
// GOOGLE_CLIENT_ID this is disabled and the app uses the shared-password gate.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const AUTH_DOMAIN = process.env.AUTH_DOMAIN || 'fuseenergy.com'
const authEnabled = !!GOOGLE_CLIENT_ID
const googleClient = authEnabled ? new OAuth2Client(GOOGLE_CLIENT_ID) : null

// Email notifications (optional). Needs a verified SES sender in SES_FROM.
// Without it, mention notifications self-disable and the UI just skips the email.
const SES_FROM = process.env.SES_FROM || ''
const APP_URL = process.env.APP_URL || (ORIGIN !== '*' ? ORIGIN : '')
const emailEnabled = !!SES_FROM
const ses = emailEnabled ? new SESClient({ ...(process.env.AWS_REGION ? { region: process.env.AWS_REGION } : {}) }) : null

// AI triage (optional). The Anthropic key lives ONLY here, server-side — never
// in the client bundle or the repo. If it's unset, the AI endpoints report
// disabled and the UI hides the feature.
const AI_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8'
const aiEnabled = !!process.env.ANTHROPIC_API_KEY
const anthropic = aiEnabled ? new Anthropic() : null // reads ANTHROPIC_API_KEY from env

// DynamoDB. Region + credentials resolve from the standard AWS chain (IAM role
// in AWS, profile/env locally). DDB_ENDPOINT lets you target DynamoDB Local.
const ddbBase = new DynamoDBClient({
  ...(process.env.AWS_REGION ? { region: process.env.AWS_REGION } : {}),
  ...(process.env.DDB_ENDPOINT ? { endpoint: process.env.DDB_ENDPOINT } : {}),
})
const ddb = DynamoDBDocumentClient.from(ddbBase, { marshallOptions: { removeUndefinedValues: true } })

// Best-effort: create the table if it's missing (needs CreateTable IAM perms).
// Set DDB_AUTOCREATE=false if the table is provisioned by your infra team.
async function ensureTable() {
  try {
    await ddbBase.send(new DescribeTableCommand({ TableName: TABLE }))
    return
  } catch (e) {
    if (e.name !== 'ResourceNotFoundException') {
      console.warn('DynamoDB describe failed (' + TABLE + '):', e.name || e.message)
      return
    }
  }
  if (process.env.DDB_AUTOCREATE === 'false') {
    console.warn('Table ' + TABLE + ' missing and autocreate disabled.')
    return
  }
  try {
    await ddbBase.send(
      new CreateTableCommand({
        TableName: TABLE,
        BillingMode: 'PAY_PER_REQUEST',
        AttributeDefinitions: [{ AttributeName: 'key', AttributeType: 'S' }],
        KeySchema: [{ AttributeName: 'key', KeyType: 'HASH' }],
      })
    )
    await waitUntilTableExists({ client: ddbBase, maxWaitTime: 60 }, { TableName: TABLE })
    console.log('Created DynamoDB table ' + TABLE)
  } catch (e) {
    console.warn('Could not auto-create table ' + TABLE + ':', e.name || e.message)
  }
}
await ensureTable()

const app = express()
app.use(cors({ origin: ORIGIN }))
app.use(express.json({ limit: '1mb' }))

// Optional shared-key gate. Not strong auth — a deterrent until real auth.
app.use((req, res, next) => {
  if (API_KEY && req.headers['x-api-key'] !== API_KEY) return res.status(401).json({ error: 'unauthorized' })
  next()
})

app.get('/health', (_req, res) => res.json({ ok: true }))

// ---- Google SSO ----
app.get('/api/auth/status', (_req, res) => res.json({ enabled: authEnabled, domain: authEnabled ? AUTH_DOMAIN : null }))

// Verify a Google ID token, enforce the company domain, return the user.
app.post('/api/auth/google', async (req, res) => {
  if (!authEnabled) return res.status(503).json({ error: 'sso_disabled' })
  const { credential } = req.body || {}
  if (!credential) return res.status(400).json({ error: 'credential required' })
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID })
    const p = ticket.getPayload()
    const email = (p.email || '').toLowerCase()
    const domainOk = p.hd === AUTH_DOMAIN || email.endsWith('@' + AUTH_DOMAIN)
    if (!p.email_verified || !domainOk) {
      return res.status(403).json({ error: 'domain_forbidden', message: 'Use your ' + AUTH_DOMAIN + ' Google account.' })
    }
    res.json({ email, name: p.name || null, picture: p.picture || null })
  } catch (e) {
    console.error('Google token verify failed:', e?.message)
    res.status(401).json({ error: 'invalid_token' })
  }
})

// Wraps an async handler so a rejected promise (e.g. a DynamoDB throttle or
// transient error) returns a 500 instead of crashing the process.
const wrap = (fn) => (req, res) =>
  fn(req, res).catch((e) => {
    console.error(req.method, req.path, 'failed:', e?.name || '', e?.message || e)
    if (!res.headersSent) res.status(500).json({ error: 'server_error' })
  })

app.get('/api/tickets', wrap(async (_req, res) => {
  const items = []
  let ExclusiveStartKey
  do {
    const r = await ddb.send(new ScanCommand({ TableName: TABLE, ExclusiveStartKey }))
    for (const it of r.Items || []) if (it.data) items.push(it.data)
    ExclusiveStartKey = r.LastEvaluatedKey
  } while (ExclusiveStartKey)
  items.sort((a, b) => (b?.num || 0) - (a?.num || 0))
  res.json(items)
}))

app.post('/api/tickets', wrap(async (req, res) => {
  const t = req.body
  if (!t || !t.key) return res.status(400).json({ error: 'ticket.key required' })
  await ddb.send(new PutCommand({ TableName: TABLE, Item: { key: t.key, num: t.num || 0, updated_at: Date.now(), data: t } }))
  res.status(201).json(t)
}))

app.put('/api/tickets/:key', wrap(async (req, res) => {
  const t = req.body
  if (!t) return res.status(400).json({ error: 'ticket body required' })
  await ddb.send(new PutCommand({ TableName: TABLE, Item: { key: req.params.key, num: t.num || 0, updated_at: Date.now(), data: t } }))
  res.json(t)
}))

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

// ---- Mention notifications (email a tagged person) ----

app.get('/api/notify/status', (_req, res) => res.json({ enabled: emailEnabled }))

const escapeHtml = (s) =>
  String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

app.post('/api/notify/mention', wrap(async (req, res) => {
  if (!emailEnabled) return res.status(503).json({ error: 'email_disabled' })
  const { ticketKey, summary, actor, text, recipients } = req.body || {}
  const to = [...new Set((recipients || []).filter((e) => /.+@.+\..+/.test(e)))]
  if (!ticketKey || to.length === 0) return res.status(400).json({ error: 'ticketKey and recipients required' })

  const subject = '[' + ticketKey + '] ' + (actor || 'Someone') + ' mentioned you'
  const link = APP_URL ? '\n\nView the request: ' + APP_URL : ''
  const bodyText =
    (actor || 'Someone') + ' mentioned you in ' + ticketKey +
    (summary ? ' — ' + summary : '') + ':\n\n"' + (text || '') + '"' + link
  const bodyHtml =
    '<p><strong>' + escapeHtml(actor || 'Someone') + '</strong> mentioned you in <strong>' + escapeHtml(ticketKey) +
    '</strong>' + (summary ? ' — ' + escapeHtml(summary) : '') + ':</p>' +
    '<blockquote style="border-left:3px solid #ccc;margin:0;padding:4px 12px;color:#444">' + escapeHtml(text || '') + '</blockquote>' +
    (APP_URL ? '<p><a href="' + escapeHtml(APP_URL) + '">Open the Access Service Desk</a></p>' : '')

  // One email per recipient so addresses aren't disclosed to each other.
  let sent = 0
  for (const addr of to) {
    try {
      await ses.send(new SendEmailCommand({
        Source: SES_FROM,
        Destination: { ToAddresses: [addr] },
        Message: {
          Subject: { Data: subject },
          Body: { Text: { Data: bodyText }, Html: { Data: bodyHtml } },
        },
      }))
      sent++
    } catch (e) {
      console.error('SES send failed for', addr, ':', e?.name || e?.message)
    }
  }
  res.json({ sent, requested: to.length })
}))

app.post('/api/notify/assign', wrap(async (req, res) => {
  if (!emailEnabled) return res.status(503).json({ error: 'email_disabled' })
  const { ticketKey, summary, actor, assignee } = req.body || {}
  if (!ticketKey || !/.+@.+\..+/.test(assignee || '')) return res.status(400).json({ error: 'ticketKey and assignee required' })

  const subject = '[' + ticketKey + '] Assigned to you'
  const link = APP_URL ? '\n\nView the request: ' + APP_URL : ''
  const bodyText =
    (actor || 'An administrator') + ' assigned ' + ticketKey + (summary ? ' — ' + summary : '') + ' to you.' + link
  const bodyHtml =
    '<p><strong>' + escapeHtml(actor || 'An administrator') + '</strong> assigned <strong>' + escapeHtml(ticketKey) +
    '</strong>' + (summary ? ' — ' + escapeHtml(summary) : '') + ' to you.</p>' +
    (APP_URL ? '<p><a href="' + escapeHtml(APP_URL) + '">Open the Access Service Desk</a></p>' : '')

  try {
    await ses.send(new SendEmailCommand({
      Source: SES_FROM,
      Destination: { ToAddresses: [assignee] },
      Message: { Subject: { Data: subject }, Body: { Text: { Data: bodyText }, Html: { Data: bodyHtml } } },
    }))
    res.json({ sent: 1 })
  } catch (e) {
    console.error('SES assign notify failed for', assignee, ':', e?.name || e?.message)
    res.status(502).json({ error: 'ses_error' })
  }
}))

// ---- Presence & login activity (owner portal) ----
// In-memory: "who's online now" is inherently ephemeral, and recent logins are
// kept since the server last started. Fine for a single instance.
const PRESENCE = new Map() // email -> { firstSeen, lastSeen }
const LOGINS = [] // recent login events, newest first: { email, at }
const ONLINE_MS = 3 * 60 * 1000

app.post('/api/presence/ping', wrap(async (req, res) => {
  const email = (req.body?.email || '').toLowerCase()
  if (!/.+@.+\..+/.test(email)) return res.status(400).json({ error: 'email required' })
  const now = Date.now()
  const cur = PRESENCE.get(email)
  if (cur) cur.lastSeen = now
  else PRESENCE.set(email, { firstSeen: now, lastSeen: now })
  if (req.body?.event === 'login') {
    LOGINS.unshift({ email, at: now })
    if (LOGINS.length > 300) LOGINS.length = 300
  }
  res.json({ ok: true })
}))

app.get('/api/presence', wrap(async (_req, res) => {
  const now = Date.now()
  const online = [...PRESENCE.entries()]
    .filter(([, v]) => now - v.lastSeen <= ONLINE_MS)
    .map(([email, v]) => ({ email, lastSeen: v.lastSeen }))
    .sort((a, b) => b.lastSeen - a.lastSeen)
  res.json({ online, logins: LOGINS.slice(0, 100) })
}))

app.listen(PORT, () =>
  console.log(
    'Access Service Desk API on :' + PORT +
      ' | DynamoDB table ' + TABLE +
      (aiEnabled ? ' | AI triage on (' + AI_MODEL + ')' : ' | AI triage off — set ANTHROPIC_API_KEY') +
      (emailEnabled ? ' | email on (' + SES_FROM + ')' : ' | email off — set SES_FROM') +
      (authEnabled ? ' | Google SSO on (' + AUTH_DOMAIN + ')' : ' | SSO off — set GOOGLE_CLIENT_ID')
  )
)
