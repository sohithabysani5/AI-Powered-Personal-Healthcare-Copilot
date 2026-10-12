import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../services/api';
import { useApp } from '../context/AppContext';
import { Activity, ShieldCheck, ArrowRight } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState('en');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await apiClient.post('/auth/register', {
        full_name: fullName,
        email,
        password,
        preferred_language: language,
      });
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please check form.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center mx-auto mb-3 border border-teal-100 shadow-xs">
            <Activity className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Create Health Account</h2>
          <p className="text-sm text-slate-500 mt-1">Start your personal AI health journey</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-hidden transition"
              placeholder="Dr. / Mr. / Ms. Name"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-hidden transition"
              placeholder="patient@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-hidden transition"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-hidden transition"
            >
              <option value="en">English</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="ta">தமிழ் (Tamil)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm rounded-lg shadow-sm transition flex items-center justify-center space-x-2"
          >
            <span>{loading ? 'Creating account...' : 'Create Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="text-teal-600 font-semibold hover:underline">
              Sign in here
            </Link>
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center space-x-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          <span>HIPAA-inspired Architecture & Consent Controls</span>
        </div>
      </div>
    </div>
  );
};
