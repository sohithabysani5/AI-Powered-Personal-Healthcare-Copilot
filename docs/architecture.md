# AI-Powered Personal Health Copilot — Architecture & Technical Specifications

**Exact Project Identity:** AI-Powered Personal Health Copilot  
**Subtitle:** A Multilingual Platform for Intelligent Medical Record Analysis, Personalized Health Profiles, and Healthcare Journey Management.

---

## 1. High-Level System Architecture

```mermaid
graph TD
    User([Patient / Healthcare User]) -->|Upload / Chat / View| ReactFE[React 18 + Vite + TypeScript Frontend]
    ReactFE -->|REST API Requests with Bearer JWT| FastAPIBE[FastAPI Backend Engine]
    
    subgraph Security & Access Control
        FastAPIBE --> AuthGuard[JWT Security & Patient Data Isolation]
    end

    subgraph Document Processing & OCR
        AuthGuard --> DocMgr[Medical Document Manager]
        DocMgr --> NativePDF[PyMuPDF Digital Text Extractor]
        DocMgr --> OCRPipeline[Tesseract OCR & Image Preprocessing]
        NativePDF --> RuleParser[Deterministic Medical Rule Parser]
        OCRPipeline --> RuleParser
    end

    subgraph Clinical Storage & Persistence
        RuleParser --> ReviewGate[Human-in-the-Loop Verification Gate]
        ReviewGate --> SQLiteDB[(SQLite / SQLAlchemy ORM)]
    end

    subgraph Multi-Provider AI Routing with Failover
        ReviewGate --> AIMgr[AI Provider Manager]
        AIMgr -->|Priority 1| Grok[xAI Grok Adapter]
        AIMgr -.->|Failover 429/Timeout| Mistral[Mistral AI Adapter]
        AIMgr -.->|Failover| Gemini[Google Gemini Adapter]
        AIMgr -.->|Air-Gapped / Outage| LocalEngine[Deterministic Clinical Explainer Engine]
    end

    subgraph Interoperability & Integration
        SQLiteDB --> FHIRExporter[FHIR R4 Bundle Exporter]
        SQLiteDB --> ABHADemo[Simulated ABHA Sandbox]
    end

    AIMgr --> ReactFE
    LocalEngine --> ReactFE
    FHIRExporter --> User
    ABHADemo --> User
```

---

## 2. Medical Document Processing & OCR Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Patient as Patient
    participant FE as React Frontend
    participant API as FastAPI Backend
    participant Parser as PyMuPDF & Tesseract OCR
    participant Rules as Deterministic Rule Engine
    participant AIMgr as Multi-Provider AI Manager
    participant DB as Isolated Database

    Patient->>FE: Upload Medical Record (PDF / JPG / PNG)
    FE->>API: POST /api/v1/documents/upload (Validated File)
    API->>Parser: Extract Digital Text or OCR Image
    Parser-->>API: Raw Text Payload & OCR Flag
    API->>Rules: Classify Category, Extract Lab Ranges, Prescriptions
    Rules-->>API: Structured Medical Fields
    alt External AI Consented & Configured
        API->>AIMgr: Request Explanations with Failover
        AIMgr-->>API: Synthesized Educational Findings
    else Local Only Mode or Unconfigured AI
        API->>Rules: Generate Local Deterministic Summary
        Rules-->>API: Verified Rule-Based Output
    end
    API->>DB: Persist Document with "Needs Review" status
    API-->>FE: Return Document Details
    Patient->>FE: Inspect Values, Correct Uncertain Fields, Confirm
    FE->>API: POST /api/v1/documents/:id/review (confirm_and_save_to_profile=true)
    API->>DB: Save Verified Observations, Prescriptions & Timeline Events
```

---

## 3. Multi-Provider AI Routing & Circuit Breaker Logic

The AI Provider Manager routes requests strictly in the following priority order:
1. **xAI Grok** (`grok-beta`)
2. **Mistral AI** (`mistral-small-latest`)
3. **Google Gemini** (`gemini-1.5-flash`)
4. **Local Deterministic Fallback** (Rules engine with zero external network dependencies)

### Failover & Circuit Breaker Protocol:
- **HTTP 429 (Rate Limits) / 5xx / Network Timeouts:** Automatically trigger failover to the next eligible provider without duplicating non-idempotent operations.
- **Circuit Breaker:** After 3 consecutive provider failures, the provider's circuit opens for 60 seconds (cooldown). Subsequent requests bypass it immediately to reduce latency.
- **Privacy & Consent Gate:** If the user enables "Local-Processing Mode" or revokes external AI consent, the multi-provider system is completely bypassed. Medical records stay entirely on-premises.

---

## 4. FHIR R4 Interoperability & Simulated ABHA Profile

- **FHIR R4 Alignment:** Generates standard `Bundle` (type: `collection`) with valid `Patient`, `Observation`, `MedicationStatement`, and `DocumentReference` clinical representations.
- **Simulated ABHA Profile:** Fully functional sandbox workflow allowing patients to link simulated 14-digit ABHA health numbers (e.g. `91-XXXX-XXXX-XXXX`) and addresses. Prominently labeled with sandbox disclaimers.
