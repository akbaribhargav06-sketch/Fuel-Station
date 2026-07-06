/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { translations, LanguageCode } from '../translations';
import { SystemState, DailyShiftRecord, Nozzle, FuelTank, Shift, Employee, UserSession, Denominations } from '../types';
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
  ArrowRight,
  Timer,
  Play,
  Check,
  Users,
  CreditCard,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  Fuel,
  Send,
  Plus,
  Trash2,
  History
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

  // Filter shifts based on logged-in employee assignments
  const allowedShifts = state.shifts.filter(s => {
    if (session.role === 'employee') {
      const loggedInEmp = state.employees.find(e => e.id === session.employeeId);
      if (loggedInEmp?.assignedShifts) {
        return loggedInEmp.assignedShifts.includes(s.id);
      }
      return true; // fallback to show all shifts if none explicitly configured in profile
    }
    return true;
  });

  const activeRecordId = `${selectedDate}-${selectedShiftId}`;
  const currentRecord = state.records.find(r => r.id === activeRecordId);

  // Sync shift selection when allowedShifts changes
  useEffect(() => {
    if (session.role === 'employee') {
      const allowed = state.shifts.filter(s => {
        const loggedInEmp = state.employees.find(e => e.id === session.employeeId);
        if (loggedInEmp?.assignedShifts) {
          return loggedInEmp.assignedShifts.includes(s.id);
        }
        return true;
      });
      if (allowed.length > 0) {
        if (!allowed.some(s => s.id === selectedShiftId)) {
          setSelectedShiftId(allowed[0].id);
        }
      } else {
        setSelectedShiftId('');
      }
    }
  }, [selectedDate, state.employees, session.employeeId, session.role, selectedShiftId]);

  // Filter nozzles based on logged-in employee assignments
  const allowedNozzles = state.nozzles.filter(noz => {
    if (!noz.active) return false;
    if (session.role === 'employee') {
      const loggedInEmp = state.employees.find(e => e.id === session.employeeId);
      if (loggedInEmp?.assignedNozzles) {
        return loggedInEmp.assignedNozzles.includes(noz.id);
      }
      return false; // hide if not explicitly assigned
    }
    return true;
  });

  const allNozzlesSubmitted = session.role === 'employee' && allowedNozzles.length > 0 && allowedNozzles.every(noz => currentRecord?.nozzleEntries[noz.id]?.isSubmitted);

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

  const prevActiveIdRef = React.useRef(activeRecordId);

  const getPreviousClosingReading = (nozzleId: string, targetDate: string, targetShiftId: string): number => {
    const targetShift = state.shifts.find(s => s.id === targetShiftId);
    const targetStartTime = targetShift?.startTime || '00:00';

    const recordsWithNozzle = state.records.filter(r => r.nozzleEntries[nozzleId] !== undefined);

    const priorRecords = recordsWithNozzle.filter(r => {
      if (r.date < targetDate) {
        return true;
      }
      if (r.date === targetDate) {
        const rShift = state.shifts.find(s => s.id === r.shiftId);
        const rStartTime = rShift?.startTime || '00:00';
        return rStartTime < targetStartTime;
      }
      return false;
    });

    priorRecords.sort((a, b) => {
      const aShift = state.shifts.find(s => s.id === a.shiftId);
      const aStartTime = aShift?.startTime || '00:00';
      const bShift = state.shifts.find(s => s.id === b.shiftId);
      const bStartTime = bShift?.startTime || '00:00';

      const aKey = `${a.date}T${aStartTime}`;
      const bKey = `${b.date}T${bStartTime}`;
      return bKey.localeCompare(aKey);
    });

    if (priorRecords.length > 0) {
      return priorRecords[0].nozzleEntries[nozzleId].closingReading;
    }

    return 1000;
  };

  // Sync draft states when shift or date parameters are toggled
  useEffect(() => {
    if (currentRecord) {
      const isDifferentShift = prevActiveIdRef.current !== activeRecordId;
      prevActiveIdRef.current = activeRecordId;

      if (isDifferentShift) {
        setAttendanceLogs(currentRecord.attendance);
        setNotes(currentRecord.notes || '');

        // Load drafts from current active record
        const initialNozzles: typeof nozzleDrafts = {};
        state.nozzles.forEach(noz => {
          const ent = currentRecord.nozzleEntries[noz.id];
          // If nozzle doesn't exist yet inside entry records, query previous shift readings or use default 1000
          let suggestedOpening = 1000;
          if (!ent) {
            suggestedOpening = getPreviousClosingReading(noz.id, selectedDate, selectedShiftId);
          }

          const txs = (currentRecord.upiTransactions || []).filter(tx => tx.nozzleId === noz.id);
          const totalUpiAmt = txs.reduce((sum, tx) => sum + tx.amount, 0);
          const upiValue = txs.length > 0 ? totalUpiAmt : (ent ? ent.upi : 0);

          // Auto-calculate cash value based on fuel sold
          const opReading = ent ? ent.openingReading : suggestedOpening;
          const clReading = ent ? ent.closingReading : suggestedOpening;
          const tLiters = ent ? (ent.testingLiters || 0) : 0;
          const litresSold = Math.max(0, clReading - opReading - tLiters);
          const tankInfo = state.tanks.find(t => t.id === noz.tankId);
          const fuelRate = tankInfo ? tankInfo.customRate : 100;
          const totalRevenue = litresSold * fuelRate;
          const creditValue = ent ? (ent.creditSales || 0) : 0;

          const calculatedCashVal = Math.max(0, totalRevenue - Number(upiValue) - creditValue);

          initialNozzles[noz.id] = {
            openingReading: ent ? String(ent.openingReading) : String(suggestedOpening),
            closingReading: ent ? String(ent.closingReading) : String(ent ? ent.openingReading : suggestedOpening),
            operatorId: ent ? ent.operatorId : (state.employees.find(e => e.role === 'employee' && e.active)?.id || ''),
            cash: String(calculatedCashVal),
            upi: String(upiValue),
            card: '0',
            creditSales: ent ? String(ent.creditSales) : '0',
            creditClient: ent?.creditClient || '',
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
        // Same shift, but currentRecord updated (like from a UPI payment add/delete or credit slip add)
        setNozzleDrafts(prev => {
          const updated = { ...prev };
          state.nozzles.forEach(noz => {
            const txs = (currentRecord.upiTransactions || []).filter(tx => tx.nozzleId === noz.id);
            const totalUpiAmt = txs.reduce((sum, tx) => sum + tx.amount, 0);
            const ent = currentRecord.nozzleEntries[noz.id];
            const upiValue = txs.length > 0 ? totalUpiAmt : (ent ? ent.upi : 0);

            if (updated[noz.id]) {
              const draft = updated[noz.id];
              const opReading = parseFloat(draft.openingReading) || 0;
              const clReading = parseFloat(draft.closingReading) || 0;
              const tLiters = parseFloat(draft.testingLiters) || 0;
              const litresSold = Math.max(0, clReading - opReading - tLiters);
              const tankInfo = state.tanks.find(t => t.id === noz.tankId);
              const fuelRate = tankInfo ? tankInfo.customRate : 100;
              const totalRevenue = litresSold * fuelRate;
              const creditValue = ent ? (ent.creditSales || 0) : 0;
              const calculatedCashVal = Math.max(0, totalRevenue - Number(upiValue) - creditValue);

              updated[noz.id] = {
                ...draft,
                upi: String(upiValue),
                creditSales: ent ? String(ent.creditSales) : '0',
                creditClient: ent?.creditClient || '',
                cash: String(calculatedCashVal)
              };
            }
          });
          return updated;
        });
      }
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

  // New States for Employee Cash Count and Oil Sales
  const employeeDenomsStorageKey = currentRecord ? `employee_denoms_${currentRecord.id}_${session.employeeId}` : '';
  const [employeeDenoms, setEmployeeDenoms] = useState<Denominations>(() => {
    if (employeeDenomsStorageKey) {
      try {
        const saved = localStorage.getItem(employeeDenomsStorageKey);
        if (saved) {
          return JSON.parse(saved);
        }
      } catch {
        // Fallback
      }
    }
    return { n500: 0, n200: 0, n100: 0, n50: 0, n20: 0, n10: 0, n5: 0, n2: 0, n1: 0 };
  });

  useEffect(() => {
    if (employeeDenomsStorageKey) {
      localStorage.setItem(employeeDenomsStorageKey, JSON.stringify(employeeDenoms));
    }
  }, [employeeDenoms, employeeDenomsStorageKey]);

  const [selectedOilProductId, setSelectedOilProductId] = useState('');
  const [oilQty, setOilQty] = useState('1');
  const [oilActionError, setOilActionError] = useState('');
  const [oilActionSuccess, setOilActionSuccess] = useState('');

  const handleEmployeeOilSale = async () => {
    setOilActionError('');
    setOilActionSuccess('');

    if (!selectedOilProductId) {
      setOilActionError(lang === 'en' ? 'Please select an oil product.' : 'કૃપા કરીને ઓઇલ પ્રોડક્ટ પસંદ કરો.');
      return;
    }

    const qty = parseFloat(oilQty);
    if (isNaN(qty) || qty <= 0) {
      setOilActionError(lang === 'en' ? 'Please enter a valid quantity.' : 'કૃપા કરીને યોગ્ય માત્રા દાખલ કરો.');
      return;
    }

    const product = (state.inventory || []).find(p => p.id === selectedOilProductId);
    if (!product) {
      setOilActionError(lang === 'en' ? 'Selected product not found.' : 'પસંદ કરેલ પ્રોડક્ટ મળી નથી.');
      return;
    }

    if (product.currentStock < qty) {
      setOilActionError(
        lang === 'en' 
          ? `Insufficient stock! Only ${product.currentStock} units available.` 
          : `અપૂરતો સ્ટોક! ફક્ત ${product.currentStock} યુનિટ ઉપલબ્ધ છે.`
      );
      return;
    }

    const txPayload = {
      action: 'add',
      transaction: {
        productId: product.id,
        productName: product.name,
        type: 'out',
        quantity: qty,
        rate: product.sellingPrice,
        totalAmount: qty * product.sellingPrice,
        date: currentRecord?.date || new Date().toISOString().split('T')[0],
        notes: `Oil sold by ${session.name} (Shift: ${state.shifts.find(s => s.id === currentRecord?.shiftId)?.name || currentRecord?.shiftId})`,
        operatorId: session.employeeId,
        shiftId: currentRecord?.shiftId
      },
      userId: session.employeeId,
      userName: session.name
    };

    try {
      await onPostAction('add stock transaction', '/api/inventory/transactions', txPayload);
      setOilActionSuccess(
        lang === 'en' 
          ? `Sold ${qty}x ${product.name} successfully!` 
          : `${qty}x ${product.name} નું વેચાણ સફળતાપૂર્વક નોંધાયું!`
      );
      setOilQty('1');
      setSelectedOilProductId('');
      onRefreshState();
    } catch (err: any) {
      setOilActionError(err.message || 'Failed to register oil sale.');
    }
  };

  const [tallyActionError, setTallyActionError] = useState('');
  const [tallyActionSuccess, setTallyActionSuccess] = useState('');
  const [tallyDateFilter, setTallyDateFilter] = useState('');

  const handleEmployeeSubmitTally = async (
    totalNotesValue: number, 
    expectedFuelCash: number, 
    expectedOilCash: number, 
    totalExpectedCash: number, 
    difference: number
  ) => {
    setTallyActionError('');
    setTallyActionSuccess('');

    if (totalNotesValue === 0) {
      setTallyActionError(lang === 'en' ? 'Cannot submit empty cash tally (Total is zero).' : 'ખાલી રોકડ મેળ સબમિટ કરી શકાતી નથી (કુલ રકમ શૂન્ય છે).');
      return;
    }

    let totalLitersSold = 0;
    allowedNozzles.forEach(noz => {
      const draft = nozzleDrafts[noz.id];
      if (draft) {
        const openingNum = parseFloat(draft.openingReading) || 0;
        const closingNum = parseFloat(draft.closingReading) || 0;
        const testingNum = parseFloat(draft.testingLiters) || 0;
        const litresSold = Math.max(0, closingNum - openingNum - testingNum);
        totalLitersSold += litresSold;
      }
    });

    const tallyPayload = {
      action: 'add',
      tally: {
        date: currentRecord?.date || new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        employeeId: session.employeeId,
        employeeName: session.name,
        shiftId: currentRecord?.shiftId || 'unknown_shift',
        shiftName: state.shifts.find(s => s.id === currentRecord?.shiftId)?.name || currentRecord?.shiftId || 'Unknown Shift',
        denominations: employeeDenoms,
        totalNotesValue,
        expectedFuelCash,
        expectedOilCash,
        totalExpectedCash,
        difference,
        litersSold: totalLitersSold
      },
      userId: session.employeeId,
      userName: session.name
    };

    try {
      await onPostAction('submit cash tally', '/api/cash-tallies', tallyPayload);
      setTallyActionSuccess(
        lang === 'en' 
          ? 'Physical cash tally entry logged successfully!' 
          : 'રોકડ મેળ મેળવણીની એન્ટ્રી સફળતાપૂર્વક સબમિટ થઈ ગઈ છે!'
      );
      // Reset denominations
      setEmployeeDenoms({ n500: 0, n200: 0, n100: 0, n50: 0, n20: 0, n10: 0, n5: 0, n2: 0, n1: 0 });
      onRefreshState();
    } catch (err: any) {
      setTallyActionError(err.message || 'Failed to submit cash tally.');
    }
  };

  const handleAttendanceToggle = (empId: string) => {
    setAttendanceLogs(prev => ({
      ...prev,
      [empId]: prev[empId] === 'present' ? 'absent' : 'present'
    }));
  };

  const handleNozzleDraftChange = (nozId: string, field: string, value: string) => {
    setNozzleDrafts(prev => {
      const existing = prev[nozId] || {
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
      
      const updatedEntry = {
        ...existing,
        [field]: value
      };

      // Auto-calculate cash based on updated values
      const opReading = parseFloat(updatedEntry.openingReading) || 0;
      const clReading = parseFloat(updatedEntry.closingReading) || 0;
      const tLiters = parseFloat(updatedEntry.testingLiters) || 0;
      const litresSold = Math.max(0, clReading - opReading - tLiters);
      const noz = state.nozzles.find(n => n.id === nozId);
      const tankInfo = noz ? state.tanks.find(t => t.id === noz.tankId) : null;
      const fuelRate = tankInfo ? tankInfo.customRate : 100;
      const totalRevenue = litresSold * fuelRate;
      
      const upiValue = parseFloat(updatedEntry.upi) || 0;
      const creditValue = parseFloat(updatedEntry.creditSales) || 0;
      const calculatedCashVal = Math.max(0, totalRevenue - upiValue - creditValue);

      return {
        ...prev,
        [nozId]: {
          ...updatedEntry,
          cash: String(calculatedCashVal)
        }
      };
    });
  };

  const handleTankDraftChange = (tId: string, field: string, value: string) => {
    setTankDrafts(prev => {
      const existing = prev[tId] || {
        purchaseQty: '0',
        closingDipStock: '0'
      };
      return {
        ...prev,
        [tId]: {
          ...existing,
          [field]: value
        }
      };
    });
  };

  // 1. OPEN / INITIALIZE ACTIVE SHIFT
  const handleOpenShift = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    // Pre-create basic drafts to be initialized on backend
    const nozzlePayload: Record<string, any> = {};
    state.nozzles.filter(n => n.active).forEach(noz => {
      // Find past reading
      const suggestedOpening = getPreviousClosingReading(noz.id, selectedDate, selectedShiftId);

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
        operatorId: draft?.operatorId || '',
        openingReading: parseFloat(draft?.openingReading) || 0,
        closingReading: parseFloat(draft?.closingReading) || 0,
        testingLiters: parseFloat(draft?.testingLiters) || 0,
        cash: parseFloat(draft?.cash) || 0,
        upi: parseFloat(draft?.upi) || 0,
        card: parseFloat(draft?.card) || 0,
        creditSales: parseFloat(draft?.creditSales) || 0,
        creditClient: (draft?.creditClient || '').trim()
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
        purchaseQty: parseFloat(draft?.purchaseQty) || 0,
        closingDipStock: parseFloat(draft?.closingDipStock) || 0
      };
    });
    return formatted;
  };

  const handleEmployeeSubmitAll = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setTallyActionError('');
    setTallyActionSuccess('');

    if (!currentRecord) return;

    const parsedNozzles = parseNozzleDrafts();
    
    // Validate readings for all assigned nozzles first
    let totalLitersSold = 0;
    let expectedFuelCash = 0;
    const readingsSummaryParts: string[] = [];

    for (const noz of allowedNozzles) {
      const entry = parsedNozzles[noz.id];
      if (!entry) {
        setErrorMsg(
          lang === 'en'
            ? `Please fill out readings for Nozzle ${noz.nozzleNumber}.`
            : `કૃપા કરીને નોઝલ ${noz.nozzleNumber} નું રીડીંગ ભરો.`
        );
        return;
      }

      if (entry.closingReading < entry.openingReading) {
        setErrorMsg(
          lang === 'en'
            ? `Closing reading cannot be less than opening reading for Nozzle ${noz.nozzleNumber}.`
            : `નોઝલ ${noz.nozzleNumber} નું અંતિમ રીડીંગ શરૂઆત કરતાં ઓછું હોઈ શકે નહીં.`
        );
        return;
      }

      const opReading = entry.openingReading;
      const clReading = entry.closingReading;
      const tLiters = entry.testingLiters || 0;
      const litresSold = Math.max(0, clReading - opReading - tLiters);
      totalLitersSold += litresSold;

      const tankInfo = state.tanks.find(t => t.id === noz.tankId);
      const fuelRate = tankInfo ? tankInfo.customRate : 100;
      const totalRevenue = litresSold * fuelRate;
      
      const upiValue = entry.upi || 0;
      const creditValue = entry.creditSales || 0;
      const cashVal = Math.max(0, totalRevenue - upiValue - creditValue);
      expectedFuelCash += cashVal;

      readingsSummaryParts.push(
        `Nozzle ${noz.nozzleNumber} (${noz.fuelType === 'petrol' ? 'Petrol' : 'Diesel'}): ${litresSold.toFixed(2)} L sold (Op: ${opReading.toFixed(2)}, Cl: ${clReading.toFixed(2)}, Test: ${tLiters.toFixed(2)}) | Cash: ₹${cashVal.toFixed(1)}, UPI: ₹${upiValue}, Credit: ₹${creditValue}`
      );
    }

    const activeOilSalesTransactions = (state.inventoryTransactions || []).filter(tx => 
      tx.operatorId === session.employeeId && 
      tx.date === currentRecord.date &&
      tx.type === 'out'
    );
    const expectedOilCash = activeOilSalesTransactions.reduce((sum, tx) => sum + (tx.totalAmount || 0), 0);
    const totalExpectedCash = expectedFuelCash + expectedOilCash;

    const totalNotesValue = 
      (employeeDenoms.n500 || 0) * 500 +
      (employeeDenoms.n200 || 0) * 200 +
      (employeeDenoms.n100 || 0) * 100 +
      (employeeDenoms.n50 || 0) * 50 +
      (employeeDenoms.n20 || 0) * 20 +
      (employeeDenoms.n10 || 0) * 10 +
      (employeeDenoms.n5 || 0) * 5 +
      (employeeDenoms.n2 || 0) * 2 +
      (employeeDenoms.n1 || 0) * 1;

    const difference = totalNotesValue - totalExpectedCash;

    if (totalNotesValue === 0 && totalExpectedCash > 0) {
      setErrorMsg(
        lang === 'en'
          ? 'Cannot submit shift hisab with empty physical cash (Total is zero) when sales are expected. Please enter physical cash notes count.'
          : 'જ્યારે વેચાણની રકમ જમા થવાની હોય ત્યારે ખાલી રોકડ મેળ સબમિટ કરી શકાતી નથી. કૃપા કરીને નોટોની ગણતરી ભરો.'
      );
      return;
    }

    const nozzleReadingsSummaryText = readingsSummaryParts.join('\n');
    const startISO = new Date().toISOString();
    const submitISO = new Date().toISOString();

    // Prepare entries as submitted
    allowedNozzles.forEach(noz => {
      const entry = parsedNozzles[noz.id];
      if (entry) {
        const actualStart = currentRecord?.nozzleEntries[noz.id]?.startedAt || startISO;
        const startTime = new Date(actualStart).getTime();
        const endTime = new Date(submitISO).getTime();
        const diffMs = endTime - startTime;
        const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
        const hrs = Math.floor(diffSecs / 3600);
        const mins = Math.floor((diffSecs % 3600) / 60);
        const elapsedStr = lang === 'en' 
          ? `${hrs > 0 ? `${hrs}h ` : ''}${mins}m`
          : `${hrs > 0 ? `${hrs} કલાક ` : ''}${mins} મિનિટ`;

        parsedNozzles[noz.id] = {
          ...entry,
          isSubmitted: true,
          startedAt: actualStart,
          submittedAt: submitISO,
          elapsedTime: elapsedStr
        };
      }
    });

    const recordPayload = {
      action: 'update-entries',
      recordId: activeRecordId,
      nozzleEntries: parsedNozzles,
      tankEntries: parseTankDrafts(),
      notes: notes,
      userId: session.employeeId,
      userName: session.name
    };

    const tallyPayload = {
      action: 'add',
      tally: {
        date: currentRecord?.date || new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        employeeId: session.employeeId,
        employeeName: session.name,
        shiftId: currentRecord?.shiftId || 'unknown_shift',
        shiftName: state.shifts.find(s => s.id === currentRecord?.shiftId)?.name || currentRecord?.shiftId || 'Unknown Shift',
        denominations: employeeDenoms,
        totalNotesValue,
        expectedFuelCash,
        expectedOilCash,
        totalExpectedCash,
        difference,
        litersSold: totalLitersSold,
        nozzleReadingsSummary: nozzleReadingsSummaryText
      },
      userId: session.employeeId,
      userName: session.name
    };

    try {
      // 1. Submit Nozzle entries to Records API
      await onPostAction('submit shift entries to manager', '/api/records', recordPayload);

      // 2. Submit physical Cash Tally to Cash Tallies API
      await onPostAction('submit cash tally with details', '/api/cash-tallies', tallyPayload);

      setSuccessMsg(
        lang === 'en' 
          ? 'Complete shift hisab and physical cash tally submitted successfully! Your entries are now locked and saved.' 
          : 'તમારો સંપૂર્ણ શિફ્ટ હિસાબ અને રોકડ મેળ ગણતરી સફળતાપૂર્વક મેનેજર અને એડમિન પેનલમાં સબમિટ થઈ ગઈ છે!'
      );

      // Reset employee denominations
      setEmployeeDenoms({ n500: 0, n200: 0, n100: 0, n50: 0, n20: 0, n10: 0, n5: 0, n2: 0, n1: 0 });
      if (employeeDenomsStorageKey) {
        localStorage.removeItem(employeeDenomsStorageKey);
      }

      onRefreshState();
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission failed.');
    }
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

  // --- EMPLOYEE/FILLER BOY SPECIFIC LOGIC & TIMERS ---
  const [tickerTime, setTickerTime] = useState(new Date());
  const [creditForm, setCreditForm] = useState({
    customerId: '',
    liters: '10',
    notes: ''
  });
  const [selectedNozzleForCredit, setSelectedNozzleForCredit] = useState('');

  // UPI register states
  const [upiNozzleId, setUpiNozzleId] = useState('');
  const [upiCustomAmount, setUpiCustomAmount] = useState('');

  // Initialize upiNozzleId if empty
  useEffect(() => {
    if (allowedNozzles.length > 0 && !upiNozzleId) {
      setUpiNozzleId(allowedNozzles[0].id);
    }
  }, [allowedNozzles, upiNozzleId]);

  const handleAddUpiPayment = async (amountVal: number, nozzleId: string) => {
    if (!nozzleId) {
      setErrorMsg(lang === 'en' ? 'Please select a nozzle.' : 'કૃપા કરીને નોઝલ પસંદ કરો.');
      return;
    }
    if (isNaN(amountVal) || amountVal <= 0) {
      setErrorMsg(lang === 'en' ? 'Please enter a valid amount.' : 'કૃપા કરીને યોગ્ય રકમ દાખલ કરો.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    const payload = {
      action: 'add-upi-transaction',
      recordId: activeRecordId,
      nozzleId,
      amount: amountVal,
      userId: session.employeeId,
      userName: session.name
    };

    try {
      await onPostAction('add upi payment', '/api/records', payload);
      setSuccessMsg(
        lang === 'en' 
          ? `UPI Payment of ₹${amountVal} registered successfully!` 
          : `₹${amountVal} ઓનલાઇન પેમેન્ટ સફળતાપૂર્વક રજીસ્ટર થઈ ગયું છે!`
      );
      onRefreshState();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add UPI payment.');
    }
  };

  const handleDeleteUpiPayment = async (transactionId: string, nozzleId: string) => {
    const confirmDelete = window.confirm(
      lang === 'en' 
        ? 'Are you sure you want to delete this UPI payment?' 
        : 'શું તમે આ ઓનલાઇન પેમેન્ટ એન્ટ્રી કાઢી નાખવા માંગો છો?'
    );
    if (!confirmDelete) return;

    setErrorMsg('');
    setSuccessMsg('');

    const payload = {
      action: 'delete-upi-transaction',
      recordId: activeRecordId,
      transactionId,
      nozzleId,
      userId: session.employeeId,
      userName: session.name
    };

    try {
      await onPostAction('delete upi payment', '/api/records', payload);
      setSuccessMsg(
        lang === 'en' 
          ? 'UPI Payment deleted successfully.' 
          : 'ઓનલાઇન પેમેન્ટ એન્ટ્રી સફળતાપૂર્વક કાઢી નાખવામાં આવી છે.'
      );
      onRefreshState();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete UPI payment.');
    }
  };

  // Auto-redirect filler boy to open operational shift
  useEffect(() => {
    if (session.role === 'employee') {
      const openRecord = state.records.find(r => r.status === 'open');
      if (openRecord) {
        setSelectedDate(openRecord.date);
        setSelectedShiftId(openRecord.shiftId);
      }
    }
  }, [state.records, session.role]);

  // Tick timer for the duty timer display
  useEffect(() => {
    const timer = setInterval(() => {
      setTickerTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatElapsedTime = (startStr?: string, submitStr?: string) => {
    if (!startStr) return '';
    const startTime = new Date(startStr).getTime();
    const endTime = submitStr ? new Date(submitStr).getTime() : tickerTime.getTime();
    const diffMs = endTime - startTime;
    if (diffMs <= 0) return lang === 'en' ? '0m' : '૦ મિનિટ';

    const diffSecs = Math.floor(diffMs / 1000);
    const hrs = Math.floor(diffSecs / 3600);
    const mins = Math.floor((diffSecs % 3600) / 60);
    const secs = diffSecs % 60;

    if (lang === 'en') {
      return `${hrs > 0 ? `${hrs}h ` : ''}${mins}m ${secs}s`;
    } else {
      // Gujarati numbers conversion optionally, standard is perfect
      return `${hrs > 0 ? `${hrs} કલાક ` : ''}${mins} મિનિટ ${secs} સેકન્ડ`;
    }
  };

  const handleClaimNozzle = async (nozzleId: string) => {
    if (!currentRecord) return;
    setErrorMsg('');
    setSuccessMsg('');

    // Prepopulate opening reading
    const existingEntry = currentRecord.nozzleEntries[nozzleId];
    let openingReading = 1000;
    if (!existingEntry) {
      openingReading = getPreviousClosingReading(nozzleId, selectedDate, selectedShiftId);
    } else {
      openingReading = existingEntry.openingReading;
    }

    const updatedNozzleEntries = {
      ...parseNozzleDrafts(),
      [nozzleId]: {
        nozzleId,
        operatorId: session.employeeId,
        openingReading,
        closingReading: existingEntry ? String(existingEntry.closingReading) : String(openingReading),
        testingLiters: existingEntry ? String(existingEntry.testingLiters || '0') : '0',
        cash: existingEntry ? String(existingEntry.cash) : '0',
        upi: existingEntry ? String(existingEntry.upi) : '0',
        card: existingEntry ? String(existingEntry.card) : '0',
        creditSales: existingEntry ? String(existingEntry.creditSales) : '0',
        creditClient: existingEntry?.creditClient || '',
        startedAt: new Date().toISOString() // auto-start timer on claim
      }
    };

    const payload = {
      action: 'update-entries',
      recordId: activeRecordId,
      nozzleEntries: updatedNozzleEntries,
      tankEntries: parseTankDrafts(),
      notes: notes,
      userId: session.employeeId,
      userName: session.name
    };

    try {
      await onPostAction('claim nozzle duty', '/api/records', payload);
      setSuccessMsg(lang === 'en' ? 'Nozzle duty claimed and active timer started!' : 'નોઝલ ડ્યુટી સફળતાપૂર્વક ફાળવવામાં આવી અને સમય શરૂ થઈ ગયો છે!');
      onRefreshState();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to claim nozzle.');
    }
  };

  const handleEmployeeStartShift = async (nozzleId: string) => {
    setErrorMsg('');
    setSuccessMsg('');

    const draft = nozzleDrafts[nozzleId];
    if (!draft) return;

    const parsed = parseNozzleDrafts();
    parsed[nozzleId].startedAt = new Date().toISOString();
    parsed[nozzleId].isSubmitted = false;

    const payload = {
      action: 'update-entries',
      recordId: activeRecordId,
      nozzleEntries: parsed,
      tankEntries: parseTankDrafts(),
      notes: notes,
      userId: session.employeeId,
      userName: session.name
    };

    try {
      await onPostAction('start nozzle shift timer', '/api/records', payload);
      setSuccessMsg(lang === 'en' ? 'Shift duty timer started!' : 'ડ્યુટી સમય શરૂ થઈ ગયો છે!');
      onRefreshState();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start shift.');
    }
  };

  const handleEmployeeSubmitToManager = async (nozzleId: string) => {
    setErrorMsg('');
    setSuccessMsg('');

    const parsedNozzles = parseNozzleDrafts();
    const entry = parsedNozzles[nozzleId];
    if (!entry) return;

    // Validate reading
    if (entry.closingReading < entry.openingReading) {
      setErrorMsg(
        lang === 'en' 
          ? `Closing reading cannot be less than opening reading.` 
          : `અંતિમ રીડીંગ શરૂઆત કરતાં ઓછું હોઈ શકે નહીં.`
      );
      return;
    }

    const startISO = currentRecord?.nozzleEntries[nozzleId]?.startedAt || new Date().toISOString();
    const submitISO = new Date().toISOString();
    
    // Calculate final elapsed time string
    const startTime = new Date(startISO).getTime();
    const endTime = new Date(submitISO).getTime();
    const diffMs = endTime - startTime;
    const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
    const hrs = Math.floor(diffSecs / 3600);
    const mins = Math.floor((diffSecs % 3600) / 60);
    const elapsedStr = lang === 'en' 
      ? `${hrs > 0 ? `${hrs}h ` : ''}${mins}m`
      : `${hrs > 0 ? `${hrs} કલાક ` : ''}${mins} મિનિટ`;

    parsedNozzles[nozzleId] = {
      ...entry,
      isSubmitted: true,
      startedAt: startISO,
      submittedAt: submitISO,
      elapsedTime: elapsedStr
    };

    const payload = {
      action: 'update-entries',
      recordId: activeRecordId,
      nozzleEntries: parsedNozzles,
      tankEntries: parseTankDrafts(),
      notes: notes,
      userId: session.employeeId,
      userName: session.name
    };

    try {
      await onPostAction('submit shift entries to manager', '/api/records', payload);
      setSuccessMsg(
        lang === 'en' 
          ? 'Hisab and readings submitted to the Manager successfully!' 
          : 'તમારો સંપૂર્ણ હિસાબ અને રીડીંગ મેનેજરને સફળતાપૂર્વક મોકલી દેવામાં આવેલ છે!'
      );
      onRefreshState();
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission failed.');
    }
  };

  const handleEmployeeAddCreditSlip = async (e: React.FormEvent, assignedNozId: string) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const customerId = creditForm.customerId || (state.customers && state.customers.filter(c => c.active)[0]?.id) || '';
    if (!customerId) {
      setErrorMsg(lang === 'en' ? 'Please select a customer.' : 'કૃપા કરીને ઉધાર ગ્રાહક પસંદ કરો.');
      return;
    }

    const litersNum = parseFloat(creditForm.liters);
    if (!litersNum || litersNum <= 0) {
      setErrorMsg(lang === 'en' ? 'Please enter valid liters.' : 'કૃપા કરીને સાચા લીટર દાખલ કરો.');
      return;
    }

    const nozzle = state.nozzles.find(n => n.id === assignedNozId);
    if (!nozzle) return;

    const tank = state.tanks.find(t => t.id === nozzle.tankId);
    const rate = tank ? tank.customRate : 100;
    const amount = litersNum * rate;
    const invoiceNo = `SLIP-${Date.now().toString().slice(-6)}`;

    // 1. Post Credit Transaction
    const txPayload = {
      action: 'add',
      transaction: {
        customerId,
        date: selectedDate,
        fuelType: nozzle.fuelType,
        liters: litersNum,
        rate: rate,
        amount: amount,
        invoiceNo: invoiceNo,
        operatorId: session.employeeId,
        notes: creditForm.notes.trim() || `Daily shift udhaar slip added by ${session.name}`
      },
      userId: session.employeeId,
      userName: session.name
    };

    try {
      // Post the credit slip transaction
      await onPostAction('add credit transaction', '/api/credit-transactions', txPayload);

      // 2. Also increment the local nozzle draft's creditSales and append client name
      const targetNozDraft = nozzleDrafts[assignedNozId];
      if (targetNozDraft) {
        const prevCreditSales = parseFloat(targetNozDraft.creditSales) || 0;
        const newCreditSales = prevCreditSales + amount;

        const customerName = state.customers?.find(c => c.id === customerId)?.name || 'Credit Client';
        const currentClients = targetNozDraft.creditClient ? targetNozDraft.creditClient.split(', ') : [];
        if (!currentClients.includes(customerName)) {
          currentClients.push(customerName);
        }

        const draftEntry = parseNozzleDrafts()[assignedNozId] || targetNozDraft;
        const openingVal = parseFloat(draftEntry.openingReading) || 0;
        const closingVal = parseFloat(draftEntry.closingReading) || 0;
        const testingVal = parseFloat(draftEntry.testingLiters) || 0;
        const litresSoldVal = Math.max(0, closingVal - openingVal - testingVal);
        const fuelRate = rate;
        const totalRevenueVal = litresSoldVal * fuelRate;
        const calculatedCashVal = Math.max(0, totalRevenueVal - (parseFloat(draftEntry.upi) || 0) - newCreditSales);

        const updatedNozzleEntries = {
          ...parseNozzleDrafts(),
          [assignedNozId]: {
            ...parseNozzleDrafts()[assignedNozId],
            creditSales: String(newCreditSales),
            creditClient: currentClients.join(', '),
            cash: String(calculatedCashVal)
          }
        };

        // Save this updated draft immediately to the backend as well
        const recordPayload = {
          action: 'update-entries',
          recordId: activeRecordId,
          nozzleEntries: updatedNozzleEntries,
          tankEntries: parseTankDrafts(),
          notes: notes,
          userId: session.employeeId,
          userName: session.name
        };

        await onPostAction('link credit slip value to nozzle draft', '/api/records', recordPayload);
      }

      setSuccessMsg(
        lang === 'en' 
          ? `Credit Slip ${invoiceNo} added and linked to nozzle successfully!` 
          : `ઉધાર કાપલી ${invoiceNo} સફળતાપૂર્વક ઉમેરી નોઝલ સાથે જોડી દેવામાં આવી છે!`
      );
      
      // Reset form
      setCreditForm({
        customerId: '',
        liters: '10',
        notes: ''
      });
      onRefreshState();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add credit slip.');
    }
  };

  // Allowed nozzles were moved to top of file to satisfy dependency references in hooks

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
              {allowedShifts.length === 0 ? (
                <option value="">{lang === 'en' ? '-- No Assigned Shift --' : '-- કોઈ ફાળવેલ શિફ્ટ નથી --'}</option>
              ) : (
                allowedShifts.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.startTime}-{s.endTime})</option>
                ))
              )}
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
        session.role === 'employee' ? (
          <div className="bg-slate-800/90 rounded-2xl border border-slate-700/65 p-8 max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-3">
              <div className="inline-flex p-4 bg-amber-500/10 rounded-full text-amber-400 border border-amber-500/20 mb-2">
                <ShieldAlert className="w-10 h-10 animate-pulse" />
              </div>
              <h3 className="font-bold text-slate-100 text-xl tracking-tight">
                {lang === 'en' ? 'No Active Shift Opened' : 'કોઈ સક્રિય શિફ્ટ ચાલુ નથી'}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
                {lang === 'en'
                  ? 'Your manager has not opened or initialized an active shift record for this date yet. However, you can view your assigned shift timings and nozzles below, and initialize the shift directly to start entering readings.'
                  : 'આ તારીખે મેનેજરે હજી સુધી શિફ્ટ શરૂ કરી નથી. પરંતુ તમે નીચે તમારી ફાળવેલ શિફ્ટ અને નોઝલ જોઈ શકો છો, અને ડ્યુટી રીડીંગ એન્ટ્રી શરૂ કરવા માટે જાતે પણ શિફ્ટ શરૂ કરી શકો છો.'}
              </p>
            </div>

            {/* Assigned Shift and Nozzle Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-left">
              {/* Timing Box */}
              <div className="bg-slate-900/60 p-4 border border-slate-700/40 rounded-xl space-y-2.5">
                <h4 className="text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-400" />
                  {lang === 'en' ? 'Your Assigned Shifts' : 'તમારી ફાળવેલ શિફ્ટ'}
                </h4>
                {allowedShifts.length > 0 ? (
                  <div className="space-y-2">
                    {allowedShifts.map(s => (
                      <div key={s.id} className="flex justify-between items-center bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700/30">
                        <span className="text-xs font-semibold text-slate-200">{s.name}</span>
                        <span className="text-[11px] font-mono text-teal-400 font-bold">{s.startTime} - {s.endTime}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-red-400 italic">
                    {lang === 'en' ? 'No shifts explicitly assigned to you.' : 'તમને કોઈ શિફ્ટ ફાળવવામાં આવી નથી.'}
                  </p>
                )}
              </div>

              {/* Nozzle Box */}
              <div className="bg-slate-900/60 p-4 border border-slate-700/40 rounded-xl space-y-2.5">
                <h4 className="text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-teal-400" />
                  {lang === 'en' ? 'Your Assigned Nozzles' : 'તમારી ફાળવેલ નોઝલ'}
                </h4>
                {allowedNozzles.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {allowedNozzles.map(noz => (
                      <span key={noz.id} className="px-2.5 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/25 text-teal-300 text-xs font-bold font-mono">
                        {noz.nozzleNumber} ({noz.fuelType.toUpperCase()})
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-red-400 italic">
                    {lang === 'en' ? 'No nozzles explicitly assigned to you.' : 'તમને કોઈ નોઝલ ફાળવવામાં આવી નથી.'}
                  </p>
                )}
              </div>
            </div>

            {/* Start Shift Action */}
            {allowedShifts.length > 0 && (
              <div className="pt-2 text-center">
                <button
                  onClick={handleOpenShift}
                  className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-slate-900 text-sm font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer flex items-center gap-2 mx-auto"
                >
                  <Play className="w-4 h-4 fill-slate-900" />
                  {lang === 'en' 
                    ? `Start ${state.shifts.find(s => s.id === selectedShiftId)?.name || 'Shift'} & Open Form` 
                    : `${state.shifts.find(s => s.id === selectedShiftId)?.name || 'શિફ્ટ'} શરૂ કરો અને ફોર્મ ખોલો`}
                </button>
              </div>
            )}
          </div>
        ) : (
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
                      type="button"
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
        )
      )}

      {/* Flow 2: Shift is OPEN, Operator can input values and submit readings */}
      {currentRecord && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* LEFT: Nozzles and entries form */}
          <div className="xl:col-span-8 space-y-5">
            {allNozzlesSubmitted ? (
              <>
                <div className="bg-slate-800/90 rounded-2xl border border-slate-700/60 p-6 space-y-6">
                  {/* Submitted visual card */}
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center space-y-4 max-w-xl mx-auto">
                    <div className="inline-flex p-3 bg-emerald-500/20 rounded-full text-emerald-400">
                      <CheckCircle2 className="w-8 h-8 animate-bounce" />
                    </div>
                    <h3 className="font-extrabold text-slate-100 text-lg">
                      {lang === 'en' ? 'Shift Hisab Submitted & Locked!' : 'શિફ્ટનો હિસાબ અને રોકડ મેળ સફળતાપૂર્વક સબમિટ થઈ ગયેલ છે!'}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {lang === 'en'
                        ? 'All your nozzle readings, fuel calculations, and cash tallies have been securely submitted to the Manager. Your inputs are now locked.'
                        : 'તમારા બધા નોઝલ રીડીંગ, ઇંધણ ગણતરી અને કેશ મેળ મેનેજરને મોકલી દેવામાં આવ્યા છે. તમારી વિગતો હવે લૉક કરવામાં આવી છે.'}
                    </p>
                  </div>
                </div>

                {/* Cash Tally History Log - THIRD */}
                <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-700/40 pb-2.5 gap-2">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-amber-400" />
                      <h3 className="font-bold text-slate-100 text-sm">
                        {lang === 'en' ? 'My Tally Entries (History)' : 'મારો સબમિટ કરેલ કેશ મેળ લોગ ઇતિહાસ'}
                      </h3>
                    </div>
                    
                    {/* Date Filter */}
                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="date"
                        value={tallyDateFilter}
                        onChange={(e) => setTallyDateFilter(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-[10px] text-slate-200 focus:outline-none focus:border-teal-500 font-mono font-bold"
                      />
                      {tallyDateFilter && (
                        <button
                          type="button"
                          onClick={() => setTallyDateFilter('')}
                          className="text-[10px] text-rose-400 hover:text-rose-300 font-bold"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {(() => {
                    const myTallies = (state.cashTallies || []).filter(t => t.employeeId === session.employeeId);
                    const filteredTallies = tallyDateFilter 
                      ? myTallies.filter(t => t.date === tallyDateFilter)
                      : myTallies;

                    if (filteredTallies.length === 0) {
                      return (
                        <div className="text-center py-8 text-slate-500 text-xs font-medium">
                          {lang === 'en' ? 'No tally entries logged for this selection.' : 'આ પસંદગી માટે કોઈ મેળ લોગ નોંધાયેલ નથી.'}
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {filteredTallies.map((t) => {
                          const dateObj = new Date(t.timestamp);
                          const formattedTime = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                          const formattedDate = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

                          return (
                            <div key={t.id} className="bg-slate-900/50 hover:bg-slate-900 border border-slate-700/40 p-3 rounded-xl space-y-2">
                              <div className="flex justify-between items-center text-[10px]">
                                <div className="flex items-center gap-1.5 text-slate-400">
                                  <span className="font-bold text-slate-200">{formattedDate} • {formattedTime}</span>
                                  <span className="text-slate-500">({t.shiftName})</span>
                                </div>
                                <span className="text-[9px] uppercase font-bold tracking-wider bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                                  {t.litersSold.toFixed(2)} Litres
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                                <div>
                                  <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Physical</span>
                                  <span className="text-slate-200 font-bold">₹{t.totalNotesValue.toLocaleString('en-IN')}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Expected</span>
                                  <span className="text-slate-200 font-bold">₹{t.totalExpectedCash.toLocaleString('en-IN')}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Diff (વધઘટ)</span>
                                  <span className={`font-bold ${
                                    Math.abs(t.difference) < 2
                                      ? 'text-emerald-400'
                                      : t.difference > 0
                                      ? 'text-blue-400'
                                      : 'text-rose-400'
                                  }`}>
                                    {t.difference >= 0 ? '+' : ''}₹{t.difference.toFixed(2)}
                                  </span>
                                </div>
                              </div>

                              {/* Denominations strip */}
                              <div className="text-[10px] text-slate-400 flex flex-wrap gap-x-2 gap-y-0.5 bg-slate-950/40 p-1.5 rounded border border-slate-800/40 font-mono">
                                {Object.entries(t.denominations).map(([k, v]) => {
                                  if (!v) return null;
                                  const val = k.replace('n', '');
                                  return (
                                    <span key={k} className="inline-block text-[9px]">
                                      ₹{val}×{v}
                                    </span>
                                  );
                                })}
                              </div>

                              {t.nozzleReadingsSummary && (
                                <div className="mt-2 text-[10px] text-slate-400 bg-slate-950/60 p-2 rounded border border-slate-800/60 font-mono space-y-1">
                                  <span className="text-[9px] uppercase font-bold text-slate-500 block border-b border-slate-800/60 pb-0.5 mb-1">
                                    {lang === 'en' ? 'Nozzle Readings & Cash Breakdown' : 'નોઝલ રીડીંગ અને વિગતવાર ગણતરી'}
                                  </span>
                                  <div className="whitespace-pre-wrap leading-relaxed text-slate-300 text-[9px]">
                                    {t.nozzleReadingsSummary}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </>
            ) : (
              <>
                {/* 📱 UPI / Online Payment Register Box (ઓનલાઇન પેમેન્ટ રજીસ્ટર) */}
            <div className="bg-white border border-purple-200/80 shadow-lg shadow-purple-500/5 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg border border-purple-100">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">
                      {lang === 'en' ? '📱 UPI Payment Register' : '📱 ઓનલાઇન પેમેન્ટ રજીસ્ટર (GPay/UPI Box)'}
                    </h3>
                    <p className="text-slate-500 text-[11px]">
                      {lang === 'en' 
                        ? 'Quick-add digital customer transactions to auto-calculate nozzle UPI totals' 
                        : 'ઓનલાઇન ગ્રાહક પેમેન્ટ્સ ઝડપથી ઉમેરો જે સીધા નોઝલના કુલ UPI હિસાબમાં ઉમેરાઈ જશે'}
                    </p>
                  </div>
                </div>
                {/* Real-time total for the shift */}
                <div className="text-right">
                  <span className="block text-slate-400 text-[10px] uppercase font-bold">Shift UPI Total</span>
                  <span className="text-purple-600 font-mono font-extrabold text-sm sm:text-base">
                    ₹{(currentRecord.upiTransactions || []).reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Input section */}
              {currentRecord.status === 'closed' ? (
                <div className="p-3 bg-purple-50/50 rounded-xl text-center text-slate-500 text-xs border border-purple-100/50">
                  {lang === 'en' ? 'This shift is closed. Payments are locked.' : 'આ શિફ્ટ બંધ થઈ ગઈ છે. પેમેન્ટ લોક છે.'}
                </div>
              ) : (
                <div className="space-y-3 bg-slate-50/50 border border-slate-100 p-4 rounded-xl">
                  {/* Step 1: Nozzle Selector Buttons */}
                  <div>
                    <span className="block text-slate-600 text-[11px] font-semibold mb-2">
                      {lang === 'en' ? '1. Select Nozzle' : '૧. નોઝલ પસંદ કરો'}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {allowedNozzles.map(noz => {
                        const isSel = upiNozzleId === noz.id;
                        const nozzleNum = noz.nozzleNumber;
                        const tank = state.tanks.find(t => t.id === noz.tankId);
                        const fuelLabel = tank ? (tank.fuelType === 'petrol' ? 'P' : 'D') : '';
                        return (
                          <button
                            key={noz.id}
                            type="button"
                            onClick={() => setUpiNozzleId(noz.id)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              isSel 
                                ? 'bg-purple-50 border-purple-400 text-purple-700 shadow-sm' 
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${tank?.fuelType === 'petrol' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                            {nozzleNum.toLowerCase().startsWith('nozzle') ? nozzleNum : `Nozzle ${nozzleNum}`} ({fuelLabel})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2: Quick Amount Buttons */}
                  <div>
                    <span className="block text-slate-600 text-[11px] font-semibold mb-2">
                      {lang === 'en' ? '2. Choose Amount & Add Entry' : '૨. રકમ પસંદ કરો અને એન્ટ્રી ઉમેરો'}
                    </span>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 mb-2.5">
                      {[100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleAddUpiPayment(amt, upiNozzleId)}
                          disabled={!upiNozzleId}
                          className="py-2 px-1 bg-white hover:bg-purple-600 hover:text-white border border-slate-200 rounded-lg text-[11px] font-bold font-mono text-slate-700 transition-all cursor-pointer flex flex-col items-center justify-center disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-700 shadow-sm hover:border-purple-600"
                        >
                          <span className="text-[9px] text-slate-400 font-sans font-normal">₹</span>
                          {amt}
                        </button>
                      ))}
                    </div>

                    {/* Custom Amount form */}
                    <div className="flex items-center gap-2 max-w-sm">
                      <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs font-mono">₹</span>
                        <input
                          type="number"
                          placeholder={lang === 'en' ? 'Custom Amount' : 'અન્ય રકમ'}
                          value={upiCustomAmount}
                          onChange={(e) => setUpiCustomAmount(e.target.value)}
                          disabled={!upiNozzleId}
                          className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-mono focus:outline-none focus:border-purple-500 placeholder-slate-400 shadow-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleAddUpiPayment(Number(upiCustomAmount), upiNozzleId);
                          setUpiCustomAmount('');
                        }}
                        disabled={!upiNozzleId || !upiCustomAmount}
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {lang === 'en' ? 'Add' : 'ઉમેરો'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Transactions Log List */}
              {currentRecord.upiTransactions && currentRecord.upiTransactions.length > 0 && (
                <div className="border-t border-slate-150 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-600 text-[11px] font-semibold flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                      {lang === 'en' ? 'Recent Online Payments log' : 'આજની ઓનલાઇન એન્ટ્રી લોગ'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {currentRecord.upiTransactions.length} {lang === 'en' ? 'entries' : 'એન્ટ્રીઓ'}
                    </span>
                  </div>

                  <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-150 bg-slate-50 divide-y divide-slate-100">
                    {currentRecord.upiTransactions.map((tx) => {
                      const nozInfo = state.nozzles.find(n => n.id === tx.nozzleId);
                      const nozNum = nozInfo?.nozzleNumber || tx.nozzleId;
                      const timeStr = new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div key={tx.id} className="flex items-center justify-between px-3 py-2 text-xs font-mono">
                          <div className="flex items-center gap-3">
                            <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 border border-purple-100 rounded font-bold text-[10px]">
                              {nozNum.toLowerCase().startsWith('nozzle') ? nozNum : `Nozzle ${nozNum}`}
                            </span>
                            <span className="text-slate-400 text-[10px]">{timeStr}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-700 font-bold">₹{tx.amount}</span>
                            {currentRecord.status === 'open' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUpiPayment(tx.id, tx.nozzleId)}
                                className="text-slate-400 hover:text-red-500 transition-all p-1 hover:bg-red rounded cursor-pointer"
                                title="Delete Entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-800/90 rounded-2xl border border-slate-700/60 p-5 space-y-4">
              <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <Zap className="text-teal-400 w-4 h-4" />
                {t.operatorNozzleEntry} (ઓપરેટર નોઝલ એન્ટ્રી)
              </h3>

              <div className="space-y-4 divide-y divide-slate-700/40">
                {allowedNozzles.length === 0 ? (
                  <div className="text-center p-8 bg-slate-900/40 rounded-xl border border-slate-700/20 text-slate-400 text-xs">
                    {lang === 'en' 
                      ? 'No nozzles are assigned to your employee profile. Please contact pump Admin/Manager.' 
                      : 'તમારી પ્રોફાઇલ પર કોઈ નોઝલ ફાળવવામાં આવી નથી. કૃપા કરીને એડમિન અથવા મેનેજરનો સંપર્ક કરો.'}
                  </div>
                ) : (
                  allowedNozzles.map((noz, index) => {
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
                    const isSubmitted = currentRecord.nozzleEntries[noz.id]?.isSubmitted || false;
                    const isLocked = isClosedMode || isSubmitted;

                     return (
                      <div key={noz.id} className={`pt-4 ${index === 0 ? 'pt-0' : ''} space-y-3`}>
                        {isSubmitted ? (
                          /* COMPACT HISTORY LOG TICKET - INPUT BOXES DELETED/BLANKED OUT */
                          <div className="bg-slate-900/60 border border-emerald-500/20 p-4 rounded-xl space-y-3.5 relative overflow-hidden shadow-inner">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
                            
                            <div className="flex justify-between items-center pb-2 border-b border-slate-850">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-200 text-sm font-sans">{noz.nozzleNumber}</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase font-mono ${
                                  noz.fuelType === 'petrol' ? 'bg-blue-400/10 text-blue-400' : 'bg-yellow-400/10 text-yellow-500'
                                }`}>
                                  {noz.fuelType === 'petrol' ? t.petrol : t.diesel}
                                </span>
                                <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-extrabold rounded uppercase tracking-wider font-sans flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" />
                                  {lang === 'en' ? 'Submitted' : 'મોકલેલ'}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {currentRecord.nozzleEntries[noz.id]?.submittedAt ? new Date(currentRecord.nozzleEntries[noz.id].submittedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                              <div>
                                <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">{t.openingReading}</span>
                                <span className="text-slate-300 font-extrabold text-sm">{openingNum.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">{t.closingReading}</span>
                                <span className="text-slate-300 font-extrabold text-sm">{closingNum.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">{t.litresSold}</span>
                                <span className="text-emerald-400 font-extrabold text-sm">{litresSold.toFixed(2)} L</span>
                              </div>
                              <div>
                                <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">Total Revenue</span>
                                <span className="text-teal-400 font-extrabold text-sm">₹{totalRevenue.toLocaleString()}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono border-t border-slate-800/60 pt-3">
                              <div>
                                <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">Cash collected</span>
                                <span className="text-teal-300 font-extrabold">₹{cashNum.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">UPI / GPay</span>
                                <span className="text-purple-300 font-extrabold">₹{upiNum.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">Credit Diary</span>
                                <span className="text-yellow-300 font-extrabold">₹{creditNum.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">Linked Client</span>
                                <span className="text-slate-400 font-semibold truncate block max-w-[120px]">{draft.creditClient || '-'}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* EDITABLE NOZZLE READINGS FORM CONTAINER */
                          <>
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
                                {isLocked || session.role === 'employee' ? (
                                  <span className="text-xs text-teal-400 font-semibold font-sans bg-teal-500/10 px-2.5 py-1 rounded">
                                    {state.employees.find(e => e.id === (draft.operatorId || session.employeeId))?.name || session.name}
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
                                <label className="block text-slate-300 text-[10px] uppercase font-semibold mb-1">{t.openingReading}</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  disabled={isLocked}
                                  value={draft.openingReading}
                                  onChange={(e) => handleNozzleDraftChange(noz.id, 'openingReading', e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 text-xs font-mono focus:outline-none focus:border-teal-500"
                                />
                              </div>

                              <div>
                                <label className="block text-slate-300 text-[10px] uppercase font-semibold mb-1">{t.closingReading}</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  disabled={isLocked}
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
                                  disabled={isLocked}
                                  value={draft.testingLiters}
                                  onChange={(e) => handleNozzleDraftChange(noz.id, 'testingLiters', e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 text-xs font-mono focus:outline-none focus:border-teal-500"
                                />
                              </div>

                              <div>
                                <span className="block text-slate-400 text-[10px] uppercase font-semibold mb-1">{t.litresSold}</span>
                                <span className="block px-2.5 py-1.5 bg-slate-900/40 border border-slate-700/60 text-emerald-400 text-xs font-mono font-bold rounded">
                                  {litresSold.toFixed(2)} L
                                </span>
                              </div>

                              <div>
                                <span className="block text-slate-400 text-[10px] uppercase font-semibold mb-1">Fuel Value</span>
                                <span className="block px-2.5 py-1.5 bg-slate-900/40 border border-slate-700/60 text-slate-100 text-xs font-mono font-bold rounded">
                                  ₹{totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                </span>
                              </div>
                            </div>

                            {/* Payments collections inputs */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                              <div>
                                <label className="block text-slate-300 text-[10px] uppercase font-semibold mb-1">
                                  Cash (₹) <span className="text-[9px] text-teal-400 normal-case font-normal">(Auto)</span>
                                </label>
                                <input
                                  type="number"
                                  disabled={true}
                                  value={draft.cash}
                                  className="w-full px-2 py-1.5 bg-teal-500/5 border border-teal-500/30 rounded text-teal-300 text-xs font-mono font-bold focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-slate-300 text-[10px] uppercase font-semibold mb-1">
                                  UPI GPay (₹)
                                  {currentRecord.upiTransactions && currentRecord.upiTransactions.filter(tx => tx.nozzleId === noz.id).length > 0 && (
                                    <span className="ml-1 text-[9px] text-purple-400 normal-case font-normal">(Auto)</span>
                                  )}
                                </label>
                                <input
                                  type="number"
                                  disabled={isLocked || (currentRecord.upiTransactions && currentRecord.upiTransactions.filter(tx => tx.nozzleId === noz.id).length > 0)}
                                  value={draft.upi}
                                  onChange={(e) => handleNozzleDraftChange(noz.id, 'upi', e.target.value)}
                                  className={`w-full px-2 py-1.5 bg-slate-900 border rounded text-slate-200 text-xs font-mono focus:outline-none focus:border-teal-500 ${
                                    currentRecord.upiTransactions && currentRecord.upiTransactions.filter(tx => tx.nozzleId === noz.id).length > 0
                                      ? 'border-purple-500/40 text-purple-300 font-bold bg-purple-500/5'
                                      : 'border-slate-700'
                                  }`}
                                />
                              </div>

                              <div>
                                <label className="block text-slate-300 text-[10px] uppercase font-semibold mb-1">
                                  Credit Diary (₹) <span className="text-[9px] text-yellow-400 normal-case font-normal">(Auto)</span>
                                </label>
                                <input
                                  type="number"
                                  disabled={true}
                                  value={draft.creditSales}
                                  className="w-full px-2 py-1.5 bg-yellow-500/5 border border-yellow-500/30 rounded text-yellow-300 text-xs font-mono font-bold focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-slate-300 text-[10px] uppercase font-semibold mb-1">Credit Client</label>
                                <input
                                  type="text"
                                  disabled={true}
                                  placeholder="No credit linked"
                                  value={draft.creditClient}
                                  className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-400 text-xs font-sans focus:outline-none"
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
                                <span className="text-slate-400 font-sans">{t.reconciliationDiff}:</span>
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

                            {/* Filler Boy Save Draft Button */}
                            {session.role === 'employee' && (
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-2 gap-2 border-t border-slate-800/60 mt-2">
                                <span className="text-[10px] text-slate-400 italic">
                                  {lang === 'en' 
                                    ? '*Submit ALL nozzles and Cash Tally together using the main button at the bottom.' 
                                    : '*બધા નોઝલ અને રોકડ મેળ છેલ્લે નીચે આપેલ મુખ્ય બટનથી એકસાથે સબમિટ કરો.'}
                                </span>
                                <button
                                  type="button"
                                  onClick={handleSaveDraft}
                                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700/80 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition-all duration-150 cursor-pointer active:scale-95 self-end sm:self-auto"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  {lang === 'en' ? 'Save Draft' : 'ડ્રાફ્ટ સાચવો'}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 🪙 SHIFT CASH TALLY & OIL/INVENTORY SALES PANEL FOR EMPLOYEES */}
            {session.role === 'employee' && (() => {
              const totalFuelCashExpected = allowedNozzles.reduce((sum, noz) => {
                const draft = nozzleDrafts[noz.id] || { cash: '0' };
                return sum + (parseFloat(draft.cash) || 0);
              }, 0);

              const activeOilSalesTransactions = (state.inventoryTransactions || []).filter(tx => 
                tx.operatorId === session.employeeId && 
                tx.date === currentRecord.date &&
                tx.type === 'out'
              );
              const totalOilSalesAmount = activeOilSalesTransactions.reduce((sum, tx) => sum + (tx.totalAmount || 0), 0);
              const totalCashExpected = totalFuelCashExpected + totalOilSalesAmount;

              const employeeNoteSum = 
                (employeeDenoms.n500 || 0) * 500 +
                (employeeDenoms.n200 || 0) * 200 +
                (employeeDenoms.n100 || 0) * 100 +
                (employeeDenoms.n50 || 0) * 50 +
                (employeeDenoms.n20 || 0) * 20 +
                (employeeDenoms.n10 || 0) * 10 +
                (employeeDenoms.n5 || 0) * 5 +
                (employeeDenoms.n2 || 0) * 2 +
                (employeeDenoms.n1 || 0) * 1;

              const employeeCashDiff = employeeNoteSum - totalCashExpected;

              const oilProducts = (state.inventory || []).filter(p => p.type === 'oil' || p.type === 'other');

              return (
                <div className="flex flex-col gap-6 mt-5" id="employee_cash_oil_panel">
                  {/* Oil & Lubes Inventory Sale Register - FIRST */}
                  <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-700/40 pb-2.5">
                      <Zap className="w-5 h-5 text-teal-400 animate-pulse" />
                      <h3 className="font-bold text-slate-100 text-sm">
                        {lang === 'en' ? 'Oil & Lubes Inventory Sale Register' : 'ઓઇલ અને લુબ્રિકન્ટ વેચાણ રજીસ્ટર'}
                      </h3>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                      {lang === 'en'
                        ? 'Record mobile/engine oil or other lubricants sold during your shift. Stock will be auto-deducted from admin inventory, logged, and revenue added to cash.'
                        : 'તમારી શિફ્ટ દરમિયાન વેચાયેલ એન્જિન ઓઇલ કે લુબ્રિકન્ટ અહીં નોંધો. એડમિનના સ્ટોકમાંથી આપોઆપ બાદ થઈ જશે અને રકમ કેશમાં ઉમેરાઈ જશે.'}
                    </p>

                    {oilActionError && (
                      <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-xl text-center">
                        {oilActionError}
                      </div>
                    )}
                    {oilActionSuccess && (
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl text-center">
                        {oilActionSuccess}
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Product select dropdown */}
                      <div className="space-y-1.5">
                        <label className="block text-slate-300 text-[10px] uppercase font-bold tracking-wider">
                          {lang === 'en' ? 'Select Oil Product / Item' : 'ઓઇલ પ્રોડક્ટ પસંદ કરો'}
                        </label>
                        <select
                          value={selectedOilProductId}
                          onChange={(e) => setSelectedOilProductId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-xs font-medium focus:outline-none focus:border-teal-500 cursor-pointer"
                        >
                          <option value="">{lang === 'en' ? '-- Select Product --' : '-- ઓઇલ પ્રોડક્ટ પસંદ કરો --'}</option>
                          {oilProducts.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} (Stock: {p.currentStock} {p.unit}) - ₹{p.sellingPrice}/Unit
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity & Summary Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="block text-slate-300 text-[10px] uppercase font-bold tracking-wider">
                            {lang === 'en' ? 'Quantity' : 'નંગ / લીટર માત્રા'}
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={oilQty}
                            onChange={(e) => setOilQty(e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-xs font-mono focus:outline-none focus:border-teal-500 font-bold"
                          />
                        </div>

                        {selectedOilProductId && (() => {
                          const prod = oilProducts.find(p => p.id === selectedOilProductId);
                          if (!prod) return null;
                          const totalAmt = (parseFloat(oilQty) || 0) * prod.sellingPrice;
                          return (
                            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/30 flex flex-col justify-center text-right">
                              <span className="text-[9px] uppercase font-bold text-slate-500 block tracking-wider">
                                {lang === 'en' ? 'Sale Amount' : 'વેચાણ રકમ'}
                              </span>
                              <span className="text-sm font-extrabold text-teal-400 block font-mono mt-0.5">
                                ₹{totalAmt.toLocaleString('en-IN')}
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      <button
                        type="button"
                        onClick={handleEmployeeOilSale}
                        className="w-full py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {lang === 'en' ? 'Register Sale & Deduct Stock' : 'વેચાણ નોંધો અને સ્ટોક બાદ કરો'}
                      </button>
                    </div>

                    {/* Oil transaction log history */}
                    {activeOilSalesTransactions.length > 0 && (
                      <div className="space-y-2 border-t border-slate-700/40 pt-3">
                        <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
                          {lang === 'en' ? 'Oil Sales History (Current Shift)' : 'આજની શિફ્ટનું ઓઇલ વેચાણ લીસ્ટ'}
                        </span>
                        <div className="max-h-24 overflow-y-auto space-y-1 divide-y divide-slate-800">
                          {activeOilSalesTransactions.map(tx => (
                            <div key={tx.id} className="flex justify-between items-center text-[10px] py-1 text-slate-300 font-mono">
                              <div>
                                <span className="font-semibold text-slate-200">{tx.productName}</span>
                                <span className="text-slate-500 ml-1">({tx.quantity} units @ ₹{tx.rate})</span>
                              </div>
                               <span className="font-mono font-bold text-emerald-400">₹{tx.totalAmount}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Physical Cash Denominations Tally - SECOND */}
                  <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-700/40 pb-2.5">
                      <DollarSign className="w-5 h-5 text-amber-400" />
                      <h3 className="font-bold text-slate-100 text-sm">
                        {lang === 'en' ? 'Physical Cash Denominations Tally' : 'રોકડ નોટોની ગણતરી પત્રક (કૅશ મેળ)'}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                      <div className="bg-slate-900/60 border border-slate-700/30 p-2.5 rounded-xl">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                          {lang === 'en' ? 'Fuel Cash Collection (Auto)' : 'ઇંધણ કેશ કલેક્શન (ઓટો)'}
                        </span>
                        <span className="text-sm font-extrabold text-teal-400 block font-mono mt-0.5">
                          ₹{totalFuelCashExpected.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="bg-slate-900/60 border border-slate-700/30 p-2.5 rounded-xl">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                          {lang === 'en' ? 'Oil Sales (Auto)' : 'ઓઇલ વેચાણ રકમ (ઓટો)'}
                        </span>
                        <span className="text-sm font-extrabold text-yellow-400 block font-mono mt-0.5">
                          ₹{totalOilSalesAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Denominations input matrix */}
                    <div className="space-y-1.5 bg-slate-900/40 p-3 rounded-xl border border-slate-700/60 max-h-60 overflow-y-auto">
                      {[
                        { val: 500, key: 'n500' as const },
                        { val: 200, key: 'n200' as const },
                        { val: 100, key: 'n100' as const },
                        { val: 50, key: 'n50' as const },
                        { val: 20, key: 'n20' as const },
                        { val: 10, key: 'n10' as const },
                        { val: 5, key: 'n5' as const },
                        { val: 2, key: 'n2' as const },
                        { val: 1, key: 'n1' as const }
                      ].map(({ val, key }) => {
                        const count = employeeDenoms[key] || 0;
                        return (
                          <div key={key} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800 last:border-0">
                            <span className="font-extrabold text-slate-300 w-16 text-sm">₹{val}  ×</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEmployeeDenoms(p => ({ ...p, [key]: Math.max(0, (p[key] || 0) - 1) }))}
                                className="w-8 h-8 bg-slate-850 hover:bg-slate-700 active:scale-90 rounded-lg text-slate-300 flex items-center justify-center font-extrabold text-base transition-all cursor-pointer"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={count || ''}
                                placeholder="0"
                                onChange={(e) => {
                                  const v = parseInt(e.target.value) || 0;
                                  setEmployeeDenoms(p => ({ ...p, [key]: Math.max(0, v) }));
                                }}
                                className="w-24 text-center bg-slate-950 border border-slate-700/80 rounded-lg py-1 px-1.5 font-mono font-extrabold text-sm text-amber-400 focus:outline-none focus:border-amber-500 shadow-inner transition-colors"
                              />
                              <button
                                type="button"
                                onClick={() => setEmployeeDenoms(p => ({ ...p, [key]: (p[key] || 0) + 1 }))}
                                className="w-8 h-8 bg-slate-850 hover:bg-slate-700 active:scale-90 rounded-lg text-slate-300 flex items-center justify-center font-extrabold text-base transition-all cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                            <span className="text-slate-100 font-mono font-bold w-24 text-right text-xs">
                              ₹{(count * val).toLocaleString('en-IN')}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Computed Summary Bar */}
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/50 space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-400">{lang === 'en' ? 'Total Cash Handed Over (Notes):' : 'કુલ ગણેલા રોકડા (નોટોનો સરવાળો):'}</span>
                        <span className="text-slate-100 font-mono font-bold font-sans">₹{employeeNoteSum.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold border-t border-slate-800 pt-1.5">
                        <span className="text-slate-400">{lang === 'en' ? 'Total Cash Expected (System):' : 'કુલ જમા થવા પાત્ર રકમ (સિસ્ટમ મુજબ):'}</span>
                        <span className="text-slate-100 font-mono font-bold font-sans">₹{totalCashExpected.toLocaleString('en-IN')}</span>
                      </div>

                      {/* Reconciliation alert badge */}
                      <div className={`p-2.5 rounded-lg border text-[11px] font-sans ${
                        Math.abs(employeeCashDiff) < 2
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : employeeCashDiff > 0
                          ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}>
                        {Math.abs(employeeCashDiff) < 2 ? (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>{lang === 'en' ? 'Perfect Match! Your cash tally reconciles precisely.' : 'હિસાબ મેળ કમ્પ્લીટ છે! કોઈ રકમ બાકી નીકળતી નથી.'}</span>
                          </div>
                        ) : employeeCashDiff > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0" />
                            <span>{lang === 'en' ? `Surplus of +₹${employeeCashDiff.toFixed(2)} detected!` : `તમારી પાસે +₹${employeeCashDiff.toFixed(2)} રોકડા વધારે છે (વધઘટ).`}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>{lang === 'en' ? `Shortage of -₹${Math.abs(employeeCashDiff).toFixed(2)} detected!` : `હિસાબમાં -₹${Math.abs(employeeCashDiff).toFixed(2)} ની ઘટ્ટ (ટૂંકો મેળ) જણાય છે!`}</span>
                          </div>
                        )}
                      </div>

                      {/* Remarks / Incident Notes input for filler boy */}
                      <div className="space-y-1 mt-1">
                        <label className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                          {lang === 'en' ? 'Shift Notes / Remarks (Optional)' : 'શિફ્ટ નોંધો / રિમાર્કસ (વૈકલ્પિક)'}
                        </label>
                        <textarea
                          rows={2}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder={lang === 'en' ? "Enter any shift incident, short payment notes, nozzle issues, etc..." : "કોઈ ચોક્કસ નોંધ, ટૂંકી રકમ, નોઝલની સમસ્યા વગેરે લખો..."}
                          className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-slate-200 text-xs font-sans focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      {/* Action Feedback Messages */}
                      {tallyActionError && (
                        <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-xl text-center">
                          {tallyActionError}
                        </div>
                      )}
                      {tallyActionSuccess && (
                        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl text-center">
                          {tallyActionSuccess}
                        </div>
                      )}

                      {/* Submit physical cash tally button */}
                      <button
                        type="button"
                        onClick={handleEmployeeSubmitAll}
                        className="w-full py-3.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-green-500 hover:from-teal-400 hover:via-emerald-400 hover:to-green-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer active:scale-95 font-sans uppercase tracking-wider"
                      >
                        <Send className="w-4 h-4" />
                        {lang === 'en' ? 'Submit Complete Shift Hisab & Cash Tally' : 'સંપૂર્ણ હિસાબ અને રોકડ મેળ સબમિટ કરો'}
                      </button>
                    </div>
                  </div>

                  {/* Cash Tally History Log - THIRD */}
                  <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-700/40 pb-2.5 gap-2">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-amber-400" />
                        <h3 className="font-bold text-slate-100 text-sm">
                          {lang === 'en' ? 'My Tally Entries (History)' : 'મારો સબમિટ કરેલ કેશ મેળ લોગ ઇતિહાસ'}
                        </h3>
                      </div>
                      
                      {/* Date Filter */}
                      <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="date"
                          value={tallyDateFilter}
                          onChange={(e) => setTallyDateFilter(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-[10px] text-slate-200 focus:outline-none focus:border-teal-500 font-mono font-bold"
                        />
                        {tallyDateFilter && (
                          <button
                            type="button"
                            onClick={() => setTallyDateFilter('')}
                            className="text-[10px] text-rose-400 hover:text-rose-300 font-bold"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {(() => {
                      const myTallies = (state.cashTallies || []).filter(t => t.employeeId === session.employeeId);
                      const filteredTallies = tallyDateFilter 
                        ? myTallies.filter(t => t.date === tallyDateFilter)
                        : myTallies;

                      if (filteredTallies.length === 0) {
                        return (
                          <div className="text-center py-8 text-slate-500 text-xs font-medium">
                            {lang === 'en' ? 'No tally entries logged for this selection.' : 'આ પસંદગી માટે કોઈ મેળ લોગ નોંધાયેલ નથી.'}
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                          {filteredTallies.map((t) => {
                            const dateObj = new Date(t.timestamp);
                            const formattedTime = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                            const formattedDate = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

                            return (
                              <div key={t.id} className="bg-slate-900/50 hover:bg-slate-900 border border-slate-700/40 p-3 rounded-xl space-y-2">
                                <div className="flex justify-between items-center text-[10px]">
                                  <div className="flex items-center gap-1.5 text-slate-400">
                                    <span className="font-bold text-slate-200">{formattedDate} • {formattedTime}</span>
                                    <span className="text-slate-500">({t.shiftName})</span>
                                  </div>
                                  <span className="text-[9px] uppercase font-bold tracking-wider bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                                    {t.litersSold.toFixed(2)} Litres
                                  </span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                                  <div>
                                    <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Physical</span>
                                    <span className="text-slate-200 font-bold">₹{t.totalNotesValue.toLocaleString('en-IN')}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Expected</span>
                                    <span className="text-slate-200 font-bold">₹{t.totalExpectedCash.toLocaleString('en-IN')}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Diff (વધઘટ)</span>
                                    <span className={`font-bold ${
                                      Math.abs(t.difference) < 2
                                        ? 'text-emerald-400'
                                        : t.difference > 0
                                        ? 'text-blue-400'
                                        : 'text-rose-400'
                                    }`}>
                                      {t.difference >= 0 ? '+' : ''}₹{t.difference.toFixed(2)}
                                    </span>
                                  </div>
                                </div>

                                {/* Denominations strip */}
                                <div className="text-[10px] text-slate-400 flex flex-wrap gap-x-2 gap-y-0.5 bg-slate-950/40 p-1.5 rounded border border-slate-800/40 font-mono">
                                  {Object.entries(t.denominations).map(([k, v]) => {
                                    if (!v) return null;
                                    const val = k.replace('n', '');
                                    return (
                                      <span key={k} className="inline-block text-[9px]">
                                        ₹{val}×{v}
                                      </span>
                                    );
                                  })}
                                </div>

                                {t.nozzleReadingsSummary && (
                                  <div className="mt-2 text-[10px] text-slate-400 bg-slate-950/60 p-2 rounded border border-slate-800/60 font-mono space-y-1">
                                    <span className="text-[9px] uppercase font-bold text-slate-500 block border-b border-slate-800/60 pb-0.5 mb-1">
                                      {lang === 'en' ? 'Nozzle Readings & Cash Breakdown' : 'નોઝલ રીડીંગ અને વિગતવાર ગણતરી'}
                                    </span>
                                    <div className="whitespace-pre-wrap leading-relaxed text-slate-300 text-[9px]">
                                      {t.nozzleReadingsSummary}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })()}
              </>
            )}
          </div>

          {/* RIGHT: Manager Tools OR Filler Boy Udhar Slips & Timer */}
          <div className="xl:col-span-4 space-y-5">
            {session.role === 'employee' ? (
              <>
                {/* 1. Duty Timer Card */}
                <div className="bg-slate-800/90 rounded-2xl border border-slate-700/60 p-5 space-y-4">
                  <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <Clock className="text-teal-400 w-4 h-4 animate-pulse" />
                    {lang === 'en' ? 'Active Duty Timer' : 'ચાલુ ડ્યુટીનો સમય'}
                  </h3>

                  <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/20 text-center space-y-2">
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                      {lang === 'en' ? 'TIME ELAPSED ON DUTY' : 'ડ્યુટી પર વીતેલો સમય'}
                    </div>
                    {(() => {
                      // Find first assigned nozzle's startedAt or default to openedAt
                      const firstAssignedNoz = allowedNozzles[0];
                      const startedAtStr = firstAssignedNoz && currentRecord.nozzleEntries[firstAssignedNoz.id]?.startedAt
                        ? currentRecord.nozzleEntries[firstAssignedNoz.id].startedAt
                        : currentRecord.openedAt || new Date().toISOString();

                      const startTime = new Date(startedAtStr).getTime();
                      const curTime = tickerTime.getTime();
                      const diffMs = Math.max(0, curTime - startTime);
                      const diffSecs = Math.floor(diffMs / 1000);
                      const hrs = Math.floor(diffSecs / 3600);
                      const mins = Math.floor((diffSecs % 3600) / 60);
                      const secs = diffSecs % 60;

                      return (
                        <div className="text-3xl font-mono font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                          {String(hrs).padStart(2, '0')}:{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                        </div>
                      );
                    })()}
                    <div className="text-xs text-slate-400 font-sans">
                      Started: <span className="text-slate-300 font-mono font-medium">{new Date(currentRecord.openedAt || new Date()).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
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
                        <div key={tank.id} className="space-y-2 p-3 bg-slate-900/50 border border-slate-700/60 rounded-xl">
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
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
