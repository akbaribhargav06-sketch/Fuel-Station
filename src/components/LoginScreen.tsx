/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { translations, TranslationSet, LanguageCode } from '../translations';
import { Fuel, Lock, User, KeyRound } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginScreenProps {
  lang: LanguageCode;
  onLoginSuccess: (session: { employeeId: string; name: string; role: 'admin' | 'manager' | 'employee' }) => void;
  langToggle: () => void;
}

export default function LoginScreen({ lang, onLoginSuccess, langToggle }: LoginScreenProps) {
  const t = translations[lang];
  const [nameOrMobile, setNameOrMobile] = useState('');
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameOrMobile.trim() || !pin) {
      setErrorMsg(lang === 'en' ? 'Please fill in all fields.' : 'કૃપા કરીને બધી વિગતો ભરો.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameOrMobile, pin }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data.error || 'Login failed.');
        setLoading(false);
        return;
      }

      onLoginSuccess(data);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        lang === 'en' 
          ? 'Network or server offline. Please retry.' 
          : 'સર્વર કનેક્શન નિષ્ફળ થયું છે. ફરી પ્રયાસ કરો.'
      );
      setLoading(false);
    }
  };

  const appendPinDigit = (digit: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit);
    }
  };

  const clearPin = () => {
    setPin('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 selection:bg-teal-500 selection:text-white" id="login_panel">
      {/* Top Banner Language Switch */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={langToggle}
          className="bg-slate-800 hover:bg-slate-700 text-teal-400 font-medium px-4 py-2 rounded-lg text-sm transition-all duration-200 border border-slate-700 cursor-pointer shadow-md"
          id="lang_switch_login"
        >
          {lang === 'en' ? 'ગુજરાતી' : 'English'}
        </button>
      </div>

      <div className="w-full max-w-md bg-slate-800 rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden p-6 md:p-8">
        {/* Brand Icon & Heading */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-teal-500/10 rounded-2xl text-teal-400 mb-3 border border-teal-500/20">
            <Fuel className="w-10 h-10" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-100 tracking-tight font-sans">
            {t.appTitle}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {t.loginSubtitle}
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg text-center"
            id="login_error"
          >
            {errorMsg}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee Identifier */}
          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              {lang === 'en' ? 'Staff Contact / Full Name' : 'કર્મચારીનું નામ અથવા મોબાઇલ'}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={nameOrMobile}
                onChange={(e) => setNameOrMobile(e.target.value)}
                placeholder={t.nameOrPhonePlaceholder}
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-sans"
                id="login_username_field"
              />
            </div>
          </div>

          {/* Secure Security PIN */}
          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              {t.pinLabel}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <KeyRound className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={pin}
                readOnly
                placeholder={t.enterPinPlaceholder}
                className="w-full pl-10 pr-10 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-center text-lg tracking-widest focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-mono"
                id="login_pin_field"
              />
              {pin && (
                <button
                  type="button"
                  onClick={clearPin}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-red-400 hover:text-red-300 transition-colors uppercase font-semibold tracking-wider cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Touch PinPad for quick pump staff login */}
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-700/40 grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => appendPinDigit(digit)}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 rounded-lg text-base font-semibold font-mono border border-slate-700/30 transition-all shadow-sm cursor-pointer"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={clearPin}
              className="py-2.5 bg-slate-800 hover:bg-slate-700 text-red-400 hover:text-red-300 text-xs font-semibold uppercase rounded-lg border border-slate-700/30 cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => appendPinDigit('0')}
              className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-base font-semibold font-mono border border-slate-700/30 cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => {
                if (pin.length > 0) {
                  setPin(prev => prev.slice(0, -1));
                }
              }}
              className="py-2.5 bg-slate-800 hover:bg-slate-700 text-yellow-400 text-xs font-semibold uppercase rounded-lg border border-slate-700/30 cursor-pointer"
            >
              Del
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-teal-500 hover:bg-teal-400 text-slate-900 text-sm font-semibold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none col-span-3 cursor-pointer"
            id="login_submit_btn"
          >
            {loading ? t.loading : (lang === 'en' ? 'Authenticate' : 'પ્રવેશ મેળવો')}
          </button>
        </form>

        <p className="text-slate-400 text-[11px] text-center mt-5 leading-relaxed bg-slate-900/50 p-2.5 rounded-lg border border-slate-700/30">
          {t.operatorLoginNote}
        </p>
      </div>
    </div>
  );
}
