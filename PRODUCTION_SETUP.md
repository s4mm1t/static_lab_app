# static_lab Production Setup

This file is the deployment checklist for Vercel. The app can run with memory storage for local demos, but production should not be considered ready until `/api/v1/status` reports persistent storage and a configured AI provider.

## Required Vercel Environment Variables

Set these in Vercel Project Settings -> Environment Variables for Production:

```env
APP_ENV=production
APP_TIMEZONE=Europe/Madrid
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require
PLANNER_DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require
ASSISTANT_DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require
SECRET_KEY=<long random secret, at least 32 chars>
GEMINI_API_KEY=<google ai studio key>
GEMINI_MODEL=gemini-2.5-flash-lite
STATIC_LAB_REQUIRE_PERSISTENT_STORAGE=true
STATIC_LAB_ADMIN_EMAILS=<admin email list, comma separated>
```

Leave `NEXT_PUBLIC_API_BASE_URL` empty on Vercel unless the backend is deployed on a different domain. The frontend uses same-origin `/api/v1/*` in production.

## Health Checks

After deployment, open:

```text
https://static-lab-app.vercel.app/api/v1/status
```

Production is acceptable only when:

- `storage` is `postgres`
- `ai_provider_configured` is `true`
- `deployment_ready` is `true`
- `warnings` is empty

If `storage` is `memory`, users, diary logs, assistant context, and calendar events can reset after a serverless cold start. If `ai_provider_configured` is `false`, the coach uses the local fallback instead of Gemini.

## AI Coach Smoke Test

Use a real account in the app and send these messages in Coach:

```text
сколько калорий осталось сегодня?
```

Expected: the answer mentions today's logged calories or remaining calories from the current account, not a generic template.

```text
добавь 100г chicken rice bowl в обед
```

Expected: the backend creates a diary entry and the answer says it was added.

```text
что съесть после тренировки?
```

Expected: the coach responds in Russian and uses profile/diary context. If Gemini is configured, the response should not mention fallback or missing API keys.

You can also run the automated backend smoke test:

```bash
npm run backend:dev:memory
npm run smoke:backend
```

By default it checks `http://127.0.0.1:8000`. The `backend:dev:memory` command is for local smoke only; it proves the API flow works, not that production persistence is configured.

To check production:

```bash
API_BASE_URL=https://static-lab-app.vercel.app SMOKE_REQUIRE_DEPLOYMENT_READY=true npm run smoke:backend
```

The production mode fails if storage is not Postgres, if the AI provider is not configured, or if `/api/v1/status` still reports deployment warnings.

## Product Database

The local SQLite file from `STATIC_LAB_PRODUCT_DB_DIR` is not available on Vercel. For production, import normalized products into Postgres and use that database as the source of truth. Runtime mounts of local disks will not work on Vercel.

Until that import exists, `/api/v1/status` may show a small product count and search quality will be limited.
