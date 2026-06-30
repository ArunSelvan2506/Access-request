import { isFirebase } from './config'

// Static-build fallback endpoint (a backend proxy you host yourself).
const CHAT_ENDPOINT = import.meta.env.VITE_CHAT_ENDPOINT || ''

// Ask the Access Assistant. In Firebase mode this calls the `chat` Cloud
// Function, which holds the Anthropic key server-side AND injects the live,
// auto-generated grounding doc (catalog rules + current ticket activity). The
// client never sends a system prompt or a key — the server owns both.
//
// `messages` is [{ role: 'user' | 'assistant', content }].
// Returns the assistant's reply text. Throws if no backend is configured.
export async function askAssistant(messages) {
  if (isFirebase) {
    const { httpsCallable } = await import('firebase/functions')
    const { functions } = await import('./firebase')
    const chat = httpsCallable(functions(), 'chat')
    const res = await chat({ messages })
    return res.data?.reply || ''
  }

  if (!CHAT_ENDPOINT) {
    throw new Error('No chat backend configured')
  }
  const res = await fetch(CHAT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })
  const data = await res.json()
  return (
    (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim() ||
    data.reply ||
    data.text ||
    ''
  )
}
