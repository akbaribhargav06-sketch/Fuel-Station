/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { translations, LanguageCode } from './translations';
import { SystemState, UserSession } from './types';
import { 
  Fuel, 
  Clock, 
  Users, 
  ToggleLeft, 
  Activity, 
  MapPin, 
  TrendingUp, 
  Droplet, 
  Settings, 
  Menu, 
  Database,
  CalendarDays,
  Globe,
  Sun,
  Moon,
  Info,
  Coins,
  Layers
} from 'lucide-react';

import DashboardTab from './components/DashboardTab';
import ShiftsTab from './components/ShiftsTab';
import EmployeesTab from './components/EmployeesTab';
import NozzlesTab from './components/NozzlesTab';
import TanksTab from './components/TanksTab';
import DailyEntryTab from './components/DailyEntryTab';
import ReportsTab from './components/ReportsTab';
import LogsTab from './components/LogsTab';
import UdhaarKhataTab from './components/UdhaarKhataTab';
import DayBookTab from './components/DayBookTab';

export default function App() {
  // Config states with persistence
  const [lang, setLang] = useState<LanguageCode>(() => {
    return (localStorage.getItem('pump_erp_lang') as LanguageCode) || 'en';
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('pump_erp_theme') === 'light' ? false : true; // default dark
  });
  
  // Auth state is bypassed by default to an Administrator session
  const [session, setSession] = useState<UserSession>({
    employeeId: 'admin-bypass',
    name: 'Administrator',
    role: 'admin'
  });

  // Navigation states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'shifts' | 'employees' | 'nozzles' | 'tanks' | 'entries' | 'reports' | 'logs' | 'udhaar' | 'daybook'>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Backend state
  const [state, setState] = useState<SystemState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch full data state from Express server
  const fetchState = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('Failed to retrieve system parameters.');
      const data = await res.json();
      setState(data);
    } catch (err: any) {
      console.error(err);
      setError('ERP offline. Please check Node server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, [session]);

  const toggleLanguage = () => {
    const nextLang = lang === 'en' ? 'gu' : 'en';
    setLang(nextLang);
    localStorage.setItem('pump_erp_lang', nextLang);
  };

  const toggleTheme = () => {
    const nextTheme = !darkMode;
    setDarkMode(nextTheme);
    localStorage.setItem('pump_erp_theme', nextTheme ? 'dark' : 'light');
  };



  // Generalized client-server communicator
  const handlePostAction = async (actionType: string, url: string, payload: any) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const refreshedState = await response.json();

    if (!response.ok) {
      throw new Error(refreshedState.error || `Failed to ${actionType}.`);
    }

    // Server returns the full updated SystemState, sync instantly
    setState(refreshedState);
  };

  const t = translations[lang];



  // Loader states
  if (loading && !state) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-900 text-slate-100 p-4">
        <Fuel className="w-12 h-12 text-teal-400 animate-bounce mb-3" />
        <span className="text-sm font-semibold text-slate-300 tracking-wider">
          Initializing Station Database... (સિસ્ટમ શરુ થઈ રહી છે...)
        </span>
      </div>
    );
  }

  // Sidebar responsive classes
  const menuItems = [
    { id: 'dashboard', label: t.dashboard, icon: Activity, roles: ['admin', 'manager', 'employee'] },
    { id: 'entries', label: t.dailyEntries, icon: CalendarDays, roles: ['admin', 'manager', 'employee'] },
    { id: 'udhaar', label: t.udhaarKhata, icon: Coins, roles: ['admin', 'manager', 'employee'] },
    { id: 'daybook', label: t.dayBook, icon: Layers, roles: ['admin', 'manager', 'employee'] },
    { id: 'reports', label: t.reports, icon: TrendingUp, roles: ['admin', 'manager'] },
    { id: 'shifts', label: t.shiftMgmt, icon: Clock, roles: ['admin'] },
    { id: 'employeeMgmt', label: t.employeeMgmt, icon: Users, roles: ['admin'] },
    { id: 'nozzleMgmt', label: t.nozzleMgmt, icon: Settings, roles: ['admin'] },
    { id: 'tankMgmt', label: t.tankMgmt, icon: Droplet, roles: ['admin'] },
    { id: 'logs', label: t.systemLogs, icon: Database, roles: ['admin'] },
  ];

  const visibleMenuItems = menuItems.filter(item => item.roles.includes(session.role));

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100 dark-mode-active' : 'bg-slate-50 text-slate-900'} flex flex-col font-sans selection:bg-teal-500 selection:text-slate-900`} id="main_layout">
      
      {/* Upper Navigation Header bar */}
      <header className={`sticky top-0 z-40 px-4 md:px-6 py-3.5 flex justify-between items-center transition-all ${
        darkMode ? 'bg-slate-900 border-b border-slate-800' : 'bg-white border-b border-slate-205 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-1 px-2.5 rounded-lg border border-slate-700/30 md:hidden hover:bg-slate-800/40 text-slate-400 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <Fuel className="w-6 h-6 text-teal-400" />
            <h1 className="font-extrabold text-slate-100 tracking-tight text-base md:text-lg flex items-center gap-1.5 font-sans">
              <span>{t.appTitle}</span>
              <span className="text-[10px] bg-teal-400/10 border border-teal-500/25 px-1.5 py-0.5 rounded text-teal-400 uppercase font-mono hidden sm:inline">
                ERP
              </span>
            </h1>
          </div>
        </div>

        {/* Dynamic Operator Info and global switches */}
        <div className="flex items-center gap-2.5">
          {/* Welcome session profile */}
          <div className="hidden md:flex items-center gap-1.5 text-right px-3 py-1 bg-slate-800/40 border border-slate-700/30 rounded-xl" id="profile_session_panel">
            <Users className="w-4 h-4 text-slate-405" />
            <div className="text-left">
              <span className="text-xs text-slate-405 block leading-none">Welcome, {session.name}</span>
              <span className={`text-[9px] uppercase font-bold tracking-wide font-mono ${
                session.role === 'admin' ? 'text-red-400' : session.role === 'manager' ? 'text-amber-400' : 'text-teal-400'
              }`}>
                {session.role}
              </span>
            </div>
          </div>

          {/* Bilingual translations toggler button */}
          <button
            onClick={toggleLanguage}
            className="p-1.5 sm:px-3 bg-slate-805 hover:bg-slate-705 text-teal-400 font-semibold text-xs border border-slate-705/50 rounded-xl cursor-pointer transition-colors flex items-center gap-1 shadow-sm"
            title="Switch language (ભાષા બદલો)"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'en' ? 'ગુજરાતી' : 'English'}</span>
          </button>

          {/* Theme toggler */}
          <button
            onClick={toggleTheme}
            className="p-2 bg-slate-805 text-slate-300 hover:text-slate-100 border border-slate-705/50 rounded-xl cursor-pointer transition-colors shadow-sm"
            title={darkMode ? t.lightMode : t.darkMode}
          >
            {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>


        </div>
      </header>

      {/* Main Structural Layout Grid */}
      <div className="flex-1 flex flex-col md:flex-row relative">
        
        {/* Horizontal Navigation Sidebar left */}
        <aside className={`w-64 flex-shrink-0 border-r border-slate-800 md:block transition-all duration-300 absolute md:relative z-35 h-full ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-205 shadow-sm'
        } ${mobileSidebarOpen ? 'left-0 block' : '-left-64 md:left-0 hidden'}`}>
          <nav className="p-4 space-y-1.5">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id || (item.id === 'employeeMgmt' && activeTab === 'employees');
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wider font-sans uppercase text-left transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-teal-500/15 to-teal-500/5 text-teal-400 border-l-4 border-l-teal-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/40'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content container body right */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl mx-auto w-full z-15">
          {error && (
            <div className="p-4 bg-red-400/10 border border-red-500/20 text-red-400 rounded-xl mb-6 text-center text-xs font-bold leading-relaxed flex items-center justify-center gap-2">
              <Info className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Routing tab view switchboard */}
          {state && (
            <div className="space-y-6">
              {activeTab === 'dashboard' && (
                <DashboardTab 
                  state={state} 
                  lang={lang} 
                  darkMode={darkMode} 
                />
              )}
              {activeTab === 'entries' && (
                <DailyEntryTab 
                  state={state} 
                  lang={lang} 
                  session={session} 
                  onPostAction={handlePostAction} 
                  onRefreshState={fetchState}
                />
              )}
              {activeTab === 'udhaar' && (
                <UdhaarKhataTab 
                  state={state} 
                  lang={lang} 
                  session={session} 
                  onPostAction={handlePostAction} 
                  onRefreshState={fetchState}
                />
              )}
              {activeTab === 'daybook' && (
                <DayBookTab 
                  state={state} 
                  lang={lang} 
                  session={session} 
                  onPostAction={handlePostAction} 
                  onRefreshState={fetchState}
                />
              )}
              {activeTab === 'reports' && (
                <ReportsTab 
                  state={state} 
                  lang={lang} 
                  session={session} 
                  onPostAction={handlePostAction} 
                  onRefreshState={fetchState}
                />
              )}
              {activeTab === 'shifts' && (
                <ShiftsTab 
                  state={state} 
                  lang={lang} 
                  session={session} 
                  onPostAction={handlePostAction} 
                />
              )}
              {activeTab === 'employeeMgmt' && (
                <EmployeesTab 
                  state={state} 
                  lang={lang} 
                  session={session} 
                  onPostAction={handlePostAction} 
                />
              )}
              {activeTab === 'nozzleMgmt' && (
                <NozzlesTab 
                  state={state} 
                  lang={lang} 
                  session={session} 
                  onPostAction={handlePostAction} 
                />
              )}
              {activeTab === 'tankMgmt' && (
                <TanksTab 
                  state={state} 
                  lang={lang} 
                  session={session} 
                  onPostAction={handlePostAction} 
                />
              )}
              {activeTab === 'logs' && (
                <LogsTab 
                  state={state} 
                  lang={lang} 
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Humble ERP status footer */}
      <footer className="py-3 px-4 border-t border-slate-905 bg-slate-950/20 text-center text-[10px] text-slate-500 tracking-wider font-mono">
        PETROL PUMP BOSS ERP SYSTEMS v1.0.4 • BILINGUAL INTERFACE (GUJARATI + ENGLISH)
      </footer>
    </div>
  );
}
