"""Deterministic medical document parser and field extractor."""

import re
from typing import Dict, Any, List


# Common laboratory tests and their standardized patterns
COMMON_LAB_PATTERNS = [
    {
        "name": "Hemoglobin",
        "pattern": r"(?:Hemoglobin|HGB|Hb)\s*[:\-]?\s*([0-9]+\.?[0-9]*)\s*(g/dL|gm/dl|g/l)?(?:\s*\(?([0-9]+\.?[0-9]*\s*[-–]\s*[0-9]+\.?[0-9]*)\)?)?",
        "unit": "g/dL",
        "standard_ref": "12.0 - 16.0"
    },
    {
        "name": "Fasting Blood Glucose",
        "pattern": r"(?:Fasting\s+Blood\s+(?:Sugar|Glucose)|FBS|Glucose\s*\(?Fasting\)?)\s*[:\-]?\s*([0-9]+\.?[0-9]*)\s*(mg/dL|mg/dl|mmol/L)?(?:\s*\(?([0-9]+\.?[0-9]*\s*[-–]\s*[0-9]+\.?[0-9]*)\)?)?",
        "unit": "mg/dL",
        "standard_ref": "70 - 100"
    },
    {
        "name": "Post Prandial Blood Glucose",
        "pattern": r"(?:Post\s+Prandial\s+(?:Sugar|Glucose)|PPBS|Glucose\s*\(?PP\)?)\s*[:\-]?\s*([0-9]+\.?[0-9]*)\s*(mg/dL|mg/dl|mmol/L)?(?:\s*\(?([0-9]+\.?[0-9]*\s*[-–]\s*[0-9]+\.?[0-9]*)\)?)?",
        "unit": "mg/dL",
        "standard_ref": "100 - 140"
    },
    {
        "name": "HbA1c",
        "pattern": r"(?:HbA1c|Glycated\s+Hemoglobin)\s*[:\-]?\s*([0-9]+\.?[0-9]*)\s*(%)?(?:\s*\(?([0-9]+\.?[0-9]*\s*[-–]\s*[0-9]+\.?[0-9]*)\)?)?",
        "unit": "%",
        "standard_ref": "4.0 - 5.6"
    },
    {
        "name": "Total Cholesterol",
        "pattern": r"(?:Total\s+Cholesterol|Cholesterol\s+Total)\s*[:\-]?\s*([0-9]+\.?[0-9]*)\s*(mg/dL|mg/dl)?(?:\s*\(?([0-9]+\.?[0-9]*\s*[-–]\s*[0-9]+\.?[0-9]*)\)?)?",
        "unit": "mg/dL",
        "standard_ref": "125 - 200"
    },
    {
        "name": "Serum Creatinine",
        "pattern": r"(?:Serum\s+Creatinine|Creatinine)\s*[:\-]?\s*([0-9]+\.?[0-9]*)\s*(mg/dL|mg/dl)?(?:\s*\(?([0-9]+\.?[0-9]*\s*[-–]\s*[0-9]+\.?[0-9]*)\)?)?",
        "unit": "mg/dL",
        "standard_ref": "0.6 - 1.2"
    },
    {
        "name": "Blood Urea Nitrogen",
        "pattern": r"(?:BUN|Blood\s+Urea|Urea)\s*[:\-]?\s*([0-9]+\.?[0-9]*)\s*(mg/dL|mg/dl)?(?:\s*\(?([0-9]+\.?[0-9]*\s*[-–]\s*[0-9]+\.?[0-9]*)\)?)?",
        "unit": "mg/dL",
        "standard_ref": "7 - 20"
    },
    {
        "name": "WBC Count",
        "pattern": r"(?:Total\s+Leukocyte\s+Count|TLC|WBC\s+Count|White\s+Blood\s+Cells)\s*[:\-]?\s*([0-9]+\.?[0-9]*)\s*(cells/cumm|/cumm|K/uL)?(?:\s*\(?([0-9,]+\s*[-–]\s*[0-9,]+)\)?)?",
        "unit": "/cumm",
        "standard_ref": "4000 - 11000"
    },
    {
        "name": "Platelet Count",
        "pattern": r"(?:Platelet\s+Count|Platelets)\s*[:\-]?\s*([0-9]+\.?[0-9]*)\s*(lakhs?/cumm|lakh/cumm|/cumm|K/uL)?(?:\s*\(?([0-9\.]+\s*[-–]\s*[0-9\.]+)\)?)?",
        "unit": "lakh/cumm",
        "standard_ref": "1.5 - 4.5"
    },
    {
        "name": "Thyroid Stimulating Hormone (TSH)",
        "pattern": r"(?:TSH|Thyroid\s+Stimulating\s+Hormone)\s*[:\-]?\s*([0-9]+\.?[0-9]*)\s*(uIU/mL|uIU/ml|mIU/L)?(?:\s*\(?([0-9]+\.?[0-9]*\s*[-–]\s*[0-9]+\.?[0-9]*)\)?)?",
        "unit": "uIU/mL",
        "standard_ref": "0.4 - 4.5"
    }
]


