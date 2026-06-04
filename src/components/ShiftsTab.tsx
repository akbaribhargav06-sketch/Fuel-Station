/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { translations, LanguageCode } from '../translations';
import { SystemState, Shift, UserSession } from '../types';
import { Clock, Plus, Trash2, Edit3, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

interface ShiftsTabProps {
  state: SystemState;
  lang: LanguageCode;
  session: UserSession;
  onPostAction: (actionType: string, url: string, payload: any) => Promise<void>;
}

export default function ShiftsTab({ state, lang, session, onPostAction }: ShiftsTabProps) {
  const t = translations[lang];
  const isAdmin = session.role === 'admin';

  // State managers
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('14:00');
  const [errorMsg, setErrorMsg] = useState('');

  const handleOpenAdd = () => {
    setIsEditing(null);
    setName('');
    setStartTime('06:00');
    setEndTime('14:00');
    setErrorMsg('');
    setShowForm(true);
  };

  const handleOpenEdit = (shift: Shift) => {
    setIsEditing(shift.id);
    setName(shift.name);
    setStartTime(shift.startTime);
    setEndTime(shift.endTime);
    setErrorMsg('');
    setShowForm(true);
  };

  // Submit Shift Addition/Edit to Node Server
  const handleSubmitShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startTime || !endTime) {
      setErrorMsg(lang === 'en' ? 'All shift timing fields are required.' : 'બધી વિગતો ભરવી ફરજિયાત છે.');
      return;
    }

    const payload = {
      action: isEditing ? 'edit' : 'add',
      userId: session.employeeId,
      userName: session.name,
      shift: {
        id: isEditing || undefined,
        name: name.trim(),
        startTime,
        endTime
      }
    };

    try {
      await onPostAction('configure shifts', '/api/shifts', payload);
      setShowForm(false);
      setName('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Server update failure.');
    }
  };

  // Submit Shift Deletion
  const handleDeleteShift = async (shift: Shift) => {
    if (!window.confirm(lang === 'en' ? `Are you sure you want to remove ${shift.name}?` : `શું તમે ખરેખર ${shift.name} શિફ્ટ કાઢી નાખવા માંગો છો?`)) {
      return;
    }

    const payload = {
      action: 'delete',
      userId: session.employeeId,
      userName: session.name,
      shift: { id: shift.id, name: shift.name }
    };

    try {
      await onPostAction('remove shift', '/api/shifts', payload);
    } catch (err: any) {
      alert(err.message || 'Failed to delete shift.');
    }
  };

  return (
    <div className="space-y-6" id="shifts_tab">
      
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Clock className="text-teal-400 w-5 h-5" />
            {t.shiftList}
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            {lang === 'en' ? 'Define structural business shifts and timing intervals' : 'પંપના રોજિંદા સંચાલન માટેની શિફ્ટ સમય ગોઠવણી અને સ્ટાફ વિતરણ.'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-900 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-md transform active:scale-95 transition-all cursor-pointer"
            id="add_new_shift_btn"
          >
            <Plus className="w-4 h-4" />
            {t.addShift}
          </button>
        )}
      </div>

      {/* Role Notice for non-admins */}
      {!isAdmin && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl p-4 text-xs flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>
            {lang === 'en' 
              ? 'Timing adjustments and shifts configuration are restricted to Admin personnel only.' 
              : 'સમય પત્રક અને શિફ્ટ ગોઠવણીમાં ફેરફાર ફક્ત એડમિનિસ્ટ્રેટર જ કરી શકે છે.'}
          </span>
        </div>
      )}

      {/* Add / Edit Shift Modal Form */}
      {showForm && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4 max-w-lg shadow-xl"
        >
          <h3 className="font-bold text-slate-200 text-sm">
            {isEditing ? t.editShift : t.addShift}
          </h3>

          {errorMsg && (
            <div className="p-2.5 bg-red-400/10 border border-red-500/20 text-red-400 text-xs rounded-lg text-center font-semibold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmitShift} className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1.5">{t.shiftName}</label>
              <input
                type="text"
                placeholder="e.g. Shift 1 (Morn)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500 font-sans"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1.5">{t.startTime}</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1.5">{t.endTime}</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-700/50">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 text-xs font-semibold rounded-lg cursor-pointer"
              >
                {t.save}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Shifts Grid Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="shifts_cards_grid">
        {state.shifts.map((shift) => (
          <div 
            key={shift.id} 
            className="bg-slate-800/90 border border-slate-700/60 hover:border-teal-500/20 rounded-2xl p-5 space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-200 text-base font-sans">{shift.name}</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-700 text-teal-400 border border-zinc-650">
                  {shift.active ? t.active : t.inactive}
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-400 text-sm font-mono bg-slate-900/50 p-2.5 rounded-lg border border-slate-700/30">
                <Clock className="w-4 h-4 text-teal-400" />
                <span>{shift.startTime} - {shift.endTime}</span>
              </div>
            </div>

            {isAdmin && (
              <div className="flex gap-2 justify-end pt-3 border-t border-slate-700/40">
                <button
                  onClick={() => handleOpenEdit(shift)}
                  className="p-2 hover:bg-teal-500/10 text-teal-400 hover:text-teal-300 rounded-lg border border-slate-700/50 transition-colors cursor-pointer"
                  title={t.edit}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteShift(shift)}
                  className="p-2 hover:bg-red-500/10 text-red-400 hover:text-red-350 rounded-lg border border-slate-700/50 transition-colors cursor-pointer"
                  title={t.delete}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}

        {state.shifts.length === 0 && (
          <div className="col-span-full text-center py-10 bg-slate-800/50 border border-dashed border-slate-700 rounded-2xl text-slate-400 text-sm">
            {t.noData}
          </div>
        )}
      </div>

    </div>
  );
}
