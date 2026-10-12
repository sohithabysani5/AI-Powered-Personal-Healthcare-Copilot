# Privacy, Data Isolation & HIPAA-Aligned Security Model

## 1. Zero-Exposure API Key Architecture

- **Backend-Only Storage:** All cloud LLM keys (xAI Grok, Mistral, Google Gemini) are loaded into FastAPI environment memory via `.env`.
- **No Client Secrets:** No API keys are bundled into Vite frontend code, build artifacts, or browser storage.

---

## 2. Cross-Patient Data Isolation

- **Server-Side Authorization:** Every database query filters by `user_id == current_user.id` derived from verified JWT payloads.
- **Resource Protection:** Changing document or observation IDs in URL paths returns an immediate 404 or 401 response; patients cannot access or mutate records belonging to other users.
- **Dedicated Upload Directories:** Uploaded clinical files are segregated on the filesystem by user (`uploads/user_{id}/`).

---

## 3. Air-Gapped Local-Processing Mode

- Patients can toggle **"Enable 100% Local-Processing Mode"** in Settings.
- When enabled, external network requests to external AI APIs are disabled.
- Report summaries, lab interpretations, and record queries run entirely through local deterministic parsers and structured database queries.
- Patient consent is recorded explicitly in the database (`consent_external_ai`).
