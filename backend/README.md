# TrackFood AI Backend

FastAPI app service for TrackFood AI.

## Local

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
DATABASE_URL=postgresql://trackfoodai:trackfoodai@localhost:5432/trackfoodai \
  .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Tests

Tests use the backend's in-memory storage mode:

```bash
DATABASE_URL=memory://test .venv/bin/python -m pytest
```
