import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../services/api';
import { useApp } from '../context/AppContext';
import {
  FileText,
  Activity,
  Pill,
  Clock,
  ArrowUpRight,
  Upload,
  Bot,
  AlertCircle,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { MedicalDocument, Observation, MedicationReminder } from '../types';

export const DashboardPage: React.FC = () => {
  const { user, t } = useApp();
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [reminders, setReminders] = useState<MedicationReminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [docsRes, obsRes, remRes] = await Promise.all([
          apiClient.get('/documents'),
          apiClient.get('/health/observations'),
          apiClient.get('/health/reminders'),
        ]);
        setDocuments(docsRes.data);
        setObservations(obsRes.data);
        setReminders(remRes.data);
      } catch (err) {
        console.error('Failed to load dashboard metrics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Actions Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-1 max-w-2xl">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal-500/20 text-teal-200 border border-teal-500/30 mb-3">
            {t('app_title')}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Hello, {user?.full_name || 'Patient'}
          </h2>
          <p className="mt-2 text-sm text-teal-100/90 leading-relaxed">
            Your centralized clinical repository is ready. Upload medical records, review automated OCR extractions, compare longitudinal lab trends, or converse with the AI Health Assistant.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/upload"
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs rounded-xl shadow-xs transition"
            >
              <Upload className="w-4 h-4" />
              <span>{t('upload_new')}</span>
            </Link>
            <Link
              to="/assistant"
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium text-xs rounded-xl backdrop-blur-xs border border-white/15 transition"
            >
              <Bot className="w-4 h-4 text-teal-300" />
              <span>{t('ask_question')}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">{t('total_documents')}</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{documents.length}</h3>
          </div>
          <div className="w-11 h-11 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center border border-teal-100">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">{t('lab_measurements')}</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{observations.length}</h3>
          </div>
          <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">{t('upcoming_reminders')}</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">
              {reminders.filter((r) => r.is_active).length}
            </h3>
          </div>
          <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100">
            <Pill className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Processing Engine</p>
            <h3 className="text-base font-bold text-slate-800 mt-1">Multi-AI + Local</h3>
          </div>
          <div className="w-11 h-11 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-100">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Documents & Upcoming Meds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Medical Records */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-teal-600" />
              <h3 className="font-semibold text-sm text-slate-800">{t('recent_records')}</h3>
            </div>
            <Link to="/documents" className="text-xs text-teal-600 font-medium hover:underline flex items-center">
              View All <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>

          {documents.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">No medical documents uploaded yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Upload a blood test report or click "Load Demo Data" to explore.
              </p>
              <Link
                to="/upload"
                className="mt-4 inline-flex items-center px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg"
              >
                Upload First Record
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.slice(0, 4).map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center justify-between transition"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800">{doc.original_filename}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {doc.document_date ? `Report Date: ${doc.document_date}` : `Uploaded: ${doc.upload_date.slice(0, 10)}`} • {doc.healthcare_provider || 'Provider not specified'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-200 text-slate-700">
                      {doc.category.replace('_', ' ')}
                    </span>
                    <Link
                      to={`/documents/${doc.id}`}
                      className="text-xs font-medium text-teal-600 hover:text-teal-700 hover:underline"
                    >
                      Inspect
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Medication Schedule */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Pill className="w-4 h-4 text-amber-600" />
              <h3 className="font-semibold text-sm text-slate-800">Medication Reminders</h3>
            </div>
            <Link to="/medications" className="text-xs text-teal-600 font-medium hover:underline flex items-center">
              Organizer <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>

          {reminders.length === 0 ? (
            <div className="py-12 text-center">
              <Pill className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-500">No active dosage reminders</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reminders.map((rem) => (
                <div
                  key={rem.id}
                  className="p-3 rounded-lg border border-slate-100 bg-amber-50/30 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{rem.medication_name}</h4>
                    <p className="text-[11px] text-slate-500 flex items-center mt-0.5">
                      <Clock className="w-3 h-3 mr-1 text-slate-400" />
                      {rem.time_of_day} • Every day
                    </p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-full">
                    Active
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
