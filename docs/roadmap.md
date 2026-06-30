# Access Service Desk — Roadmap to Best-in-Class

Target: a best-in-class access-request system for an organisation of ~600 people.
Legend: ✅ built · 🟡 client-side demo (needs backend to be real) · 🔶 needs backend · 🧩 needs integration/3rd-party

## Where we are today
- ✅ Service catalog (26 apps), per-app dynamic forms, validation + auto-reject
- ✅ SLA timers, board, queues, dashboard, UK-time dates
- ✅ Urgency, pending reasons, app icons
- 🟡 Roles (owner / admin / requester) and login — enforced in the browser
- 🔶 AI assistant + auto-grounding (scaffolded, parked)
- 🔶 Slack notifications (scaffolded, parked)

## 1. Foundation — non-negotiable for 600 people  🔶
- **Backend** (Firebase): shared data, real **SSO** (Google, locked to the company), server-enforced **RBAC**
- **Audit log**: immutable who-did-what-when on every request and approval (compliance)
- **Email + Slack notifications** on create / approval / status change

## 2. Governance & approvals — what an org this size needs  🔶
- **Multi-step approval workflows** per application (e.g. manager → security; Finance gate for JetBrains; line-manager approval for Social Media)
- **Time-bound access** — request for N days, auto-expiry + renewal reminders
- **Access recertification** — periodic (e.g. quarterly) reviews where owners re-attest who still needs access (SOC 2 / ISO 27001)
- **Segregation-of-duties / policy checks** — block conflicting access combinations

## 3. Actually grant the access — the real differentiator  🧩
Move from *tracking* to *provisioning* (auto-grant and auto-revoke):
- **Google Workspace** group membership
- **GitHub org** invites / team membership
- **AWS IAM** roles, **Okta / Microsoft Entra ID** via **SCIM**
- **Joiner / mover / leaver** sync from the identity provider / HR system

## 4. Operations & insight  🔶
- **Reporting dashboards**: SLA attainment, request volumes, top apps, rejection reasons, mean time to resolve
- **Assignment rules / queues** per team, round-robin to agents
- **Business-hours SLA calendars** + breach **escalations**
- **Saved views**, full-text search, CSV export

## 5. Requester & approver experience
- **Request on behalf of / bulk onboarding** for new starters (managers)  🔶
- **Duplicate detection** — "you already have this / a request is pending"  🔶
- **My approvals queue** + notification centre  🔶
- **Knowledge base / help articles** embedded in the portal  ✅(easy)
- **Self-service catalog admin UI** — add/edit applications without code  🔶

## 6. AI
- **AI assistant** grounded in catalog + live tickets (scaffolded)  🔶
- **AI triage**: suggest the right approver, flag unusual/risky requests, summarise long requests  🔶

## 7. Security & compliance
- **Data sensitivity tiers** per app (e.g. Bitwarden vaults), evidence retention
- **Audit export** for SOC 2 / ISO 27001 / UK GDPR
- **2FA / step-up** for sensitive approvals (via the IdP)

## Recommended sequence
1. **Backend foundation** (auth + shared data + audit) — everything else depends on it.
2. **Approvals + notifications** (Slack/email) — immediate day-to-day value.
3. **Provisioning integrations** — the leap from "ticket tracker" to "access platform".
4. **Recertification + reporting** — compliance and insight.
5. **AI triage** — efficiency on top of a working platform.
