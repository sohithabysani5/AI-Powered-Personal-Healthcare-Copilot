"""Health Profile, Observations, Timeline, Medications, Reminders, and Wellness endpoints."""

from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.models.all_models import (
    User, HealthProfile, Observation, Medication, MedicationReminder,
    TimelineEvent, WellnessEntry, Condition, MedicalDocument, VerificationStatus,
    AssistantConversation, AssistantMessage
)
from app.schemas.all_schemas import (
    HealthProfileResponse, HealthProfileUpdate,
    ObservationResponse, ObservationCreate, TrendSeriesPoint,
    MedicationResponse, MedicationCreate,
    MedicationReminderResponse, MedicationReminderCreate,
    TimelineEventResponse, TimelineEventCreate,
    WellnessResponse, WellnessCreate,
    HealthQARequest, HealthQAResponse,
    AIProviderConfigResponse
)
from app.auth.security import get_current_user
from app.ai.provider_manager import ai_manager
from app.medical.fhir_exporter import export_fhir_bundle

router = APIRouter(prefix="/health", tags=["Health Intelligence"])


# --- Unified Profile ---
@router.get("/profile", response_model=HealthProfileResponse)
def get_health_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(HealthProfile).filter(HealthProfile.user_id == current_user.id).first()
    if not profile:
        profile = HealthProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.patch("/profile", response_model=HealthProfileResponse)
def update_health_profile(
    p_in: HealthProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(HealthProfile).filter(HealthProfile.user_id == current_user.id).first()
    if not profile:
        profile = HealthProfile(user_id=current_user.id)
        db.add(profile)

    if p_in.date_of_birth is not None:
        profile.date_of_birth = p_in.date_of_birth
    if p_in.gender is not None:
        profile.gender = p_in.gender
    if p_in.blood_group is not None:
        profile.blood_group = p_in.blood_group
    if p_in.allergies is not None:
        profile.allergies = p_in.allergies
    if p_in.chronic_conditions is not None:
        profile.chronic_conditions = p_in.chronic_conditions
    if p_in.emergency_contact_name is not None:
        profile.emergency_contact_name = p_in.emergency_contact_name
    if p_in.emergency_contact_phone is not None:
        profile.emergency_contact_phone = p_in.emergency_contact_phone

    db.commit()
    db.refresh(profile)
    return profile


# --- Observations & Trends ---
@router.get("/observations", response_model=List[ObservationResponse])
def get_observations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Observation).filter(Observation.user_id == current_user.id).order_by(Observation.created_at.desc()).all()


