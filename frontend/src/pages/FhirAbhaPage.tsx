import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { ShieldCheck, Download, Link2, CheckCircle2, AlertTriangle, FileCode } from 'lucide-react';
import { HealthProfile } from '../types';

export const FhirAbhaPage: React.FC = () => {
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [fhirJson, setFhirJson] = useState<any>(null);
  const [loadingFhir, setLoadingFhir] = useState(false);
  const [linkingAbha, setLinkingAbha] = useState(false);
  const [abhaNotice, setAbhaNotice] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get('/health/profile');
        setProfile(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchProfile();
  }, []);

  const handleFetchFhir = async () => {
    try {
      setLoadingFhir(true);
      const res = await apiClient.get('/health/export/fhir');
      setFhirJson(res.data);
    } catch (err) {
      alert('Failed to generate FHIR export.');
    } finally {
      setLoadingFhir(false);
    }
  };

  const handleDownloadFhir = () => {
    if (!fhirJson) return;
    const blob = new Blob([JSON.stringify(fhirJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FHIR_Health_Bundle_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSimulateAbha = async () => {
    try {
      setLinkingAbha(true);
      const res = await apiClient.post('/health/abha/simulate-link');
      setProfile((prev) => prev ? { ...prev, abha_number: res.data.abha_number, abha_address: res.data.abha_address, abha_linked: true } : null);
      setAbhaNotice(res.data.notice);
    } catch (err) {
      alert('Failed to simulate ABHA link.');
    } finally {
      setLinkingAbha(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Interoperability: FHIR R4 & ABHA Simulation</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Standards-aligned healthcare data export and Ayushman Bharat Health Account (ABHA) sandbox simulation.
        </p>
      </div>

      {/* Prominent Sandbox Notice */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3 text-xs text-amber-800">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block">DEMO SIMULATION — NOT CONNECTED TO REAL ABDM OR ABHA SERVICES</span>
          <p className="mt-0.5 leading-relaxed">
            The ABHA module is a sandbox demonstration for innovation expos and development evaluation. All IDs and integration workflows shown here are completely synthetic and do not contact national ABDM gateways.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ABHA Simulated Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-800">Simulated ABHA Health ID</h3>
          </div>

          <div className="p-5 bg-gradient-to-br from-slate-900 to-teal-950 text-white rounded-xl shadow-inner space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Ayushman Bharat Health Card (Simulated)</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">DEMO ONLY</span>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">ABHA Number</p>
              <p className="text-base font-mono font-bold tracking-wider">
                {profile?.abha_number || '91-XXXX-XXXX-XXXX'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">ABHA Address</p>
              <p className="text-xs font-mono text-teal-200">
                {profile?.abha_address || 'not_linked@abdm-demo'}
              </p>
            </div>
          </div>

          {!profile?.abha_linked ? (
            <button
              onClick={handleSimulateAbha}
              disabled={linkingAbha}
              className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
            >
              {linkingAbha ? 'Generating Simulated ABHA...' : 'Link Simulated ABHA Profile'}
            </button>
          ) : (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Simulated ABHA profile linked successfully for demo.</span>
            </div>
          )}
        </div>

        {/* FHIR Export Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2">
            <FileCode className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">FHIR R4 Bundle Export</h3>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Exports verified patient health records, laboratory observations, medication statements, and document references mapped to standard HL7 FHIR R4 schema format.
          </p>

          <div className="flex space-x-3">
            <button
              onClick={handleFetchFhir}
              disabled={loadingFhir}
              className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition"
            >
              {loadingFhir ? 'Generating Bundle...' : 'Generate FHIR JSON'}
            </button>

            {fhirJson && (
              <button
                onClick={handleDownloadFhir}
                className="py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            )}
          </div>

          {fhirJson && (
            <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              Bundle ID: <span className="font-mono text-slate-800">{fhirJson.id}</span> • Total Resources: {fhirJson.total}
            </div>
          )}
        </div>
      </div>

      {/* FHIR JSON Preview Inspector */}
      {fhirJson && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-800">FHIR R4 JSON Payload Preview</h3>
          <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs overflow-x-auto max-h-96 font-mono leading-relaxed">
            {JSON.stringify(fhirJson, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
