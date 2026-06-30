// Tiny SQLite-backed API for the Access Service Desk.
// Stores each ticket as a JSON document keyed by its ACC-### key. Works with a
// local file (file:access.db) for dev, or a Turso/libSQL URL + token in prod.
import express from 'express'
import cors from 'cors'
import { createClient } from '@libsql/client'

const PORT = process.env.PORT || 8787
const API_KEY = process.env.API_KEY || '' // optional shared key (x-api-key)
const ORIGIN = process.env.CORS_ORIGIN || '*'

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

app.listen(PORT, () => console.log('Access Service Desk API on :' + PORT))
