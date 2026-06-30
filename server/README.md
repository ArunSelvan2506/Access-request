# Access Service Desk — SQLite API (libSQL / Turso)

A tiny Express server that stores tickets in **SQLite** (via libSQL). It's the
"for now" backend that gives the app **shared data** without Firebase.

> Why a server at all? The DB token is a secret and can't live in a static page,
> and browsers can't write to a SQLite file. This thin API holds the token and
> exposes read/write endpoints. It's intentionally minimal.

## Run locally (uses a local file DB — no account needed)
```bash
cd server
npm install
npm start            # -> http://localhost:8787, data in server/access.db
```
Then build the web app pointing at it:
```bash
# from the repo root, in .env.local
VITE_BACKEND=api
VITE_API_BASE=http://localhost:8787
npm run dev
```

## Use Turso (hosted SQLite) for a shared, always-on DB
1. Install the Turso CLI and create a DB:
   ```bash
   turso db create access-desk
   turso db show access-desk --url          # -> TURSO_DATABASE_URL
   turso db tokens create access-desk       # -> TURSO_AUTH_TOKEN
   ```
2. Run the server with those env vars (see `.env.example`), plus:
   - `API_KEY` — a long random string; the client must send it as `x-api-key`.
   - `CORS_ORIGIN` — `https://arunselvan2506.github.io`.
3. Host the server anywhere that runs Node (Render / Railway / Fly.io all have
   free tiers). Set the same env vars there.

## Point the deployed web app at it
In the GitHub repo **Actions → Variables**:
- `VITE_BACKEND=api`
- `VITE_API_BASE=https://<your-server-url>`
- `VITE_API_KEY=<same as server API_KEY>`

Redeploy and the site reads/writes shared tickets from SQLite.

## Deploy

**Fly.io (via GitHub Actions)** — files included: `Dockerfile`, `fly.toml`,
`.github/workflows/deploy-server.yml`.
1. `cd server && flyctl launch --no-deploy` (creates the app; keep/edit the name in `fly.toml`).
2. `flyctl secrets set TURSO_DATABASE_URL=… TURSO_AUTH_TOKEN=… API_KEY=… CORS_ORIGIN=https://arunselvan2506.github.io`
3. Create a deploy token: `flyctl tokens create deploy` → add it as the repo
   secret **FLY_API_TOKEN**.
4. Run the **Deploy API server (Fly.io)** workflow (Actions tab → Run), or push
   a change under `server/` to `main`.

**Render (no Actions)** — `render.yaml` included. In Render: New → Blueprint →
connect this repo; set the Turso/API_KEY env vars in the dashboard. Auto-deploys
on push.

> Use Turso (not the local file) in production — Fly/Render container disks are
> ephemeral, so a `file:` DB resets on redeploy.

## Endpoints
- `GET /health`
- `GET /api/tickets` → all tickets (newest first)
- `POST /api/tickets` → create (body = full ticket)
- `PUT /api/tickets/:key` → replace a ticket

## Honest limits (for now)
- `API_KEY` is a deterrent, not real per-user auth — anyone with the key + URL
  can read/write. Real Google SSO + per-user roles is the later upgrade.
- Business logic (validation, approvals, SLA) runs in the browser; the server is
  a JSON document store. Fine for a shared demo; move logic server-side for a
  hardened deployment.
