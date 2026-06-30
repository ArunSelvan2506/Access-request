# Access Service Desk

A Jira Service Management–style **access-request ticketing tool**, built with React + Vite.
Staff raise access requests against a service catalog; the app validates them on submission,
auto-rejects incomplete requests, tracks SLA timers live, and offers an AI assistant grounded
in the catalog rules.

This is a React port of the original single-file HTML prototype, decomposed into small,
focused components so the business logic is easy to extend.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build into dist/
npm run preview  # preview the production build
```

## Project structure

```
src/
  main.jsx              App entry
  App.jsx               Layout + view routing + shared state wiring
  styles.css            All styles (ported from the prototype)

  data/
    catalog.js          Service catalog: apps, required fields, SLAs, routing, validators
    seed.js             Demo tickets used on first run
    rules.js            Automation rules shown on the Automations screen

  hooks/
    useTickets.js       Ticket store: localStorage persistence + create/transition
    useNow.js           Ticking clock that refreshes SLA timers (30s)

  utils/
    sla.js              SLA state computation (ok / warn / breach)
    validation.js       Pure validation engine for the create form
    format.js           timeAgo, status classes, workflow transition map

  components/
    TopNav.jsx  Sidebar.jsx
    Dashboard.jsx  Queue.jsx  Board.jsx  Automations.jsx  Catalog.jsx
    CreateModal.jsx       Create form + dynamic fields + validation
    TicketDrawer.jsx      Ticket detail + workflow transitions + activity
    Chatbot.jsx           AI assistant (Access Assistant)
    common/
      Badges.jsx          AppCell, StatusPill, SlaCell
      Toast.jsx           Toast provider + useToast() hook
```

## Where to add logic

- **New application or changed rules** → edit `src/data/catalog.js`. The catalog drives the
  create form, the catalog screen, the validation engine and the AI knowledge base.
- **Validation behavior** → `src/utils/validation.js` (pure function, easy to test).
- **Ticket lifecycle / persistence** → `src/hooks/useTickets.js`.
- **Workflow transitions** → `src/utils/format.js` (`TRANSITIONS`).
- **Automation rules** → `src/data/rules.js`.

## Deployment (GitHub Pages + custom domain)

The app deploys automatically to GitHub Pages via `.github/workflows/deploy.yml`
on every push to `main`. The production domain is **accessrequest.fuseenergy.com**
(set in `public/CNAME`).

**One-time setup (repo owner):**

1. **Enable Pages** — repo *Settings → Pages → Build and deployment → Source:
   **GitHub Actions***.
2. **Merge to `main`** — the deploy workflow runs on pushes to `main`. Merge this
   branch in and the first deploy starts (watch it under the *Actions* tab).
3. **Add the DNS record** at the registrar that manages `fuseenergy.com`:

   | Type  | Host / Name      | Value                       |
   | ----- | ---------------- | --------------------------- |
   | CNAME | `accessrequest`  | `arunselvan2506.github.io.` |

   (For an apex/root domain you'd use A records instead; a subdomain like this
   one uses a single CNAME.)
4. **Set the custom domain** — repo *Settings → Pages → Custom domain* →
   `accessrequest.fuseenergy.com` → **Save**, then tick **Enforce HTTPS** once the
   certificate is issued (can take a few minutes after DNS propagates).

The `CNAME` file is committed so GitHub keeps the custom domain across deploys.
Asset paths are relative (`base: './'` in `vite.config.js`), so the build also
works at the default `…/access-request/` Pages URL before DNS is live.

## Backends: local vs Firebase

The app runs in one of two modes, chosen at build time by `VITE_BACKEND`:

| | **local** (default) | **firebase** |
| --- | --- | --- |
| Tickets | per-browser `localStorage` | shared Firestore, realtime |
| Login | none | Google SSO, `@fuseenergy.com` only |
| AI assistant | optional self-hosted proxy | Cloud Function with live grounding |
| Daily maintenance | none | none — self-updating |

Local mode is the current static GitHub Pages site and needs no setup. Firebase
mode turns it into a real, company-wide Jira-style service desk.

### How the AI grounding stays current (no daily code edits)

The assistant is grounded in two things: the **catalog rules** (synced from the
Notion page) and a **live ticket-activity summary** that is regenerated
automatically on every ticket create and status change:

```
ticket created / moved to Done|Rejected
        │  (Firestore trigger: functions/onTicketWritten)
        ▼
buildGrounding(all tickets)  →  meta/grounding  (open counts, top reject
        │                        reasons, avg resolution time, per-app stats)
        ▼
chat() Cloud Function reads meta/grounding + catalog rules → Claude
```

Nobody edits code day-to-day. Policy changes happen in Notion → `catalog.js`;
everything else updates itself from ticket activity.

### Turning on Firebase mode

**One-time (you):**

1. **Create a Firebase project** (console.firebase.google.com), add a Web app,
   and enable **Authentication → Google** + **Firestore**.
2. **Set the build config** — put the `VITE_FIREBASE_*` values from the Firebase
   SDK config (see `.env.example`) into the repo's **Actions → Variables**, and
   set `VITE_BACKEND=firebase`.
3. **Deploy rules + functions** (needs the [Firebase CLI](https://firebase.google.com/docs/cli)):
   ```bash
   npm --prefix functions install
   firebase use <your-project-id>          # or edit .firebaserc
   firebase functions:secrets:set ANTHROPIC_API_KEY   # paste the company key
   firebase deploy --only firestore:rules,functions
   ```
4. **Authorize the domain** — Firebase console → Authentication → Settings →
   Authorized domains → add `accessrequest.fuseenergy.com`.

Hosting stays on GitHub Pages; only the database, auth and functions live in
Firebase. Until step 2 is done, the site keeps running in local mode unchanged.

## AI assistant

`Chatbot.jsx` posts to an endpoint defined by `VITE_CHAT_ENDPOINT`. The browser must **not**
hold an API key, so point this at your own backend proxy that forwards to the Claude API and
returns the response. Without an endpoint configured, the assistant falls back to a friendly
"can't reach the service" message.

```bash
# .env.local
VITE_CHAT_ENDPOINT=https://your-backend.example.com/chat
```
