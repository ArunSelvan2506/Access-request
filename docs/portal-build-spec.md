# Access Request Portal — Build Spec

How to (re)configure the Jira Service Management portal (project **AR1**) so it
matches the Access Service Desk web tool. Everything here is configured in the
**Jira/JSM admin UI** (Project settings → Request types / Fields / Workflows /
SLAs / Automation) — it cannot be created through the Jira API.

> Source of truth for fields, SLAs and reject triggers: the web tool catalog
> (`src/data/catalog.js`) + the Notion "Access Request — Field Validation
> Requirements by Application" page.

## 1. Portal setup
- **Name:** Access Service Desk
- **Intro:** "Request access to company applications. Pick the application below,
  fill in the required fields, and submit. Incomplete requests are auto-rejected."
- **Two request-type groups:** `IT-managed — raise a request` and
  `Not IT-managed` (the second is portal info/articles, **not** request types).

## 2. Roles
| Role | Jira mapping | Can |
| --- | --- | --- |
| Primary owner (you) | Project admin | Everything + manage agents |
| Administrators | JSM agents | See all requests, transition status, set pending reason |
| Requesters | JSM customers | Submit and see only their own requests |

## 3. Custom fields to create
- **Application name** — single select
- **GitHub username** — short text (+ validation: real handle, contains the person's name)
- **Urgency** — select: Critical / High / Medium / Low
- **Pending reason** — select: More info required / Awaiting approval / Waiting on vendor / Pending on change request
- **Linear ticket reference** — short text
- **Access type** — select: Standard Claude / Claude Code (devs & quants only)
- Plus per-request-type: Finance approval reference, Licence type, Exact vault/collection name,
  Exact Shared Drive name, Group name, Region, etc.

## 4. IT-managed request types (one per application)
| Application | SLA | Required fields | Auto-reject trigger |
|---|---|---|---|
| GitHub | 8h | GitHub username (valid, contains your name); Business justification | Invalid / unidentifiable username |
| AWS | 8h | Specific resource/permission; Issue description; Region (default eu-west-2); Screenshot attached (Yes/No); Business justification | Missing resource detail or screenshot |
| Datadog | 8h | Permission level; Business justification; Linear ticket | Missing justification |
| Metabase | 8h | Table/dashboard/dataset name; Business justification | Missing table name |
| Claude | 8h | Linear ticket; Access type; Business justification | Missing Linear ticket |
| Cursor | 8h | Linear ticket; Business justification | Missing Linear ticket |
| ChatGPT | 8h | Description of the issue | Raised without a real issue |
| GeminiAI | 8h | Business justification | Missing justification |
| Bitwarden | 8h | Exact vault/collection name; Business justification | Missing vault name |
| Microsoft | 16h | Why Google Workspace is insufficient; Product & access level | Weak/missing justification |
| Google Shared Drive | 8h | Exact Shared Drive name; Business justification | Missing drive name |
| Google Voice | 16h | Business use case; Duration | Missing duration |
| Google Groups | 8h | Group name; Confirmed not already a member | Already a member |
| Google Account Reset / 2FA | 4h | Type of issue; Affected account email | Missing account details |
| JetBrains | 24h | Finance approval reference; Licence type | Missing Finance approval |
| Social Media | 16h | Business reason; Line manager approval | Missing manager approval |

## 5. Not IT-managed (portal info, not request types — route elsewhere)
| Application | How to request |
|---|---|
| Backoffice | Post in #access-request, tag @ops-permission-managers |
| Navan | Contact the Finance team |
| GES / ECOES | Post in #access-request, include your email |
| TMA | Post in #access-request, tag @installs-third-liners (background check) |
| Figma | Contact the Design team |
| Adobe | Contact the Design team |
| Docusign | Contact the Legal / Compliance team |
| LinkedIn Premium | Contact the People team |
| Deliveroo | Contact the People team |
| Devbox | Post in #access-request, tag the platform team |

## 6. Workflow / statuses
`Open → In Progress → Waiting (set Pending reason) → Done`, plus **Rejected**
(add this status — the default JSM workflow only has Cancelled).

Transitions:
- Open → In Progress, Rejected
- In Progress → Waiting, Done, Rejected
- Waiting → In Progress, Done
- Done → In Progress
- Rejected → Open

## 7. Automation rules (Project settings → Automation)
1. **Auto-reject incomplete** — on create, if any required field for the chosen
   Application is empty/invalid → transition to Rejected with the catalog reason.
2. **Route non-IT applications** — block the 10 non-IT apps; reply with the
   correct Slack/contact channel.
3. **SLA breach escalation** — at 75% of SLA flag "at risk"; on breach raise
   priority + notify @ops-permission-managers.
4. **Require Linear (AI tools)** — Cursor & Claude without a valid Linear ref →
   reject; Claude Code also requires Access type = developer/quant.
5. **Finance gate — JetBrains** — no Finance approval reference → reject.
6. **AWS screenshot reminder** (optional) — if an AWS request has no screenshot,
   comment to ask before rejecting.

---
Tracked in Jira as **AR1-7**. Demo tickets that mirror these request types are
tagged `acc-tool-demo` in the AR1 project.
