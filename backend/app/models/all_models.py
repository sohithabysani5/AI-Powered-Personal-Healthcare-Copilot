"""SQLAlchemy data models for AI-Powered Personal Health Copilot."""

import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey, Enum, JSON
)
from sqlalchemy.orm import relationship
from app.database.session import Base


class DocumentCategory(str, enum.Enum):
    LAB_REPORT = "lab_report"
    PRESCRIPTION = "prescription"
    DISCHARGE_SUMMARY = "discharge_summary"
    IMAGING_REPORT = "imaging_report"
    CONSULTATION_NOTE = "consultation_note"
    VACCINATION_RECORD = "vaccination_record"
    OTHER = "other"


class ProcessingStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    NEEDS_REVIEW = "needs_review"


class VerificationStatus(str, enum.Enum):
    EXTRACTED = "extracted"
    USER_VERIFIED = "user_verified"
    USER_EDITED = "user_edited"
    REJECTED = "rejected"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    # Consent for external AI processing
    consent_external_ai = Column(Boolean, default=False)
    local_only_mode = Column(Boolean, default=False)
    preferred_language = Column(String(10), default="en")  # en, te, hi, ta

    # Relationships
    profile = relationship("HealthProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    documents = relationship("MedicalDocument", back_populates="user", cascade="all, delete-orphan")
    observations = relationship("Observation", back_populates="user", cascade="all, delete-orphan")
    medications = relationship("Medication", back_populates="user", cascade="all, delete-orphan")
    reminders = relationship("MedicationReminder", back_populates="user", cascade="all, delete-orphan")
    wellness_entries = relationship("WellnessEntry", back_populates="user", cascade="all, delete-orphan")
    timeline_events = relationship("TimelineEvent", back_populates="user", cascade="all, delete-orphan")
    ai_interactions = relationship("AIInteractionLog", back_populates="user", cascade="all, delete-orphan")
    conditions = relationship("Condition", back_populates="user", cascade="all, delete-orphan")
    assistant_conversations = relationship("AssistantConversation", back_populates="user", cascade="all, delete-orphan")


class HealthProfile(Base):
    __tablename__ = "health_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    date_of_birth = Column(String(50), nullable=True)
    gender = Column(String(50), nullable=True)
    blood_group = Column(String(10), nullable=True)
    allergies = Column(JSON, default=list)  # List of allergies [{name, severity, verified}]
    chronic_conditions = Column(JSON, default=list)
    emergency_contact_name = Column(String(255), nullable=True)
    emergency_contact_phone = Column(String(50), nullable=True)
    
    # Simulated ABHA
    abha_number = Column(String(50), nullable=True)  # Mock e.g. 91-XXXX-XXXX-XXXX
    abha_address = Column(String(100), nullable=True)  # e.g. user@abdm-demo
    abha_linked = Column(Boolean, default=False)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user = relationship("User", back_populates="profile")


class MedicalDocument(Base):
    __tablename__ = "medical_documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    category = Column(Enum(DocumentCategory), default=DocumentCategory.OTHER)
    
    # Dates
    document_date = Column(String(50), nullable=True)
    upload_date = Column(DateTime, default=datetime.utcnow)
    healthcare_provider = Column(String(255), nullable=True)
    
    # Processing & OCR
    processing_status = Column(Enum(ProcessingStatus), default=ProcessingStatus.PENDING)
    ocr_applied = Column(Boolean, default=False)
    extracted_text = Column(Text, nullable=True)
    extracted_data_json = Column(JSON, nullable=True)  # Structured extracted payload
    
    # Summaries & AI explanation
    summary = Column(Text, nullable=True)
    simplified_explanation = Column(Text, nullable=True)
    doctor_questions = Column(JSON, default=list)
    is_rule_based_summary = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="documents")
    observations = relationship("Observation", back_populates="document", cascade="all, delete-orphan")
    medications = relationship("Medication", back_populates="document", cascade="all, delete-orphan")
    timeline_events = relationship("TimelineEvent", back_populates="document", cascade="all, delete-orphan")


