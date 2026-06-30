# Backend Access Checklist (for IT)

Everything needed to turn the Access Service Desk web tool from a static demo
into a real backend-powered tool (secure login + shared data, and the AI
assistant later). Frontend stays on GitHub Pages; the backend is **Firebase**.

## 0. Decisions to confirm first
- **Login method:** Google SSO (recommended, locked to `@fuseenergy.com`) **or** email + password.
- **Allowed email domain:** `fuseenergy.com`.
- **Firestore region:** e.g. `europe-west2` (London) — pick once, can't change later.

## 1. Firebase project
- A **Firebase project** — new (e.g. `access-service-desk`) or an existing one.
- On the **Blaze (pay-as-you-go) plan** — needed for Cloud Functions / the AI.
  (Usage for an internal tool is a few cents; free allowances still apply.)

## 2. Access to grant the person setting it up (me/you)
- **Owner** or **Editor** role on that Firebase / Google Cloud project
  (simplest). A dedicated project where you're Owner avoids touching anything else.

## 3. Firebase services to enable (in the console)
- **Authentication** → enable the chosen provider (Google and/or Email/Password).
  - Add **authorized domain:** `arunselvan2506.github.io`.
- **Cloud Firestore** → create database (production mode), chosen region.
- **Cloud Functions** (for the AI proxy + auto-grounding) — enabling these turns
  on the underlying Google Cloud APIs automatically: Cloud Functions, Cloud Build,
  Artifact Registry, Cloud Run, Eventarc, **Secret Manager**, Pub/Sub.

## 4. Config to hand over (NOT secret — safe to share)
From Project settings → Your apps → Web app → SDK config, the 6 values:
`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`.
→ These go into the GitHub repo's Actions **Variables**.

## 5. For Google SSO only — Google Workspace
- If the project is under the company Google Workspace org, set the **OAuth
  consent screen to "Internal"** so only `@fuseenergy.com` accounts can sign in.
  (May need a **Google Workspace admin**.)

## 6. For the AI assistant (later)
- An **Anthropic API key** (company account) — this **is secret**; it's stored
  via the Firebase CLI in **Secret Manager**, never in the repo or chat.
- Blaze plan (already covered above) so Functions can call the Anthropic API.

## 7. GitHub (already in place)
- Repo: `arunselvan2506/Access-request` (you own it).
- Ability to set **Actions → Variables/Secrets** (you have it).

## 8. Optional — auto-deploy the backend from GitHub Actions
Only if you want functions/rules to deploy automatically on push. Needs a Google
**service account** key (stored as a GitHub secret) with roles:
`Firebase Admin`, `Cloud Functions Admin`, `Cloud Datastore Owner`,
`Firebase Rules Admin`, `Service Account User`, `Artifact Registry Writer`,
`Cloud Build Editor`, `Secret Manager Admin`.
(Not required to start — first deploy can be done manually with the Firebase CLI.)

---

## Who does what
| Step | Who |
| --- | --- |
| Create Firebase project, set Blaze, grant access | IT / you |
| Enable Auth + Firestore + Functions | IT / you |
| OAuth consent = Internal (Google SSO) | Google Workspace admin |
| Provide the 6 web-config values | you → me |
| Wire the app to Firebase (code) | me |
| Set Anthropic key as a secret (AI phase) | you (CLI) / me with access |

## Minimum to start (login + shared data)
Steps **1–4** only. The AI (steps 6) can come later — it doesn't block secure
login and shared tickets.
