# PipHigh

Forex / CFD trading platform — trader app, admin panel, backend APIs, and
market data infrastructure as a single Docker-composed stack.

## Structure

| Path | What |
|---|---|
| `frontend/trader/` | Next.js 15 trader app (includes landing site at `/company/*`, `/auth/*`, and the dashboard) |
| `frontend/admin/` | Next.js 15 admin panel |
| `backend/services/gateway/` | FastAPI gateway — REST + WebSocket (port 8000) |
| `backend/services/admin/` | FastAPI admin API (port 8001) |
| `backend/services/market-data/` | Market data ticker ingestor |
| `backend/services/b-book-engine/` | B-book matching engine |
| `backend/services/risk-engine/` | Margin call / stop-out engine |
| `backend/packages/common/` | Shared models, config, SQLAlchemy DB, SMTP, notify |
| `backend/infra/migrations/` | Alembic migrations |
| `backend/infra/docker/init-db.sql` | Postgres baseline schema (mounted at container init) |
| `deploy/nginx/piphigh.conf` | Production nginx config — Cloudflare origin SSL, reverse proxy |
| `docker-compose.yml` | Dev stack (host-bound ports for local access) |
| `docker-compose.prod.yml` | Production overlay (localhost-only ports; nginx fronts) |
| `scripts/` | DB backup + admin password reset utilities |

## Quick start (local)

```bash
cp .env.example .env              # then fill in strong secrets
docker compose --env-file .env up -d postgres timescaledb redis zookeeper kafka
docker compose --env-file .env --profile migrate up migrate
docker compose --env-file .env up -d --build
```

- Trader: http://localhost:3010
- Admin: http://localhost:3011
- Gateway API: http://localhost:8000/health

## Production deploy

See [`deploy/DEPLOY-GUIDE.md`](deploy/DEPLOY-GUIDE.md) for the full VPS + Cloudflare walkthrough.

## Stack

- Frontends: Next.js 15, React 18, Tailwind, Framer Motion, Lucide
- Backend: Python 3.12, FastAPI, SQLAlchemy + asyncpg, aiokafka, redis
- Data: PostgreSQL 16, TimescaleDB (`marketdata` DB), Redis 7, Kafka
- Proxy: Nginx 1.24+ behind Cloudflare (Full strict SSL)
