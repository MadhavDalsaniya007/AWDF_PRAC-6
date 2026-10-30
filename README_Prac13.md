# Practical 13: AI API Integration into a Web Application

## Course Outcome & Program Outcomes
- **CO6**: Integrate external cloud/AI services and APIs into web applications following security best practices.
- **PO3**: Design/development of solutions.
- **PO5**: Modern tool usage.
- **PO12**: Life-long learning and ethical awareness in technology adoption.

---

## Objective
To integrate an external AI service (OpenAI API / Google Gemini API) into the full-stack Task Management application to automate task description generation, ensure secure server-side credential management, implement graceful degradation against third-party failures, and understand responsible AI practices.

---

## Architecture & Request-Response Flow

```
┌────────────────────────────────────────────────────────┐
│               React 18 Frontend UI                     │
│  [Task Title Input]                                    │
│  [ ✨ Generate description ]  <── User clicks button   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           │ POST /api/ai/generate-description
                           │ Body: { title: "..." }
                           │ (No API key sent from browser)
                           ▼
┌────────────────────────────────────────────────────────┐
│               Express.js Backend Server                │
│  1. Check rate limit (5s cooldown per client)          │
│  2. Validate request payload                           │
│  3. Read OPENAI_API_KEY / GEMINI_API_KEY from .env     │
│  4. Invoke external AI API with timeout controller     │
└──────────────┬───────────────────────────┬─────────────┘
               │                           │
      [External Success]            [External Failure / 401 / Timeout]
               │                           │
               ▼                           ▼
┌───────────────────────────┐ ┌──────────────────────────┐
│  OpenAI / Gemini API      │ │ Graceful Degradation     │
│  (gpt-4o-mini / gemini)   │ │ Offline Heuristic Engine │
│  Returns generated text   │ │ Returns fallback draft   │
└──────────────┬────────────┘ └────────────┬─────────────┘
               │                           │
               └─────────────┬─────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────┐
│  JSON Response: { description, fallback: false|true }  │
└────────────────────────────┬───────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────┐
│               React Frontend Form                      │
│  - Populates editable description field                │
│  - Shows success or fallback notification              │
│  - Shows Responsible AI disclaimer notice              │
│  - Allows user to edit, accept, or discard suggestion  │
└────────────────────────────────────────────────────────┘
```

---

## Theoretical Analysis & Key Concepts

### 1. Why must the AI API key be called from the backend rather than directly from the React frontend?
* **Secret Leakage & Decompilation:** React frontend code is delivered to and executed within the user's browser. Any environment variable embedded in client bundles (e.g., `VITE_` or `REACT_APP_`) is visible in plaintext in network tabs, JavaScript bundles, or browser memory.
* **Cost & Quota Abuse:** If an API key is exposed client-side, malicious actors can extract it and drain the owner's billing credit, run unauthorized batch queries, or incur thousands of dollars in charges.
* **Prompt Hardening & Governance:** Backend mediation allows the server to sanitize user inputs, enforce system prompts, prevent prompt injection attacks, and apply server-side audit logs.
* **CORS Restrictions:** Many external API providers enforce strict Cross-Origin Resource Sharing (CORS) policies that disallow direct calls from browser origins without server intermediaries.

### 2. What does 'graceful degradation' mean in this context, and why does it matter?
* **Definition:** Graceful degradation is an architectural pattern where an application continues to operate in a functional, albeit reduced, state when an auxiliary subsystem or external dependency fails.
* **Why it matters for third-party AI APIs:**
  * External AI services are outside your infrastructure control (subject to latency spikes, rate limits, network outages, model downtime, and HTTP 401/429/500 errors).
  * **Core task management must never break** simply because AI description generation failed.
  * In this application: If the AI call fails or times out, the backend catches the error, logs it server-side, and returns `{ fallback: true, description: "..." }`. The frontend notifies the user and keeps the input field fully editable so the user can type their description manually with zero crashes.

### 3. What are the privacy, governance, and ethical implications of sending task data to an external AI API?
* **Personally Identifiable Information (PII):** User data such as real names, phone numbers, home addresses, employee IDs, and financial records must **never** be forwarded to third-party public models.
* **Confidentiality & Trade Secrets:** Proprietary source code snippets, unreleased project roadmaps, and internal security vulnerability reports must be filtered or excluded.
* **Data Retention & Model Training:** By default, public API tiers may retain input prompts for monitoring or model retraining. Organizations must review compliance terms (e.g., GDPR, HIPAA, SOC 2) and configure zero-data-retention (ZDR) enterprise agreements.
* **Model Bias & Hallucination:** Generative models can produce inaccurate, biased, or nonsensical descriptions. The UI must always display a clear disclaimer and treat AI outputs as editable suggestions rather than authoritative facts.

