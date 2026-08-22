# CrackEd server

With `uv`:

```bash
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

Or with pip:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- Health: `GET /api/health`
- Hello: `GET /api/hello?name=CrackEd`
- Docs: http://127.0.0.1:8000/docs
