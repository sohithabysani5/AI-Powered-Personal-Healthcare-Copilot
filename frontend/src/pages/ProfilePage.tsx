import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { useApp } from '../context/AppContext';
import { User, Shield, Heart, AlertCircle, Save } from 'lucide-react';
import { HealthProfile } from '../types';

export const ProfilePage: React.FC = () => {
  const { user } = useApp();
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form states
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergiesText, setAllergiesText] = useState('');
  const [conditionsText, setConditionsText] = useState('');
  const [emergName, setEmergName] = useState('');
  const [emergPhone, setEmergPhone] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/health/profile');
        setProfile(res.data);
        setDob(res.data.date_of_birth || '');
        setGender(res.data.gender || '');
        setBloodGroup(res.data.blood_group || '');
        setAllergiesText(
          res.data.allergies?.map((a: any) => (typeof a === 'string' ? a : a.name)).join(', ') || ''
        );
        setConditionsText(res.data.chronic_conditions?.join(', ') || '');
        setEmergName(res.data.emergency_contact_name || '');
        setEmergPhone(res.data.emergency_contact_phone || '');
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const allergiesList = allergiesText
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean)
        .map((name) => ({ name, verified: true }));

      const conditionsList = conditionsText
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      const res = await apiClient.patch('/health/profile', {
        date_of_birth: dob,
        gender,
        blood_group: bloodGroup,
        allergies: allergiesList,
        chronic_conditions: conditionsList,
        emergency_contact_name: emergName,
        emergency_contact_phone: emergPhone,
      });

      setProfile(res.data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert('Failed to update health profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Unified Personal Health Profile</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Consolidated patient demographics, validated allergies, chronic conditions, and emergency contacts.
        </p>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200">
          Health profile updated successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Demographics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
              <input
                type="text"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                placeholder="e.g. O+, B+, A-"
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Clinical History</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Known Drug & Food Allergies (Comma separated)
              </label>
              <input
                type="text"
                value={allergiesText}
                onChange={(e) => setAllergiesText(e.target.value)}
                placeholder="e.g. Penicillin, Peanuts, Sulfa"
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Chronic Diagnoses & Conditions (Comma separated)
              </label>
              <input
                type="text"
                value={conditionsText}
                onChange={(e) => setConditionsText(e.target.value)}
                placeholder="e.g. Type 2 Diabetes, Mild Hypertension"
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Emergency Contact</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Full Name</label>
              <input
                type="text"
                value={emergName}
                onChange={(e) => setEmergName(e.target.value)}
                placeholder="e.g. Sarah Miller"
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={emergPhone}
                onChange={(e) => setEmergPhone(e.target.value)}
                placeholder="e.g. +1 (555) 019-2831"
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center space-x-2"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