class Observation(Base):
    """Laboratory test or biometric measurement."""
    __tablename__ = "observations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("medical_documents.id", ondelete="SET NULL"), nullable=True)
    
    test_name = Column(String(255), nullable=False, index=True)
    standard_code = Column(String(50), nullable=True)  # LOINC or standardized name
    value_numeric = Column(Float, nullable=True)
    value_text = Column(String(100), nullable=False)
    unit = Column(String(50), nullable=True)
    reference_range = Column(String(100), nullable=True)  # e.g., "13.0 - 17.0"
    reference_low = Column(Float, nullable=True)
    reference_high = Column(Float, nullable=True)
    
    flag = Column(String(50), nullable=True)  # High, Low, Normal, Borderline, etc.
    observation_date = Column(String(50), nullable=True)
    verification_status = Column(Enum(VerificationStatus), default=VerificationStatus.EXTRACTED)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="observations")
    document = relationship("MedicalDocument", back_populates="observations")


class Condition(Base):
    """Diagnoses or chronic conditions extracted or user-verified."""
    __tablename__ = "conditions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("medical_documents.id", ondelete="SET NULL"), nullable=True)

    condition_name = Column(String(255), nullable=False)
    status = Column(String(50), default="active")  # active, resolved, managed
    diagnosed_date = Column(String(50), nullable=True)
    verification_status = Column(Enum(VerificationStatus), default=VerificationStatus.EXTRACTED)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="conditions")


class Medication(Base):
    """Medications extracted from prescriptions or added manually."""
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("medical_documents.id", ondelete="SET NULL"), nullable=True)

    name = Column(String(255), nullable=False)
    dosage = Column(String(100), nullable=True)  # e.g., 500 mg
    frequency = Column(String(100), nullable=True)  # e.g., Twice daily after food
    instructions = Column(Text, nullable=True)
    prescribed_by = Column(String(255), nullable=True)
    start_date = Column(String(50), nullable=True)
    end_date = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    verification_status = Column(Enum(VerificationStatus), default=VerificationStatus.EXTRACTED)
    is_ambiguous = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="medications")
    document = relationship("MedicalDocument", back_populates="medications")
    reminders = relationship("MedicationReminder", back_populates="medication", cascade="all, delete-orphan")


class MedicationReminder(Base):
    """Scheduled dosage reminders."""
    __tablename__ = "medication_reminders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    medication_id = Column(Integer, ForeignKey("medications.id", ondelete="CASCADE"), nullable=False)

    time_of_day = Column(String(20), nullable=False)  # HH:MM e.g. "08:00"
    days_of_week = Column(String(100), default="all")  # e.g. "all" or "mon,tue,wed"
    is_active = Column(Boolean, default=True)
    last_taken_at = Column(DateTime, nullable=True)
    last_status = Column(String(20), nullable=True)  # taken, skipped
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reminders")
    medication = relationship("Medication", back_populates="reminders")


class TimelineEvent(Base):
    """Chronological health events."""
    __tablename__ = "timeline_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("medical_documents.id", ondelete="SET NULL"), nullable=True)

    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)  # lab, prescription, visit, wellness, upload
    event_date = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="timeline_events")
    document = relationship("MedicalDocument", back_populates="timeline_events")


class WellnessEntry(Base):
    """User-entered wellness metrics."""
    __tablename__ = "wellness_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    entry_date = Column(String(50), nullable=False)
    weight_kg = Column(Float, nullable=True)
    sleep_hours = Column(Float, nullable=True)
    water_liters = Column(Float, nullable=True)
    exercise_minutes = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="wellness_entries")


class AIInteractionLog(Base):
    """Audit log of AI operations for transparency and failover verification."""
    __tablename__ = "ai_interaction_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    task_type = Column(String(50), nullable=False)  # summarize, explain, qa, translate
    provider_used = Column(String(50), nullable=False)  # grok, mistral, gemini, local_fallback
    model_used = Column(String(100), nullable=True)
    success = Column(Boolean, default=True)
    failover_occurred = Column(Boolean, default=False)
    providers_attempted = Column(JSON, default=list)
    duration_ms = Column(Integer, nullable=True)
    error_category = Column(String(100), nullable=True)  # sanitized e.g. "rate_limit_429", "timeout"
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="ai_interactions")


class AssistantConversation(Base):
    __tablename__ = "assistant_conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(160), nullable=False, default="New conversation")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False, index=True)

    user = relationship("User", back_populates="assistant_conversations")
    messages = relationship(
        "AssistantMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="AssistantMessage.created_at"
    )


class AssistantMessage(Base):
    __tablename__ = "assistant_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(
        Integer,
        ForeignKey("assistant_conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    provider_used = Column(String(50), nullable=True)
    is_rule_based = Column(Boolean, nullable=False, default=False)
    cited_records = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    conversation = relationship("AssistantConversation", back_populates="messages")
