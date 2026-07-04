/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { translations, LanguageCode } from '../translations';
import { SystemState, FuelTank, UserSession } from '../types';
import { Droplet, Plus, Trash2, Edit, Percent, ShieldCheck, Check, Fuel, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

interface TanksTabProps {
  state: SystemState;
  lang: LanguageCode;
  session: UserSession;
  onPostAction: (actionType: string, url: string, payload: any) => Promise<void>;
}

export default function TanksTab({ state, lang, session, onPostAction }: TanksTabProps) {
  const t = translations[lang];
  const isAdmin = session.role === 'admin';

  // State managers
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [fuelType, setFuelType] = useState<'petrol' | 'diesel'>('petrol');
  const [capacity, setCapacity] = useState<string>('20000');
  const [openingStock, setOpeningStock] = useState<string>('10000');
  const [customRate, setCustomRate] = useState<string>('101.45');
  const [errorMsg, setErrorMsg] = useState('');

  // Bulk rate setters
  const petrolRateVal = state.tanks.find(t => t.fuelType === 'petrol')?.customRate || 101.45;
  const dieselRateVal = state.tanks.find(t => t.fuelType === 'diesel')?.customRate || 92.15;

  const [petrolInput, setPetrolInput] = useState(petrolRateVal.toString());
  const [dieselInput, setDieselInput] = useState(dieselRateVal.toString());
  const [isUpdatingRates, setIsUpdatingRates] = useState(false);
  const [rateErrorMsg, setRateErrorMsg] = useState('');
  const [rateSuccessMsg, setRateSuccessMsg] = useState('');

  React.useEffect(() => {
    setPetrolInput(petrolRateVal.toString());
  }, [petrolRateVal]);

  React.useEffect(() => {
    setDieselInput(dieselRateVal.toString());
  }, [dieselRateVal]);

  const handleUpdateRates = async (e: React.FormEvent) => {
    e.preventDefault();
    setRateErrorMsg('');
    setRateSuccessMsg('');
    setIsUpdatingRates(true);

    const pRate = parseFloat(petrolInput);
    const dRate = parseFloat(dieselInput);

    if (isNaN(pRate) || pRate <= 0 || isNaN(dRate) || dRate <= 0) {
      setRateErrorMsg(lang === 'en' ? 'Rates must be valid positive numbers.' : 'ભાવ પોઝીટીવ સંખ્યા હોવા જોઈએ.');
      setIsUpdatingRates(false);
      return;
    }

    try {
      await onPostAction('configure fuel rates', '/api/tanks', {
        action: 'update_rates',
        userId: session.employeeId,
        userName: session.name,
        petrolRate: pRate,
        dieselRate: dRate
      });
      setRateSuccessMsg(lang === 'en' ? 'Fuel rates updated successfully for all tanks!' : 'બધા બળતણ ના ભાવ સફળતાપૂર્વક અપડેટ થયા છે!');
      setTimeout(() => setRateSuccessMsg(''), 4000);
    } catch (err: any) {
      setRateErrorMsg(err.message || 'Failed to update rates.');
    } finally {
      setIsUpdatingRates(false);
    }
  };

  const handleOpenAdd = () => {
    setIsEditing(null);
    setName(`Tank ${state.tanks.length + 1}`);
    setFuelType('petrol');
    setCapacity('20000');
    setOpeningStock('15000');
    setCustomRate('101.45');
    setErrorMsg('');
    setShowForm(true);
  };

  const handleOpenEdit = (tank: FuelTank) => {
    setIsEditing(tank.id);
    setName(tank.name);
    setFuelType(tank.fuelType);
    setCapacity(tank.capacity.toString());
    setOpeningStock(tank.openingStock.toString());
    setCustomRate(tank.customRate.toString());
    setErrorMsg('');
    setShowForm(true);
  };

  // Submit Tank addition/edit to server
  const handleSubmitTank = async (e: React.FormEvent) => {
    e.preventDefault();
    const capNum = parseFloat(capacity);
    const rateNum = parseFloat(customRate);
    const stockNum = parseFloat(openingStock);

    if (!name.trim() || isNaN(capNum) || isNaN(rateNum)) {
      setErrorMsg(lang === 'en' ? 'Tank Name, Capacity, and fuel selling Rate are required.' : 'ટાંકીનું નામ, ક્ષમતા અને બળતણનો ભાવ આપવો ફરજિયાત છે.');
      return;
    }

    if (capNum <= 0 || rateNum <= 0) {
      setErrorMsg(lang === 'en' ? 'Capacity and Rate must be valid positive numbers.' : 'ક્ષમતા અને ભાવ પોઝીટીવ સંખ્યા હોવા જોઈએ.');
      return;
    }

    const payload = {
      action: isEditing ? 'edit' : 'add',
      userId: session.employeeId,
      userName: session.name,
      tank: {
        id: isEditing || undefined,
        name: name.trim(),
        fuelType,
        capacity: capNum,
        openingStock: isNaN(stockNum) ? 0 : stockNum,
        customRate: rateNum
      }
    };

    try {
      await onPostAction('configure fuel reservoir', '/api/tanks', payload);
      setShowForm(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Server update failure.');
    }
  };

  // Delete Tank
  const handleDeleteTank = async (tank: FuelTank) => {
    if (!window.confirm(lang === 'en' ? `Are you sure you want to delete ${tank.name}?` : `શું તમે ખરેખર ${tank.name} ટાંકી કાઢી નાખવા માંગો છો?`)) {
      return;
    }

    const payload = {
      action: 'delete',
      userId: session.employeeId,
      userName: session.name,
      tank: { id: tank.id, name: tank.name }
    };

    try {
      await onPostAction('remove reservoir', '/api/tanks', payload);
    } catch (err: any) {
      alert(err.message || 'Failed to remove tank.');
    }
  };

  return (
    <div className="space-y-6" id="tanks_tab">
      
      {/* Header and Add buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Droplet className="text-teal-400 w-5 h-5 animate-pulse" />
            {t.tankList}
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            {lang === 'en' ? 'Monitor underground bulk reservoirs, fuel volumes, and configure rates' : 'પંપ હેઠળ ફીટ કરેલી મુખ્ય બળતણ ટાંકીઓ અને તેના ક્ષમતા આંકડા.'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-900 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-md cursor-pointer transition-all"
            id="create_tank_btn"
          >
            <Plus className="w-4 h-4" />
            {t.addTank}
          </button>
        )}
      </div>

      {/* Form Dialog modal for configuration */}
      {showForm && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4 max-w-lg shadow-2xl"
        >
          <h3 className="font-bold text-slate-200 text-sm">
            {isEditing ? t.editTank : t.addTank}
          </h3>

          {errorMsg && (
            <div className="p-2.5 bg-red-400/10 border border-red-500/20 text-red-400 text-xs rounded-lg text-center font-bold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmitTank} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1.5">{t.tankName}</label>
              <input
                type="text"
                placeholder="e.g. Tank 1 (Petrol Main)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500 font-sans"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1.5">{t.fuelType}</label>
                <select
                  value={fuelType}
                  onChange={(e) => {
                    const type = e.target.value as 'petrol' | 'diesel';
                    setFuelType(type);
                    setCustomRate(type === 'petrol' ? '101.45' : '92.15');
                  }}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  <option value="petrol">{t.petrol}</option>
                  <option value="diesel">{t.diesel}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1.5">{t.fuelRate} (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1.5">{t.capacity} (L)</label>
                <input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1.5">{t.openingStock} (L)</label>
                <input
                  type="number"
                  value={openingStock}
                  onChange={(e) => setOpeningStock(e.target.value)}
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

      {/* Bulk Fuel Rates Setter Panel */}
      {isAdmin && (
        <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-700/40 pb-3">
            <TrendingUp className="text-teal-400 w-5 h-5" />
            <div>
              <h3 className="font-bold text-slate-100 text-sm">
                {lang === 'en' ? 'Quick Fuel Rate Config' : 'બળતણના દરો સેટ કરો'}
              </h3>
              <p className="text-[11px] text-slate-400 font-sans">
                {lang === 'en' 
                  ? 'Set the bulk price per liter of Petrol and Diesel for all calculating registries' 
                  : 'પેટ્રોલ અને ડીઝલનો ભાવ અહીં સેટ કરો જેથી બધી ગણતરી આ મુજબ થાય.'}
              </p>
            </div>
          </div>

          {rateErrorMsg && (
            <div className="p-2.5 bg-red-400/10 border border-red-500/20 text-red-400 text-xs rounded-lg text-center font-bold">
              {rateErrorMsg}
            </div>
          )}

          {rateSuccessMsg && (
            <div className="p-2.5 bg-emerald-400/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg text-center font-bold">
              {rateSuccessMsg}
            </div>
          )}

          <form onSubmit={handleUpdateRates} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-slate-350 text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                {lang === 'en' ? 'Petrol Rate (₹/L)' : 'પેટ્રોલ નો ભાવ (₹/લીટર)'}
              </label>
              <input
                type="number"
                step="0.01"
                value={petrolInput}
                onChange={(e) => setPetrolInput(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500 font-mono"
                placeholder="101.45"
              />
            </div>

            <div>
              <label className="block text-slate-355 text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-450 inline-block"></span>
                {lang === 'en' ? 'Diesel Rate (₹/L)' : 'ડીઝલ નો ભાવ (₹/લીટર)'}
              </label>
              <input
                type="number"
                step="0.01"
                value={dieselInput}
                onChange={(e) => setDieselInput(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500 font-mono"
                placeholder="92.15"
              />
            </div>

            <button
              type="submit"
              disabled={isUpdatingRates}
              className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow transition-all cursor-pointer active:scale-95 h-[38px]"
            >
              <Check className="w-4 h-4" />
              {isUpdatingRates 
                ? (lang === 'en' ? 'Updating...' : 'અપડેટ થાય છે...') 
                : (lang === 'en' ? 'Apply New Rates' : 'નવો ભાવ લાગુ કરો')}
            </button>
          </form>
        </div>
      )}

      {/* Reservoir Tank rows and details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" id="reservoirs_cards_panel">
        {state.tanks.map((tank) => {
          const fillPercent = ((tank.currentStock / tank.capacity) * 100);
          let levelColor = "bg-green-500";
          if (fillPercent < 20) levelColor = "bg-red-500 animate-pulse";
          else if (fillPercent < 45) levelColor = "bg-yellow-500";

          return (
            <div 
              key={tank.id} 
              className="bg-slate-800/90 border border-slate-700/60 hover:border-teal-500/10 rounded-2xl p-5 space-y-4 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-100 text-base font-sans">{tank.name}</h4>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                    ID: {tank.id}
                  </span>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold font-mono ${
                    tank.fuelType === 'petrol' ? 'bg-blue-400/10 text-blue-400' : 'bg-yellow-400/10 text-yellow-500'
                  }`}>
                    {tank.fuelType === 'petrol' ? t.petrol : t.diesel}
                  </span>
                  <span className="text-xs text-teal-400 font-mono font-bold bg-teal-950/40 p-1 rounded border border-teal-500/15">
                    ₹{tank.customRate.toFixed(2)} / L
                  </span>
                </div>
              </div>

              {/* Tank Fuel Level bar visual */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span>Current Volume:</span>
                  <span className="font-semibold text-slate-200">{tank.currentStock.toFixed(1)} / {tank.capacity.toLocaleString()} L</span>
                </div>

                <div className="w-full bg-slate-900 rounded-lg h-3 overflow-hidden border border-slate-800">
                  <div 
                    className={`${levelColor} h-full rounded-lg`} 
                    style={{ width: `${Math.min(100, fillPercent)}%` }}
                  ></div>
                </div>

                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>Usage Level: {fillPercent.toFixed(1)}%</span>
                  <span>Empty Volume: {(tank.capacity - tank.currentStock).toFixed(1)} L</span>
                </div>
              </div>

              {/* Static Opening Stock parameters */}
              <div className="grid grid-cols-2 gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-700/35 text-xs text-slate-400">
                <div>
                  <span className="text-[10px] text-slate-500 block">Initial Opening Stock</span>
                  <span className="font-bold text-slate-300 font-mono">{tank.openingStock.toLocaleString()} L</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Decanted Cargo Status</span>
                  <span className="font-semibold text-slate-400 font-mono">Decanted as Enterable</span>
                </div>
              </div>

              {isAdmin && (
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-700/35">
                  <button
                    onClick={() => handleOpenEdit(tank)}
                    className="p-2 text-xs bg-slate-700 hover:bg-slate-600 text-teal-400 font-semibold border border-slate-650 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Configure Rates / Specs
                  </button>
                  <button
                    onClick={() => handleDeleteTank(tank)}
                    className="p-2 text-red-400 hover:bg-red-500/10 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                    title={t.delete}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

            </div>
          );
        })}

        {state.tanks.length === 0 && (
          <div className="col-span-full text-center py-10 bg-slate-800/50 border border-dashed border-slate-700 rounded-2xl text-slate-400 text-sm">
            {t.noData}
          </div>
        )}
      </div>

    </div>
  );
}