@router.post("/observations", response_model=ObservationResponse)
def create_observation(obs_in: ObservationCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obs = Observation(
        user_id=current_user.id,
        test_name=obs_in.test_name,
        value_numeric=obs_in.value_numeric,
        value_text=obs_in.value_text,
        unit=obs_in.unit,
        reference_range=obs_in.reference_range,
        reference_low=obs_in.reference_low,
        reference_high=obs_in.reference_high,
        flag=obs_in.flag or "Normal",
        observation_date=obs_in.observation_date,
        document_id=obs_in.document_id,
        notes=obs_in.notes,
        verification_status=VerificationStatus.USER_VERIFIED
    )
    db.add(obs)
    db.commit()
    db.refresh(obs)
    return obs


@router.get("/trends/{test_name}", response_model=List[TrendSeriesPoint])
def get_trends_for_test(test_name: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Retrieve all measurements for this test name with numeric values
    obs_list = db.query(Observation).filter(
        Observation.user_id == current_user.id,
        func.lower(Observation.test_name) == test_name.lower().strip(),
        Observation.value_numeric.isnot(None)
    ).order_by(Observation.observation_date.asc(), Observation.created_at.asc()).all()

    points = []
    for obs in obs_list:
        points.append(TrendSeriesPoint(
            date=obs.observation_date or obs.created_at.strftime("%Y-%m-%d"),
            value=obs.value_numeric,
            value_text=obs.value_text,
            unit=obs.unit,
            reference_range=obs.reference_range,
            flag=obs.flag,
            document_id=obs.document_id
        ))
    return points


@router.get("/available-tests")
def get_available_tests(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    results = db.query(Observation.test_name).filter(
        Observation.user_id == current_user.id,
        Observation.value_numeric.isnot(None)
    ).distinct().all()
    return [r[0] for r in results]


# --- Medications & Reminders ---
@router.get("/medications", response_model=List[MedicationResponse])
def get_medications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Medication).filter(Medication.user_id == current_user.id).order_by(Medication.created_at.desc()).all()


@router.post("/medications", response_model=MedicationResponse)
def create_medication(med_in: MedicationCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    med = Medication(
        user_id=current_user.id,
        name=med_in.name,
        dosage=med_in.dosage,
        frequency=med_in.frequency,
        instructions=med_in.instructions,
        prescribed_by=med_in.prescribed_by,
        start_date=med_in.start_date,
        end_date=med_in.end_date,
        is_active=med_in.is_active,
        document_id=med_in.document_id,
        is_ambiguous=med_in.is_ambiguous,
        verification_status=VerificationStatus.USER_VERIFIED
    )
    db.add(med)
    db.commit()
    db.refresh(med)
    return med


@router.patch("/medications/{med_id}/toggle-active")
def toggle_medication(med_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    med = db.query(Medication).filter(Medication.id == med_id, Medication.user_id == current_user.id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    med.is_active = not med.is_active
    db.commit()
    return {"message": "Status updated", "is_active": med.is_active}


@router.delete("/medications/{med_id}")
def delete_medication(med_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    med = db.query(Medication).filter(Medication.id == med_id, Medication.user_id == current_user.id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    db.delete(med)
    db.commit()
    return {"message": "Medication deleted"}


@router.get("/reminders", response_model=List[MedicationReminderResponse])
def get_reminders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    reminders = db.query(MedicationReminder).filter(MedicationReminder.user_id == current_user.id).all()
    res = []
    for r in reminders:
        res.append(MedicationReminderResponse(
            id=r.id,
            medication_id=r.medication_id,
            medication_name=r.medication.name if r.medication else "Unknown",
            time_of_day=r.time_of_day,
            days_of_week=r.days_of_week,
            is_active=r.is_active,
            last_taken_at=r.last_taken_at,
            last_status=r.last_status,
            created_at=r.created_at
        ))
    return res


@router.post("/reminders", response_model=MedicationReminderResponse)
def create_reminder(r_in: MedicationReminderCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    med = db.query(Medication).filter(Medication.id == r_in.medication_id, Medication.user_id == current_user.id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication record not found.")

    reminder = MedicationReminder(
        user_id=current_user.id,
        medication_id=r_in.medication_id,
        time_of_day=r_in.time_of_day,
        days_of_week=r_in.days_of_week or "all"
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)

    return MedicationReminderResponse(
        id=reminder.id,
        medication_id=reminder.medication_id,
        medication_name=med.name,
        time_of_day=reminder.time_of_day,
        days_of_week=reminder.days_of_week,
        is_active=reminder.is_active,
        last_taken_at=reminder.last_taken_at,
        last_status=reminder.last_status,
        created_at=reminder.created_at
    )


@router.post("/reminders/{reminder_id}/log-action")
def log_reminder_action(reminder_id: int, action: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    r = db.query(MedicationReminder).filter(MedicationReminder.id == reminder_id, MedicationReminder.user_id == current_user.id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reminder not found.")
    from datetime import datetime
    r.last_status = action  # "taken", "skipped"
    r.last_taken_at = datetime.utcnow()
    db.commit()
    return {"message": f"Reminder recorded as {action}."}


# --- Timeline ---
@router.get("/timeline", response_model=List[TimelineEventResponse])
def get_timeline(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(TimelineEvent).filter(TimelineEvent.user_id == current_user.id).order_by(TimelineEvent.event_date.desc(), TimelineEvent.created_at.desc()).all()


@router.post("/timeline", response_model=TimelineEventResponse)
def add_timeline_event(t_in: TimelineEventCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    te = TimelineEvent(
        user_id=current_user.id,
        title=t_in.title,
        category=t_in.category,
        event_date=t_in.event_date,
        description=t_in.description,
        document_id=t_in.document_id,
        metadata_json=t_in.metadata_json or {}
    )
    db.add(te)
    db.commit()
    db.refresh(te)
    return te


# --- Wellness Tracker ---
@router.get("/wellness", response_model=List[WellnessResponse])
def get_wellness_entries(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(WellnessEntry).filter(WellnessEntry.user_id == current_user.id).order_by(WellnessEntry.entry_date.desc()).all()


@router.post("/wellness", response_model=WellnessResponse)
def add_wellness_entry(w_in: WellnessCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    w = WellnessEntry(
        user_id=current_user.id,
        entry_date=w_in.entry_date,
        weight_kg=w_in.weight_kg,
        sleep_hours=w_in.sleep_hours,
        water_liters=w_in.water_liters,
        exercise_minutes=w_in.exercise_minutes,
        notes=w_in.notes
    )
    db.add(w)
    db.commit()
    db.refresh(w)
    return w


# --- Personal Health Question-Answering ---
@router.post("/assistant/qa", response_model=HealthQAResponse)
async def ask_health_assistant(
    qa_in: HealthQARequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Assemble relevant context strictly from current user's authorized records
    docs = (
        db.query(MedicalDocument)
        .filter(MedicalDocument.user_id == current_user.id)
        .order_by(MedicalDocument.upload_date.desc())
        .limit(10)
        .all()
    )
    obs = (
        db.query(Observation)
        .filter(Observation.user_id == current_user.id)
        .order_by(Observation.created_at.desc())
        .limit(30)
        .all()
    )
    meds = (
        db.query(Medication)
        .filter(Medication.user_id == current_user.id, Medication.is_active.is_(True))
        .order_by(Medication.created_at.desc())
        .limit(20)
        .all()
    )

    context_parts = []
    if docs:
        context_parts.append(f"Uploaded Medical Documents ({len(docs)}):")
        for d in docs:
            context_parts.append(f"- {d.original_filename} (Date: {d.document_date or 'Unknown'}, Category: {d.category.value})")
            if d.simplified_explanation:
                context_parts.append(f"  Report analysis: {d.simplified_explanation[:2500]}")
            elif d.extracted_text:
                context_parts.append(f"  Extracted report text: {d.extracted_text[:2500]}")
    if obs:
        context_parts.append(f"\nLaboratory & Health Measurements ({len(obs)}):")
        for o in obs[:15]:
            ref = f" (Ref: {o.reference_range})" if o.reference_range else ""
            flag = f" [{o.flag}]" if o.flag and o.flag != "Normal" else ""
            context_parts.append(f"- {o.test_name}: {o.value_text} {o.unit or ''}{flag} on {o.observation_date or 'Recent'}{ref}")
    if meds:
        context_parts.append(f"\nPrescriptions & Medications ({len(meds)}):")
        for m in meds:
            context_parts.append(f"- {m.name} ({m.dosage or 'dosage unspecified'}) - {m.frequency or 'as directed'}")

    context_str = "\n".join(context_parts) if context_parts else "No records currently uploaded for this patient."

    if qa_in.conversation_id:
        conversation = (
            db.query(AssistantConversation)
            .filter(
                AssistantConversation.id == qa_in.conversation_id,
                AssistantConversation.user_id == current_user.id,
            )
            .first()
        )
        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found.")
    else:
        conversation = AssistantConversation(user_id=current_user.id, title="New conversation")
        db.add(conversation)
        db.flush()

    history_messages = (
        db.query(AssistantMessage)
        .filter(AssistantMessage.conversation_id == conversation.id)
        .order_by(AssistantMessage.created_at.desc(), AssistantMessage.id.desc())
        .limit(10)
        .all()
    )
    conversation_history = [
        {"role": message.role, "content": message.content}
        for message in reversed(history_messages)
    ]
    if conversation.title == "New conversation":
        question_title = qa_in.question.strip()
        conversation.title = question_title[:157].rstrip() + ("..." if len(question_title) > 157 else "")
    conversation.updated_at = datetime.utcnow()

    res = await ai_manager.answer_health_question(
        question=qa_in.question,
        user_records_context=context_str,
        conversation_history=conversation_history,
        user_consent=current_user.consent_external_ai,
        local_only=current_user.local_only_mode,
        preferred_language=qa_in.language or current_user.preferred_language
    )

    cited = []
    for d in docs[:3]:
        cited.append({"document_id": d.id, "filename": d.original_filename, "date": d.document_date})

    user_message = AssistantMessage(
        conversation_id=conversation.id,
        role="user",
        content=qa_in.question.strip(),
        is_rule_based=False,
        cited_records=[],
    )
    assistant_message = AssistantMessage(
        conversation_id=conversation.id,
        role="assistant",
        content=res["answer"],
        provider_used=res["provider_used"],
        is_rule_based=res["is_rule_based"],
        cited_records=cited,
    )
    db.add_all([user_message, assistant_message])
    db.commit()
    db.refresh(assistant_message)

    return HealthQAResponse(
        answer=res["answer"],
        cited_records=cited,
        provider_used=res["provider_used"],
        model_used=res["model_used"],
        failover_occurred=res["failover_occurred"],
        is_rule_based=res["is_rule_based"],
        disclaimer=res["disclaimer"],
        conversation_id=conversation.id,
        message_id=assistant_message.id,
    )


# --- FHIR R4 Export ---
@router.get("/export/fhir")
def export_fhir(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(HealthProfile).filter(HealthProfile.user_id == current_user.id).first()
    docs = db.query(MedicalDocument).filter(MedicalDocument.user_id == current_user.id).all()
    obs = db.query(Observation).filter(Observation.user_id == current_user.id).all()
    meds = db.query(Medication).filter(Medication.user_id == current_user.id).all()

    user_dict = {"id": current_user.id, "full_name": current_user.full_name}
    profile_dict = {
        "gender": profile.gender if profile else None,
        "date_of_birth": profile.date_of_birth if profile else None,
        "abha_number": profile.abha_number if profile else None
    }
    docs_list = [{"id": d.id, "original_filename": d.original_filename, "category": d.category.value} for d in docs]
    obs_list = [{
        "id": o.id, "test_name": o.test_name, "value_numeric": o.value_numeric,
        "value_text": o.value_text, "unit": o.unit, "reference_range": o.reference_range,
        "observation_date": o.observation_date
    } for o in obs]
    meds_list = [{"id": m.id, "name": m.name, "dosage": m.dosage, "frequency": m.frequency, "is_active": m.is_active} for m in meds]

    bundle = export_fhir_bundle(user_dict, profile_dict, docs_list, obs_list, meds_list)
    return bundle


# --- Simulated ABHA ---
@router.post("/abha/simulate-link")
def link_simulated_abha(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(HealthProfile).filter(HealthProfile.user_id == current_user.id).first()
    if not profile:
        profile = HealthProfile(user_id=current_user.id)
        db.add(profile)

    import random
    mock_id = f"91-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"
    clean_username = current_user.email.split("@")[0].lower()
    profile.abha_number = mock_id
    profile.abha_address = f"{clean_username}@abdm-demo"
    profile.abha_linked = True
    db.commit()

    return {
        "status": "success",
        "notice": "DEMO SIMULATION — NOT CONNECTED TO REAL ABDM OR ABHA SERVICES.",
        "abha_number": mock_id,
        "abha_address": profile.abha_address
    }


# --- AI Provider Status Configuration ---
@router.get("/ai-status", response_model=AIProviderConfigResponse)
def get_ai_status(current_user: User = Depends(get_current_user)):
    status_list = ai_manager.get_provider_status()
    from app.core.config import settings
    return AIProviderConfigResponse(
        provider_order=settings.provider_order,
        providers=status_list,
        local_only_mode=current_user.local_only_mode,
        consent_given=current_user.consent_external_ai
    )
