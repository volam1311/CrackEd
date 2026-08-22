# CrackEd server

```bash
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

- Health: `GET /api/health`
- Hello: `GET /api/hello?name=CrackEd`
- Docs: http://127.0.0.1:8000/docs
