# Mini Job Processing Platform

A background job processing API built with NestJS, PostgreSQL, Redis, and BullMQ.

## Stack

- **NestJS** — modular server framework
- **TypeORM** + **PostgreSQL** — persistence
- **BullMQ** + **Redis** — job queue with priority, delay, and retry
- **Passport JWT** — authentication
- **Swagger** — API documentation at `/api`

---

## Setup

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL and Redis)

### 1. Start infrastructure

```bash
docker run -d --name postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mini-job-processing-task \
  -p 5433:5432 postgres:16

docker run -d --name redis -p 6379:6379 redis:7
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env if needed (DB credentials, JWT_SECRET, Redis host/port)
```

### 3. Install dependencies

```bash
npm install
```

### 4. Run migrations

```bash
npm run migration:run
```

### 5. Start the application

```bash
npm run start:dev
```

Swagger UI: http://localhost:4000/api

---

## API Overview

### Auth (public)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register user, returns JWT |
| POST | `/auth/login` | Login, returns JWT |

### Tasks (requires Bearer token)
| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/tasks` | USER, ADMIN | Create task |
| GET | `/tasks` | USER, ADMIN | List tasks (USER: own only) |
| POST | `/tasks/:id/cancel` | USER, ADMIN | Cancel PENDING task |
| POST | `/tasks/:id/reprocess` | ADMIN | Reprocess FAILED task |
| GET | `/tasks/metrics` | ADMIN | Aggregated metrics |

### Query parameters for `GET /tasks`
- `status` — filter by TaskStatus
- `type` — filter by task type (e.g. `email`)
- `from` / `to` — ISO date range on `createdAt`
- `page` / `limit` — pagination (default: page=1, limit=20)

---

## Architecture

```
src/
├── auth/           # JWT strategy, guards, register/login
├── user/           # User entity + service
├── task/           # Task CRUD, cancel, reprocess, metrics
├── queue/          # BullMQ queue module + QueueService
├── worker/         # TaskProcessor (BullMQ consumer)
├── mock/           # MockService: simulates 2–5s work, 25% failure rate
└── database/       # TypeORM DataSource + DatabaseModule
```

### Job lifecycle

```
POST /tasks → DB (PENDING) → BullMQ queue
    ↓
Worker picks up → DB (PROCESSING)
    ↓ success           ↓ failure
DB (COMPLETED)     retry (max 3, exponential backoff 5s)
                        ↓ exhausted
                   DB (FAILED) → dead-letter queue
```

### Priority mapping

| API value | BullMQ priority |
|-----------|----------------|
| `high`    | 1 |
| `normal`  | 2 |
| `low`     | 3 |

Lower BullMQ priority number = processed first.

### Rate limiting

Per-type rate limits are defined in `src/queue/queue.constants.ts`:

```ts
email:  { max: 5, duration: 60_000 }   // 5 per minute
report: { max: 2, duration: 60_000 }   // 2 per minute
```

Global HTTP throttle: 60 requests/minute per IP (via `@nestjs/throttler`).

### Idempotency

The `idempotencyKey` field has a DB-level unique constraint. A duplicate key on `POST /tasks` returns `409 Conflict` — the job is not added to the queue a second time.

### Concurrency safety

BullMQ uses Redis locks to guarantee a job is never processed by two workers simultaneously. The processor additionally checks for terminal states (`COMPLETED`, `CANCELLED`) before processing.

---

## Design Decisions & Tradeoffs

| Decision | Rationale |
|----------|-----------|
| Single `task-queue` for all types | Simpler ops; per-type rate limiting via separate queues would give finer control but require more Redis connections |
| `PENDING` reset on retry | Keeps status accurate during backoff window; a dedicated `RETRYING` status would be cleaner but adds enum complexity |
| DB-level unique on `idempotencyKey` | Guarantees correctness even under concurrent requests; application-level check is a fast-path optimisation |
| `JwtAuthGuard` globally applied | Reduces boilerplate; `@Public()` decorator opts out individual endpoints |
| Worker in the same process | Acceptable for MVP; in production a separate worker process/container is recommended to scale independently |
| MockService for simulation | Keeps the business logic decoupled from actual job implementation |

---

## Migration commands

```bash
npm run migration:generate   # generate new migration from entity changes
npm run migration:run        # apply pending migrations
npm run migration:revert     # revert last migration
```