def classify_document(text: str) -> str:
    """Classifies document category based on deterministic keyword heuristics."""
    lower_text = text.lower()
    
    if any(k in lower_text for k in ["rx", "prescription", "tab ", "cap ", "tablet", "syrup", "dosage", "twice daily", "once daily"]):
        return "prescription"
    elif any(k in lower_text for k in ["discharge summary", "admission date", "discharge date", "course in hospital", "condition at discharge"]):
        return "discharge_summary"
    elif any(k in lower_text for k in ["laboratory report", "lab report", "test name", "reference interval", "reference range", "haemoglobin", "hemoglobin", "fasting blood sugar"]):
        return "lab_report"
    elif any(k in lower_text for k in ["mri", "ct scan", "x-ray", "ultrasound", "usg", "impression:", "radiology"]):
        return "imaging_report"
    elif any(k in lower_text for k in ["vaccine", "vaccination", "dose 1", "dose 2", "booster", "immunization"]):
        return "vaccination_record"
    elif any(k in lower_text for k in ["clinical consultation", "doctor note", "complaints:", "diagnosis:", "chief complaint"]):
        return "consultation_note"
    return "other"


def extract_patient_name(text: str) -> str | None:
    match = re.search(r"(?:Patient\s*Name|Name\s*of\s*Patient|Pt\s*Name|Name)\s*[:\-]\s*([A-Za-z\.\s]{3,35})", text, re.IGNORECASE)
    if match:
        name = match.group(1).strip()
        # Clean off extra noise
        clean_name = re.sub(r"\s+(?:Age|Gender|Sex|Ref|Date|Dr|Bed).*", "", name, flags=re.IGNORECASE)
        return clean_name.strip()
    return None


