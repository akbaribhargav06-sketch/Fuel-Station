/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { translations, LanguageCode } from '../translations';
import { SystemState, DailyShiftRecord, Nozzle, FuelTank, Shift, Employee, UserSession } from '../types';
import { 
  Zap, 
  User, 
  Clock, 
  Calendar, 
  FileCheck, 
  CheckCircle2, 
  Save, 
  Info,
  DollarSign,
  AlertTriangle,
  Lock,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';

interface DailyEntryTabProps {
  state: SystemState;
  lang: LanguageCode;
  session: UserSession;
  onPostAction: (actionType: string, url: string, payload: any) => Promise<void>;
  onRefreshState: () => void;
}

export default function DailyEntryTab({ state, lang, session, onPostAction, onRefreshState }: DailyEntryTabProps) {
  const t = translations[lang];

  // Parameters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedShiftId, setSelectedShiftId] = useState(state.shifts.length > 0 ? state.shifts[0].id : '');

  const activeRecordId = `${selectedDate}-${selectedShiftId}`;
  const currentRecord = state.records.find(r => r.id === activeRecordId);

  // Initialization states for a new record
  const [attendanceLogs, setAttendanceLogs] = useState<Record<string, 'present' | 'absent'>>({});
  const [nozzleDrafts, setNozzleDrafts] = useState<Record<string, {
    openingReading: string;
    closingReading: string;
    operatorId: string;
    cash: string;
    upi: string;
    card: string;
    creditSales: string;
    creditClient: string;
    testingLiters: string;
  }>>({});
  const [tankDrafts, setTankDrafts] = useState<Record<string, {
    purchaseQty: string;
    closingDipStock: string;
  }>>({});
  
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sync draft states when shift or date parameters are toggled
  useEffect(() => {
    if (currentRecord) {
      setAttendanceLogs(currentRecord.attendance);
      setNotes(currentRecord.notes || '');

      // Load drafts from current active record
      const initialNozzles: typeof nozzleDrafts = {};
      state.nozzles.forEach(noz => {
        const ent = currentRecord.nozzleEntries[noz.id];
        // If nozzle doesn't exist yet inside entry records, query previous shift readings or use default 1000
        let suggestedOpening = 1000;
        if (!ent) {
          // Find the last actual recorded closing reading for this nozzle across all records to prevent typing manual readings
          const pastRecordsDesc = [...state.records]
            .filter(r => r.nozzleEntries[noz.id] !== undefined)
            .sort((a,b) => b.id.localeCompare(a.id));
          if (pastRecordsDesc.length > 0) {
            suggestedOpening = pastRecordsDesc[0].nozzleEntries[noz.id].closingReading;
          }
        }

        initialNozzles[noz.id] = {
          openingReading: ent ? String(ent.openingReading) : String(suggestedOpening),
          closingReading: ent ? String(ent.closingReading) : String(ent ? ent.openingReading : suggestedOpening),
          operatorId: ent ? ent.operatorId : (state.employees.find(e => e.role === 'employee' && e.active)?.id || ''),
          cash: ent ? String(ent.cash) : '0',
          upi: ent ? String(ent.upi) : '0',
          card: ent ? String(ent.card) : '0',
          creditSales: ent ? String(ent.creditSales) : '0',
          creditClient: ent ? ent.creditClient : '',
          testingLiters: ent ? String(ent.testingLiters || '0') : '0'
        };
      });
      setNozzleDrafts(initialNozzles);

      const initialTanks: typeof tankDrafts = {};
      state.tanks.forEach(tank => {
        const ent = currentRecord.tankEntries[tank.id];
        initialTanks[tank.id] = {
          purchaseQty: ent ? String(ent.purchaseQty) : '0',
          closingDipStock: ent ? String(ent.closingDipStock) : '0'
        };
      });
      setTankDrafts(initialTanks);
    } else {
      // Clear forms if record does not exist yet to initialize
      const initialAtt: typeof attendanceLogs = {};
      state.employees.filter(e => e.active).forEach(e => {
        initialAtt[e.id] = 'absent';
      });
      setAttendanceLogs(initialAtt);
      setNotes('');
    }
    setErrorMsg('');
    setSuccessMsg('');
  }, [selectedDate, selectedShiftId, currentRecord, state.nozzles, state.tanks]);

  const handleAttendanceToggle = (empId: string) => {
    setAttendanceLogs(prev => ({
      ...prev,
      [empId]: prev[empId] === 'present' ? 'absent' : 'present'
    }));
  };

  const handleNozzleDraftChange = (nozId: string, field: string, value: string) => {
    setNozzleDrafts(prev => ({
      ...prev,
      [nozId]: {
        ...prev[nozId],
        [field]: value
      }
    }));
  };

  const handleTankDraftChange = (tId: string, field: string, value: string) => {
    setTankDrafts(prev => ({
      ...prev,
      [tId]: {
        ...prev[tId],
        [field]: value
      }
    }));
  };

  // 1. OPEN / INITIALIZE ACTIVE SHIFT
  const handleOpenShift = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    // Pre-create basic drafts to be initialized on backend
    const nozzlePayload: Record<string, any> = {};
    state.nozzles.filter(n => n.active).forEach(noz => {
      // Find past reading
      let suggestedOpening = 1000;
      const pastRecordsDesc = [...state.records]
        .filter(r => r.nozzleEntries[noz.id] !== undefined)
        .sort((a,b) => b.id.localeCompare(a.id));
      if (pastRecordsDesc.length > 0) {
        suggestedOpening = pastRecordsDesc[0].nozzleEntries[noz.id].closingReading;
      }

      nozzlePayload[noz.id] = {
        nozzleId: noz.id,
        operatorId: state.employees.find(e => e.role === 'employee' && e.active)?.id || '',
        openingReading: suggestedOpening,
        closingReading: suggestedOpening,
        testingLiters: 0,
        cash: 0,
        upi: 0,
        card: 0,
        creditSales: 0,
        creditClient: ''
      };
    });

    const tankPayload: Record<string, any> = {};
    state.tanks.forEach(tank => {
      tankPayload[tank.id] = {
        tankId: tank.id,
        openingStock: tank.currentStock,
        purchaseQty: 0,
        closingDipStock: 0
      };
    });

    const payload = {
      action: 'open',
      date: selectedDate,
      shiftId: selectedShiftId,
      attendance: attendanceLogs,
      nozzleEntries: nozzlePayload,
      tankEntries: tankPayload,
      notes: notes.trim(),
      userId: session.employeeId,
      userName: session.name
    };

    try {
      await onPostAction('open operational shift', '/api/records', payload);
      setSuccessMsg(lang === 'en' ? 'Shift initialized successfully.' : 'શિફ્ટ સફળતાપૂર્વક શરુ કરવામાં આવી છે.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to open shift.');
    }
  };

  // Convert inputs to numbers
  const parseNozzleDrafts = () => {
    const formatted: Record<string, any> = {};
    Object.keys(nozzleDrafts).forEach(nozId => {
      const draft = nozzleDrafts[nozId];
      formatted[nozId] = {
        nozzleId: nozId,
        operatorId: draft.operatorId,
        openingReading: parseFloat(draft.openingReading) || 0,
        closingReading: parseFloat(draft.closingReading) || 0,
        testingLiters: parseFloat(draft.testingLiters) || 0,
        cash: parseFloat(draft.cash) || 0,
        upi: parseFloat(draft.upi) || 0,
        card: parseFloat(draft.card) || 0,
        creditSales: parseFloat(draft.creditSales) || 0,
        creditClient: draft.creditClient.trim()
      };
    });
    return formatted;
  };

  const parseTankDrafts = () => {
    const formatted: Record<string, any> = {};
    Object.keys(tankDrafts).forEach(tId => {
      const draft = tankDrafts[tId];
      formatted[tId] = {
        tankId: tId,
        openingStock: currentRecord?.tankEntries[tId]?.openingStock || 0,
        purchaseQty: parseFloat(draft.purchaseQty) || 0,
        closingDipStock: parseFloat(draft.closingDipStock) || 0
      };
    });
    return formatted;
  };

  // Validate Reading inputs
  const validateReadings = (nozzlesToVerify: Record<string, any>) => {
    for (const nozId of Object.keys(nozzlesToVerify)) {
      const entry = nozzlesToVerify[nozId];
      const details = state.nozzles.find(n => n.id === nozId);
      if (entry.closingReading < entry.openingReading) {
        return {
          valid: false,
          error: lang === 'en' 
            ? `Nozzle "${details?.nozzleNumber || nozId}" closing reading cannot be less than opening reading.` 
            : `નોઝલ "${details?.nozzleNumber || nozId}" નું અંતિમ રીડીંગ શરૂઆત કરતાં ઓછું હોઈ શકે નહીં.`
        };
      }
    }
    return { valid: true };
  };

  // 2. QUICK SAVE OPERATOR DRAFTS
  const handleSaveDraft = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    const parsedNozzles = parseNozzleDrafts();
    const validation = validateReadings(parsedNozzles);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Reading validation failed.');
      return;
    }

    const payload = {
      action: 'update-entries',
      recordId: activeRecordId,
      attendance: attendanceLogs,
      nozzleEntries: parsedNozzles,
      tankEntries: parseTankDrafts(),
      notes: notes.trim(),
      userId: session.employeeId,
      userName: session.name
    };

    try {
      await onPostAction('save shift logs', '/api/records', payload);
      setSuccessMsg(lang === 'en' ? 'Draft values saved successfully.' : 'ઓપરેટર ડ્રાફ્ટ સફળતાપૂર્વક સાચવવામાં આવ્યો છે.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Draft save failed.');
    }
  };

  // 3. ONE-CLICK SHIFT CLOSE Workflow
  const handleCloseShift = async () => {
    const confirmClose = window.confirm(
      lang === 'en' 
        ? 'Are you sure you want to CLOSE this shift? Stocks will be permanently calculated and locked.' 
        : 'શું તમે આ શિફ્ટ પ્રક્રિયા કાયમ માટે બંધ કરવા માંગો છો? બળતણ સ્ટોક કાયમ માટે સરભર થશે.'
    );
    if (!confirmClose) return;

    setErrorMsg('');
    setSuccessMsg('');

    const parsedNozzles = parseNozzleDrafts();
    const validation = validateReadings(parsedNozzles);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Reading validation failed.');
      return;
    }

    const payload = {
      action: 'close',
      recordId: activeRecordId,
      attendance: attendanceLogs,
      nozzleEntries: parsedNozzles,
      tankEntries: parseTankDrafts(),
      notes: notes.trim(),
      userId: session.employeeId,
      userName: session.name
    };

    try {
      await onPostAction('finalize shift closing', '/api/records', payload);
      setSuccessMsg(lang === 'en' ? 'Shift closed and stock locked successfully.' : 'શિફ્ટ સફળતાપૂર્વક બંધ કરી સ્ટોક સુધારી દીધેલ છે.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Closing workflow aborted.');
    }
  };

  return (
    <div className="space-y-6" id="daily_entry_tab">
      
      {/* Date & Shift Picker Segment */}
      <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Date Field */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              <Calendar className="w-4 h-4" />
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500 font-mono cursor-pointer"
            />
          </div>

          {/* Shift selector */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              <Clock className="w-4 h-4" />
            </span>
            <select
              value={selectedShiftId}
              onChange={(e) => setSelectedShiftId(e.target.value)}
              className="pl-9 pr-6 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              {state.shifts.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.startTime}-{s.endTime})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic Status Badges */}
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-xs font-semibold">Active Record:</span>
          {currentRecord ? (
            <span className={`px-3 py-1 text-xs font-bold rounded-lg ${
              currentRecord.status === 'open' 
                ? 'bg-green-400/10 text-green-400 border border-green-500/20 animate-pulse'
                : 'bg-red-400/10 text-red-400 border border-red-500/20'
            }`}>
              {currentRecord.status === 'open' 
                ? (lang === 'en' ? 'OPEN / EDITABLE' : 'શિફ્ટ ચાલુ છે / એન્ટ્રી ફોર્મ')
                : (lang === 'en' ? 'CLOSED & READ-ONLY' : 'શિફ્ટ કાયમી બંધ છે')
              }
            </span>
          ) : (
            <span className="px-3 py-1 bg-amber-400/10 text-amber-500 border border-amber-500/20 text-xs font-semibold rounded-lg">
              {lang === 'en' ? 'NOT INITIALIZED' : 'સ્થિતિ: શરુ કરેલ નથી'}
            </span>
          )}
        </div>
      </div>

      {/* Operation Status Messages */}
      {errorMsg && (
        <div className="p-3 bg-red-400/10 border border-red-500/25 text-red-400 font-bold text-xs rounded-xl text-center">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-400/10 border border-emerald-500/25 text-emerald-400 font-bold text-xs rounded-xl text-center">
          {successMsg}
        </div>
      )}

      {/* Flow 1: Shift is NOT initialized yet (Manager/Admin can click to INITIALIZE SHIFT with attendance) */}
      {!currentRecord && (
        <div className="bg-slate-800/90 rounded-2xl border border-slate-700/65 p-6 space-y-6 text-center max-w-2xl mx-auto">
          <div className="inline-flex p-4 bg-teal-500/10 rounded-full text-teal-400 border border-teal-500/20 mb-2">
            <FileCheck className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-slate-100 text-lg">
              {lang === 'en' ? 'Initialize Active Shift' : 'નવી શિફ્ટ શરૂ કરો પંપ વિતરણ પત્રક'}
            </h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              {lang === 'en' 
                ? 'Check operational staff attendance to create today\'s active roster entry.' 
                : 'સ્ટાફની હાજરી ચકાસીને આજની ચોક્કસ શિફ્ટ એન્ટ્રી શરૂ કરો.'}
            </p>
          </div>

          {/* Attendance Selection */}
          <div className="bg-slate-900/50 p-4 border border-slate-700/35 rounded-xl space-y-3 text-left">
            <h4 className="text-slate-300 font-semibold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-teal-400" />
              {t.attendance} (માર્ક કર્મચારી હાજરી)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {state.employees.filter(e => e.active).map(emp => {
                const isSelected = attendanceLogs[emp.id] === 'present';
                return (
                  <button
                    key={emp.id}
                    onClick={() => handleAttendanceToggle(emp.id)}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex justify-between items-center transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-teal-500/10 border-teal-500 text-teal-300 shadow-sm' 
                        : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-400'
                    }`}
                  >
                    <span>{emp.name} ({emp.role === 'employee' ? 'Operator' : emp.role})</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold font-mono ${
                      isSelected ? 'bg-teal-400/20 text-teal-300' : 'bg-slate-900 text-slate-500'
                    }`}>
                      {isSelected ? t.present : t.absent}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleOpenShift}
            className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-slate-900 text-sm font-semibold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-2 mx-auto"
            id="start_shift_btn"
          >
            <ArrowRight className="w-4 h-4" />
            {t.openShiftBtn}
          </button>
        </div>
      )}

      {/* Flow 2: Shift is OPEN, Operator can input values and submit readings */}
      {currentRecord && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* LEFT: Nozzles and entries form */}
          <div className="xl:col-span-8 space-y-5">
            <div className="bg-slate-800/90 rounded-2xl border border-slate-700/60 p-5 space-y-4">
              <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <Zap className="text-teal-400 w-4 h-4" />
                {t.operatorNozzleEntry} (ઓપરેટર નોઝલ એન્ટ્રી)
              </h3>

              <div className="space-y-4 divide-y divide-slate-700/40">
                {state.nozzles
                  .filter(n => n.active)
                  .map((noz, index) => {
                    const draft = nozzleDrafts[noz.id] || {
                      openingReading: '1000',
                      closingReading: '1000',
                      operatorId: '',
                      cash: '0',
                      upi: '0',
                      card: '0',
                      creditSales: '0',
                      creditClient: '',
                      testingLiters: '0'
                    };

                    const tankInfo = state.tanks.find(t => t.id === noz.tankId);
                    const fuelRate = tankInfo ? tankInfo.customRate : 100;

                    // Formulas
                    const openingNum = parseFloat(draft.openingReading) || 0;
                    const closingNum = parseFloat(draft.closingReading) || 0;
                    const testingNum = parseFloat(draft.testingLiters) || 0;
                    const litresSold = Math.max(0, closingNum - openingNum - testingNum);
                    const totalRevenue = litresSold * fuelRate;

                    const cashNum = parseFloat(draft.cash) || 0;
                    const upiNum = parseFloat(draft.upi) || 0;
                    const cardNum = parseFloat(draft.card) || 0;
                    const creditNum = parseFloat(draft.creditSales) || 0;
                    const totalReceived = cashNum + upiNum + cardNum + creditNum;

                    const reconDiff = totalReceived - totalRevenue;
                    const isClosedMode = currentRecord.status === 'closed';

                    return (
                      <div key={noz.id} className={`pt-4 ${index === 0 ? 'pt-0' : ''} space-y-3`}>
                        {/* Nozzle Header info */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200 text-sm font-sans">{noz.nozzleNumber}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                              noz.fuelType === 'petrol' ? 'bg-blue-400/10 text-blue-400' : 'bg-yellow-400/10 text-yellow-500'
                            }`}>
                              {noz.fuelType === 'petrol' ? t.petrol : t.diesel}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">Rate: ₹{fuelRate.toFixed(2)}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-xs">Attendant:</span>
                            {isClosedMode ? (
                              <span className="text-xs text-slate-300 font-semibold">
                                {state.employees.find(e => e.id === draft.operatorId)?.name || 'N/A'}
                              </span>
                            ) : (
                              <select
                                value={draft.operatorId}
                                onChange={(e) => handleNozzleDraftChange(noz.id, 'operatorId', e.target.value)}
                                className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                              >
                                <option value="">Select Operator</option>
                                {state.employees
                                  .filter(e => e.active && e.role === 'employee')
                                  .map(e => (
                                    <option key={e.id} value={e.id}>{e.name}</option>
                                  ))}
                              </select>
                            )}
                          </div>
                        </div>

                        {/* Nozzle physical readings inputs */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          <div>
                            <label className="block text-slate-400 text-[10px] uppercase font-semibold mb-1">{t.openingReading}</label>
                            <input
                              type="number"
                              step="0.01"
                              readOnly // Lock opening reading to prevent key-in validation errors
                              value={draft.openingReading}
                              className="w-full px-2.5 py-1.5 bg-slate-900/60 border border-slate-750 rounded text-slate-400 text-xs font-mono focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-300 text-[10px] uppercase font-semibold mb-1">{t.closingReading}</label>
                            <input
                              type="number"
                              step="0.01"
                              disabled={isClosedMode}
                              value={draft.closingReading}
                              onChange={(e) => handleNozzleDraftChange(noz.id, 'closingReading', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 text-xs font-mono focus:outline-none focus:border-teal-500"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-300 text-[10px] uppercase font-semibold mb-1">{t.testingLiters}</label>
                            <input
                              type="number"
                              step="0.01"
                              disabled={isClosedMode}
                              value={draft.testingLiters}
                              onChange={(e) => handleNozzleDraftChange(noz.id, 'testingLiters', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 text-xs font-mono focus:outline-none focus:border-teal-500"
                            />
                          </div>

                          <div>
                            <span className="block text-slate-400 text-[10px] uppercase font-semibold mb-1">{t.litresSold}</span>
                            <span className="block px-2.5 py-1.5 bg-slate-900/40 border border-slate-750 text-emerald-400 text-xs font-mono font-bold rounded">
                              {litresSold.toFixed(2)} L
                            </span>
                          </div>

                          <div>
                            <span className="block text-slate-400 text-[10px] uppercase font-semibold mb-1">Fuel Value</span>
                            <span className="block px-2.5 py-1.5 bg-slate-900/40 border border-slate-750 text-slate-100 text-xs font-mono font-bold rounded">
                              ₹{totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                            </span>
                          </div>
                        </div>

                        {/* Payments collections inputs */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                          <div>
                            <label className="block text-slate-300 text-[10px] uppercase font-semibold mb-1">Cash (₹)</label>
                            <input
                              type="number"
                              disabled={isClosedMode}
                              value={draft.cash}
                              onChange={(e) => handleNozzleDraftChange(noz.id, 'cash', e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 text-xs font-mono focus:outline-none focus:border-teal-500"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-300 text-[10px] uppercase font-semibold mb-1">UPI GPay (₹)</label>
                            <input
                              type="number"
                              disabled={isClosedMode}
                              value={draft.upi}
                              onChange={(e) => handleNozzleDraftChange(noz.id, 'upi', e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 text-xs font-mono focus:outline-none focus:border-teal-500"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-300 text-[10px] uppercase font-semibold mb-1">POS Cards (₹)</label>
                            <input
                              type="number"
                              disabled={isClosedMode}
                              value={draft.card}
                              onChange={(e) => handleNozzleDraftChange(noz.id, 'card', e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 text-xs font-mono focus:outline-none focus:border-teal-500"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-300 text-[10px] uppercase font-semibold mb-1">Credit Diary (₹)</label>
                            <input
                              type="number"
                              disabled={isClosedMode}
                              value={draft.creditSales}
                              onChange={(e) => handleNozzleDraftChange(noz.id, 'creditSales', e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 text-xs font-mono focus:outline-none focus:border-teal-500"
                            />
                          </div>

                          <div className="col-span-2 sm:col-span-1">
                            <label className="block text-slate-300 text-[10px] uppercase font-semibold mb-1">Credit Client</label>
                            <input
                              type="text"
                              disabled={isClosedMode}
                              placeholder="e.g. S.T. Bus Depot"
                              value={draft.creditClient}
                              onChange={(e) => handleNozzleDraftChange(noz.id, 'creditClient', e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 text-xs font-sans focus:outline-none focus:border-teal-500"
                            />
                          </div>
                        </div>

                        {/* Reconciliation comparison bar */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-2.5 rounded-lg text-xs bg-slate-900/60 border border-slate-700/20 font-mono gap-2">
                          <div className="text-slate-400">
                            <span>Money Accounted: </span>
                            <span className="text-slate-200 font-bold">₹{totalReceived.toLocaleString()}</span>
                            <span className="text-slate-500"> vs Expected Value: ₹{totalRevenue.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-450 font-sans">{t.reconciliationDiff}:</span>
                            <span className={`px-2 py-0.5 rounded font-bold ${
                              reconDiff > 5 
                                ? 'bg-green-400/10 text-green-400' 
                                : reconDiff < -5 
                                  ? 'bg-red-400/10 text-red-400' 
                                  : 'bg-slate-800 text-slate-300'
                            }`}>
                              {reconDiff > 5 ? `+₹${reconDiff.toFixed(1)} (${t.surplus})` : reconDiff < -5 ? `-₹${Math.abs(reconDiff).toFixed(1)} (${t.shortage})` : t.balanced}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* RIGHT: Tank purchase decantation and closing dip, buttons */}
          <div className="xl:col-span-4 space-y-5">
            
            {/* Decanting arrivals & Physical Dipstick check */}
            <div className="bg-slate-800/90 rounded-2xl border border-slate-700/60 p-5 space-y-4">
              <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <Calendar className="text-blue-400 w-4 h-4 animate-spin-slow" />
                {t.dailyStockBalance}
              </h3>

              <div className="space-y-4">
                {state.tanks.map((tank) => {
                  const draft = tankDrafts[tank.id] || { purchaseQty: '0', closingDipStock: '0' };
                  const isClosedMode = currentRecord.status === 'closed';

                  return (
                    <div key={tank.id} className="space-y-2 p-3 bg-slate-900/50 border border-slate-755 rounded-xl">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-200">{tank.name}</span>
                        <span className="text-slate-500 font-mono">Current calculated: {tank.currentStock.toFixed(1)} L</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Tank Decanting entry (Purchase stock) */}
                        <div>
                          <label className="block text-slate-400 text-[10px] uppercase font-semibold mb-1">Cargo Arrived (L)</label>
                          <input
                            type="number"
                            disabled={isClosedMode}
                            value={draft.purchaseQty}
                            onChange={(e) => handleTankDraftChange(tank.id, 'purchaseQty', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-705 rounded text-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        {/* Physical measured closing stock DIP */}
                        <div>
                          <label className="block text-slate-350 text-[10px] uppercase font-semibold mb-1">Actual Dip Check (L)</label>
                          <input
                            type="number"
                            disabled={isClosedMode}
                            value={draft.closingDipStock}
                            onChange={(e) => handleTankDraftChange(tank.id, 'closingDipStock', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-705 rounded text-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shift operators summary and actions */}
            <div className="bg-slate-800/90 rounded-2xl border border-slate-700/60 p-5 space-y-4">
              <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <FileCheck className="text-teal-400 w-4 h-4" />
                Shift Log notes & Roster
              </h3>

              <div className="space-y-3">
                {/* Notes input */}
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase font-semibold mb-1">{t.notes}</label>
                  <textarea
                    rows={2}
                    disabled={currentRecord.status === 'closed'}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter any shift incident, short payment logs, decanting numbers, or roster changes..."
                    className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs font-sans focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Submit action panel */}
                {currentRecord.status === 'open' ? (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={handleSaveDraft}
                      className="py-2.5 px-3 bg-zinc-700 hover:bg-zinc-650 border border-zinc-600 text-teal-300 font-semibold rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow"
                    >
                      <Save className="w-4 h-4" />
                      Save Draft
                    </button>

                    <button
                      onClick={handleCloseShift}
                      className="py-2.5 px-3 bg-red-500 hover:bg-red-400 text-slate-900 font-bold rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow"
                    >
                      <Lock className="w-4 h-4" />
                      {t.closeShiftBtn}
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-center text-red-400 text-xs font-semibold leading-relaxed">
                    Shift locked. Calculations applied and synced under permanent history registry database.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
