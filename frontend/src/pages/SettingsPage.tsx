import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { useApp } from '../context/AppContext';
import { Settings, Shield, Server, Cpu, CheckCircle2, XCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { AIProviderStatus } from '../types';

export const SettingsPage: React.FC = () => {
  const { user, setUser, logout } = useApp();
  const [providerStatuses, setProviderStatuses] = useState<AIProviderStatus[]>([]);
  const [localOnly, setLocalOnly] = useState(user?.local_only_mode || false);
  const [consent, setConsent] = useState(user?.consent_external_ai || false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [privacySuccess, setPrivacySuccess] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await apiClient.get('/health/ai-status');
        setProviderStatuses(res.data.providers || []);
        setLocalOnly(res.data.local_only_mode);
        setConsent(res.data.consent_given);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStatus();
  }, []);

  const handleUpdatePrivacy = async () => {
    try {
      setSavingPrivacy(true);
      const res = await apiClient.patch('/auth/me', {
        consent_external_ai: consent,
        local_only_mode: localOnly,
      });
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      setPrivacySuccess(true);
      setTimeout(() => setPrivacySuccess(false), 3000);
    } catch (err) {
      alert('Failed to update privacy settings');
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('PERMANENT ACTION: Are you sure you want to permanently delete your account and all associated healthcare documents?')) return;
    try {
      await apiClient.delete('/auth/me');
      logout();
    } catch (err) {
      alert('Failed to delete account');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Settings, AI Status & Privacy</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure multi-provider LLM routing, verify active circuit breakers, and enforce HIPAA-grade local-only privacy boundaries.
        </p>
      </div>

      {privacySuccess && (
        <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200">
          Privacy settings updated successfully!
        </div>
      )}

      {/* AI Provider Status & Failover Health */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <Cpu className="w-4 h-4 text-teal-600" />
          <h3 className="text-sm font-bold text-slate-800">
            AI Provider Priority Order: 1. Grok → 2. Mistral → 3. Gemini → 4. Local Deterministic Fallback
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {providerStatuses.map((p) => (
            <div key={p.name} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-800">{p.name}</span>
                {p.configured ? (
                  <span className="flex items-center space-x-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Configured</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 text-[11px] font-medium text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-md">
                    <XCircle className="w-3 h-3 text-slate-400" />
                    <span>No API Key</span>
                  </span>
                )}
              </div>

              <div className="text-[11px] text-slate-500 space-y-0.5">
                <div>Model: <span className="font-mono text-slate-700">{p.model}</span></div>
                <div>Circuit Breaker: {p.is_circuit_open ? 'Tripped (Open)' : 'Healthy (Closed)'}</div>
                <div>Failures: {p.consecutive_failures}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 bg-teal-50/60 text-teal-900 rounded-xl border border-teal-200 text-xs leading-relaxed">
          <strong>Automatic Failover Guarantee:</strong> If the primary provider experiences HTTP 429 rate limits, network timeouts, or quota depletion, requests automatically fail over to Mistral, then Gemini, and finally the deterministic local clinical rule engine. Your secrets are stored exclusively server-side and never exposed to the browser.
        </div>
      </div>

      {/* Privacy & Consent Boundaries */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <Shield className="w-4 h-4 text-teal-600" />
          <h3 className="text-sm font-bold text-slate-800">Patient Privacy & External AI Processing Consent</h3>
        </div>

        <div className="space-y-4">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={localOnly}
              onChange={(e) => setLocalOnly(e.target.checked)}
              className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Enable 100% Local-Processing Mode (Air-Gapped Privacy)
              </span>
              <span className="text-xs text-slate-500 block mt-0.5 leading-relaxed">
                When enabled, absolutely no text or health data is ever transmitted to external AI APIs. Document extraction and explanations run entirely using local deterministic clinical algorithms.
              </span>
            </div>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              disabled={localOnly}
              className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
            />
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Consent for External AI Health Intelligence (Grok / Mistral / Gemini)
              </span>
              <span className="text-xs text-slate-500 block mt-0.5 leading-relaxed">
                Allow secure, encrypted transmission of anonymized report snippets to configured cloud LLM providers for natural-language explanations and multilingual summaries.
              </span>
            </div>
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleUpdatePrivacy}
            disabled={savingPrivacy}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
          >
            {savingPrivacy ? 'Saving...' : 'Save Privacy Controls'}
          </button>
        </div>
      </div>

      {/* Account Deletion */}
      <div className="bg-red-50/50 rounded-2xl border border-red-200 p-6 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-red-900">Delete Account & Clinical History</h3>
          <p className="text-xs text-red-700 mt-0.5">
            Permanently erases all user profile data, uploaded PDFs, extracted tests, and reminders.
          </p>
        </div>
        <button
          onClick={handleDeleteAccount}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Account</span>
        </button>
      </div>
    </div>
  );
};
