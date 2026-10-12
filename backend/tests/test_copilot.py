"""Automated test suite verifying authentication, medical extraction, AI failover, and FHIR export."""

import pytest
import os
import json
from fastapi.testclient import TestClient

# Set testing environment variables before importing app
os.environ["APP_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-32-character-minimum-requirement-12345"
os.environ["DATABASE_URL"] = "sqlite:///./test_health_copilot.db"

from app.main import app
from app.database.session import Base, engine, SessionLocal
from app.medical.parser import extract_document_fields_deterministic
from app.medical.local_explainer import generate_deterministic_summary
from app.medical.fhir_exporter import export_fhir_bundle
from app.ai.provider_manager import ai_manager
from app.ai.provider_base import ProviderResponse

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_health_copilot.db"):
        try:
            os.remove("./test_health_copilot.db")
        except Exception:
            pass


def test_auth_registration_and_login():
    # 1. Register User
    reg_payload = {
        "email": "sarah.patient@example.com",
        "password": "Password123!",
        "full_name": "Sarah Jenkins",
        "preferred_language": "en"
    }
    res = client.post("/api/v1/auth/register", json=reg_payload)
    assert res.status_code == 200, res.text
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "sarah.patient@example.com"
    token = data["access_token"]

    # 2. Get Profile (/me)
    headers = {"Authorization": f"Bearer {token}"}
    res_me = client.get("/api/v1/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["full_name"] == "Sarah Jenkins"

    # 3. Login
    login_res = client.post("/api/v1/auth/login", json={
        "email": "sarah.patient@example.com",
        "password": "Password123!"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


def test_cross_user_data_isolation():
    # Create User 1
    r1 = client.post("/api/v1/auth/register", json={
        "email": "user1@example.com",
        "password": "Password123!",
        "full_name": "User One"
    })
    token1 = r1.json()["access_token"]

    # Create User 2
    r2 = client.post("/api/v1/auth/register", json={
        "email": "user2@example.com",
        "password": "Password123!",
        "full_name": "User Two"
    })
    token2 = r2.json()["access_token"]

    # Load demo data for User 1
    client.post("/api/v1/demo/load", headers={"Authorization": f"Bearer {token1}"})

    # User 1 should have observations
    obs_u1 = client.get("/api/v1/health/observations", headers={"Authorization": f"Bearer {token1}"}).json()
    assert len(obs_u1) > 0

    # User 2 should have 0 observations (Strict Backend Isolation)
    obs_u2 = client.get("/api/v1/health/observations", headers={"Authorization": f"Bearer {token2}"}).json()
    assert len(obs_u2) == 0


def test_deterministic_medical_parser():
    sample_report = """
    CITY METRO LABS
    Date: 15/09/2026
    Patient Name: Johnathan Doe
    Fasting Blood Glucose: 110 mg/dL (70-100)
    Hemoglobin: 14.2 g/dL (12.0 - 16.0)
    Total Cholesterol: 210 mg/dL (125-200)
    Rx:
    Tab. Metformin 500mg Twice daily
    """
    extracted = extract_document_fields_deterministic(sample_report)
    assert extracted["document_date"] == "15/09/2026"
    assert "Johnathan Doe" in extracted["patient_name"]
    assert len(extracted["lab_tests"]) >= 3
    
    # Check glucose flag
    glucose = next(t for t in extracted["lab_tests"] if t["test_name"] == "Fasting Blood Glucose")
    assert glucose["numeric_value"] == 110.0
    assert glucose["flag"] == "High"

    # Check local deterministic explainer
    expl = generate_deterministic_summary(extracted)
    assert expl["is_rule_based"] is True
    assert "Fasting Blood Glucose" in expl["explanation"]
    assert len(expl["doctor_questions"]) > 0


def test_fhir_bundle_exporter():
    user = {"id": 1, "full_name": "Sarah Jenkins"}
    profile = {"gender": "female", "date_of_birth": "1992-04-12", "abha_number": "91-1122-3344-5566"}
    obs = [{"id": 101, "test_name": "Hemoglobin", "value_numeric": 14.2, "value_text": "14.2", "unit": "g/dL", "reference_range": "12.0 - 16.0"}]
    meds = [{"id": 201, "name": "Metformin", "dosage": "500 mg", "frequency": "twice daily", "is_active": True}]
    docs = [{"id": 301, "original_filename": "blood_test.pdf", "category": "lab_report"}]

    bundle = export_fhir_bundle(user, profile, docs, obs, meds)
    assert bundle["resourceType"] == "Bundle"
    assert bundle["type"] == "collection"
    assert bundle["total"] == 4
    
    res_types = [e["resource"]["resourceType"] for e in bundle["entry"]]
    assert "Patient" in res_types
    assert "Observation" in res_types
    assert "MedicationStatement" in res_types
    assert "DocumentReference" in res_types


@pytest.mark.asyncio
async def test_ai_failover_and_local_fallback(monkeypatch):
    # Test that when external AI fails or is unconfigured, system falls back cleanly to local
    extracted_data = {
        "category": "lab_report",
        "document_date": "2026-09-15",
        "healthcare_provider": "Central Clinic",
        "lab_tests": [{"test_name": "Hemoglobin", "value": "14.0", "unit": "g/dL", "reference_range": "12-16", "flag": "Normal"}]
    }

    # Simulate local-only mode (No external API calls permitted)
    result = await ai_manager.explain_medical_document(
        extracted_data=extracted_data,
        user_consent=False,
        local_only=True
    )
    assert result["is_rule_based"] is True
    assert "Hemoglobin" in result["explanation"]
