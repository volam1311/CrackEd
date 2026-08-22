# CrackEd

Monorepo with a React + TypeScript client and a FastAPI server.

## Structure

```
client/   # Vite + React + TypeScript (port 5173)
server/   # FastAPI + Uvicorn (port 8000)
```

## Prerequisites

- Node.js 20+
- Python 3.11+ and [uv](https://docs.astral.sh/uv/)

## Run the server

```bash
cd server
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

API docs: http://127.0.0.1:8000/docs

## Run the client

```bash
cd client
npm install
npm run dev
```

App: http://localhost:5173

Vite proxies `/api/*` to the FastAPI server, so you can call `/api/health` from the browser without CORS issues in local dev.
