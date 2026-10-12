"""Pydantic schemas for request and response validation."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field


# --- Auth & User Schemas ---
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    preferred_language: Optional[str] = "en"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    preferred_language: str
    consent_external_ai: bool
    local_only_mode: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    preferred_language: Optional[str] = None
    consent_external_ai: Optional[bool] = None
    local_only_mode: Optional[bool] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


# --- Health Profile ---
class HealthProfileUpdate(BaseModel):
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[List[Dict[str, Any]]] = None
    chronic_conditions: Optional[List[str]] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None


class HealthProfileResponse(BaseModel):
    id: int
    user_id: int
    date_of_birth: Optional[str]
    gender: Optional[str]
    blood_group: Optional[str]
    allergies: List[Any]
    chronic_conditions: List[Any]
    emergency_contact_name: Optional[str]
    emergency_contact_phone: Optional[str]
    abha_number: Optional[str]
    abha_address: Optional[str]
    abha_linked: bool
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# --- Document Schemas ---
class ExtractedLabItem(BaseModel):
    test_name: str
    value: str
    numeric_value: Optional[float] = None
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    flag: Optional[str] = None  # High, Low, Normal
    confidence: Optional[str] = "High"


class ExtractedMedicationItem(BaseModel):
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    instructions: Optional[str] = None
    duration: Optional[str] = None
    is_ambiguous: Optional[bool] = False


class DocumentExtractionData(BaseModel):
    patient_name: Optional[str] = None
    document_date: Optional[str] = None
    healthcare_provider: Optional[str] = None
    category: Optional[str] = None
    diagnoses: Optional[List[str]] = []
    lab_tests: Optional[List[ExtractedLabItem]] = []
    medications: Optional[List[ExtractedMedicationItem]] = []
    observations: Optional[List[str]] = []
    warnings: Optional[List[str]] = []


class DocumentResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_size_bytes: int
    mime_type: str
    category: str
    document_date: Optional[str]
    upload_date: datetime
    healthcare_provider: Optional[str]
    processing_status: str
    ocr_applied: bool
    extracted_text: Optional[str]
    extracted_data_json: Optional[Dict[str, Any]]
    summary: Optional[str]
    simplified_explanation: Optional[str]
    doctor_questions: Optional[List[str]]
    is_rule_based_summary: bool

    class Config:
        from_attributes = True


class DocumentUpdateReview(BaseModel):
    category: Optional[str] = None
    document_date: Optional[str] = None
    healthcare_provider: Optional[str] = None
    extracted_data_json: Dict[str, Any]
    confirm_and_save_to_profile: bool = False


# --- Observation & Trend Schemas ---
class ObservationCreate(BaseModel):
    test_name: str
    value_numeric: Optional[float] = None
    value_text: str
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    reference_low: Optional[float] = None
    reference_high: Optional[float] = None
    flag: Optional[str] = None
    observation_date: Optional[str] = None
    document_id: Optional[int] = None
    notes: Optional[str] = None


class ObservationResponse(BaseModel):
    id: int
    test_name: str
    standard_code: Optional[str]
    value_numeric: Optional[float]
    value_text: str
    unit: Optional[str]
    reference_range: Optional[str]
    reference_low: Optional[float]
    reference_high: Optional[float]
    flag: Optional[str]
    observation_date: Optional[str]
    verification_status: str
    document_id: Optional[int]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class TrendSeriesPoint(BaseModel):
    date: str
    value: float
    value_text: str
    unit: Optional[str]
    reference_range: Optional[str]
    flag: Optional[str]
    document_id: Optional[int]


# --- Medication & Reminder Schemas ---
class MedicationCreate(BaseModel):
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    instructions: Optional[str] = None
    prescribed_by: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: bool = True
    document_id: Optional[int] = None
    is_ambiguous: bool = False


class MedicationResponse(BaseModel):
    id: int
    name: str
    dosage: Optional[str]
    frequency: Optional[str]
    instructions: Optional[str]
    prescribed_by: Optional[str]
    start_date: Optional[str]
    end_date: Optional[str]
    is_active: bool
    verification_status: str
    is_ambiguous: bool
    document_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class MedicationReminderCreate(BaseModel):
    medication_id: int
    time_of_day: str  # "08:00"
    days_of_week: Optional[str] = "all"


class MedicationReminderResponse(BaseModel):
    id: int
    medication_id: int
    medication_name: Optional[str] = None
    time_of_day: str
    days_of_week: str
    is_active: bool
    last_taken_at: Optional[datetime]
    last_status: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# --- Timeline Schemas ---
class TimelineEventCreate(BaseModel):
    title: str
    category: str
    event_date: str
    description: Optional[str] = None
    document_id: Optional[int] = None
    metadata_json: Optional[Dict[str, Any]] = None


class TimelineEventResponse(BaseModel):
    id: int
    title: str
    category: str
    event_date: str
    description: Optional[str]
    document_id: Optional[int]
    metadata_json: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True


# --- Wellness Schemas ---
class WellnessCreate(BaseModel):
    entry_date: str
    weight_kg: Optional[float] = None
    sleep_hours: Optional[float] = None
    water_liters: Optional[float] = None
    exercise_minutes: Optional[int] = None
    notes: Optional[str] = None


class WellnessResponse(BaseModel):
    id: int
    entry_date: str
    weight_kg: Optional[float]
    sleep_hours: Optional[float]
    water_liters: Optional[float]
    exercise_minutes: Optional[int]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# --- AI & Question Answering ---
class HealthQARequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    language: Optional[str] = "en"
    conversation_id: Optional[int] = Field(default=None, gt=0)


class HealthQAResponse(BaseModel):
    answer: str
    cited_records: List[Dict[str, Any]] = Field(default_factory=list)
    provider_used: str
    model_used: Optional[str] = None
    failover_occurred: bool = False
    is_rule_based: bool = False
    disclaimer: str
    conversation_id: int
    message_id: int


class AssistantConversationCreate(BaseModel):
    title: str = Field(default="New conversation", min_length=1, max_length=160)


class AssistantConversationResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AssistantMessageResponse(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    provider_used: Optional[str] = None
    is_rule_based: bool
    cited_records: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime

    class Config:
        from_attributes = True


class ProviderStatusItem(BaseModel):
    name: str
    configured: bool
    healthy: bool
    consecutive_failures: int
    is_circuit_open: bool
    model: str


class AIProviderConfigResponse(BaseModel):
    provider_order: List[str]
    providers: List[ProviderStatusItem]
    local_only_mode: bool
    consent_given: bool
