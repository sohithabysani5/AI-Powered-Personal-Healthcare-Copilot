# AI-Powered Personal Health Copilot

**Subtitle:** A Multilingual Platform for Intelligent Medical Record Analysis, Personalized Health Profiles, and Healthcare Journey Management.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript%20%2B%20Vite-61DAFB.svg)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC.svg)](https://tailwindcss.com)
[![FHIR R4](https://img.shields.io/badge/Interoperability-HL7%20FHIR%20R4-E95420.svg)](https://hl7.org/fhir)
[![Tests](https://img.shields.io/badge/Tests-5%2F5%20Passing-success.svg)](#automated-testing)

---

## 🌟 Project Overview

**AI-Powered Personal Health Copilot** is a full-stack digital health platform designed for college innovation expos, hackathons, and future clinical startup development. It empowers users to upload medical documents (laboratory tests, prescriptions, discharge summaries), extract clinical metrics deterministically, understand their health reports in clear plain language, compare longitudinal biomarker trends, track medication adherence, and query their health journey using multi-provider AI with automatic failover.

---

## 🚀 Key Highlights & Capabilities

- **AI-Powered Medical Document Understanding:** Ingests PDFs and scans using PyMuPDF and Tesseract OCR with image preprocessing.
- **Multi-Provider AI Routing with Automatic Failover:** Priority routing: **xAI Grok → Mistral AI → Google Gemini → Deterministic Local Fallback**. Intelligently handles HTTP 429 rate limits, network timeouts, and quota exhaustion with bounded retries and circuit breakers.
- **100% Operational Without External AI Keys:** Seamless local deterministic clinical engine extracts lab measurements, flags abnormal bounds, and explains reports without cloud API credentials.
- **Multilingual Support:** Instant language selection in **English, Telugu (తెలుగు), Hindi (हिन्दी), and Tamil (தமிழ்)**. Preserves medicine names and units accurately.
- **Longitudinal Trend Analytics:** Interactive Recharts graphs tracking biomarkers (Hemoglobin, Fasting Glucose, Cholesterol) across report dates with preserved reference intervals.
- **Medication Organizer & Reminders:** Prescriptions tracking with scheduled dosage reminders, adherence logging, and warnings for ambiguous instructions.
- **FHIR R4-Ready Export:** Generates standardized HL7 FHIR R4 JSON bundles containing `Patient`, `Observation`, `MedicationStatement`, and `DocumentReference` resources.
- **Simulated ABHA Sandbox:** Full Ayushman Bharat Health Account (ABHA) demonstration with simulated 14-digit IDs (`91-XXXX-XXXX-XXXX`) and consent management.
- **Patient Privacy & Air-Gapped Mode:** Server-side authorization, patient data isolation, and a toggleable "Local-Processing Mode" ensuring sensitive medical text never leaves the machine.

---

## 🛠️ Technology Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide React icons, Recharts, React Router DOM, Axios.
- **Backend:** Python 3.10+, FastAPI, Uvicorn, SQLAlchemy ORM, Pydantic v2, SQLite locally and PostgreSQL on Render.
- **Document & Clinical Engines:** PyMuPDF (fitz), Tesseract OCR (pytesseract), PIL, Pandas, NumPy.
- **AI Integrations:** Adapters for xAI Grok, Mistral AI, and Google Gemini with normalized error handling and local fallback.

---

## ⚡ Quick Start Instructions

### 1. Backend Setup
```powershell
# In project root
pip install -r backend/requirements.txt
Copy-Item .env.example .env

# Run automated tests
$env:PYTHONPATH="backend"
python -m pytest backend/tests/test_copilot.py

# Start backend server
$env:PYTHONPATH="backend"
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend runs at `http://127.0.0.1:8000` with Swagger docs at `http://127.0.0.1:8000/docs`.*

### 2. Frontend Setup
```powershell
# In a second terminal
cd frontend
npm install
npm run dev
```
*Frontend runs at `http://localhost:5173`.*

### Deploy to Render

The root [`render.yaml`](render.yaml) Blueprint creates the FastAPI service, React static site, managed PostgreSQL database, and persistent disk for uploaded files. The database and disk require paid Render resources.

1. Push this repository to a Git provider connected to your Render account.
2. In the [Render Dashboard](https://dashboard.render.com), select **New > Blueprint**, connect the repository, and deploy the Blueprint.
3. Enter a Gemini API key when prompted. The application generates its own signing secret; do not replace it with a checked-in value.
4. Wait for both services to finish deploying, then open the `health-copilot-frontend` URL. The API health endpoint is `/healthz`.

The Blueprint keeps the database private to Render and stores uploaded reports on the backend's persistent disk. Keep real patient data out of demo deployments; this project is not, by deployment alone, a guarantee of HIPAA or other regulatory compliance. Review access controls, retention, backups, provider agreements, and applicable privacy obligations before using real medical records.

---

## 📚 Technical Documentation

- 📐 [Architecture & Sequence Diagrams](docs/architecture.md)
- 🛡️ [Clinical Safety Boundaries](docs/safety.md)
- 🔒 [Privacy, Data Isolation & HIPAA Alignment](docs/privacy.md)
- 📖 [Complete Setup & Installation Guide](docs/setup.md)
