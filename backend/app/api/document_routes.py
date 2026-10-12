"""Medical Document management and extraction endpoints."""

import os
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.session import get_db
from app.models.all_models import (
    User, MedicalDocument, Observation, Medication, TimelineEvent,
    DocumentCategory, ProcessingStatus, VerificationStatus
)
from app.schemas.all_schemas import DocumentResponse, DocumentUpdateReview
from app.auth.security import get_current_user
from app.ocr.extractor import extract_text_from_pdf, extract_text_from_image
from app.medical.parser import extract_document_fields_deterministic
from app.ai.provider_manager import ai_manager

router = APIRouter(prefix="/documents", tags=["Medical Documents"])

ALLOWED_MIME_TYPES = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png"
}


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validation
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{file.content_type}'. Please upload PDF, JPG, or PNG files."
        )

    ext = ALLOWED_MIME_TYPES[file.content_type]
    file_bytes = await file.read()
    if len(file_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum limit of 20MB."
        )

    # 2. Safe server-side file naming
    safe_name = f"doc_{current_user.id}_{uuid.uuid4().hex[:12]}{ext}"
    user_upload_dir = os.path.join(settings.UPLOAD_DIR, f"user_{current_user.id}")
    os.makedirs(user_upload_dir, exist_ok=True)
    file_path = os.path.join(user_upload_dir, safe_name)

    with open(file_path, "wb") as f:
        f.write(file_bytes)

    # 3. Extraction pipeline
    ocr_applied = False
    if ext == ".pdf":
        text, ocr_applied = extract_text_from_pdf(file_path)
    else:
        text, ocr_applied = extract_text_from_image(file_path)

    # Parse fields
    extracted_data = extract_document_fields_deterministic(text)
    category_str = extracted_data.get("category", "other")
    try:
        category_enum = DocumentCategory(category_str)
    except ValueError:
        category_enum = DocumentCategory.OTHER

    # Generate initial explanation (Deterministic fallback or AI if consented)
    ai_expl = await ai_manager.explain_medical_document(
        extracted_data=extracted_data,
        user_consent=current_user.consent_external_ai,
        local_only=current_user.local_only_mode,
        preferred_language=current_user.preferred_language
    )

    # 4. Save to DB
    doc = MedicalDocument(
        user_id=current_user.id,
        filename=safe_name,
        original_filename=file.filename or "medical_document",
        file_path=file_path,
        file_size_bytes=len(file_bytes),
        mime_type=file.content_type,
        category=category_enum,
        document_date=extracted_data.get("document_date"),
        healthcare_provider=extracted_data.get("healthcare_provider"),
        processing_status=ProcessingStatus.NEEDS_REVIEW,
        ocr_applied=ocr_applied,
        extracted_text=text[:10000] if text else "",
        extracted_data_json=extracted_data,
        summary=ai_expl.get("summary"),
        simplified_explanation=ai_expl.get("explanation"),
        doctor_questions=ai_expl.get("doctor_questions", []),
        is_rule_based_summary=ai_expl.get("is_rule_based", True)
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Automatically log Timeline Event for upload
    t_event = TimelineEvent(
        user_id=current_user.id,
        document_id=doc.id,
        title=f"Uploaded {doc.original_filename}",
        category="upload",
        event_date=doc.document_date or doc.upload_date.strftime("%Y-%m-%d"),
        description=f"Uploaded {doc.category.value.replace('_', ' ')} for processing.",
        metadata_json={"document_id": doc.id, "ocr_applied": ocr_applied}
    )
    db.add(t_event)
    db.commit()

    return doc


@router.get("", response_model=List[DocumentResponse])
def get_documents(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(MedicalDocument).filter(MedicalDocument.user_id == current_user.id).order_by(MedicalDocument.upload_date.desc()).all()


@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(doc_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(MedicalDocument).filter(MedicalDocument.id == doc_id, MedicalDocument.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Medical document not found.")
    return doc


@router.get("/{doc_id}/download")
def download_document(doc_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(MedicalDocument).filter(MedicalDocument.id == doc_id, MedicalDocument.user_id == current_user.id).first()
    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found.")
    return FileResponse(doc.file_path, media_type=doc.mime_type, filename=doc.original_filename)


@router.post("/{doc_id}/review", response_model=DocumentResponse)
async def review_and_confirm_document(
    doc_id: int,
    review_in: DocumentUpdateReview,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(MedicalDocument).filter(MedicalDocument.id == doc_id, MedicalDocument.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Medical document not found.")

    if review_in.category:
        try:
            doc.category = DocumentCategory(review_in.category)
        except ValueError:
            pass

    if review_in.document_date is not None:
        doc.document_date = review_in.document_date
    if review_in.healthcare_provider is not None:
        doc.healthcare_provider = review_in.healthcare_provider

    doc.extracted_data_json = review_in.extracted_data_json
    doc.processing_status = ProcessingStatus.COMPLETED

    # Regenerate summary and explanation based on verified user edits
    ai_expl = await ai_manager.explain_medical_document(
        extracted_data=doc.extracted_data_json,
        user_consent=current_user.consent_external_ai,
        local_only=current_user.local_only_mode,
        preferred_language=current_user.preferred_language
    )
    doc.summary = ai_expl.get("summary")
    doc.simplified_explanation = ai_expl.get("explanation")
    doc.doctor_questions = ai_expl.get("doctor_questions", [])
    doc.is_rule_based_summary = ai_expl.get("is_rule_based", True)

    # If user confirms save to unified profile, persist lab observations & medications
    if review_in.confirm_and_save_to_profile:
        # Save lab observations
        labs = review_in.extracted_data_json.get("lab_tests", [])
        for lab in labs:
            obs = Observation(
                user_id=current_user.id,
                document_id=doc.id,
                test_name=lab.get("test_name"),
                value_numeric=lab.get("numeric_value"),
                value_text=str(lab.get("value")),
                unit=lab.get("unit"),
                reference_range=lab.get("reference_range"),
                flag=lab.get("flag", "Normal"),
                observation_date=doc.document_date or doc.upload_date.strftime("%Y-%m-%d"),
                verification_status=VerificationStatus.USER_VERIFIED
            )
            db.add(obs)

        # Save medications
        meds = review_in.extracted_data_json.get("medications", [])
        for m in meds:
            med = Medication(
                user_id=current_user.id,
                document_id=doc.id,
                name=m.get("name"),
                dosage=m.get("dosage"),
                frequency=m.get("frequency"),
                instructions=m.get("instructions"),
                prescribed_by=doc.healthcare_provider,
                start_date=doc.document_date,
                verification_status=VerificationStatus.USER_VERIFIED,
                is_ambiguous=m.get("is_ambiguous", False)
            )
            db.add(med)

    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/{doc_id}")
def delete_document(doc_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(MedicalDocument).filter(MedicalDocument.id == doc_id, MedicalDocument.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Medical document not found.")

    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    db.delete(doc)
    db.commit()
    return {"message": "Document and associated observations removed."}
