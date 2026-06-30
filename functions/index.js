// ================= CLOUD FUNCTIONS =================
// Two functions power the "AI for future works" requirement:
//   1. onTicketWritten — a Firestore trigger that regenerates the AI grounding
//      doc every time a ticket is created or its status changes (create/close).
//   2. chat — a callable function the app uses to ask the Access Assistant. It
//      holds the Anthropic key server-side and injects the live grounding doc,
//      so the assistant answers from current ticket reality. No daily code edits.
const { onDocumentWritten } = require('firebase-functions/v2/firestore')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { setGlobalOptions } = require('firebase-functions/v2')
const { defineSecret } = require('firebase-functions/params')
const admin = require('firebase-admin')
const Anthropic = require('@anthropic-ai/sdk')

const { buildCatalogKB } = require('./catalogRules')
const { buildGrounding } = require('./grounding')

admin.initializeApp()
setGlobalOptions({ region: 'us-central1', maxInstances: 10 })

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY')
const ALLOWED_DOMAIN = 'fuseenergy.com'
const GROUNDING_REF = () => admin.firestore().doc('meta/grounding')

// ---- 1. Auto-grounding: rebuild on every ticket create / status change ----
exports.onTicketWritten = onDocumentWritten('tickets/{ticketId}', async (event) => {
  const before = event.data?.before?.data()
  const after = event.data?.after?.data()

  // Only rebuild when something meaningful changed: creation, deletion, or a
  // status transition (which covers the "closing state" — Done/Rejected).
  const statusChanged = before?.status !== after?.status
  const created = !before && !!after
  const deleted = !!before && !after
  if (!created && !deleted && !statusChanged) return

  const snap = await admin.firestore().collection('tickets').get()
  const tickets = snap.docs.map((d) => d.data())
  const grounding = buildGrounding(tickets)

  await GROUNDING_REF().set(
    { text: grounding, updatedAt: admin.firestore.FieldValue.serverTimestamp(), ticketCount: tickets.length },
    { merge: true }
  )
})

// ---- 2. Access Assistant chat ----
const SYSTEM_INSTRUCTIONS = `You are the Access Assistant, an AI help bot embedded in Fuse Energy's IT Access Service Desk (a Jira Service Management replica). Answer staff questions about how to request access to applications, what fields are required, SLA targets, why tickets get auto-rejected, and the current state of the service desk.

Rules:
- Answer ONLY from the knowledge base and live ticket activity below. If something isn't covered, say you don't have that info and suggest posting in #access-request.
- Be concise and practical. Use short paragraphs or tight bullet lists.
- If an application is NOT IT-managed, make clear they must NOT raise a Jira ticket and tell them the correct channel.
- If asked "why was my ticket rejected", explain the likely auto-reject trigger for that application.
- You may use the live ticket activity to answer questions like how many requests are open or what commonly gets rejected.
- Never invent fields, SLAs, contacts, or approval steps that aren't in the knowledge base.`

exports.chat = onCall({ secrets: [ANTHROPIC_API_KEY] }, async (request) => {
  // Auth: signed-in company users only.
  const auth = request.auth
  if (!auth || !auth.token?.email?.endsWith('@' + ALLOWED_DOMAIN)) {
    throw new HttpsError('permission-denied', 'Sign in with a Fuse Energy account.')
  }

  const messages = Array.isArray(request.data?.messages) ? request.data.messages : []
  if (!messages.length) throw new HttpsError('invalid-argument', 'No messages provided.')

  // Sanitize to the shape the model expects.
  const clean = messages
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content }))

  // Pull the live grounding doc (auto-maintained by onTicketWritten).
  let live = ''
  try {
    const g = await GROUNDING_REF().get()
    if (g.exists) live = g.data().text || ''
  } catch (e) {
    /* grounding not built yet — fall back to catalog only */
  }

  const system = `${SYSTEM_INSTRUCTIONS}

KNOWLEDGE BASE (access rules):
${buildCatalogKB()}

${live || 'LIVE TICKET ACTIVITY: none recorded yet.'}`

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() })
  try {
    const resp = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system,
      messages: clean,
    })
    const reply = (resp.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim()
    return { reply }
  } catch (e) {
    throw new HttpsError('internal', 'The assistant is temporarily unavailable.')
  }
})
