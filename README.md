# TrackFood AI

Mobile-first nutrition tracking app built as a real app service: Next.js +
React frontend, FastAPI backend, PostgreSQL storage, and Docker Compose for
OrbStack.

## Run with OrbStack / Docker

```bash
cd "/Volumes/NEYKA SSD/trackfoodai_app"
docker compose up --build
```

Open:

```text
http://localhost:3000
```

Backend:

```text
http://localhost:8000/docs
http://localhost:8000/health
```

Stop:

```bash
docker compose down
```

Remove database data only when you want a clean reset:

```bash
docker compose down -v
```

## Local Development

Install frontend dependencies:

```bash
npm install
```

Install backend dependencies:

```bash
npm run backend:install
```

Run frontend:

```bash
npm run dev
```

Run backend in another terminal:

```bash
npm run backend:dev
```

For local backend development without Docker Postgres, export a database URL or
run the Docker database service:

```bash
docker compose up db
```

## Checks

```bash
npm run lint
npm run build
npm run backend:test
```

## App Shape

- Mobile-first dashboard with bottom navigation.
- Food library, quick meal logging, text nutrition estimates, profile auth.
- JWT-backed API sessions.
- PostgreSQL tables: `users`, `foods`, `meal_logs`.
- The backend imports the combined product SQLite database from
  `TRACKFOODAI_PRODUCT_DB_DIR/Combined.sqlite` through a read-only Docker volume.
  The default path is `/Volumes/NEYKA SSD/бд для сайта/newbd/Combine (full)`.
- PWA-ready metadata and manifest.
