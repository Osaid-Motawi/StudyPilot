# StudyPilot

An AI study companion that turns study material into active learning
tools — quizzes, conversational help, and file/image analysis, all in one
place.

## The Problem

Reading notes passively is one of the least effective ways to study.
Students rarely test themselves, rarely get instant feedback on what they
actually understand, and have no single place to track how they're
improving over time or get quick help understanding a document, image, or
question.

## The Solution

StudyPilot brings together four connected tools, all behind sign-in and
sharing one account, history, and design system:

- **Quiz Generator** — paste notes or upload a document (PDF/.txt/image)
  and pick a question type: multiple-choice, fill-in-the-blank,
  essay/free-response, or matching. Take the generated quiz and get a
  score with per-question feedback.
- **AI Chat** — free-form conversational Q&A, persisted per user.
- **File/Image Analysis** — upload an image or file and either chat about
  its content or generate a quiz from it.
- **Profile** — performance overview (average score, total quizzes) plus
  a read-only history of every quiz taken, reopenable for full review.

## How Fetch AI Is Used

All AI reasoning lives in a dedicated **Fetch AI agent** (`agent/`, built
with `uAgents`), fully separated from the rest of the app. It handles
every task that requires judgment over language or images — generating
questions in the four supported types, grading free-text and essay
answers via **ASI:One** with structured/JSON output, powering the AI Chat,
and extracting text from uploaded images via OCR for analysis. The
backend only handles what's deterministic: scoring multiple-choice and
matching questions, persistence, and auth — it never re-implements AI
logic itself.

## Architecture (three layers)

Per the project constitution (v1.2.0), the codebase is split into three
independent layers at the repo root:

| Layer | Path | Stack | Responsibility |
|---|---|---|---|
| **Frontend** | `frontend/` | React 18 + Vite | Four pages + shared nav; Firebase Auth (to get an ID token); talks only to the backend |
| **Backend** | `backend/` | Node.js + Express | REST API; verifies Firebase ID tokens; owns all Firestore access; deterministically scores multiple-choice and matching; orchestrates the agent |
| **Agent** | `agent/` | Python + uAgents | ALL AI logic via ASI:One: multi-type generation, fill-in-blank + essay grading, general chat, and image analysis (OCR) |

Data lives in Firebase Firestore: `users/{uid}/quizzes`,
`users/{uid}/attempts`, `users/{uid}/chats`. Design docs:
`specs/001-ai-quiz-generator/` and `specs/002-ai-study-companion/`.

## Prerequisites

- Node.js 20+ and npm
- Python 3.11 and pip
- Tesseract OCR installed on the agent host (for image analysis; the agent
  uses `pytesseract`). Without it, image analysis degrades gracefully to
  "no text".
- Firebase project `studypilot-osaid` (Auth + Firestore enabled — already
  provisioned)
- A Firebase service-account key for the backend (Firebase Console →
  Project Settings → Service Accounts → Generate new private key) saved
  as `backend/serviceAccount.json`
- An ASI:One API key for the agent

## Configuration

Copy the example env files and fill in values (see each feature's
`quickstart.md`):

```bash
cp agent/.env.example agent/.env         # ASI_ONE_API_KEY (already set locally)
cp backend/.env.example backend/.env     # GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_PROJECT_ID, AGENT_BASE_URL
cp frontend/.env.example frontend/.env   # VITE_API_BASE_URL + VITE_FIREBASE_* (already set locally)
```

`.env` files and `serviceAccount.json` are git-ignored — never commit
them.

## Run (three processes)

```bash
# 1. Agent (Python uAgents)  → http://localhost:8001
cd agent && python agent.py          # uses agent/venv; deps in agent/requirements.txt

# 2. Backend (Express)       → http://localhost:8080
cd backend && npm install && npm run dev

# 3. Frontend (React/Vite)   → http://localhost:5173
cd frontend && npm install && npm run dev
```

Then open the frontend, sign in, and use the four pages (Create Quiz / AI
Chat / Analysis / Profile). Validation scenarios: 001 quickstart and 002
quickstart.

## Tests

```bash
cd backend && npm test          # 71 tests — scoring (mcq/matching), grading dispatch, routes, chats, analysis, profile, isolation
cd agent && python -m pytest    # 27 tests — per-type generation, essay/short grading, chat, image OCR (all mocked)
cd frontend && npm test         # core quiz flow + chat flow (apiClient/auth mocked)
```

All business-logic tests run without live Firestore, ASI:One, or
Tesseract (Constitution Principle IV) via injectable seams.

## Security notes

- Firestore rules (`firestore.rules`) deny all direct client access
  (covers quizzes, attempts, and chats) — every read/write goes through
  the backend Admin SDK. Rules are deployed to the live project.
- The backend verifies a Firebase ID token on every `/api` request and
  scopes all data to the authenticated user; other users' resources
  return 404.
- Quiz "taking" payloads omit answer material; correctness is revealed
  only in attempt results after submission.

## License

This project was built as part of an educational training program.
