export interface User {
  id: number;
  email: string;
  full_name: string;
  preferred_language: string;
  consent_external_ai: boolean;
  local_only_mode: boolean;
}

export interface HealthProfile {
  id: number;
  user_id: number;
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  allergies: Array<{ name: string; severity?: string; verified?: boolean }>;
  chronic_conditions: string[];
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  abha_number: string | null;
  abha_address: string | null;
  abha_linked: boolean;
}

export interface MedicalDocument {
  id: number;
  filename: string;
  original_filename: string;
  file_size_bytes: number;
  mime_type: string;
  category: string;
  document_date: string | null;
  upload_date: string;
  healthcare_provider: string | null;
  processing_status: string;
  ocr_applied: boolean;
  extracted_text: string | null;
  extracted_data_json: {
    category?: string;
    document_date?: string;
    healthcare_provider?: string;
    diagnoses?: string[];
    lab_tests?: Array<{
      test_name: string;
      value: string;
      numeric_value?: number;
      unit?: string;
      reference_range?: string;
      flag?: string;
    }>;
    medications?: Array<{
      name: string;
      dosage?: string;
      frequency?: string;
      instructions?: string;
      is_ambiguous?: boolean;
    }>;
    warnings?: string[];
  } | null;
  summary: string | null;
  simplified_explanation: string | null;
  doctor_questions: string[];
  is_rule_based_summary: boolean;
}

export interface Observation {
  id: number;
  test_name: string;
  value_numeric: number | null;
  value_text: string;
  unit: string | null;
  reference_range: string | null;
  flag: string | null;
  observation_date: string | null;
  document_id: number | null;
  verification_status: string;
}

export interface Medication {
  id: number;
  name: string;
  dosage: string | null;
  frequency: string | null;
  instructions: string | null;
  prescribed_by: string | null;
  start_date: string | null;
  is_active: boolean;
  verification_status: string;
  is_ambiguous: boolean;
}

export interface MedicationReminder {
  id: number;
  medication_id: number;
  medication_name: string;
  time_of_day: string;
  days_of_week: string;
  is_active: boolean;
  last_taken_at: string | null;
  last_status: string | null;
}

export interface TimelineEvent {
  id: number;
  title: string;
  category: string;
  event_date: string;
  description: string | null;
  document_id: number | null;
}

export interface WellnessEntry {
  id: number;
  entry_date: string;
  weight_kg: number | null;
  sleep_hours: number | null;
  water_liters: number | null;
  exercise_minutes: number | null;
  notes: string | null;
}

export interface AIProviderStatus {
  name: string;
  configured: boolean;
  healthy: boolean;
  consecutive_failures: number;
  is_circuit_open: boolean;
  model: string;
}
