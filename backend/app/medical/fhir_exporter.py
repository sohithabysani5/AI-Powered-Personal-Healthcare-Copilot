"""FHIR R4-aligned structured healthcare data exporter."""

import uuid
from datetime import datetime
from typing import Dict, Any, List


def export_fhir_bundle(user_dict: Dict[str, Any], profile_dict: Dict[str, Any], documents: List[Dict[str, Any]], observations: List[Dict[str, Any]], medications: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generates a valid FHIR R4 Bundle containing Patient, Observations,
    MedicationStatements, and DocumentReferences.
    """
    patient_id = f"urn:uuid:{uuid.uuid5(uuid.NAMESPACE_DNS, str(user_dict.get('id')))}"
    bundle_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat() + "Z"

    entries = []

    # 1. Patient Resource
    patient_entry = {
        "fullUrl": patient_id,
        "resource": {
            "resourceType": "Patient",
            "id": str(user_dict.get("id")),
            "identifier": [
                {
                    "system": "urn:ietf:rfc:3986",
                    "value": f"user-{user_dict.get('id')}"
                }
            ],
            "active": True,
            "name": [
                {
                    "use": "official",
                    "text": user_dict.get("full_name")
                }
            ],
            "gender": (profile_dict.get("gender") or "unknown").lower(),
            "birthDate": profile_dict.get("date_of_birth") or "1990-01-01"
        }
    }
    if profile_dict.get("abha_number"):
        patient_entry["resource"]["identifier"].append({
            "system": "https://healthid.ndhm.gov.in",
            "value": profile_dict.get("abha_number"),
            "type": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                        "code": "MR",
                        "display": "Simulated ABHA ID"
                    }
                ]
            }
        })
    entries.append(patient_entry)

    # 2. Observations (Lab Tests)
    for obs in observations:
        obs_id = str(uuid.uuid4())
        obs_entry = {
            "fullUrl": f"urn:uuid:{obs_id}",
            "resource": {
                "resourceType": "Observation",
                "id": str(obs.get("id", obs_id)),
                "status": "final",
                "category": [
                    {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                                "code": "laboratory",
                                "display": "Laboratory"
                            }
                        ]
                    }
                ],
                "code": {
                    "text": obs.get("test_name")
                },
                "subject": {
                    "reference": patient_id
                },
                "effectiveDateTime": obs.get("observation_date") or timestamp[:10],
                "valueQuantity": {
                    "value": obs.get("value_numeric"),
                    "unit": obs.get("unit") or ""
                } if obs.get("value_numeric") is not None else None,
                "valueString": obs.get("value_text") if obs.get("value_numeric") is None else None,
                "referenceRange": [
                    {
                        "text": obs.get("reference_range")
                    }
                ] if obs.get("reference_range") else []
            }
        }
        # Clean null values
        if obs_entry["resource"]["valueQuantity"] is None:
            del obs_entry["resource"]["valueQuantity"]
        if obs_entry["resource"]["valueString"] is None:
            del obs_entry["resource"]["valueString"]

        entries.append(obs_entry)

    # 3. Medications (MedicationStatement)
    for med in medications:
        med_id = str(uuid.uuid4())
        med_entry = {
            "fullUrl": f"urn:uuid:{med_id}",
            "resource": {
                "resourceType": "MedicationStatement",
                "id": str(med.get("id", med_id)),
                "status": "active" if med.get("is_active", True) else "completed",
                "medicationCodeableConcept": {
                    "text": med.get("name")
                },
                "subject": {
                    "reference": patient_id
                },
                "dosage": [
                    {
                        "text": f"{med.get('dosage') or ''} {med.get('frequency') or ''}".strip()
                    }
                ]
            }
        }
        entries.append(med_entry)

    # 4. DocumentReferences
    for doc in documents:
        doc_id = str(uuid.uuid4())
        doc_entry = {
            "fullUrl": f"urn:uuid:{doc_id}",
            "resource": {
                "resourceType": "DocumentReference",
                "id": str(doc.get("id", doc_id)),
                "status": "current",
                "type": {
                    "text": doc.get("category", "medical_record")
                },
                "subject": {
                    "reference": patient_id
                },
                "date": timestamp,
                "description": doc.get("original_filename", "Medical Document")
            }
        }
        entries.append(doc_entry)

    return {
        "resourceType": "Bundle",
        "id": bundle_id,
        "type": "collection",
        "timestamp": timestamp,
        "total": len(entries),
        "entry": entries
    }
