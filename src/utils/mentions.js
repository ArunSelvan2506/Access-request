// Mentions are written into comment text as "@email" tokens — unambiguous to
// parse and to map back to a person. The UI renders them as "@Display Name".
export const MENTION_EMAIL_RE = /@([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g

// Pull the unique mentioned emails out of a comment. If `validEmails` is given,
// only those are returned (so you can't email arbitrary addresses).
export function extractMentions(text, validEmails) {
  const allow = validEmails ? new Set(validEmails.map((e) => e.toLowerCase())) : null
  const found = new Set()
  let m
  MENTION_EMAIL_RE.lastIndex = 0
  while ((m = MENTION_EMAIL_RE.exec(text || '')) !== null) {
    const e = m[1].toLowerCase()
    if (!allow || allow.has(e)) found.add(e)
  }
  return [...found]
}
