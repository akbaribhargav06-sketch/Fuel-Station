/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { translations, LanguageCode } from '../translations';
import { SystemState, DailyShiftRecord, FuelTank, Nozzle, UserSession } from '../types';
import { 
  Fuel, 
  Coins, 
  Users, 
  Activity, 
  MapPin, 
  AlertTriangle, 
  TrendingUp,
  Droplet,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';

interface DashboardTabProps {
  state: SystemState;
  lang: LanguageCode;
  darkMode: boolean;
  session: UserSession;
}

export default function DashboardTab({ state, lang, darkMode, session }: DashboardTabProps) {
  const t = translations[lang];

  // Derive today's values
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayRecords = state.records.filter(r => r.date === todayDateStr);

  // Custom fuel filler boy panel view
  if (session.role === 'employee') {
    // Collect specific operator stats for today
    let operatorLitres = 0;
    let operatorCash = 0;
    let operatorUPI = 0;
    let operatorCard = 0;
    let operatorCredit = 0;
    let assignedNozzles: Nozzle[] = [];

    todayRecords.forEach(rec => {
      Object.keys(rec.nozzleEntries).forEach(nozId => {
        const entry = rec.nozzleEntries[nozId];
        if (entry.operatorId === session.employeeId) {
          const nozzle = state.nozzles.find(n => n.id === nozId);
          if (nozzle) {
            if (!assignedNozzles.some(n => n.id === nozzle.id)) {
              assignedNozzles.push(nozzle);
            }
            const tank = state.tanks.find(tk => tk.id === nozzle.tankId);
            const rate = tank ? tank.customRate : 100;
            const sold = Math.max(0, entry.closingReading - entry.openingReading - (entry.testingLiters || 0));
            operatorLitres += sold;
            operatorCash += entry.cash || 0;
            operatorUPI += entry.upi || 0;
            operatorCard += entry.card || 0;
            operatorCredit += entry.creditSales || 0;
          }
        }
      });
    });

    const operatorTotalMoney = operatorCash + operatorUPI + operatorCard + operatorCredit;

    return (
      <div className="space-y-6" id="operator_dashboard_panel">
        {/* Operator Header greeting banner */}
        <div className="bg-gradient-to-r from-teal-500/10 to-transparent border border-teal-500/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Fuel className="w-40 h-40" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <span className="text-teal-405 text-xs font-bold uppercase tracking-widest font-mono block">
                {lang === 'en' ? 'PUMP OPERATOR PORTAL' : 'પંપ ઓપરેટર કંટ્રોલ પેનલ'}
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-slate-100 tracking-tight">
                {t.welcome}, {session.name}!
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm">
                {lang === 'en' 
                  ? 'Have a safe and productive shift today. Keep your fuel meters matched!' 
                  : 'આજની શિફ્ટ માટે શુભકામનાઓ. તમારા ફ્યુઅલ રીડીંગ અને વકરો મેળવતા રહો!'}
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="h-2.5 w-2.5 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] text-slate-300 font-bold font-mono uppercase bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700/45">
                {lang === 'en' ? 'Shift Active' : 'શિફ્ટ ચાલુ છે'}
              </span>
            </div>
          </div>
        </div>

        {/* Today's Fuel Rates (Quick References) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {state.tanks.map((tank) => (
            <div 
              key={tank.id} 
              className={`border rounded-2xl p-5 shadow-sm transition-all hover:border-teal-500/30 flex items-center justify-between ${
                tank.fuelType === 'petrol' 
                  ? 'bg-blue-500/5 border-blue-500/10 hover:border-blue-500/20' 
                  : 'bg-yellow-500/5 border-yellow-500/10 hover:border-yellow-500/20'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl border ${
                  tank.fuelType === 'petrol' 
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                    : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                }`}>
                  <Fuel className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-slate-450 text-[10px] font-bold uppercase tracking-wider block">
                    {lang === 'en' ? `${tank.name} Rate` : `${tank.name} નો ભાવ`}
                  </span>
                  <span className="text-xl font-black font-mono tracking-tight text-slate-100 block mt-0.5">
                    ₹{tank.customRate.toFixed(2)} <span className="text-xs text-slate-500">/ L</span>
                  </span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                tank.fuelType === 'petrol' ? 'bg-blue-500/10 text-blue-450' : 'bg-yellow-500/10 text-yellow-450'
              }`}>
                {tank.fuelType === 'petrol' ? t.petrol : t.diesel}
              </span>
            </div>
          ))}
        </div>

        {/* Operator Stats for Today */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Total Litres Dispensed */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 flex items-center gap-4">
            <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">
                {lang === 'en' ? 'Your Fuel Sales' : 'તમારું વેચાણ (લીટર)'}
              </span>
              <span className="text-slate-100 text-xl font-bold font-mono tracking-tight my-0.5 block">
                {operatorLitres.toFixed(1)} L
              </span>
              <span className="text-slate-500 text-[10px] block font-semibold uppercase tracking-wider">
                {lang === 'en' ? 'across assigned nozzles' : 'તમારી સોંપાયેલ નોઝલ પર'}
              </span>
            </div>
          </div>

          {/* Total Money Recorded */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">
                {lang === 'en' ? 'Your Recorded Proceeds' : 'તમારી નોંધાયેલ આવક'}
              </span>
              <span className="text-slate-100 text-xl font-bold font-mono tracking-tight my-0.5 block">
                ₹{operatorTotalMoney.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-slate-500 text-[10px] block">
                Cash: ₹{operatorCash.toLocaleString()} | UPI: ₹{operatorUPI.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Assigned Nozzles list card */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 flex items-center gap-4 sm:col-span-2 lg:col-span-1">
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">
                {lang === 'en' ? 'Assigned Nozzles' : 'તમારી એલોટેડ નોઝલ'}
              </span>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {assignedNozzles.length === 0 ? (
                  <span className="text-xs text-slate-550 italic">
                    {lang === 'en' ? 'No active nozzles linked to you today' : 'કોઈ સક્રિય નોઝલ લિંક નથી'}
                  </span>
                ) : (
                  assignedNozzles.map(noz => (
                    <span 
                      key={noz.id} 
                      className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${
                        noz.fuelType === 'petrol' 
                          ? 'bg-blue-400/10 text-blue-400 border-blue-500/20' 
                          : 'bg-yellow-400/10 text-yellow-550 border-yellow-500/20'
                      }`}
                    >
                      {noz.nozzleNumber}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Collections Breakdown Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-slate-800/90 rounded-2xl border border-slate-700/60 p-5 space-y-4">
            <h3 className="font-bold text-slate-200 text-sm font-sans flex items-center gap-2">
              <Coins className="w-4 h-4 text-teal-400" />
              {lang === 'en' ? 'Your Payment Collections Summary' : 'તમારી પેમેન્ટ વિગતો મેળવણી'}
            </h3>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/30 text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wide">Cash (રોકડા)</span>
                <span className="text-base md:text-lg font-bold font-mono text-emerald-400 mt-1 block">₹{operatorCash.toLocaleString()}</span>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/30 text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wide">UPI (ફોનપે / જીપે)</span>
                <span className="text-base md:text-lg font-bold font-mono text-cyan-400 mt-1 block">₹{operatorUPI.toLocaleString()}</span>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/30 text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wide">POS Cards</span>
                <span className="text-base md:text-lg font-bold font-mono text-purple-400 mt-1 block">₹{operatorCard.toLocaleString()}</span>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/30 text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wide">Udhaar (ઉધાર)</span>
                <span className="text-base md:text-lg font-bold font-mono text-amber-400 mt-1 block">₹{operatorCredit.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Quick Guidelines Card */}
          <div className="bg-slate-800/90 rounded-2xl border border-slate-700/60 p-5 space-y-4">
            <h3 className="font-bold text-slate-200 text-sm font-sans flex items-center gap-2">
              <Info className="w-4 h-4 text-teal-400" />
              {lang === 'en' ? 'Shift Duty Guidelines' : 'શિફ્ટ સમય દરમિયાન ખાસ નિયમો'}
            </h3>

            <ol className="text-slate-400 text-xs space-y-2.5 font-sans leading-relaxed list-decimal pl-4">
              <li>
                <strong className="text-slate-300">{lang === 'en' ? 'Verify Nozzle Opening:' : 'શરૂઆતનું રીડીંગ મેળવવું:'}</strong>{' '}
                {lang === 'en' 
                  ? 'Ensure previous shifts nozzle closing level exactly matches your opening meter reading.' 
                  : 'તમારી શિફ્ટ ચાલુ થાય ત્યારે આગળની શિફ્ટનું છેલ્લું રીડીંગ તમારા શરૂઆતના રીડીંગ સાથે મેળવે છે કે નહીં તે ચેક કરો.'}
              </li>
              <li>
                <strong className="text-slate-300">{lang === 'en' ? 'Verify UPI Payments:' : 'ઓનલાઇન ક્યુઆર પેમેન્ટ્સ:'}</strong>{' '}
                {lang === 'en' 
                  ? 'Cross-check PhonePe / GPay notification sound alerts or sms before confirming fuel releases.' 
                  : 'ગ્રાહકના ફોનપે કે જીપે પેમેન્ટ ટ્રાન્સફરની સાઉન્ડ બોક્સ એલર્ટ સાંભળ્યા પછી જ ગાડી જવા દેવી.'}
              </li>
              <li>
                <strong className="text-slate-300">{lang === 'en' ? 'Issue Credit Slips:' : 'ઉધાર ખાતા બિલ (Slips):'}</strong>{' '}
                {lang === 'en' 
                  ? 'Always log and write down the customer vehicle number for local credit diary accounts.' 
                  : 'ઉધાર ગ્રાહકો માટે ફરજિયાત વાહન નંબર અને ગ્રાહકનું નામ તમારી બુકમાં અથવા ઉધાર બિલ સ્લિપમાં નોંધી લેવું.'}
              </li>
              <li>
                <strong className="text-slate-300">{lang === 'en' ? 'Daily Reconciliation:' : 'દૈનિક એન્ટ્રી સમયસર કરો:'}</strong>{' '}
                {lang === 'en' 
                  ? 'Quickly save your operator readings draft before handing over nozzle feeds to the next attendant.' 
                  : 'તમારી ડ્યુટી પૂર્ણ થાય ત્યારે સમયસર તમારા નોઝલ રીડીંગ અને રોકડ હિસાબ "દૈનિક એન્ટ્રી" વિભાગમાં નોંધી લેવી.'}
              </li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Totals for today (Managers & Admins dashboard)
  let totalDailyLitres = 0;
  let totalDailyRevenue = 0;
  let totalCash = 0;
  let totalUPI = 0;
  let totalCard = 0;
  let totalCredit = 0;

  todayRecords.forEach(rec => {
    Object.keys(rec.nozzleEntries).forEach(nozId => {
      const entry = rec.nozzleEntries[nozId];
      const nozzle = state.nozzles.find(n => n.id === nozId);
      if (nozzle) {
        const tank = state.tanks.find(tk => tk.id === nozzle.tankId);
        const rate = tank ? tank.customRate : 100;
        const sold = Math.max(0, entry.closingReading - entry.openingReading - (entry.testingLiters || 0));
        totalDailyLitres += sold;
        totalDailyRevenue += sold * rate;
        totalCash += entry.cash || 0;
        totalUPI += entry.upi || 0;
        totalCard += entry.card || 0;
        totalCredit += entry.creditSales || 0;
      }
    });
  });

  const aggregateCollection = totalCash + totalUPI + totalCard + totalCredit;

  // Active user / operator count
  const presentEmployeesCount = state.employees.filter(e => {
    if (!e.active) return false;
    // Check if recorded present in any of today's records
    return todayRecords.some(r => r.attendance[e.id] === 'present');
  }).length;

  // Stock calculations
  const totalPetrolStock = state.tanks
    .filter(tk => tk.fuelType === 'petrol')
    .reduce((acc, curr) => acc + curr.currentStock, 0);

  const totalDieselStock = state.tanks
    .filter(tk => tk.fuelType === 'diesel')
    .reduce((acc, curr) => acc + curr.currentStock, 0);

  const totalPetrolCapacity = state.tanks
    .filter(tk => tk.fuelType === 'petrol')
    .reduce((acc, curr) => acc + curr.capacity, 0);

  const totalDieselCapacity = state.tanks
    .filter(tk => tk.fuelType === 'diesel')
    .reduce((acc, curr) => acc + curr.capacity, 0);

  // Mismatch Detection logic:
  // For matching closing entries, let's look at yesterday's or today's records for mismatch
  let mismatchCount = 0;
  let mismatchData: { tankName: string; calculated: number; physical: number; diff: number }[] = [];

  state.records.slice(0, 5).forEach(rec => {
    Object.keys(rec.tankEntries).forEach(tId => {
      const tEntry = rec.tankEntries[tId];
      // If closingDipStock was recorded and is different from calculated stock
      if (tEntry && tEntry.closingDipStock > 0) {
        const tank = state.tanks.find(t => t.id === tId);
        const nozzleSalesForThisTank = Object.keys(rec.nozzleEntries)
          .filter(nozId => {
            const noz = state.nozzles.find(n => n.id === nozId);
            return noz && noz.tankId === tId;
          })
          .reduce((sum, nozId) => {
            const ent = rec.nozzleEntries[nozId];
            return sum + Math.max(0, ent.closingReading - ent.openingReading - (ent.testingLiters || 0));
          }, 0);

        const calculatedClosing = tEntry.openingStock + tEntry.purchaseQty - nozzleSalesForThisTank;
        const physicalClosing = tEntry.closingDipStock;
        const diff = physicalClosing - calculatedClosing;

        if (Math.abs(diff) > 5) { // threshold of 5 litres
          mismatchCount++;
          if (mismatchData.length < 3) {
            mismatchData.push({
              tankName: tank ? tank.name : tId,
              calculated: calculatedClosing,
              physical: physicalClosing,
              diff
            });
          }
        }
      }
    });
  });

  return (
    <div className="space-y-6" id="dashboard_tab">
      {/* Mismatch Alert Box if any detected */}
      {mismatchCount > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex items-start gap-4" id="stock_mismatch_alert">
          <div className="bg-red-500/20 text-red-500 p-2.5 rounded-xl border border-red-500/30">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h3 className="font-bold text-slate-200 text-base">{t.mismatchAlertTitle}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{t.mismatchAlertDesc}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              {mismatchData.map((m, idx) => (
                <div key={idx} className="bg-slate-900/50 rounded-xl p-3 border border-red-500/10 text-xs font-mono">
                  <span className="block font-sans text-slate-300 font-bold mb-1">{m.tankName}</span>
                  <div className="flex justify-between text-slate-400 mt-1">
                    <span>Calc Nozzle Volume:</span>
                    <span>{m.calculated.toFixed(1)} L</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Actual Dip Volume:</span>
                    <span>{m.physical.toFixed(1)} L</span>
                  </div>
                  <div className="flex justify-between font-bold mt-1 pt-1 border-t border-slate-800 text-red-400">
                    <span>Shortage (ઘટ):</span>
                    <span>{m.diff.toFixed(1)} L (₹{(m.diff * 100).toFixed(0)})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Grid: Main KPI values */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Daily Fuel Volume Sale */}
        <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl p-5 flex items-center gap-4 hover:border-teal-500/30 transition-all shadow-sm">
          <div className="p-3 bg-teal-500/10 rounded-xl text-teal-400 border border-teal-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold font-sans block">{t.totalDailySale}</span>
            <span className="text-slate-100 text-2xl font-bold font-mono tracking-tight my-0.5 block">
              {totalDailyLitres.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L
            </span>
            <span className="text-slate-400 text-[11px] block">
              Est. Value: ₹{totalDailyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* Daily Cash/UPI collections */}
        <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl p-5 flex items-center gap-4 hover:border-emerald-500/30 transition-all shadow-sm">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold font-sans block">{t.dailyCollection}</span>
            <span className="text-slate-100 text-2xl font-bold font-mono tracking-tight my-0.5 block">
              ₹{aggregateCollection.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span className="text-slate-400 text-[11px] block">
              UPI/Card: ₹{(totalUPI + totalCard).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* Petrol safety stock */}
        <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl p-5 flex items-center gap-4 hover:border-blue-500/30 transition-all shadow-sm">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
            <Fuel className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold block">{t.petrolStock}</span>
            <span className="text-slate-100 text-xl font-bold font-mono tracking-tight my-0.5 block">
              {totalPetrolStock.toLocaleString()} L
            </span>
            <div className="w-full bg-slate-900 rounded-full h-1.5 mt-1 border border-slate-800">
              <div 
                className="bg-blue-500 h-1.5 rounded-full" 
                style={{ width: `${Math.min(100, (totalPetrolStock / (totalPetrolCapacity || 1)) * 100)}%` }}
              ></div>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {((totalPetrolStock / (totalPetrolCapacity || 1)) * 100).toFixed(0)}% of Max Capacity
            </span>
          </div>
        </div>

        {/* Diesel stock info */}
        <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl p-5 flex items-center gap-4 hover:border-yellow-500/30 transition-all shadow-sm">
          <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-400 border border-yellow-500/20">
            <Fuel className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold block">{t.dieselStock}</span>
            <span className="text-slate-100 text-xl font-bold font-mono tracking-tight my-0.5 block">
              {totalDieselStock.toLocaleString()} L
            </span>
            <div className="w-full bg-slate-900 rounded-full h-1.5 mt-1 border border-slate-800">
              <div 
                className="bg-yellow-500 h-1.5 rounded-full" 
                style={{ width: `${Math.min(100, (totalDieselStock / (totalDieselCapacity || 1)) * 100)}%` }}
              ></div>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {((totalDieselStock / (totalDieselCapacity || 1)) * 100).toFixed(0)}% of Max Capacity
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Collections Breakdown & Stock Levels comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Collections Breakdown Bar Graph */}
        <div className="lg:col-span-7 bg-slate-800/90 rounded-2xl border border-slate-700/60 p-5 space-y-4">
          <h3 className="font-bold text-slate-200 text-sm font-sans flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-400" />
            {lang === 'en' ? 'Today\'s Sales Reconciliation Breakdown' : 'દૈનિક હિસ્સો અને આવક વિગતો'}
          </h3>

          <div className="space-y-4 pt-1">
            {/* Horizontal Bar for Cash */}
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                <span className="font-sans font-semibold text-slate-300">Cash Received (રોકડ આવક)</span>
                <span>₹{totalCash.toLocaleString()} ({((totalCash / (aggregateCollection || 1)) * 100).toFixed(0)}%)</span>
              </div>
              <div className="w-full bg-slate-900 rounded-lg h-3 overflow-hidden border border-slate-800">
                <div className="bg-emerald-500 h-full rounded-lg" style={{ width: `${(totalCash / (aggregateCollection || 1)) * 100}%` }}></div>
              </div>
            </div>

            {/* Horizontal Bar for UPI */}
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                <span className="font-sans font-semibold text-slate-300">UPI Transfers (ફોનપે / જીપે)</span>
                <span>₹{totalUPI.toLocaleString()} ({((totalUPI / (aggregateCollection || 1)) * 100).toFixed(0)}%)</span>
              </div>
              <div className="w-full bg-slate-900 rounded-lg h-3 overflow-hidden border border-slate-800">
                <div className="bg-cyan-500 h-full rounded-lg" style={{ width: `${(totalUPI / (aggregateCollection || 1)) * 100}%` }}></div>
              </div>
            </div>

            {/* Horizontal Bar for Card */}
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                <span className="font-sans font-semibold text-slate-300">POS Card Swipes / Debit</span>
                <span>₹{totalCard.toLocaleString()} ({((totalCard / (aggregateCollection || 1)) * 100).toFixed(0)}%)</span>
              </div>
              <div className="w-full bg-slate-900 rounded-lg h-3 overflow-hidden border border-slate-800">
                <div className="bg-purple-500 h-full rounded-lg" style={{ width: `${(totalCard / (aggregateCollection || 1)) * 100}%` }}></div>
              </div>
            </div>

            {/* Horizontal Bar for Credit clients */}
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                <span className="font-sans font-semibold text-slate-300">Credit Diary Accs (ઉધાર ખાતા વેચાણ)</span>
                <span>₹{totalCredit.toLocaleString()} ({((totalCredit / (aggregateCollection || 1)) * 100).toFixed(0)}%)</span>
              </div>
              <div className="w-full bg-slate-900 rounded-lg h-3 overflow-hidden border border-slate-800">
                <div className="bg-amber-500 h-full rounded-lg" style={{ width: `${(totalCredit / (aggregateCollection || 1)) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Operator status & Attendance summary */}
        <div className="lg:col-span-5 bg-slate-800/90 rounded-2xl border border-slate-700/60 p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-200 text-sm font-sans flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-400" />
              {t.activeShift} & {t.todaysAttendance}
            </h3>
            <span className="text-[10px] text-teal-400 bg-teal-400/10 border border-teal-500/20 px-2 py-0.5 rounded font-mono">
              Live Feed
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {todayRecords.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm border border-dashed border-slate-700/50 rounded-xl bg-slate-900/30">
                {lang === 'en' ? 'No shift active yet today.' : 'આજે હજુ કોઈ શિફ્ટ ચાલુ નથી.'}
              </div>
            ) : (
              todayRecords.map((rec) => {
                const shiftInfo = state.shifts.find(s => s.id === rec.shiftId);
                const isClosed = rec.status === 'closed';
                return (
                  <div key={rec.id} className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-3 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-slate-200 text-sm font-sans block">{shiftInfo ? shiftInfo.name : rec.shiftId}</span>
                      <span className="text-[11px] text-slate-500 block font-mono">
                        Opened: {rec.openedAt ? new Date(rec.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold block text-center ${
                        isClosed ? 'bg-red-400/10 text-red-400 border border-red-500/25' : 'bg-green-400/10 text-green-400 border border-green-500/25 animate-pulse'
                      }`}>
                        {isClosed ? t.shiftClosed : (lang === 'en' ? 'OPEN' : 'ચાલુ')}
                      </span>
                    </div>
                  </div>
                );
              })
            )}

            <div className="pt-2 border-t border-slate-700/45">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Rostered Staff On-Site:</span>
                <span className="font-bold text-slate-300 font-mono">{presentEmployeesCount} of {state.employees.filter(e => e.active).length} Present</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reservoir Tank stock details list */}
      <div className="bg-slate-800/90 rounded-2xl border border-slate-700/60 p-5 space-y-4">
        <h3 className="font-bold text-slate-200 text-sm font-sans flex items-center gap-2">
          <Droplet className="w-4 h-4 text-blue-400" />
          {lang === 'en' ? 'Fuel Reservoir Detailed Stock Level (DIP vs Calculated)' : 'ટાંકીઓનો વિગતવાર સ્ટોક અને ડીપ માપન'}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-400 font-semibold tracking-wider">
                <th className="py-3 px-2">{t.tankName}</th>
                <th className="py-3 px-2">{t.fuelType}</th>
                <th className="py-3 px-2">{t.pricePerLitre}</th>
                <th className="py-3 px-2 text-right">{t.capacity}</th>
                <th className="py-3 px-2 text-right">{t.currentStock}</th>
                <th className="py-3 px-2 text-right">Available Margin</th>
                <th className="py-3 px-2 text-center">Fuel Status Gauge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40 text-slate-300">
              {state.tanks.map((tank) => {
                const fillPercent = ((tank.currentStock / tank.capacity) * 100);
                let colorClass = "bg-green-500";
                if (fillPercent < 20) colorClass = "bg-red-500 animate-pulse";
                else if (fillPercent < 45) colorClass = "bg-yellow-500";
                
                return (
                  <tr key={tank.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="py-3.5 px-2 font-semibold text-slate-200">{tank.name}</td>
                    <td className="py-3.5 px-2 uppercase text-[10px]">
                      <span className={`px-2 py-0.5 rounded font-bold font-mono ${
                        tank.fuelType === 'petrol' ? 'bg-blue-400/10 text-blue-400 border border-blue-500/20' : 'bg-yellow-400/10 text-yellow-500 border border-yellow-500/20'
                      }`}>
                        {tank.fuelType === 'petrol' ? t.petrol : t.diesel}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 font-mono text-slate-300">₹{tank.customRate.toFixed(2)}</td>
                    <td className="py-3.5 px-2 text-right font-mono">{tank.capacity.toLocaleString()} L</td>
                    <td className="py-3.5 px-2 text-right font-mono font-bold text-slate-100">{tank.currentStock.toFixed(1)} L</td>
                    <td className="py-3.5 px-2 text-right font-mono text-slate-400">{(tank.capacity - tank.currentStock).toFixed(1)} L Left</td>
                    <td className="py-3.5 px-2 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-24 bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div className={`${colorClass} h-full rounded-full`} style={{ width: `${Math.min(100, fillPercent)}%` }}></div>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono w-8 text-right">{fillPercent.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
