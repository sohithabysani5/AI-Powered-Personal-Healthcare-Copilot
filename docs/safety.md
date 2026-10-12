# Clinical Safety Guidelines & Boundaries — AI-Powered Personal Health Copilot

## Core Clinical Safety Philosophy

The **AI-Powered Personal Health Copilot** is designed exclusively as an educational, organizational, and record-structuring aid for patients. It is **not** a diagnostic device and **must never** substitute for a physician’s clinical judgment.

---

## 1. Prohibited Actions (Strictly Enforced)

Under no circumstances does this application:
1. **Diagnose diseases:** Never infers or asserts that a patient has a medical condition from an isolated test or uploaded report.
2. **Prescribe or modify medication:** Never alters prescription dosages, frequencies, or suggests stopping treatments.
3. **Fabricate reference intervals:** If a laboratory document does not explicitly provide a reference range, the value is marked as "Reference Range Unspecified" rather than guessed.
4. **Present AI output as licensed medical advice:** Every explanation includes clear disclaimers that reference ranges differ across laboratories, instruments, patient age, and clinical conditions.

---

## 2. Emergency & Urgent Symptoms Protocol

If a patient describes acute emergency symptoms (severe chest pain, difficulty breathing, sudden slurred speech, acute trauma):
- The assistant is instructed via system prompts to immediately direct the user to emergency medical services or nearest trauma centers without attempting diagnosis.

---

## 3. Human-in-the-Loop Verification

- All findings extracted by OCR or rule parsers are presented on an interactive **Review & Verification** screen.
- Extracted values do **not** enter the patient's verified health profile or timeline until explicitly reviewed and confirmed by the patient.
