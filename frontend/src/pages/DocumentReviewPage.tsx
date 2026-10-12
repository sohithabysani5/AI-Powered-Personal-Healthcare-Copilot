import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import { useApp } from '../context/AppContext';
import { speakText, stopSpeech } from '../utils/voiceUtils';
import { ReadableAnswer } from '../components/ReadableAnswer';
import {
  FileText,
  Calendar,
  Hospital,
  CheckCircle2,
  AlertTriangle,
  Download,
  Save,
  Trash2,
  Sparkles,
  HelpCircle,
  Volume2,
  VolumeX
} from 'lucide-react';
import { MedicalDocument } from '../types';

export const DocumentReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useApp();
  const [doc, setDoc] = useState<MedicalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Editable review states
  const [category, setCategory] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [provider, setProvider] = useState('');
  const [extractedData, setExtractedData] = useState<any>({});

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/documents/${id}`);
        setDoc(res.data);
        setCategory(res.data.category || 'other');
        setDocumentDate(res.data.document_date || '');
        setProvider(res.data.healthcare_provider || '');
        setExtractedData(res.data.extracted_data_json || {});
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDoc();

    return () => {
      stopSpeech();
    };
  }, [id]);

  const handleToggleVoice = () => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = doc?.simplified_explanation || doc?.summary || 'No document description available.';
    setIsSpeaking(true);
    speakText(
      textToSpeak,
      language,
      () => setIsSpeaking(false),
      () => setIsSpeaking(false)
    );
  };

  const handleSaveReview = async (confirmToProfile: boolean) => {
    try {
      setSaving(true);
      const payload = {
        category,
        document_date: documentDate,
        healthcare_provider: provider,
        extracted_data_json: extractedData,
        confirm_and_save_to_profile: confirmToProfile,
      };
      const res = await apiClient.post(`/documents/${id}/review`, payload);
      setDoc(res.data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (confirmToProfile) {
        alert('Verified measurements have been successfully committed to your Health Profile and timeline!');
      }
    } catch (err) {
      alert('Failed to save review changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await apiClient.get(`/documents/${id}/download`, { responseType: 'blob' });
      const downloadUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = doc?.original_filename || 'medical-document';
      link.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Failed to download medical document.', error);
      alert('Could not download this document. Please try again.');
    }
  };

  if (loading || !doc) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading document inspection...</div>;
  }

  const labs = extractedData.lab_tests || [];
  const meds = extractedData.medications || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-teal-50 text-teal-700 border border-teal-200 uppercase">
              {doc.category.replace('_', ' ')}
            </span>
            <span className="text-xs text-slate-400">
              {doc.ocr_applied ? 'Processed with Tesseract OCR' : 'Extracted natively via PyMuPDF'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mt-2">{doc.original_filename}</h2>
        </div>

        <div className="flex items-center space-x-3">
          {/* Voice Narration Button */}
          <button
            onClick={handleToggleVoice}
            className={`px-3.5 py-2 font-semibold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 ${
              isSpeaking
                ? 'bg-rose-600 text-white hover:bg-rose-700 animate-pulse'
                : 'bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100'
            }`}
            title="Read out document explanation aloud"
          >
            {isSpeaking ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>Stop Voice</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Listen to Description (Voice)</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl transition flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Source</span>
          </button>
          <button
            onClick={() => handleSaveReview(true)}
            disabled={saving}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Verify & Commit to Profile'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Review updates saved successfully!</span>
        </div>
      )}

      {/* Review Fields Editor */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
          Structured Document Attributes (Editable)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Document Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
            >
              <option value="lab_report">Blood Test / Lab Report</option>
              <option value="prescription">Prescription</option>
              <option value="discharge_summary">Discharge Summary</option>
              <option value="imaging_report">Diagnostic Imaging</option>
              <option value="consultation_note">Consultation Note</option>
              <option value="vaccination_record">Vaccination Record</option>
              <option value="other">Other Document</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Report / Consultation Date</label>
            <input
              type="text"
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
              placeholder="YYYY-MM-DD or DD/MM/YYYY"
              className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Healthcare Facility / Doctor</label>
            <input
              type="text"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="e.g. Metro Diagnostic Centre"
              className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Extracted Lab Observations Table */}
      {labs.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Extracted Laboratory Measurements</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                  <th className="p-2.5">Test Name</th>
                  <th className="p-2.5">Measured Value</th>
                  <th className="p-2.5">Unit</th>
                  <th className="p-2.5">Reference Range</th>
                  <th className="p-2.5">Status Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {labs.map((lab: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2.5 font-medium text-slate-800">{lab.test_name}</td>
                    <td className="p-2.5 font-bold text-slate-900">{lab.value}</td>
                    <td className="p-2.5 text-slate-500">{lab.unit || '-'}</td>
                    <td className="p-2.5 text-slate-500">{lab.reference_range || 'Unspecified'}</td>
                    <td className="p-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          lab.flag === 'High'
                            ? 'bg-rose-100 text-rose-800'
                            : lab.flag === 'Low'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {lab.flag || 'Normal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Extracted Medications */}
      {meds.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Identified Prescription Medications</h3>
          <div className="space-y-2">
            {meds.map((m: any, idx: number) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{m.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {m.dosage} • {m.frequency}
                  </p>
                </div>
                <span className="text-[10px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                  Prescription Match
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI / Deterministic Report Explainer with Voice */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-800">Intelligent Document Description & Explanation</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleToggleVoice}
              className={`p-1.5 rounded-lg border text-xs font-medium flex items-center space-x-1 transition ${
                isSpeaking
                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-teal-600" />}
              <span>{isSpeaking ? 'Mute' : 'Voice Narration'}</span>
            </button>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {doc.is_rule_based_summary ? 'Deterministic Clinical Rules' : 'Multi-AI Synthesis'}
            </span>
          </div>
        </div>

        <div className="max-w-none bg-slate-50/70 p-4 rounded-xl border border-slate-100">
          <ReadableAnswer text={doc.simplified_explanation || doc.summary || 'Summary unavailable.'} />
        </div>

        {doc.doctor_questions && doc.doctor_questions.length > 0 && (
          <div className="pt-2">
            <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center space-x-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
              <span>Recommended Questions For Your Physician:</span>
            </h4>
            <ul className="space-y-1.5 list-disc list-inside text-xs text-slate-600">
              {doc.doctor_questions.map((q, idx) => (
                <li key={idx} className="pl-1">
                  {q}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
