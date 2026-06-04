/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { translations, LanguageCode } from '../translations';
import { SystemState, Nozzle, UserSession } from '../types';
import { ToggleLeft, ToggleRight, Plus, Pencil, Trash2, ShieldAlert, Zap } from 'lucide-react';
import { motion } from 'motion/react';

interface NozzlesTabProps {
  state: SystemState;
  lang: LanguageCode;
  session: UserSession;
  onPostAction: (actionType: string, url: string, payload: any) => Promise<void>;
}

export default function NozzlesTab({ state, lang, session, onPostAction }: NozzlesTabProps) {
  const t = translations[lang];
  const isAdmin = session.role === 'admin';

  // State managers
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [nozzleNumber, setNozzleNumber] = useState('');
  const [fuelType, setFuelType] = useState<'petrol' | 'diesel'>('petrol');
  const [tankId, setTankId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Choose the first tank inside system state by default
  const defaultTankId = state.tanks.length > 0 ? state.tanks[0].id : '';

  const handleOpenAdd = () => {
    setIsEditing(null);
    setNozzleNumber(`Nozzle ${state.nozzles.length + 1}`);
    setFuelType('petrol');
    setTankId(defaultTankId);
    setErrorMsg('');
    setShowForm(true);
  };

  const handleOpenEdit = (noz: Nozzle) => {
    setIsEditing(noz.id);
    setNozzleNumber(noz.nozzleNumber);
    setFuelType(noz.fuelType);
    setTankId(noz.tankId);
    setErrorMsg('');
    setShowForm(true);
  };

  // Submit Nozzle config edit/add to server
  const handleSubmitNozzle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nozzleNumber.trim() || !tankId) {
      setErrorMsg(lang === 'en' ? 'Nozzle number and feeding Tank are required.' : 'નોઝલ નંબર અને જોડાયેલ ટાંકી પસંદ કરવી જરૂરી છે.');
      return;
    }

    const payload = {
      action: isEditing ? 'edit' : 'add',
      userId: session.employeeId,
      userName: session.name,
      nozzle: {
        id: isEditing || undefined,
        nozzleNumber: nozzleNumber.trim(),
        fuelType,
        tankId
      }
    };

    try {
      await onPostAction('configure nozzle', '/api/nozzles', payload);
      setShowForm(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Server update failed.');
    }
  };

  // Enable / Disable toggler
  const handleToggleNozzle = async (noz: Nozzle) => {
    const payload = {
      action: 'toggle',
      userId: session.employeeId,
      userName: session.name,
      nozzle: { id: noz.id }
    };

    try {
      await onPostAction('toggle nozzle safety', '/api/nozzles', payload);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle nozzle.');
    }
  };

  // Destructive delete nozzle
  const handleDeleteNozzle = async (noz: Nozzle) => {
    if (!window.confirm(lang === 'en' ? `Are you sure you want to permanently delete ${noz.nozzleNumber}?` : `શું તમે ખરેખર ${noz.nozzleNumber} કાયમ માટે કાઢી નાખવા માંગો છો?`)) {
      return;
    }

    const payload = {
      action: 'delete',
      userId: session.employeeId,
      userName: session.name,
      nozzle: { id: noz.id, nozzleNumber: noz.nozzleNumber }
    };

    try {
      await onPostAction('delete nozzle mounting', '/api/nozzles', payload);
    } catch (err: any) {
      alert(err.message || 'Failed to delete nozzle.');
    }
  };

  return (
    <div className="space-y-6" id="nozzles_tab">
      
      {/* Header and Add buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Zap className="text-teal-400 w-5 h-5" />
            {t.nozzleList}
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            {lang === 'en' ? 'Manage fuel dispensers, nozzles, linked product reservoirs, safety switches' : 'ડીઝલ અને પેટ્રોલ બહાર કાઢતા નોઝલ યુનિટ, વાલ્વ, ટાંકી મેચ અને ઓપરેશનલ વાલ્વ સ્થિતિ.'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-900 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-md cursor-pointer transition-all"
            id="register_noz_btn"
          >
            <Plus className="w-4 h-4" />
            {t.addNozzle}
          </button>
        )}
      </div>

      {/* Role Notice */}
      {!isAdmin && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl p-4 text-xs flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>
            {lang === 'en' 
              ? 'Mounting new nozzles, delete operations, or editing configurations is locked to Admin level.' 
              : 'નવા નોઝલ ઉમેરવા, કાયમી કાઢવા કે કનેક્શન બદલવાની ક્ષમતા એડમિન ઓથોરાઇઝેશન સુધી સીમિત છે.'}
          </span>
        </div>
      )}

      {/* Mounting Form */}
      {showForm && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4 max-w-lg shadow-2xl"
        >
          <h3 className="font-bold text-slate-200 text-sm">
            {isEditing ? t.editNozzle : t.addNozzle}
          </h3>

          {errorMsg && (
            <div className="p-2.5 bg-red-400/10 border border-red-500/20 text-red-400 text-xs rounded-lg text-center font-bold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmitNozzle} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1.5">{t.nozzleNo}</label>
              <input
                type="text"
                placeholder="e.g. Nozzle 1"
                value={nozzleNumber}
                onChange={(e) => setNozzleNumber(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500 font-sans"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1.5">{t.fuelType}</label>
                <select
                  value={fuelType}
                  onChange={(e) => {
                    const selFuel = e.target.value as 'petrol' | 'diesel';
                    setFuelType(selFuel);
                    // preset connected tank corresponding to that fuel type
                    const correctTank = state.tanks.find(tk => tk.fuelType === selFuel);
                    if (correctTank) setTankId(correctTank.id);
                  }}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  <option value="petrol">{t.petrol}</option>
                  <option value="diesel">{t.diesel}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1.5">{t.linkedTank}</label>
                <select
                  value={tankId}
                  onChange={(e) => setTankId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  {state.tanks
                    .filter(tk => tk.fuelType === fuelType)
                    .map(tk => (
                      <option key={tk.id} value={tk.id}>{tk.name}</option>
                    ))}
                  {state.tanks.filter(tk => tk.fuelType === fuelType).length === 0 && (
                    <option value="">No Tank of this type available</option>
                  )}
                </select>
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

      {/* Nozzle Grid list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="nozzles_dispenser_grid">
        {state.nozzles.map((noz) => {
          const tankName = state.tanks.find(t => t.id === noz.tankId)?.name || 'Unlinked';
          return (
            <div 
              key={noz.id} 
              className={`bg-slate-800/90 border rounded-2xl p-5 space-y-4 flex flex-col justify-between transition-all ${
                noz.active 
                  ? 'border-slate-700/60 hover:border-teal-500/10' 
                  : 'border-red-500/20 bg-slate-900/30 opacity-60'
              }`}
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-100 text-base">{noz.nozzleNumber}</h4>
                    <span className="text-[10px] text-slate-400 italic">Linked Feed: {tankName}</span>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                    noz.fuelType === 'petrol' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                  }`}>
                    {noz.fuelType === 'petrol' ? t.petrol : t.diesel}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-xl border border-slate-700/20 text-xs text-slate-400">
                  <span>Status:</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${noz.active ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                    <span className={noz.active ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                      {noz.active ? t.active : t.disabled}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action operations controls */}
              <div className="flex justify-between pt-3 border-t border-slate-700/40 items-center">
                <button
                  onClick={() => handleToggleNozzle(noz)}
                  className={`flex items-center gap-1 cursor-pointer text-xs font-semibold ${
                    noz.active ? 'text-red-400 hover:text-red-300' : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                  title="Toggle active status"
                >
                  {noz.active ? (
                    <>
                      <ToggleRight className="w-6 h-6 text-emerald-400" />
                      <span>Disable</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-6 h-6 text-slate-500" />
                      <span>Enable</span>
                    </>
                  )}
                </button>

                {isAdmin && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(noz)}
                      className="p-1 px-2 text-[10px] bg-slate-700 hover:bg-slate-650 text-slate-200 border border-slate-600 rounded cursor-pointer transition-all"
                    >
                      Config
                    </button>
                    <button
                      onClick={() => handleDeleteNozzle(noz)}
                      className="p-1 px-2 text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded cursor-pointer transition-all border border-red-500/25"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {state.nozzles.length === 0 && (
          <div className="col-span-full text-center py-10 bg-slate-800/50 border border-dashed border-slate-700 rounded-2xl text-slate-400 text-sm">
            {t.noData}
          </div>
        )}
      </div>

    </div>
  );
}
