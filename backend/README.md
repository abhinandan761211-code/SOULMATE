# SoulMate API

FastAPI service that sits in front of Supabase. Deployed on **Render**, called by the
Netlify frontend. Every endpoint requires the caller's Supabase access token and only
ever touches that user's rows.

## Endpoints

| Method | Path | What it does |
|---|---|---|
| GET | `/` · `/health` · `/api/health` | health checks (Render uses `/health`) |
| GET | `/docs` | interactive Swagger UI |
| GET | `/api/me` | current profile |
| POST | `/api/onboarding` | save role / name / age / country, mark onboarded |
| GET | `/api/dashboard` | goals + journal + habits + projects + analysis + challenges in one call |
| GET · PUT · DELETE | `/api/journal` · `/api/journal/{date}` · `/api/journal/{id}` | journal entries |
| GET · POST · PATCH · DELETE | `/api/goals` | goals |
| GET · POST · DELETE | `/api/habits` · `/api/habits/{id}` | habits |
| POST | `/api/habits/mark` | upsert a day's mark |
| GET · POST · PATCH · DELETE | `/api/projects` · `/api/projects/{id}/tasks` · `/api/projects/{id}/columns` | projects, rows, columns |
| GET · POST · PATCH · DELETE | `/api/challenges` | challenges |
| POST · DELETE | `/api/challenges/{id}/days[/{date}]` | pass/fail mark for a day |
| GET · PUT | `/api/analysis` · `/api/analysis/{period_start}` | weekly reviews |

## Run locally

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # fill in SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
uvicorn app.main:app --reload --port 8000
```

Open <http://localhost:8000/docs>.

Then point the frontend at it — add to `frontend/.env`:

```dotenv
VITE_API_URL=http://localhost:8000
```

## Security model

The service-role key bypasses row-level security, so the API **must** scope queries
itself. Every handler passes `user_id = <the verified token's user>` into its
filters, and `ids` are always combined with that owner filter. The JWT is verified
against Supabase Auth on each request, so a forged token is rejected with 401.

## Deploy (Render)

| Setting | Value |
|---|---|
| Service type | **Web Service** |
| Runtime | Python 3 |
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `gunicorn app.main:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT` |
| Health Check Path | `/health` |

Environment variables:

```
SUPABASE_URL              = https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY = <service role key>
CORS_ORIGINS              = https://<your-app>.netlify.app,http://localhost:5199
```

`render.yaml` and `Procfile` in this folder contain the same configuration.
