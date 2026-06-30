import { useState, useRef } from 'react'
import { MENTION_EMAIL_RE } from '../../utils/mentions'

// The "@word" currently being typed immediately before the caret.
const TYPING_RE = /@([\w.+-]*)$/

// A single-line text input with @mention autocomplete. Selecting a person
// inserts their "@email" token; matching is by name or email.
export function MentionInput({ value, onChange, people = [], placeholder, onEnter, style }) {
  const ref = useRef(null)
  const [open, setOpen] = useState(false)
  const [matches, setMatches] = useState([])
  const [active, setActive] = useState(0)

  const recompute = (val, caret) => {
    const m = val.slice(0, caret).match(TYPING_RE)
    if (!m) return setOpen(false)
    const q = m[1].toLowerCase()
    const found = people
      .filter((p) => p.email.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
      .slice(0, 6)
    setMatches(found)
    setActive(0)
    setOpen(found.length > 0)
  }

  const handleChange = (e) => {
    onChange(e.target.value)
    recompute(e.target.value, e.target.selectionStart)
  }

  const insert = (person) => {
    const el = ref.current
    const caret = el ? el.selectionStart : value.length
    const before = value.slice(0, caret).replace(TYPING_RE, '@' + person.email + ' ')
    const next = before + value.slice(caret)
    onChange(next)
    setOpen(false)
    requestAnimationFrame(() => {
      if (el) { el.focus(); el.setSelectionRange(before.length, before.length) }
    })
  }

  const handleKey = (e) => {
    if (open && matches.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); return setActive((a) => (a + 1) % matches.length) }
      if (e.key === 'ArrowUp') { e.preventDefault(); return setActive((a) => (a - 1 + matches.length) % matches.length) }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); return insert(matches[active]) }
      if (e.key === 'Escape') { return setOpen(false) }
    }
    if (e.key === 'Enter' && onEnter) onEnter()
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={ref}
        value={value}
        placeholder={placeholder}
        onChange={handleChange}
        onKeyDown={handleKey}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={style}
      />
      {open && (
        <div className="mention-pop">
          {matches.map((p, i) => (
            <div
              key={p.email}
              className={'mention-opt' + (i === active ? ' active' : '')}
              onMouseDown={(e) => { e.preventDefault(); insert(p) }}
            >
              <span className="mention-name">{p.name}</span>
              <span className="mention-email">{p.email}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Render comment text with "@email" tokens shown as highlighted "@Name" chips.
export function renderMentions(text, nameOf) {
  const out = []
  let last = 0
  let m
  MENTION_EMAIL_RE.lastIndex = 0
  while ((m = MENTION_EMAIL_RE.exec(text || '')) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(
      <span className="mention" key={m.index}>
        @{nameOf ? nameOf(m[1]) : m[1]}
      </span>
    )
    last = m.index + m[0].length
  }
  if (last < (text || '').length) out.push(text.slice(last))
  return out
}
