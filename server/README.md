# Access Service Desk — API (Express + DynamoDB on AWS)

A small Express server that stores tickets in **Amazon DynamoDB** and hosts the
optional **AI triage** endpoint. Designed to run on AWS (App Runner or ECS
Fargate) using an **IAM role** for both DynamoDB and credentials — no AWS keys
live in the code or environment.

> Why a server at all? The Anthropic key is a secret and can't live in a static
> page, and the browser shouldn't talk to DynamoDB directly. This thin API holds
> the secret(s) and exposes read/write endpoints. It's intentionally minimal.

## Data model
One DynamoDB table (default `access_desk_tickets`):
- Partition key **`key`** (string) — the `ACC-###` ticket key.
- Attributes: `num` (number), `updated_at` (number), `data` (the full ticket).

Billing mode is on-demand (PAY_PER_REQUEST) — no capacity to manage. The app
will auto-create the table on first run if its IAM role allows `CreateTable`;
otherwise have your infra team create it and set `DDB_AUTOCREATE=false`.

## Run locally
Against **DynamoDB Local** (no AWS account needed):
```bash
# 1. start DynamoDB Local (Docker)
docker run -p 8000:8000 amazon/dynamodb-local

# 2. start the API
cd server
npm install
DDB_ENDPOINT=http://localhost:8000 AWS_REGION=eu-west-2 \
  AWS_ACCESS_KEY_ID=local AWS_SECRET_ACCESS_KEY=local npm start
```
To test AI triage locally, also pass `ANTHROPIC_API_KEY=sk-ant-...` on that line.

Point the web app at it (repo root `.env.local`):
```
VITE_BACKEND=api
VITE_API_BASE=http://localhost:8787
npm run dev
```

## Deploy to AWS App Runner (recommended)
App Runner builds the included `Dockerfile` and gives you an HTTPS URL.
1. Push the image to **ECR**, or point App Runner at this repo (root dir `server`).
2. Create the service; container **port 8787**.
3. **Instance role** (IAM): allow DynamoDB on the table, e.g.
   `dynamodb:GetItem,PutItem,Scan,DescribeTable` (+ `CreateTable` if auto-creating).
4. **Env vars / secrets** on the service:
   - `ANTHROPIC_API_KEY` → from **AWS Secrets Manager / SSM** (not plaintext)
   - `CORS_ORIGIN=https://arunselvan2506.github.io`
   - `DDB_TABLE=access_desk_tickets` (optional)
   - `API_KEY=<long random>` (optional shared-key deterrent)
5. The service URL (e.g. `https://xxxx.eu-west-2.awsapprunner.com`) becomes the
   site's `VITE_API_BASE`.

> ECS Fargate works the same way (task role for DynamoDB + secrets, ALB on 8787).

## Point the deployed web app at it
In the GitHub repo **Actions → Variables**:
- `VITE_BACKEND=api`
- `VITE_API_BASE=https://<your-app-runner-url>`
- `VITE_API_KEY=<same as server API_KEY>` (only if you set `API_KEY`)

Redeploy and the site reads/writes shared tickets from DynamoDB.

## Endpoints
- `GET /health`
- `GET /api/tickets` → all tickets (newest first)
- `POST /api/tickets` → create (body = full ticket)
- `PUT /api/tickets/:key` → replace a ticket
- `GET /api/ai/status` → `{ enabled, model }`
- `POST /api/ai/triage` → AI triage for one ticket (admin-facing, advisory)
- `GET /api/notify/status` → `{ enabled }` (email configured?)
- `POST /api/notify/mention` → email the people tagged in a comment (Amazon SES)

## Mention emails (Amazon SES)
Tagging a person in a comment (`@name`) emails them. Set `SES_FROM` to a
**verified SES sender** and give the instance role `ses:SendEmail`. Internal
notes only notify the admin team, never the requester. Without `SES_FROM` the
feature self-disables and comments still post normally.

## Honest limits (for now)
- `API_KEY` is a deterrent, not real per-user auth — anyone with the key + URL
  can read/write. Real Google SSO + per-user roles is the later upgrade.
- Business logic (validation, approvals, SLA) runs in the browser; the server is
  a JSON document store plus the AI endpoint. Fine for a shared deployment; move
  logic server-side to harden it.
