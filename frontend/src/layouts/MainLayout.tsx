import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  User,
  Upload,
  FileText,
  LineChart,
  Clock,
  Pill,
  Activity,
  Bot,
  ShieldCheck,
  Settings,
  LogOut,
  Globe,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { apiClient } from '../services/api';

export const MainLayout: React.FC = () => {
  const { user, t, language, setLanguage, logout } = useApp();
  const location = useLocation();
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);

  const navItems = [
    { to: '/', label: t('dashboard'), icon: LayoutDashboard },
    { to: '/profile', label: t('my_profile'), icon: User },
    { to: '/upload', label: t('upload_records'), icon: Upload },
    { to: '/documents', label: t('my_documents'), icon: FileText },
    { to: '/comparison', label: t('report_comparison'), icon: LineChart },
    { to: '/timeline', label: t('health_timeline'), icon: Clock },
    { to: '/medications', label: t('medications'), icon: Pill },
    { to: '/wellness', label: t('wellness_tracker'), icon: Activity },
    { to: '/assistant', label: t('health_assistant'), icon: Bot },
    { to: '/fhir-abha', label: t('fhir_export'), icon: ShieldCheck },
    { to: '/settings', label: t('settings'), icon: Settings },
  ];

  const handleLoadDemo = async () => {
    try {
      setLoadingDemo(true);
      await apiClient.post('/demo/load');
      setDemoMessage('Synthetic demo records loaded successfully! Refreshing view...');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      setDemoMessage('Failed to load demo data.');
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800">
        <div className="p-4 border-b border-slate-800 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xl border border-teal-500/40">
            HC
          </div>
          <div>
            <h1 className="font-semibold text-sm leading-tight text-white">AI Health Copilot</h1>
            <p className="text-xs text-slate-400">Personal Health Assistant</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Demo Data Button */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={handleLoadDemo}
            disabled={loadingDemo}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-medium transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{loadingDemo ? 'Loading...' : t('demo_load_btn')}</span>
          </button>
          {demoMessage && (
            <p className="text-[11px] text-teal-400 text-center mt-2">{demoMessage}</p>
          )}
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-xs font-medium text-white truncate">{user?.full_name || 'Patient'}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
            title={t('logout')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10 shadow-xs">
          <div className="flex items-center space-x-3">
            <h2 className="text-base font-semibold text-slate-800 tracking-tight">
              AI-Powered Personal Health Copilot
            </h2>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-teal-50 text-teal-700 border border-teal-200">
              Multilingual RAG Platform
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Language Selector */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-600 bg-slate-100 rounded-lg px-2 py-1 border border-slate-200">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="bg-transparent border-none text-xs text-slate-700 font-medium focus:outline-hidden cursor-pointer"
              >
                <option value="en">English</option>
                <option value="te">తెలుగు (Telugu)</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="ta">தமிழ் (Tamil)</option>
              </select>
            </div>
          </div>
        </header>

        {/* Global Clinical Safety Banner */}
        <div className="bg-amber-50/80 border-b border-amber-200/60 px-6 py-2 flex items-center space-x-2 text-xs text-amber-800">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>{t('disclaimer_banner')}</span>
        </div>

        {/* Dynamic Route Pages */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
