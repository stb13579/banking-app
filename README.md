# banking-app — API Gateway

Node.js 20 / Express 4 API gateway for the mock consumer banking application. Handles authentication middleware, request routing, and proxying to downstream microservices.

---

## Architecture

```
Client
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
| `banking-app-products` | Java/Spring Boot | 8003 |
| `banking-app-support` | Node.js/Express | 8004 |

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
| `GET` | `/debug/config` | Debug info |
| `POST` | `/auth/register` | Register a user |
| `POST` | `/auth/login` | Login — returns JWT |
| `POST` | `/auth/refresh` | Refresh access token |

### Authenticated routes (Bearer JWT required)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/auth/me` | Current user profile |
| `GET` | `/accounts` | List accounts |
| `POST` | `/accounts` | Open new account |
| `GET` | `/accounts/:id` | Get account |
| `GET` | `/accounts/:id/transactions` | Transaction history |
| `POST` | `/transfers` | Transfer funds |
| `GET` | `/products` | Product catalog |
| `POST` | `/products/credit-card/apply` | Apply for credit card |
| `POST` | `/products/loan/apply` | Apply for loan |
| `GET` | `/applications/:id` | Get application |
| `POST` | `/tickets` | Open support ticket |
| `GET` | `/tickets` | List tickets |
| `GET` | `/tickets/:id` | Get ticket |
| `POST` | `/tickets/:id/messages` | Post message |

---

## curl Walkthrough

### Register

```bash
curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123"}' | jq
```

### Login — capture JWT

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123"}' \
  | jq -r '.access_token')
```

### Create account

```bash
curl -s -X POST http://localhost:3000/accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"checking"}' | jq
```

### Transfer funds

```bash
curl -s -X POST http://localhost:3000/transfers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "from_account_id": "<FROM>",
    "to_account_id": "<TO>",
    "amount": 100.00
  }' | jq
```

---

## Project Structure

```
banking-app/
├── src/
│   ├── index.js              # Express app, middleware, routing
│   ├── middleware/
│   │   ├── auth.js           # JWT middleware
│   │   ├── rateLimiter.js    # Auth route rate limiting
│   │   └── requestId.js      # Correlation ID propagation
│   └── routes/
│       ├── proxy.js          # Proxy routes per downstream service
│       └── debug.js          # /debug/config
├── openapi.yaml              # OpenAPI 3.0 spec
├── Dockerfile
├── docker-compose.yml        # Full-stack compose
└── package.json
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Gateway listen port |
| `NODE_ENV` | `development` | Node environment |
| `JWT_SECRET` | `supersecret123` | JWT signing secret |
| `AUTH_SERVICE_URL` | `http://localhost:8001` | Auth service base URL |
| `CORE_SERVICE_URL` | `http://localhost:8002` | Core banking service base URL |
| `PRODUCTS_SERVICE_URL` | `http://localhost:8003` | Products service base URL |
| `SUPPORT_SERVICE_URL` | `http://localhost:8004` | Support service base URL |
