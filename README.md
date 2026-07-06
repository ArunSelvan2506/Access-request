# Access Service Desk

A Jira Service Management–style **access-request ticketing tool**, built with React + Vite.
Staff raise access requests against a service catalog; the app validates them on submission,
auto-rejects incomplete requests, routes for line-manager approval, tracks SLA timers live,
and gives admins an audit trail, a Kanban board and reports.

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
  config.js             Build-time backend flag (local | api) and public config
  styles.css            All styles

  data/
    catalog.js          Service catalog: apps, required fields, routing, validators
    jira.js             Priority → SLA map and workflow helpers
    seed.js             Demo tickets used on first run (local mode)
    rules.js            Automation rules shown on the Automations screen
    ticketOps.js        Pure ticket lifecycle ops (create/transition/approve/assign/comment)
    logos.js            App logos for the catalog

  auth/
    session.js          Roles (owner/admin/user), owner list, display names

  hooks/
    useTicketStore.js   Picks the store from the backend flag (local vs api)
    useTickets.js       Local store: localStorage persistence + create/transition
    useApiTickets.js    API store: reads/writes tickets via the server
    useSession.js       Sign-in state (Google SSO or shared-password gate)
    usePresence.js      Presence heartbeat (api mode)
    useNow.js           Ticking clock that refreshes SLA timers (30s)

  api/                  Thin client wrappers over the server endpoints
    client.js  ai.js  auth.js  notify.js  presence.js

  utils/
    sla.js              SLA state computation (ok / warn / breach) + expiry
    validation.js       Pure validation engine for the create form
    format.js           timeAgo, status classes, workflow transition map
    mentions.js  csv.js  reports.js

  components/
    TopNav.jsx  Sidebar.jsx  GlobalSearch.jsx  HelpPanel.jsx  SignIn.jsx
    Dashboard.jsx  Queue.jsx  Board.jsx  Automations.jsx  Catalog.jsx  Reports.jsx
    OwnerPortal.jsx  AdminSettings.jsx
    CreateModal.jsx       Create form + dynamic fields + validation
    TicketDrawer.jsx      Ticket detail + workflow transitions + activity
    common/
      Badges.jsx          AppCell, StatusPill, SlaCell
      MentionInput.jsx    @mention-aware comment box
      Toast.jsx           Toast provider + useToast() hook

server/                 Optional Express + Amazon DynamoDB API (see server/README.md)
```

## Where to add logic

- **New application or changed rules** → edit `src/data/catalog.js`. The catalog drives the
  create form, the catalog screen, and the validation engine.
- **Validation behavior** → `src/utils/validation.js` (pure function, easy to test).
- **Ticket lifecycle** → `src/data/ticketOps.js` (pure ops, shared by both stores).
- **Persistence** → `src/hooks/useTickets.js` (local) / `src/hooks/useApiTickets.js` (api).
- **Priority → SLA** → `PRIORITY_SLA` in `src/data/jira.js`.
- **Workflow transitions** → `src/utils/format.js` (`TRANSITIONS`).
- **Automation rules (display)** → `src/data/rules.js`.

## Deployment (GitHub Pages)

The app deploys automatically to GitHub Pages via `.github/workflows/deploy.yml`
on every push to `main`. It serves from the default Pages URL:

```
https://your-org.github.io/access-request/
```

**One-time setup (repo owner):**

1. **Enable Pages** — repo *Settings → Pages → Build and deployment → Source:
   **GitHub Actions***.
2. **Merge to `main`** — the deploy workflow runs on pushes to `main`. Merge this
   branch in and the first deploy starts (watch it under the *Actions* tab).

Asset paths are relative (`base: './'` in `vite.config.js`), so the build works
at the project sub-path above. A custom domain can be added later by setting one
in *Settings → Pages* and committing a matching `public/CNAME` file.

## Backends: local vs api

The app runs in one of two modes, chosen at build time by `VITE_BACKEND`:

| | **local** (default) | **api** |
| --- | --- | --- |
| Tickets | per-browser `localStorage` | shared, in **Amazon DynamoDB** |
| Sign-in | shared-password gate | Google SSO (`@fuseenergy.com`), password fallback |
| Notifications | none | Slack on create · SES email on @mention / assignment |
| AI triage | off | Claude, server-side |
| Presence & login history | this browser only | org-wide, from the server |

**Local mode** is the current static GitHub Pages site and needs no setup —
sign in by email, tickets persist in the browser's `localStorage`.

**API mode** turns it into a shared, company-wide service desk. All the
server-backed features (shared data, Google SSO, email, Slack, AI triage,
presence) degrade gracefully in local mode and activate once the API server is
deployed and the site points at it — there is no separate code path to enable.

### Roles

Sign in with a `@fuseenergy.com` email; your role is derived from it (see
`src/auth/session.js`):

| Role | Who | Can |
| --- | --- | --- |
| **Owner** | `VITE_OWNER_EMAILS` (build-time config) | Everything + audit log, presence, routing, manage admins |
| **Administrator** | emails an owner adds | See all requests, assign, action, approve, automations |
| **Requester** | everyone else | Submit requests and track only their own |

> Owner emails are **not** hardcoded — set `VITE_OWNER_EMAILS` (comma-separated)
> as an Actions Variable so no personal address is committed to source. It
> defaults to a generic `owner@fuseenergy.com` mailbox.

> ⚠️ In **local** mode roles are enforced in the browser — fine for a demo, not
> real security. In **api** mode the server verifies the Google ID token and the
> email domain on sign-in.

## API server

The optional backend lives in `server/` — an Express app that stores tickets in
Amazon DynamoDB and hosts the AI triage, email (SES), Slack and Google SSO
endpoints. It's designed to run on AWS (App Runner or ECS Fargate) using an IAM
role, so no AWS keys live in code or env. See **[server/README.md](server/README.md)**
for the data model, local run instructions and the AWS deploy steps.

To point the web app at it, set these repo **Actions → Variables**:

```
VITE_BACKEND=api
VITE_API_BASE=https://<your-api-url>
VITE_GOOGLE_CLIENT_ID=<oauth-client-id>   # optional, enables Google SSO
```
