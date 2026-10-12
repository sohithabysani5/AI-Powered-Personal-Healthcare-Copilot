import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { Pill, Clock, Plus, Check, X, AlertTriangle, Calendar } from 'lucide-react';
import { Medication, MedicationReminder } from '../types';

export const MedicationsPage: React.FC = () => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [reminders, setReminders] = useState<MedicationReminder[]>([]);
  const [loading, setLoading] = useState(true);

  // New medication form
  const [showAddMed, setShowAddMed] = useState(false);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [instructions, setInstructions] = useState('');

  // Reminder form
  const [selectedMedId, setSelectedMedId] = useState<number | null>(null);
  const [timeOfDay, setTimeOfDay] = useState('08:00');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [medsRes, remRes] = await Promise.all([
        apiClient.get('/health/medications'),
        apiClient.get('/health/reminders'),
      ]);
      setMedications(medsRes.data);
      setReminders(remRes.data);
      if (medsRes.data.length > 0) {
        setSelectedMedId(medsRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateMed = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/health/medications', {
        name,
        dosage,
        frequency,
        instructions,
        is_active: true,
      });
      setName('');
      setDosage('');
      setFrequency('');
      setInstructions('');
      setShowAddMed(false);
      fetchData();
    } catch (err) {
      alert('Failed to add medication');
    }
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedId) return;
    try {
      await apiClient.post('/health/reminders', {
        medication_id: selectedMedId,
        time_of_day: timeOfDay,
        days_of_week: 'all',
      });
      fetchData();
    } catch (err) {
      alert('Failed to set reminder');
    }
  };

  const handleLogReminderAction = async (reminderId: number, action: 'taken' | 'skipped') => {
    try {
      await apiClient.post(`/health/reminders/${reminderId}/log-action?action=${action}`);
      fetchData();
    } catch (err) {
      alert('Failed to log reminder');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Medication Organizer & Reminders</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize prescriptions, schedule dosage alerts, and track medication intake adherence.
          </p>
        </div>
        <button
          onClick={() => setShowAddMed(!showAddMed)}
          className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showAddMed ? 'Close Form' : 'Add Medication'}</span>
        </button>
      </div>

      {showAddMed && (
        <form onSubmit={handleCreateMed} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Add New Medication Record</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Medicine Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Metformin"
                className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Strength / Dosage</label>
              <input
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="e.g. 500 mg"
                className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Frequency</label>
              <input
                type="text"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                placeholder="e.g. Twice daily"
                className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Instructions</label>
              <input
                type="text"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. After food"
                className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-xl hover:bg-teal-700 transition"
          >
            Save Medication
          </button>
        </form>
      )}

      {/* Grid: Medications and Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Medications List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
            Active Prescriptions ({medications.length})
          </h3>
          {medications.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No medications recorded. Add one above or load demo data.
            </div>
          ) : (
            <div className="space-y-3">
              {medications.map((m) => (
                <div key={m.id} className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Pill className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{m.name} {m.dosage && `(${m.dosage})`}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">{m.frequency || 'Frequency not stated'}</p>
                      {m.instructions && (
                        <p className="text-[11px] text-slate-400 mt-0.5">Notes: {m.instructions}</p>
                      )}
                      {m.prescribed_by && (
                        <p className="text-[11px] text-teal-700 mt-1">Prescribed by: {m.prescribed_by}</p>
                      )}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Reminders Schedule */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
            Daily Dosage Reminders
          </h3>

          {medications.length > 0 && (
            <form onSubmit={handleCreateReminder} className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block text-[11px] font-semibold text-slate-700">Set New Reminder Alert</label>
              <select
                value={selectedMedId || ''}
                onChange={(e) => setSelectedMedId(Number(e.target.value))}
                className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
              >
                {medications.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.dosage}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
              />
              <button
                type="submit"
                className="w-full py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700"
              >
                Set Reminder Schedule
              </button>
            </form>
          )}

          <div className="space-y-2.5">
            {reminders.map((r) => (
              <div key={r.id} className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/60 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{r.medication_name}</h4>
                  <p className="text-[11px] text-slate-500 flex items-center mt-0.5">
                    <Clock className="w-3 h-3 text-amber-600 mr-1" />
                    {r.time_of_day} • Daily
                  </p>
                  {r.last_status && (
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Last: {r.last_status.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => handleLogReminderAction(r.id, 'taken')}
                    className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition"
                    title="Mark as Taken"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleLogReminderAction(r.id, 'skipped')}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                    title="Skip"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 leading-normal">
            Reminder Notice: Reminders are personal organizational aids, not proof that a clinical dose was ingested. Never alter dosages without doctor authorization.
          </div>
        </div>
      </div>
    </div>
  );
};
