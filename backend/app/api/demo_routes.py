"""Synthetic medical demo data loader for demonstration and hackathon showcases."""

import os
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.all_models import (
    User, HealthProfile, MedicalDocument, Observation, Medication,
    MedicationReminder, TimelineEvent, WellnessEntry,
    DocumentCategory, ProcessingStatus, VerificationStatus
)
from app.auth.security import get_current_user

router = APIRouter(prefix="/demo", tags=["Demo Data Loader"])


@router.post("/load")
def load_synthetic_demo_data(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Populates current user's profile with fully synthetic medical demonstration data.
    Clearly labelled with synthetic origins and safe demonstration values.
    """
    # 1. Update Profile
    profile = db.query(HealthProfile).filter(HealthProfile.user_id == current_user.id).first()
    if not profile:
        profile = HealthProfile(user_id=current_user.id)
        db.add(profile)

    profile.date_of_birth = "1988-06-14"
    profile.gender = "Male"
    profile.blood_group = "O+"
    profile.allergies = [
        {"name": "Penicillin", "severity": "Moderate (Skin rash)", "verified": True},
        {"name": "Peanuts", "severity": "Mild", "verified": True}
    ]
    profile.chronic_conditions = ["Type 2 Diabetes Mellitus (Well-managed)", "Mild Hypertension"]
    profile.emergency_contact_name = "Sarah Miller"
    profile.emergency_contact_phone = "+1 (555) 349-8201"
    profile.abha_number = "91-8842-1940-5201"
    profile.abha_address = f"{current_user.email.split('@')[0]}@abdm-demo"
    profile.abha_linked = True

    # 2. Add Synthetic Documents
    doc1 = MedicalDocument(
        user_id=current_user.id,
        filename="demo_comprehensive_metabolic_panel.pdf",
        original_filename="Comprehensive_Metabolic_Panel_Sept_2026.pdf",
        file_path="uploads/demo_doc1.pdf",
        file_size_bytes=104520,
        mime_type="application/pdf",
        category=DocumentCategory.LAB_REPORT,
        document_date="2026-09-15",
        healthcare_provider="Metro Diagnostics & Health Center",
        processing_status=ProcessingStatus.COMPLETED,
        ocr_applied=False,
        extracted_text="Metro Diagnostics. Comprehensive Lab Panel. Fasting Blood Glucose: 98 mg/dL. Hemoglobin: 14.5 g/dL. Total Cholesterol: 185 mg/dL. Serum Creatinine: 0.9 mg/dL. HbA1c: 5.4%.",
        extracted_data_json={
            "document_date": "2026-09-15",
            "healthcare_provider": "Metro Diagnostics & Health Center",
            "category": "lab_report",
            "lab_tests": [
                {"test_name": "Hemoglobin", "value": "14.5", "numeric_value": 14.5, "unit": "g/dL", "reference_range": "13.0 - 17.0", "flag": "Normal"},
                {"test_name": "Fasting Blood Glucose", "value": "98", "numeric_value": 98.0, "unit": "mg/dL", "reference_range": "70 - 100", "flag": "Normal"},
                {"test_name": "HbA1c", "value": "5.4", "numeric_value": 5.4, "unit": "%", "reference_range": "4.0 - 5.6", "flag": "Normal"},
                {"test_name": "Total Cholesterol", "value": "185", "numeric_value": 185.0, "unit": "mg/dL", "reference_range": "125 - 200", "flag": "Normal"},
                {"test_name": "Serum Creatinine", "value": "0.9", "numeric_value": 0.9, "unit": "mg/dL", "reference_range": "0.6 - 1.2", "flag": "Normal"}
            ],
            "medications": [],
            "diagnoses": []
        },
        summary="Synthetic Metabolic Profile: All routine markers within typical laboratory thresholds.",
        simplified_explanation="Your metabolic panel shows healthy blood sugar regulation (98 mg/dL) and optimal hemoglobin levels (14.5 g/dL). Kidney filtration parameters are within expected limits.",
        doctor_questions=[
            "Should we continue with the current annual checkup schedule?",
            "Are there any additional cardiovascular markers to monitor?"
        ],
        is_rule_based_summary=True
    )

    doc2 = MedicalDocument(
        user_id=current_user.id,
        filename="demo_prescription_aug_2026.pdf",
        original_filename="Consultation_Prescription_Cardiology.pdf",
        file_path="uploads/demo_doc2.pdf",
        file_size_bytes=84120,
        mime_type="application/pdf",
        category=DocumentCategory.PRESCRIPTION,
        document_date="2026-08-10",
        healthcare_provider="City Health Multispeciality Hospital - Dr. Rajesh Sharma",
        processing_status=ProcessingStatus.COMPLETED,
        ocr_applied=False,
        extracted_text="City Health Hospital. Rx: Tab. Metformin 500mg Twice daily after food. Tab. Telmisartan 40mg Once daily morning.",
        extracted_data_json={
            "document_date": "2026-08-10",
            "healthcare_provider": "City Health Multispeciality Hospital",
            "category": "prescription",
            "medications": [
                {"name": "Metformin", "dosage": "500 mg", "frequency": "Twice daily after meals", "instructions": "Take after breakfast and dinner"},
                {"name": "Telmisartan", "dosage": "40 mg", "frequency": "Once daily morning", "instructions": "Take in morning before food"}
            ]
        },
        summary="Prescription for glycemic and blood pressure regulation.",
        simplified_explanation="Medication schedule prescribed for preventive glycemic regulation and cardiovascular maintenance.",
        doctor_questions=["When should I schedule the next blood pressure review?"],
        is_rule_based_summary=True
    )

    db.add(doc1)
    db.add(doc2)
    db.commit()

    # 3. Add Multi-date Trend Observations (For comparative charts)
    trend_data = [
        # Fasting Glucose Trend across 4 quarters
        ("Fasting Blood Glucose", 118.0, "118", "mg/dL", "70 - 100", "High", "2025-12-10"),
        ("Fasting Blood Glucose", 108.0, "108", "mg/dL", "70 - 100", "High", "2026-03-14"),
        ("Fasting Blood Glucose", 102.0, "102", "mg/dL", "70 - 100", "High", "2026-06-20"),
        ("Fasting Blood Glucose", 98.0, "98", "mg/dL", "70 - 100", "Normal", "2026-09-15"),
        # Hemoglobin Trend
        ("Hemoglobin", 13.8, "13.8", "g/dL", "13.0 - 17.0", "Normal", "2025-12-10"),
        ("Hemoglobin", 14.1, "14.1", "g/dL", "13.0 - 17.0", "Normal", "2026-03-14"),
        ("Hemoglobin", 14.3, "14.3", "g/dL", "13.0 - 17.0", "Normal", "2026-06-20"),
        ("Hemoglobin", 14.5, "14.5", "g/dL", "13.0 - 17.0", "Normal", "2026-09-15"),
        # Total Cholesterol Trend
        ("Total Cholesterol", 215.0, "215", "mg/dL", "125 - 200", "High", "2025-12-10"),
        ("Total Cholesterol", 205.0, "205", "mg/dL", "125 - 200", "High", "2026-03-14"),
        ("Total Cholesterol", 192.0, "192", "mg/dL", "125 - 200", "Normal", "2026-06-20"),
        ("Total Cholesterol", 185.0, "185", "mg/dL", "125 - 200", "Normal", "2026-09-15")
    ]

    for item in trend_data:
        obs = Observation(
            user_id=current_user.id,
            document_id=doc1.id,
            test_name=item[0],
            value_numeric=item[1],
            value_text=item[2],
            unit=item[3],
            reference_range=item[4],
            flag=item[5],
            observation_date=item[6],
            verification_status=VerificationStatus.USER_VERIFIED
        )
        db.add(obs)

    # 4. Add Medications & Reminders
    med1 = Medication(
        user_id=current_user.id,
        document_id=doc2.id,
        name="Metformin",
        dosage="500 mg",
        frequency="Twice daily after meals",
        instructions="Take morning and evening after food",
        prescribed_by="Dr. Rajesh Sharma",
        start_date="2026-08-10",
        is_active=True,
        verification_status=VerificationStatus.USER_VERIFIED
    )
    med2 = Medication(
        user_id=current_user.id,
        document_id=doc2.id,
        name="Telmisartan",
        dosage="40 mg",
        frequency="Once daily morning",
        instructions="Take at 8:00 AM before breakfast",
        prescribed_by="Dr. Rajesh Sharma",
        start_date="2026-08-10",
        is_active=True,
        verification_status=VerificationStatus.USER_VERIFIED
    )
    db.add(med1)
    db.add(med2)
    db.commit()

    rem1 = MedicationReminder(user_id=current_user.id, medication_id=med1.id, time_of_day="08:30", days_of_week="all")
    rem2 = MedicationReminder(user_id=current_user.id, medication_id=med1.id, time_of_day="20:30", days_of_week="all")
    rem3 = MedicationReminder(user_id=current_user.id, medication_id=med2.id, time_of_day="08:00", days_of_week="all")
    db.add(rem1)
    db.add(rem2)
    db.add(rem3)

    # 5. Timeline Events
    timeline_events = [
        ("Comprehensive Health Checkup", "lab", "2026-09-15", "Routine quarterly metabolic assessment completed with optimal values."),
        ("Cardiology Follow-up Consultation", "visit", "2026-08-10", "Reviewed lifestyle modifications and blood pressure maintenance."),
        ("Quarterly Blood Sugar Review", "lab", "2026-06-20", "Showed ongoing glycemic reduction following diet optimization."),
        ("Spring Wellness Check", "lab", "2026-03-14", "HbA1c assessed alongside lipid panel."),
        ("Annual Health Baseline", "lab", "2025-12-10", "Initial baseline measurements recorded.")
    ]
    for ev in timeline_events:
        db.add(TimelineEvent(
            user_id=current_user.id,
            title=ev[0],
            category=ev[1],
            event_date=ev[2],
            description=ev[3]
        ))

    # 6. Wellness Entries
    wellness_data = [
        ("2026-10-10", 72.4, 7.5, 2.5, 45, "Brisk morning walk, feeling energetic."),
        ("2026-10-09", 72.6, 7.0, 2.8, 30, "Adequate hydration maintained."),
        ("2026-10-08", 72.8, 8.0, 3.0, 40, "Good recovery day.")
    ]
    for w in wellness_data:
        db.add(WellnessEntry(
            user_id=current_user.id,
            entry_date=w[0],
            weight_kg=w[1],
            sleep_hours=w[2],
            water_liters=w[3],
            exercise_minutes=w[4],
            notes=w[5]
        ))

    db.commit()

    return {
        "status": "success",
        "message": "Synthetic demonstration dataset loaded successfully! Explore dashboard, timeline, medications, and trend charts.",
        "label": "DEMO DATA — SYNTHETIC CLINICAL DEMONSTRATION"
    }
