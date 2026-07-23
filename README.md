# StudyPilot

AI-powered study quiz generator. Paste or upload study material, generate a mixed
multiple-choice + short-answer quiz, take it in-app, and get an immediate scored
breakdown. Quizzes and attempt history are saved so you can track progress.

## Architecture (three layers)

Per the [project constitution](.specify/memory/constitution.md), the codebase is
split into three independent layers at the repo root:

| Layer | Path | Stack | Responsibility |
|-------|------|-------|----------------|
| **Frontend** | `frontend/` | React 18 + Vite | UI; Firebase Auth (to get an ID token); talks only to the backend |
| **Backend** | `backend/` | Node.js + Express | REST API; verifies Firebase ID tokens; owns all Firestore access; deterministically scores multiple-choice; orchestrates the agent |
| **Agent** | `agent/` | Python + uAgents | ALL AI logic: analyze notes, generate questions, semantically grade short answers (via the ASI:One API) |

Data lives in **Firebase Firestore** (`users/{uid}/quizzes`, `users/{uid}/attempts`).
See the design docs in [`specs/001-ai-quiz-generator/`](specs/001-ai-quiz-generator/):
`spec.md`, `plan.md`, `data-model.md`, `contracts/`, and `quickstart.md`.

## Prerequisites

- Node.js 20+ and npm
- Python 3.11 and pip
- Firebase project `studypilot-osaid` (Auth + Firestore enabled — already provisioned)
- A Firebase **service-account key** for the backend (download from Firebase
  Console → Project Settings → Service Accounts → Generate new private key) saved
  as `backend/serviceAccount.json`
- An **ASI:One API key** for the agent

## Configuration

Copy the example env files and fill in values (see [quickstart.md](specs/001-ai-quiz-generator/quickstart.md)
for the full list):

```bash
cp agent/.env.example agent/.env         # ASI_ONE_API_KEY (already set locally)
cp backend/.env.example backend/.env     # GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_PROJECT_ID, AGENT_BASE_URL
cp frontend/.env.example frontend/.env   # VITE_API_BASE_URL + VITE_FIREBASE_* (already set locally)
```

`.env` files and `serviceAccount.json` are git-ignored — never commit them.

## Run (three processes)

```bash
# 1. Agent (Python uAgents)  → http://localhost:8001
cd agent && python agent.py          # uses agent/venv; deps: pip install -r requirements.txt

# 2. Backend (Express)       → http://localhost:8080
cd backend && npm install && npm run dev

# 3. Frontend (React/Vite)   → http://localhost:5173
cd frontend && npm install && npm run dev
```

Then open the frontend, sign in, and follow the flows in
[quickstart.md](specs/001-ai-quiz-generator/quickstart.md) (Scenarios A–D).

## Tests

```bash
cd backend && npm test     # 34 tests — MCQ scoring, extraction, routes, isolation (Firestore + agent mocked)
cd agent && python -m pytest   # 6 tests — generation + grading (ASI:One mocked)
cd frontend && npm test    # core flow: create → take → results (apiClient/auth mocked)
```

All business-logic tests run **without** live Firestore or ASI:One (Constitution
Principle IV) via injectable seams.

## Security notes

- Firestore rules (`firestore.rules`) **deny all direct client access** — every
  read/write goes through the backend Admin SDK. Rules are deployed to the live
  project.
- The backend verifies a Firebase ID token on every `/api` request and scopes all
  data to the authenticated user; other users' resources return `404`.
- The quiz "taking" payload omits correct answers; correctness is revealed only in
  attempt results after submission.
