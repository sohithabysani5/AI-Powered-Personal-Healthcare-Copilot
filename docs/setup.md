# Complete Setup & Installation Guide

**Project Title:** AI-Powered Personal Health Copilot  
**Subtitle:** A Multilingual Platform for Intelligent Medical Record Analysis, Personalized Health Profiles, and Healthcare Journey Management.

---

## 1. Prerequisites

- **Python 3.10+** (tested with Python 3.10)
- **Node.js v18+** (tested with Node.js v22.17)
- **Tesseract OCR (Optional for scanned image documents):**
  - **Windows:** Download installer from [UB-Mannheim Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) and add `C:\Program Files\Tesseract-OCR` to your system `PATH`.
  - **Ubuntu/Debian:** `sudo apt-get install tesseract-ocr tesseract-ocr-hin tesseract-ocr-tel tesseract-ocr-tam`
  - *Note: Digital text PDFs are extracted natively via PyMuPDF without requiring Tesseract.*

---

## 2. Backend Setup & Startup

1. **Open PowerShell / Terminal** in the project root:
   ```powershell
   cd "c:\Users\bhanu\OneDrive\Desktop\ai powered healthcare copilot"
   ```

2. **Install Python Dependencies:**
   ```powershell
   pip install -r backend/requirements.txt
   ```

3. **Configure Environment:**
   ```powershell
   Copy-Item .env.example .env
   ```
   *(Optional: Add `XAI_API_KEY`, `MISTRAL_API_KEY`, or `GEMINI_API_KEY` to `.env`. If left empty, the application runs seamlessly using local deterministic rule engines.)*

4. **Run Backend Tests:**
   ```powershell
   $env:PYTHONPATH="backend"
   python -m pytest backend/tests/test_copilot.py
   ```

5. **Start FastAPI Backend Server:**
   ```powershell
   $env:PYTHONPATH="backend"
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   The backend API documentation is now live at: `http://127.0.0.1:8000/docs`

---

## 3. Frontend Setup & Startup

1. **In a second terminal window**, navigate to `frontend`:
   ```powershell
   cd frontend
   npm install
   ```

2. **Start Vite Development Server:**
   ```powershell
   npm run dev
   ```

3. **Access Application:**
   Open your browser at `http://localhost:5173`.

---

## 4. Quick Demonstration Flow

1. Click **"Register here"** and create a patient account.
2. In the left navigation, click **"Load Demo Data (Synthetic)"**.
3. Explore:
   - **Dashboard:** Metrics and recent clinical summaries.
   - **Report Comparison:** Interactive longitudinal trend charts for Hemoglobin, Glucose, and Cholesterol.
   - **Health Timeline:** Chronological clinical events.
   - **Medications:** Scheduled dosage reminders and mark as taken.
   - **Health Assistant:** Ask record-grounded questions.
   - **FHIR / ABHA Demo:** Generate FHIR R4 JSON bundles and link simulated ABHA IDs.
   - **Settings:** Inspect AI provider circuit-breaker health and toggle Local-Processing Mode.
