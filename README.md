# CrackEd

Monorepo with a React + TypeScript client and a FastAPI server.

## Structure

```
client/   # Vite + React + TypeScript (port 5173)
server/   # FastAPI + Uvicorn (port 8000)
```

## Prerequisites

- Node.js 20+
- Python 3.11+
- Optional: [uv](https://docs.astral.sh/uv/)

## Run the server

With `uv`:

```bash
cd server
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

Or with pip:

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
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

## Run with Docker

Make sure you have [Docker](https://www.docker.com/) and Docker Compose installed.

```bash
docker compose up --build
```

This starts three services:

| Service  | URL                    | Description             |
| -------- | ---------------------- | ----------------------- |
| Client   | http://localhost:3000   | React app (nginx)       |
| Server   | http://localhost:8000   | FastAPI                 |
| MongoDB  | localhost:27017        | Database                |

API docs: http://localhost:8000/docs

To stop everything:

```bash
docker compose down
```

To stop and remove the database volume:

```bash
docker compose down -v
```

### Environment variables

The server container receives these variables by default (set in `docker-compose.yml`):

| Variable   | Default                     |
| ---------- | --------------------------- |
| `MONGO_URL`| `mongodb://mongo:27017`     |
| `MONGO_DB` | `cracked`                   |

## Application flow

```mermaid
flowchart TB
  subgraph Frontend
    U[User]
    Home[Home feed<br/>Today's Pick / Recommended / Continue Learning]
    Cards[Video cards]
    Player[YouTube iframe player]
    FetchUI[Fetch from YouTube UI<br/>Add channels]
    UploadUI[Upload Videos UI<br/>5-step wizard]
  end

  subgraph Backend["Backend Core — Person 1"]
    API[FastAPI]
    UploadEP[Upload endpoint]
    CRUD[Video / channel CRUD]
    FS["/uploads filesystem"]
    DB[(Database<br/>videos · channels)]
  end

  subgraph Pipeline["YouTube + AI — Person 2"]
    YTPipe[YouTube pipeline]
    YTAPI[YouTube Data API]
    LLM[LLM title rewrite]
  end

  U --> Home
  U --> FetchUI
  U --> UploadUI
  U --> Player

  Home --> Cards
  Cards --> CRUD
  Player --> Cards

  FetchUI --> YTPipe
  YTPipe --> YTAPI
  YTPipe --> DB
  YTPipe --> LLM
  UploadEP --> LLM
  LLM --> DB

  UploadUI --> UploadEP
  UploadEP --> FS
  UploadEP --> DB
  CRUD --> DB
  API --- UploadEP
  API --- CRUD
```

### Upload wizard

```mermaid
flowchart LR
  A[1. Upload] --> B[2. Details]
  B --> C[3. Preprocess<br/>mock OK if AI split not ready]
  C --> D[4. Review]
  D --> E[5. Publish]
```
