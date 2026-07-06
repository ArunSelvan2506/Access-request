# Backend Access Checklist (for IT)

Everything needed to turn the Access Service Desk web tool from a static demo
into a real backend-powered tool (secure login + shared data, plus email, Slack
and AI triage). The frontend stays on GitHub Pages; the backend is the Express +
**Amazon DynamoDB** API in `server/`, deployed on AWS. See `server/README.md`
for the step-by-step deploy.

## 0. Decisions to confirm first
- **Login method:** Google SSO (recommended, locked to `@fuseenergy.com`) **or** the shared-password gate.
- **Allowed email domain:** `fuseenergy.com`.
- **AWS region:** e.g. `eu-west-2` (London) — used for DynamoDB and SES.

## 1. AWS account & compute
- An **AWS account** (or a dedicated sub-account for this tool).
- A place to run the container: **AWS App Runner** (simplest) or **ECS Fargate**.
  Point it at the `server/` `Dockerfile`; the service listens on **port 8787**.
- Cost for an internal tool is minimal — DynamoDB on-demand + one small container.

## 2. Access to grant the person setting it up (me/you)
- Permission to create the App Runner/ECS service, a **DynamoDB table**, an
  **IAM role**, and to read the relevant **Secrets Manager / SSM** secrets.
  A dedicated account/project where you have admin avoids touching anything else.

## 3. AWS resources to create
- **DynamoDB table** (default `access_desk_tickets`, on-demand billing). The app
  auto-creates it on first run if its IAM role allows `CreateTable`; otherwise
  create it with partition key `key` (string) and set `DDB_AUTOCREATE=false`.
- **Instance IAM role** for the service granting, on that table:
  `dynamodb:GetItem, PutItem, Scan, DescribeTable` (+ `CreateTable` if auto-creating).
  Credentials come from this role — **no AWS keys live in code or env**.

## 4. Config to hand over (NOT secret — safe to share)
Set these as the GitHub repo's Actions **Variables** so the site points at the API:
- `VITE_BACKEND=api`
- `VITE_API_BASE=https://<your-app-runner-url>`
- `VITE_GOOGLE_CLIENT_ID=<oauth-client-id>` (only if using Google SSO)
- `VITE_OWNER_EMAILS=<comma-separated owner emails>`

## 5. For Google SSO — Google Cloud / Workspace
- Google Cloud console → **APIs & Services → Credentials → Create OAuth client ID
  → Web application**. Add your site origin to **Authorized JavaScript origins**
  (e.g. `https://your-org.github.io`).
- Copy the **Client ID** (no client secret needed) into **both** the server env
  `GOOGLE_CLIENT_ID` and the web build var `VITE_GOOGLE_CLIENT_ID`.
- If under the company Workspace org, set the **OAuth consent screen to
  "Internal"** so only `@fuseenergy.com` accounts can sign in (may need a
  **Google Workspace admin**).

## 6. For the AI triage assistant
- An **Anthropic API key** (company account) — this **is secret**; store it in
  **AWS Secrets Manager / SSM** and inject as the service env `ANTHROPIC_API_KEY`,
  never in the repo or chat.

## 6b. For email notifications (Amazon SES)
- A **verified SES sender** address; set it as the server env `SES_FROM` and give
  the instance role `ses:SendEmail`. Without it, mention/assignment emails
  self-disable and the UI just skips the email.

## 6c. For Slack notifications
- A **Slack Incoming Webhook URL** for the target channel (e.g. `#access-request`).
  Created via a Slack app → Incoming Webhooks (may need a **Slack workspace admin**).
- The webhook URL **is secret** → store it in Secrets Manager / SSM and inject as
  the server env `SLACK_WEBHOOK_URL` (never in the repo/chat).
- Posts a card to Slack when a ticket is created (Jira-style).

## 7. GitHub (already in place)
- Repo: `your-org/access-request`.
- Ability to set **Actions → Variables/Secrets** and **CORS_ORIGIN** on the
  server to the site origin (e.g. `https://your-org.github.io`).

---

## Who does what
| Step | Who |
| --- | --- |
| Create AWS account/service, DynamoDB table, IAM role | IT / you |
| Deploy the `server/` container (App Runner / ECS) | IT / you |
| OAuth client ID + consent = Internal (Google SSO) | Google Workspace admin |
| Set Actions Variables to point the site at the API | you → me |
| Store `ANTHROPIC_API_KEY` / `SLACK_WEBHOOK_URL` as secrets | you / me with access |

## Minimum to start (login + shared data)
Steps **1–4** only. Email, Slack and AI (steps 6–6c) can come later — they don't
block secure login and shared tickets, and each self-disables until configured.