def extract_document_date(text: str) -> str | None:
    # Match dates like DD/MM/YYYY, YYYY-MM-DD, DD-Mon-YYYY
    match = re.search(r"(?:Date|Dated|Report\s*Date|Coll(?:\.|ected)?\s*Date)\s*[:\-]?\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4}|[0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{2,4}|[0-9]{4}[\/\-][0-9]{1,2}[\/\-][0-9]{1,2})", text, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return None


def extract_healthcare_provider(text: str) -> str | None:
    match = re.search(r"(?:Hospital|Clinic|Diagnostic\s*Centre|Healthcare|Labs?|Dr\.\s*[A-Za-z\s]+)\b", text, re.IGNORECASE)
    if match:
        # Search the line containing the provider
        for line in text.splitlines()[:10]:
            if any(k in line.lower() for k in ["hospital", "clinic", "diagnostic", "labs", "centre", "dr."]):
                line_clean = line.strip()
                if 4 < len(line_clean) < 60:
                    return line_clean
    return None


def parse_lab_observations(text: str) -> List[Dict[str, Any]]:
    """Deterministic extractor for laboratory measurements."""
    observations = []

    for item in COMMON_LAB_PATTERNS:
        matches = re.finditer(item["pattern"], text, re.IGNORECASE)
        for m in matches:
            val_str = m.group(1)
            try:
                num_val = float(val_str)
            except ValueError:
                num_val = None

            unit = m.group(2) if len(m.groups()) >= 2 and m.group(2) else item["unit"]
            ref_range = m.group(3) if len(m.groups()) >= 3 and m.group(3) else item["standard_ref"]
            
            # Determine flag if ref_range is available
            flag = "Normal"
            if num_val is not None and ref_range:
                nums = re.findall(r"([0-9]+\.?[0-9]*)", ref_range)
                if len(nums) >= 2:
                    low = float(nums[0])
                    high = float(nums[1])
                    if num_val < low:
                        flag = "Low"
                    elif num_val > high:
                        flag = "High"

            observations.append({
                "test_name": item["name"],
                "value": val_str,
                "numeric_value": num_val,
                "unit": unit,
                "reference_range": ref_range,
                "flag": flag,
                "confidence": "High"
            })
            break  # Take first clear occurrence of each test

    return observations


def parse_medications(text: str) -> List[Dict[str, Any]]:
    """Deterministic extractor for medications from prescription text."""
    meds = []
    
    # Matches patterns like: Tab. Metformin 500mg 1-0-1 30 days
    # or: Amoxicillin 500 mg Twice daily
    med_pattern = re.compile(
        r"(?:Tab(?:let)?|Cap(?:sule)?|Syr(?:up)?|Inj(?:ection)?)?\s*\.?\s*([A-Za-z0-9\-\s]{3,25})\s+([0-9]+\s*(?:mg|gm|mcg|ml))\b(?:\s*[:\-]?\s*([0-9\-\/]+|once\s+daily|twice\s+daily|thrice\s+daily|tds|bd|od))?",
        re.IGNORECASE
    )

    lines = text.splitlines()
    for line in lines:
        line_clean = line.strip()
        if not line_clean:
            continue
        m = med_pattern.search(line_clean)
        if m:
            med_name = m.group(1).strip()
            dosage = m.group(2).strip()
            freq = m.group(3).strip() if m.group(3) else "As directed"
            
            # Exclude false positives like dates or common header words
            if any(bad in med_name.lower() for bad in ["date", "report", "patient", "name", "doctor", "phone", "test", "total"]):
                continue

            meds.append({
                "name": med_name,
                "dosage": dosage,
                "frequency": freq,
                "instructions": line_clean,
                "duration": None,
                "is_ambiguous": False
            })

    return meds


def parse_diagnoses(text: str) -> List[str]:
    diagnoses = []
    match = re.search(r"(?:Diagnosis|Impression|Assessment|Condition)\s*[:\-]\s*([^\n\r]+)", text, re.IGNORECASE)
    if match:
        diag_line = match.group(1).strip()
        parts = [p.strip() for p in re.split(r"[,;]|\band\b", diag_line) if len(p.strip()) > 3]
        diagnoses.extend(parts)
    return diagnoses


def extract_document_fields_deterministic(text: str) -> Dict[str, Any]:
    """Top-level deterministic extraction function."""
    cat = classify_document(text)
    patient = extract_patient_name(text)
    doc_date = extract_document_date(text)
    provider = extract_healthcare_provider(text)
    labs = parse_lab_observations(text)
    meds = parse_medications(text)
    diagnoses = parse_diagnoses(text)

    warnings = []
    if not doc_date:
        warnings.append("Document date could not be automatically detected. Please enter manually during review.")
    if not labs and not meds and not diagnoses:
        warnings.append("No common lab tests, medications, or diagnoses were detected by standard rule patterns. Please review extracted text.")

    return {
        "patient_name": patient,
        "document_date": doc_date,
        "healthcare_provider": provider,
        "category": cat,
        "diagnoses": diagnoses,
        "lab_tests": labs,
        "medications": meds,
        "warnings": warnings,
        "raw_text_length": len(text)
    }
