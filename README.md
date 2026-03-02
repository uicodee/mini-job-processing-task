# Mini Job Processing Platform

## Stack

- **NestJS**
- **TypeORM** + **PostgreSQL**
- **BullMQ** + **Redis**
- **Passport JWT**
- **Swagger**

---

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+

### 1. Configure environment

```bash
cp .env.example .env
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run migrations

```bash
npm run migration:run
```

### 4. Start the application

```bash
npm run start:dev
```

Swagger UI: `http://localhost:APP_PORT/docs`

---

## Environment variables

| Variable            | Description                                                        |
|---------------------|--------------------------------------------------------------------|
| `NODE_ENV`          | Environment: `development` or `production`                         |
| `APP_PORT`          | HTTP server port                                                   |
| `POSTGRES_HOST`     | PostgreSQL host                                                    |
| `POSTGRES_PORT`     | PostgreSQL port                                                    |
| `POSTGRES_USER`     | PostgreSQL username                                                |
| `POSTGRES_PASSWORD` | PostgreSQL password                                                |
| `POSTGRES_DB`       | PostgreSQL database name                                           |
| `JWT_SECRET`        | Secret key used to sign JWT tokens                                 |
| `REDIS_HOST`        | Redis host                                                         |
| `REDIS_PORT`        | Redis port                                                         |

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
| GET | `/tasks/metrics` | ADMIN | Metrics |

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

### Rate limiting

Настраивается в `src/queue/queue.constants.ts`:

```ts
email:  { max: 5, duration: 60_000 }
report: { max: 2, duration: 60_000 }
```

---

## Migration commands

```bash
npm run migration:generate   # generate new migration from entity changes
npm run migration:run        # apply pending migrations
npm run migration:revert     # revert last migration
```
