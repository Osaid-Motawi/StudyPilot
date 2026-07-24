# StudyPilot

An AI study companion with four parts, all behind sign-in and sharing one account,
history, and design system:

1. **Quiz Generator** — paste notes or upload a document (PDF/.txt/image) and pick a
   question type: multiple-choice, fill-in-the-blank, essay/free-response, or
   matching. Take the generated quiz and get a score with per-question feedback.
2. **AI Chat** — free-form conversational Q&A, persisted per user.
3. **File/Image Analysis** — upload an image or file and either chat about its
   content or generate a quiz from it.
4. **Profile** — performance overview (average score, total quizzes) plus a
   read-only history of every quiz taken, reopenable for full review.

## Architecture (three layers)

Per the [project constitution](.specify/memory/constitution.md) (v1.2.0), the
codebase is split into three independent layers at the repo root:

| Layer | Path | Stack | Responsibility |
|-------|------|-------|----------------|
| **Frontend** | `frontend/` | React 18 + Vite | Four pages + shared nav; Firebase Auth (to get an ID token); talks only to the backend |
| **Backend** | `backend/` | Node.js + Express | REST API; verifies Firebase ID tokens; owns all Firestore access; deterministically scores multiple-choice **and** matching; orchestrates the agent |
| **Agent** | `agent/` | Python + uAgents | ALL AI logic via ASI:One: multi-type generation, fill-in-blank + essay grading, general chat, and image analysis (OCR) |

Data lives in **Firebase Firestore**: `users/{uid}/quizzes`, `users/{uid}/attempts`,
`users/{uid}/chats`. Design docs: [`specs/001-ai-quiz-generator/`](specs/001-ai-quiz-generator/)
and [`specs/002-ai-study-companion/`](specs/002-ai-study-companion/).

## Prerequisites

- Node.js 20+ and npm
- Python 3.11 and pip
- **Tesseract OCR** installed on the agent host (for image analysis; the agent uses
  `pytesseract`). Without it, image analysis degrades gracefully to "no text".
- Firebase project `studypilot-osaid` (Auth + Firestore enabled — already provisioned)
- A Firebase **service-account key** for the backend (Firebase Console → Project
  Settings → Service Accounts → Generate new private key) saved as
  `backend/serviceAccount.json`
- An **ASI:One API key** for the agent

## Configuration

Copy the example env files and fill in values (see each feature's `quickstart.md`):

```bash
cp agent/.env.example agent/.env         # ASI_ONE_API_KEY (already set locally)
cp backend/.env.example backend/.env     # GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_PROJECT_ID, AGENT_BASE_URL
cp frontend/.env.example frontend/.env   # VITE_API_BASE_URL + VITE_FIREBASE_* (already set locally)
```

`.env` files and `serviceAccount.json` are git-ignored — never commit them.

## Run (three processes)

```bash
# 1. Agent (Python uAgents)  → http://localhost:8001
cd agent && python agent.py          # uses agent/venv; deps in agent/requirements.txt

# 2. Backend (Express)       → http://localhost:8080
cd backend && npm install && npm run dev

# 3. Frontend (React/Vite)   → http://localhost:5173
cd frontend && npm install && npm run dev
```

Then open the frontend, sign in, and use the four pages (Create Quiz / AI Chat /
Analysis / Profile). Validation scenarios:
[001 quickstart](specs/001-ai-quiz-generator/quickstart.md) and
[002 quickstart](specs/002-ai-study-companion/quickstart.md).

## Tests

```bash
cd backend && npm test          # 71 tests — scoring (mcq/matching), grading dispatch, routes, chats, analysis, profile, isolation
cd agent && python -m pytest    # 27 tests — per-type generation, essay/short grading, chat, image OCR (all mocked)
cd frontend && npm test         # core quiz flow + chat flow (apiClient/auth mocked)
```

All business-logic tests run **without** live Firestore, ASI:One, or Tesseract
(Constitution Principle IV) via injectable seams.

## Security notes

- Firestore rules (`firestore.rules`) **deny all direct client access** (covers
  quizzes, attempts, and chats) — every read/write goes through the backend Admin
  SDK. Rules are deployed to the live project.
- The backend verifies a Firebase ID token on every `/api` request and scopes all
  data to the authenticated user; other users' resources return `404`.
- Quiz "taking" payloads omit answer material; correctness is revealed only in
  attempt results after submission.