---

## Implementation Details

### Backend (`backend/routes/ai.js` & `backend/server.js`)
* **Dual Provider Support:** Seamlessly supports **OpenAI** (`OPENAI_API_KEY` / `gpt-4o-mini`) and **Google Gemini** (`GEMINI_API_KEY` / `gemini-1.5-flash`).
* **Route Endpoints:**
  * `POST /api/ai/generate-description` (and alias `POST /ai/generate-description`)
  * `GET /api/ai/status` (Healthcheck and configuration diagnostic)
* **Rate Limiting:** In-memory client rate limiter (`5-second window` between consecutive generation requests) returning HTTP 429 when spammed.
* **Graceful Degradation:** Wrapped in `try / catch` with an `AbortController` timeout (10 seconds). On any failure, responds with HTTP 200 `{ description: fallbackDraft, fallback: true, message: "..." }` to prevent frontend crashes.

### Frontend (`frontend/src/components/TaskForm.jsx` & `frontend/src/api.js`)
* **✨ Generate description Button:** Allows one-click generation directly in the task form.
* **Loading State:** Displays inline spinner and disables button during generation.
* **Editable Suggestion:** Automatically populates the description textarea, allowing the user full freedom to accept, edit, or delete the text before clicking **Add Task**.
* **Button Cooldown:** 5-second countdown timer on the frontend prevents duplicate clicks.
* **Responsible AI Disclaimer:** Prominently informs the user that AI suggestions must be reviewed and sensitive data should not be submitted.

---

## Environment Configuration

Store keys in `.env` inside the `backend/` directory (already ignored by `.gitignore`):

```bash
# backend/.env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_here
MONGO_URI=mongodb+srv://24it010_db_user:user123@cluster0.zepgced.mongodb.net/taskdb

# OpenAI API Key (Option A)
OPENAI_API_KEY=sk-proj-yourOpenAIKeyHere
OPENAI_MODEL=gpt-4o-mini

# OR Google Gemini API Key (Option B)
# GEMINI_API_KEY=AIzaSyYourGeminiKeyHere
# GEMINI_MODEL=gemini-1.5-flash
```

> **Security Note:** Neither `backend/.env` nor `frontend/.env` is ever committed to GitHub. A template is provided in `.env.example`.

---

## How to Run & Test

### 1. Run Automated Backend Tests
Run the comprehensive test suite covering normal task CRUD, AI route success, AI error fallback, and rate limiting:
```bash
npm --prefix backend test
```

### 2. Run the Code Linter
```bash
npm --prefix backend run lint
```

### 3. Start Backend Server
```bash
npm --prefix backend start
```
*Healthcheck:* `GET http://localhost:5000/api/ai/status`

### 4. Start React Frontend
```bash
npm --prefix frontend run dev
```

---

## Verifying Failure Path (Graceful Degradation)
1. Open `backend/.env` and intentionally set `OPENAI_API_KEY=sk-invalid-broken-key-12345`.
2. Restart backend: `npm --prefix backend start`.
3. In the React UI, type task title: `Fix database connection timeout`.
4. Click **✨ Generate description**.
5. Observe:
   - The backend logs the 401/error without crashing.
   - The frontend displays a helpful fallback draft description.
   - A status banner informs the user: *"AI fallback active: offline suggestion applied. Edit as needed."*
   - The user can still click **Add Task** and save the task without disruption.

---

## Viva & Evaluation Q&A

| Question | Answer Summary |
|---|---|
| **Q1: Why not put the API key in React `import.meta.env`?** | Any client-side variable is bundled into browser JS and accessible in developer tools, leading to credential theft and financial exploitation. |
| **Q2: What is graceful degradation?** | Designing the app so that if an external dependency fails, the core functionality (task creation) continues seamlessly with fallback behavior. |
| **Q3: What HTTP status code should be returned on AI failure in fallback mode?** | Either 200 with `{ fallback: true }` (allowing client to show fallback message without treating it as an HTTP crash), or handled via standard error status with UI recovery. |
| **Q4: What data must never be sent to an AI API?** | PII (passwords, social security numbers, private health data), enterprise confidential intellectual property, and internal secrets. |
| **Q5: Why make the AI response editable?** | Humans must remain in the loop (Responsible AI) to verify accuracy, prevent hallucinations from polluting the database, and maintain user agency. |
