import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Coins, 
  ArrowRight,
  TrendingUp, 
  Save, 
  FileCheck,
  AlertCircle, 
  TrendingDown, 
  CheckCircle2, 
  Calculator,
  Calendar,
  Layers,
  Printer,
  ChevronRight,
  Sparkles,
  ArrowDownCircle,
  PiggyBank,
  DollarSign,
  AlertTriangle,
  Info,
  Trash2,
  Edit,
  Search,
  Filter,
  Check,
  Fuel
} from 'lucide-react';
import { SystemState, DailyClosingRecord, Denominations, UserSession } from '../types';

interface DayBookTabProps {
  state: SystemState;
  lang: 'en' | 'gu';
  session: UserSession;
  onPostAction: (actionType: string, url: string, payload: any) => Promise<void>;
  onRefreshState: () => void;
}

const DEFAULT_DENOMINATIONS: Denominations = {
  n500: 0,
  n100: 0,
  n50: 0,
  n20: 0,
  n10: 0,
  n5: 0,
  n2: 0,
  n1: 0
};

export default function DayBookTab({ 
  state, 
  lang, 
  session, 
  onPostAction, 
  onRefreshState 
}: DayBookTabProps) {
  // Parameters
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Search parameters for past daily closings
  const [historySearch, setHistorySearch] = useState('');

  // Financial inputs
  const [todayCollection, setTodayCollection] = useState<string>('0');
  const [kharcha, setKharcha] = useState<string>('0');
  const [udhar, setUdhar] = useState<string>('0');
  const [onlineCollection, setOnlineCollection] = useState<string>('0');
  const [cashCollection, setCashCollection] = useState<string>('0');
  const [jama, setJama] = useState<string>('0');
  const [oilSell, setOilSell] = useState<string>('0');
  const [silak, setSilak] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');

  // Cash Denominations
  const [denoms, setDenoms] = useState<Denominations>({ ...DEFAULT_DENOMINATIONS });

  // Filter existing closings list
  const closingsList = state.dailyClosings || [];
  const existingClosing = closingsList.find(c => c.date === selectedDate);

  // Auto consolidation from the 3 shifts under selected Date
  const dayShifts = state.records.filter(r => r.date === selectedDate);
  
  // Calculate automatic system shift aggregates
  let aggPetrolLiters = 0;
  let aggPetrolSales = 0;
  let aggDieselLiters = 0;
  let aggDieselSales = 0;

  let aggCashCollection = 0;
  let aggOnlineCollection = 0;
  let aggCreditSales = 0;

  dayShifts.forEach(shiftRecord => {
    Object.keys(shiftRecord.nozzleEntries).forEach(nozId => {
      const entry = shiftRecord.nozzleEntries[nozId];
      if (entry) {
        const nozObj = state.nozzles.find(n => n.id === nozId);
        const diffLiters = Math.max(0, entry.closingReading - entry.openingReading - (entry.testingLiters || 0));
        
        // Find Tank customRate
        const tank = state.tanks.find(t => t.fuelType === nozObj?.fuelType);
        const rate = tank ? tank.customRate : (nozObj?.fuelType === 'petrol' ? 101.45 : 92.15);
        const salesVal = diffLiters * rate;

        if (nozObj?.fuelType === 'petrol') {
          aggPetrolLiters += diffLiters;
          aggPetrolSales += salesVal;
        } else if (nozObj?.fuelType === 'diesel') {
          aggDieselLiters += diffLiters;
          aggDieselSales += salesVal;
        }

        aggCashCollection += Number(entry.cash || 0);
        aggOnlineCollection += Number(entry.upi || 0) + Number(entry.card || 0);
        aggCreditSales += Number(entry.creditSales || 0);
      }
    });
  });

  const totalAggLiters = aggPetrolLiters + aggDieselLiters;
  const totalAggSalesValue = aggPetrolSales + aggDieselSales;

  // Form Sync on Selected Date change or when values are saved/updated
  useEffect(() => {
    if (existingClosing) {
      setTodayCollection(String(existingClosing.todayCollection));
      setKharcha(String(existingClosing.kharcha));
      setUdhar(String(existingClosing.udhar));
      setOnlineCollection(String(existingClosing.onlineCollection));
      setCashCollection(String(existingClosing.cashCollection));
      setJama(String(existingClosing.jama));
      setOilSell(String(existingClosing.oilSell));
      setSilak(String(existingClosing.silak));
      setNotes(existingClosing.notes || '');
      setDenoms(existingClosing.notesBreakdown || { ...DEFAULT_DENOMINATIONS });
    } else {
      // Pre-populate with auto-consolidated shift values to make user entry fast & painless!
      setTodayCollection(String(Math.round(totalAggSalesValue)));
      setKharcha('0');
      setUdhar(String(Math.round(aggCreditSales)));
      setOnlineCollection(String(Math.round(aggOnlineCollection)));
      setCashCollection(String(Math.round(aggCashCollection)));
      setJama('0');
      setOilSell('0');
      setSilak('0');
      setNotes('');
      setDenoms({ ...DEFAULT_DENOMINATIONS });
    }
    setErrorMessage('');
    setSuccessMessage('');
  }, [selectedDate, existingClosing, totalAggSalesValue, aggCashCollection, aggOnlineCollection, aggCreditSales]);

  // Recalculate/reset form from active shift data manually
  const handleAutofillReset = () => {
    setTodayCollection(String(Math.round(totalAggSalesValue)));
    setUdhar(String(Math.round(aggCreditSales)));
    setOnlineCollection(String(Math.round(aggOnlineCollection)));
    setCashCollection(String(Math.round(aggCashCollection)));
    setNotes(prev => prev ? prev + ' (Autofilled from Shifts)' : 'Autofilled from shift logs.');
    setSuccessMessage(lang === 'en' ? 'Form populated with active shift aggregates!' : 'શિફ્ટ લૉગ્સના આધારે આંકડા ફરીથી ગણવામાં આવ્યા!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Handle denomination changes
  const handleDenomChange = (key: keyof Denominations, valueStr: string) => {
    const val = parseInt(valueStr) || 0;
    setDenoms(prev => ({
      ...prev,
      [key]: Math.max(0, val)
    }));
  };

  // Immediate note sum calculation
  const noteSum = 
    (denoms.n500 * 500) +
    (denoms.n100 * 100) +
    (denoms.n50 * 50) +
    (denoms.n20 * 20) +
    (denoms.n10 * 10) +
    (denoms.n5 * 5) +
    (denoms.n2 * 2) +
    (denoms.n1 * 1);

  // Financial book calculation from user states
  const todayCollVal = parseFloat(todayCollection) || 0;
  const kharchaVal = parseFloat(kharcha) || 0;
  const udharVal = parseFloat(udhar) || 0;
  const onlineCollVal = parseFloat(onlineCollection) || 0;
  const cashCollVal = parseFloat(cashCollection) || 0;
  const jamaVal = parseFloat(jama) || 0;
  const oilSellVal = parseFloat(oilSell) || 0;
  const silakVal = parseFloat(silak) || 0;

  // Formula matching general pump standards:
  // Total Cash in book which should exist = (todayCollection + oilSell + cashCollection) - kharcha - jama - silak
  const totalCashCalculated = (todayCollVal + cashCollVal + oilSellVal) - kharchaVal - jamaVal - silakVal;
  const totalBankCalculated = onlineCollVal + jamaVal;
  const grandTotalReconciled = todayCollVal + oilSellVal + cashCollVal + onlineCollVal;

  const handleSaveClosing = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const closingObj: DailyClosingRecord = {
        id: selectedDate,
        date: selectedDate,
        todayCollection: todayCollVal,
        kharcha: kharchaVal,
        udhar: udharVal,
        onlineCollection: onlineCollVal,
        cashCollection: cashCollVal,
        jama: jamaVal,
        oilSell: oilSellVal,
        silak: silakVal,
        totalCash: totalCashCalculated,
        totalBank: totalBankCalculated,
        notesBreakdown: denoms,
        notesTotal: noteSum,
        notes: notes,
      };

      await onPostAction('save daily closing reconciliation', '/api/daily-closings', {
        action: 'save',
        closingData: closingObj,
        userId: session.employeeId,
        userName: session.name
      });
      
      setSuccessMessage(
        lang === 'en' 
          ? 'Daily reconciliation and cash denomination summary saved successfully!' 
          : 'દૈનિક મેળ હિસાબ અને રોકડા નોટોની વિગતો સફળતાપૂર્વક સાચવવામાં આવી!'
      );
      
      onRefreshState();
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving day book summary.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete a historical closing day book record
  const handleDeleteClosing = async (dateStr: string) => {
    setIsDeleting(dateStr);
    try {
      await onPostAction('delete daily closing record', '/api/daily-closings', {
        action: 'delete',
        closingData: { date: dateStr },
        userId: session.employeeId,
        userName: session.name
      });
      setSuccessMessage(
        lang === 'en'
          ? 'Specified Day Book record deleted successfully!'
          : 'પસંદ કરેલ મેળ હિસાબ રેકોર્ડ સફળતાપૂર્વક કાઢી નાખવામાં આવ્યો છે!'
      );
      onRefreshState();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error deleting Day Book record.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter history records based on search (dates / notes)
  const filteredHistory = closingsList
    .filter(c => {
      const term = historySearch.toLowerCase().trim();
      if (!term) return true;
      return c.date.includes(term) || (c.notes || '').toLowerCase().includes(term);
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6" id="day_book_container">
      
      {/* Visual Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
            <Layers className="w-6 h-6 text-indigo-500 animate-pulse" />
            <span>
              {lang === 'en' ? 'Daily Book (24-Hour Consolidated Reconciliation)' : '૨૪ કલાક મેળ (આખા દિવસનો હિસાબ અને નોટોની ગણતરી)'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'en' 
              ? 'Consolidate fuel nozzle parameters and cash counts across 24 hours. Manage cash balances, expenses, and log previous days\' histories.' 
              : 'સમગ્ર ૨૪ કલાક દરમિયાનના નોઝલ એન્ટ્રી પેરામીટર, ઓનલાઇન-રોકડ કલેક્શન અને તિજોરીની નોટોનું ઓડિટ કરો.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleAutofillReset}
            className="flex items-center gap-1 px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 text-xs font-bold cursor-pointer transition-colors"
            title={lang === 'en' ? 'Recalculate values directly from logged shifts of this date' : 'આ તારીખની શિફ્ટ એન્ટ્રીઓ પરથી ફરી ગણતરી કરો'}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Recalculate system shift figures' : 'સિસ્ટમ ઓટો મેળવો'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 border border-slate-250 text-slate-800 rounded-lg hover:bg-slate-200 text-xs font-semibold cursor-pointer transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>{lang === 'en' ? 'Print Sheet' : 'પ્રિન્ટ કરો'}</span>
          </button>
        </div>
      </div>

      {/* Date parameter card & Shift status consolidation */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              {lang === 'en' ? 'Reconciliation Accounts Date' : 'મેળ હિસાબ કરવાની તારીખ'}
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="mt-0.5 bg-slate-50 border border-slate-250 rounded px-2.5 py-1 text-xs font-bold text-indigo-900 font-mono outline-hidden focus:border-indigo-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Dynamic Shift status tag summary */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-600 mr-1.5">
            {lang === 'en' ? 'Logged Shift Records:' : 'કુલ હાજર શિફ્ટ રજીસ્ટર:'}
          </span>
          {state.shifts.map(sh => {
            const matchRecord = dayShifts.find(r => r.shiftId === sh.id);
            const isClosed = matchRecord?.status === 'closed';
            const isOpen = matchRecord?.status === 'open';

            return (
              <span
                key={sh.id}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border font-mono flex items-center gap-1 ${
                  isClosed 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-250' 
                    : isOpen 
                    ? 'bg-amber-50 text-amber-800 border-amber-250 animate-pulse' 
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${isClosed ? 'bg-emerald-500' : isOpen ? 'bg-amber-500' : 'bg-slate-350'}`} />
                <span>{sh.name}</span>
                <span className="opacity-75 text-[9px]">
                  {isClosed ? '(Closed)' : isOpen ? '(Open)' : '(Pending)'}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {dayShifts.length === 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/10 text-amber-800 text-xs rounded-xl flex items-start gap-2">
          <Info className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">
              {lang === 'en' ? 'No shift records found for this selected date.' : 'પસંદ કરેલ તારીખે કોઈ શિફ્ટ એન્ટ્રી ભરેલ નથી!'}
            </span>
            <span className="opacity-90 block mt-0.5">
              {lang === 'en' 
                ? 'You can still manually enter previous hisab amounts (Today Collection, Cash box details, notes counter) and hit "Save" to append this historical daily book summary!' 
                : 'વાંધો નહિ, તમે હજુ પણ તમારા પાછલા આર્થિક આંકડાઓ (ગલ્લો, ખર્ચ, ઉધાર, બેંક જમા) મેન્યુઅલી લખીને તિજોરી નોટોનો "મેળ સેવ કરો" બટન દબાવી રેકોર્ડ જાળવી શકો છો!'}
            </span>
          </div>
        </div>
      )}

      {/* Auto consolidated summary alerts banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1 shadow-3xs">
          <span className="text-[10px] uppercase font-black text-indigo-400 block tracking-wider">Aggregated sales (Liters)</span>
          <span className="text-base font-black text-slate-800 block font-mono">
            {totalAggLiters.toFixed(2)} Litres
          </span>
          <span className="text-[9px] text-slate-500 block">
            Petrol: {aggPetrolLiters.toFixed(1)}L | Diesel: {aggDieselLiters.toFixed(1)}L
          </span>
        </div>

        <div className="p-3 bg-emerald-50 border border-emerald-250 rounded-xl space-y-1 shadow-3xs">
          <span className="text-[10px] uppercase font-black text-emerald-500 block tracking-wider">Aggregated Fuel Sales</span>
          <span className="text-base font-black text-emerald-700 block font-mono">
            ₹{totalAggSalesValue.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
          </span>
          <span className="text-[9px] text-slate-500 block">
            Expected counter bill receipts
          </span>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-250 rounded-xl space-y-1 shadow-3xs">
          <span className="text-[10px] uppercase font-black text-amber-600 block tracking-wider">Expected Cash On Duty</span>
          <span className="text-base font-black text-amber-700 block font-mono">
            ₹{aggCashCollection.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
          </span>
          <span className="text-[9px] text-slate-500 block">
            Expected physical currency in hand
          </span>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-250 rounded-xl space-y-1 shadow-3xs">
          <span className="text-[10px] uppercase font-black text-blue-500 block tracking-wider">Aggregated credit (Udhar)</span>
          <span className="text-base font-black text-blue-700 block font-mono">
            ₹{aggCreditSales.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
          </span>
          <span className="text-[9px] text-slate-500 block">
            Logged credit vouchers today
          </span>
        </div>
      </div>

      {/* 24-Hour ALL NOZZLE SHIFT ENTRIES BREAKDOWN (Requirement 1) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Fuel className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-sm text-slate-900">
              {lang === 'en' ? '24h Consolidated Nozzles Shift-wise Readings' : '૨૪ કલાક તમામ શિફ્ટ નોઝલ પ્રોગ્રેસ અને વેચાણ પત્રક'}
            </h3>
          </div>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-bold">
            {lang === 'en' ? 'Computed from Shifts' : 'શિફ્ટ લૉગ્સ વિશ્લેષણ'}
          </span>
        </div>

        {dayShifts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 font-bold text-slate-500 border-b border-slate-150">
                <tr>
                  <th className="p-3 text-center">{lang === 'en' ? 'Nozzle' : 'નોઝલ'}</th>
                  <th className="p-3 text-center">{lang === 'en' ? 'Fuel Type' : 'ઈંધણ પ્રકાર'}</th>
                  <th className="p-3 text-right">{lang === 'en' ? 'Opening Rdg (Min)' : 'શરૂઆત રીડિંગ'}</th>
                  <th className="p-3 text-right">{lang === 'en' ? 'Closing Rdg (Max)' : 'આખર રીડિંગ'}</th>
                  <th className="p-3 text-right">{lang === 'en' ? 'Test Litres' : 'ટેસ્ટિંગ લીટર'}</th>
                  <th className="p-3 text-right">{lang === 'en' ? 'Net Litres Sold' : 'ચોખ્ખું વેચાણ (L)'}</th>
                  <th className="p-3 text-right">{lang === 'en' ? 'Rate (₹)' : 'ભાવ'}</th>
                  <th className="p-3 text-right">{lang === 'en' ? 'Net Value' : 'કુલ કિંમત (₹)'}</th>
                  <th className="p-3 text-center">{lang === 'en' ? 'Shift Breakdowns (Operator : Cash / UPI / Udhar)' : 'શિફ્ટવાઇઝ વિગતવાર એન્ટ્રીઓ (કુલ મેળ)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.nozzles.map(noz => {
                  let nozOpening = -1;
                  let nozClosing = -1;
                  let nozTesting = 0;
                  let nozNetLiters = 0;
                  const individualShiftEntries: Array<{
                    shiftName: string;
                    operatorName: string;
                    rawSale: number;
                    cash: number;
                    online: number;
                    credit: number;
                  }> = [];

                  dayShifts.forEach(shRecord => {
                    const entry = shRecord.nozzleEntries[noz.id];
                    if (entry) {
                      const shDef = state.shifts.find(s => s.id === shRecord.shiftId);
                      const opDef = state.employees.find(e => e.id === entry.operatorId);
                      const rawSaleLiters = Math.max(0, entry.closingReading - entry.openingReading - (entry.testingLiters || 0));
                      
                      individualShiftEntries.push({
                        shiftName: shDef?.name || 'N/A',
                        operatorName: opDef?.name || 'Unknown',
                        rawSale: rawSaleLiters,
                        cash: entry.cash || 0,
                        online: (entry.upi || 0) + (entry.card || 0),
                        credit: entry.creditSales || 0,
                      });

                      // Track min opening and max closing across active shifts of that day
                      if (nozOpening === -1 || entry.openingReading < nozOpening) {
                        nozOpening = entry.openingReading;
                      }
                      nozClosing = Math.max(nozClosing, entry.closingReading);
                      nozTesting += (entry.testingLiters || 0);
                      nozNetLiters += rawSaleLiters;
                    }
                  });

                  const tank = state.tanks.find(t => t.id === noz.tankId);
                  const rate = tank ? tank.customRate : (noz.fuelType === 'petrol' ? 101.45 : '92.15');
                  const salesPrice = nozNetLiters * Number(rate);

                  if (individualShiftEntries.length === 0) {
                    return (
                      <tr key={noz.id} className="text-slate-400 opacity-60">
                        <td className="p-3 font-mono font-bold text-center">{noz.nozzleNumber}</td>
                        <td className="p-3 text-center capitalize">{noz.fuelType === 'petrol' ? '⛽ Petrol' : '🚚 Diesel'}</td>
                        <td colspan={7} className="p-3 text-center italic text-[10px]">
                          {lang === 'en' ? 'No logged shift entries for this nozzle on this date' : 'આ તારીખે આ નોઝલમાં કોઈ શિફ્ટ રીડિંગ નોંધાયેલ નથી'}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={noz.id} className="hover:bg-slate-50/70 font-mono text-[11px] font-bold">
                      <td className="p-3 text-slate-900 text-center font-sans font-bold">{noz.nozzleNumber}</td>
                      <td className="p-3 text-center font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${noz.fuelType === 'petrol' ? 'bg-blue-50 text-blue-700 border border-blue-150' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'}`}>
                          {noz.fuelType === 'petrol' ? (lang === 'en' ? 'Petrol' : 'પેટ્રોલ') : (lang === 'en' ? 'Diesel' : 'ડીઝલ')}
                        </span>
                      </td>
                      <td className="p-3 text-right text-slate-500">{nozOpening.toFixed(2)}</td>
                      <td className="p-3 text-right text-slate-800">{nozClosing.toFixed(2)}</td>
                      <td className="p-3 text-right text-amber-600">{nozTesting > 0 ? nozTesting.toFixed(1) : '0'}</td>
                      <td className="p-3 text-right text-indigo-700 text-xs font-black">{nozNetLiters.toFixed(2)} L</td>
                      <td className="p-3 text-right text-slate-500">₹{rate}</td>
                      <td className="p-3 text-right text-emerald-700 text-xs font-black">₹{salesPrice.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</td>
                      
                      {/* Detailed shift-wise stack inside 1 cell */}
                      <td className="p-3 font-sans">
                        <div className="space-y-1.5 min-w-[280px]">
                          {individualShiftEntries.map((shLog, idx) => (
                            <div key={idx} className="bg-slate-50 hover:bg-slate-100 p-2 rounded-lg border border-slate-150 text-[10px] flex flex-col gap-0.5">
                              <div className="flex justify-between items-center text-slate-500">
                                <span className="font-extrabold text-indigo-800 uppercase tracking-wide font-mono">{shLog.shiftName} ({shLog.operatorName})</span>
                                <span className="font-mono text-slate-800 font-bold">{shLog.rawSale.toFixed(1)} Litres</span>
                              </div>
                              <div className="flex gap-2 items-center text-[9px] text-slate-400 font-mono mt-0.5">
                                <span>💵 Cash: <strong className="text-slate-700">₹{shLog.cash}</strong></span>
                                <span>📱 UPI/Card: <strong className="text-blue-700">₹{shLog.online}</strong></span>
                                <span>💳 Udhar: <strong className="text-amber-800">₹{shLog.credit}</strong></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl leading-relaxed italic">
            {lang === 'en' 
              ? 'No shift entries exist on this date. Reconciled aggregates can be manually written below.' 
              : 'આ તારીખે કોઈ શિફ્ટના નોઝલ એન્ટ્રી રેકોર્ડ મળેલ નથી. તમે નીચે આશરે અથવા સાચા આંકડા જાતે લખી બુક મેળવી શકો છો.'}
          </div>
        )}
      </div>

      {/* Main 2 Column Grid for accounts sheet & notes denominations */}
      <form onSubmit={handleSaveClosing} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Day Book accounts inputs */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <h3 className="font-extrabold text-sm text-slate-900 animate-pulse">
                {lang === 'en' ? 'Daily Master Financial Ledger/Book' : 'આખા દિવસનો મુખ્ય આર્થિક મેળ હિસાબ'}
              </h3>
            </div>
            
            <button
              type="button"
              onClick={handleAutofillReset}
              className="text-[10px] text-indigo-600 font-black flex items-center gap-1 hover:underline"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Auto-Load Shifts' : 'શિફ્ટ લૉગ્સ કોપી કરો'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Input fields */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                {lang === 'en' ? 'Today Collection' : 'આજનો ગલ્લો / કલેક્શન (₹)'}
              </label>
              <input
                type="number"
                value={todayCollection}
                onChange={(e) => setTodayCollection(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs font-mono font-bold"
              />
              <span className="text-[9px] text-slate-500 mt-0.5 block">
                {lang === 'en' ? 'Default: System fuel total' : 'સિસ્ટમ ઓટો: વેચાણ કુલ આવક'}
              </span>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                {lang === 'en' ? 'Cash Collection' : 'ગલ્લા કેશ કલેક્શન (₹)'}
              </label>
              <input
                type="number"
                value={cashCollection}
                onChange={(e) => setCashCollection(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs font-mono font-bold"
              />
              <span className="text-[9px] text-slate-500 mt-0.5 block">
                {lang === 'en' ? 'Default: System shift cash' : 'સિસ્ટમ ઓટો: શિફ્ટ રોકડ કલેક્શન'}
              </span>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                {lang === 'en' ? 'Kharcha' : 'રૂબરૂ ખર્ચા (Kharcha) (₹)'}
              </label>
              <input
                type="number"
                value={kharcha}
                onChange={(e) => setKharcha(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs font-mono font-bold text-rose-650"
              />
              <span className="text-[9px] text-slate-500 mt-0.5 block">
                {lang === 'en' ? 'Daily expenses paid' : 'ચા-નાસ્તો, મજુરી વગેરેના ચૂકવેલ રોકડા'}
              </span>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                {lang === 'en' ? 'Udhar' : 'કુલ ઉધાર વેચાણ (Udhar) (₹)'}
              </label>
              <input
                type="number"
                value={udhar}
                onChange={(e) => setUdhar(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs font-mono font-bold"
              />
              <span className="text-[9px] text-slate-500 mt-0.5 block">
                {lang === 'en' ? 'Default: Book credit entries' : 'સિસ્ટમ ઓટો: આજે નોંધાયેલ ઉધાર બુક'}
              </span>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                {lang === 'en' ? 'Online Collection' : 'ઓનલાઇન કલેક્શન (UPI/Card) (₹)'}
              </label>
              <input
                type="number"
                value={onlineCollection}
                onChange={(e) => setOnlineCollection(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs font-mono font-bold text-blue-700"
              />
              <span className="text-[9px] text-slate-500 mt-0.5 block">
                {lang === 'en' ? 'Default: Cards + UPI receipts' : 'સિસ્ટમ ઓટો: ઓનલાઇન જમા રકમ'}
              </span>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                {lang === 'en' ? 'Jama' : 'બેંક જમા કરાવી (Jama) (₹)'}
              </label>
              <input
                type="number"
                value={jama}
                onChange={(e) => setJama(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs font-mono font-bold text-indigo-700"
              />
              <span className="text-[9px] text-slate-500 mt-0.5 block">
                {lang === 'en' ? 'Deposited to main bank' : 'આજરોજ બેંક ખાતામાં ભરેલા રોકડા'}
              </span>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                {lang === 'en' ? 'Oil Sell' : 'ઑઇલ વેચાણ (Oil Sales) (₹)'}
              </label>
              <input
                type="number"
                value={oilSell}
                onChange={(e) => setOilSell(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs font-mono font-bold"
              />
              <span className="text-[9px] text-slate-500 mt-0.5 block">
                {lang === 'en' ? 'Lubricants or grease sales' : 'એન્જિન ઓઇલ વગેરેથી થયેલ રોકડ આવક'}
              </span>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                {lang === 'en' ? 'Silak' : 'આજની આખર સિલક (Silak) (₹)'}
              </label>
              <input
                type="number"
                value={silak}
                onChange={(e) => setSilak(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs font-mono font-bold text-amber-500"
              />
              <span className="text-[9px] text-slate-500 mt-0.5 block">
                {lang === 'en' ? 'Closing cash kept in pump' : 'ડેઇલી ક્લોઝિંગ બાદ તિજોરીમાં બચેલ કેશ'}
              </span>
            </div>

          </div>

          {/* Computed Output Panels */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3.5">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 pb-2 border-b border-slate-200">
              <Calculator className="w-4 h-4 text-indigo-600" />
              <span>{lang === 'en' ? 'Instant Reconciled Auto-Analysis' : 'લાઈવ મેળ ગણતરી પત્રક'}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-2.5 bg-white border border-slate-150 rounded-lg">
                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                  {lang === 'en' ? 'Total Collected' : 'કુલ થયેલ કલેક્શન'}
                </span>
                <span className="text-sm font-extrabold text-slate-900 block font-mono mt-0.5">
                  ₹{grandTotalReconciled.toLocaleString('en-IN', { minimumFractionDigits: 1 })}
                </span>
              </div>

              <div className="p-2.5 bg-white border border-slate-150 rounded-lg">
                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                  {lang === 'en' ? 'Total Cash Drawer (Computed)' : 'તિજોરી કેશ રોકડ સિલક'}
                </span>
                <span className={`text-sm font-extrabold block font-mono mt-0.5 ${totalCashCalculated >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  ₹{totalCashCalculated.toLocaleString('en-IN', { minimumFractionDigits: 1 })}
                </span>
              </div>

              <div className="p-2.5 bg-white border border-slate-150 rounded-lg">
                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                  {lang === 'en' ? 'Total Bank Deposits (UPI/Deposits)' : 'કુલ બેંક ફંડ (જમા + UPI)'}
                </span>
                <span className="text-sm font-extrabold text-indigo-800 block font-mono mt-0.5">
                  ₹{totalBankCalculated.toLocaleString('en-IN', { minimumFractionDigits: 1 })}
                </span>
              </div>
            </div>

            {/* Note clarification mismatch validation prompt */}
            <div className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs transition-colors ${
              Math.abs(totalCashCalculated - noteSum) < 2 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              {Math.abs(totalCashCalculated - noteSum) < 2 ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Cash Reconciliation Matches perfectly! (તિજોરી કેશ મેળ કમ્પ્લીટ છે!)</span>
                    <span className="text-[10px] opacity-90 block mt-0.5">Your cash book balance matched precisely with active physical currency note calculator tally (₹{noteSum.toLocaleString()}).</span>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Cash Drawer and Notes Count is Unreconciled (નોટોની ગણતરી અને કેશ સિલકમાં તફાવત છે)</span>
                    <span className="text-[10px] opacity-90 block mt-0.5">
                      The total cash computed from transactions is <strong className="font-mono">₹{totalCashCalculated.toLocaleString()}</strong>, but your physical denominations count tally shows <strong className="font-mono">₹{noteSum.toLocaleString()}</strong>. (તફાવત: <strong className="font-mono">₹{(totalCashCalculated - noteSum).toLocaleString()}</strong>).
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              {lang === 'en' ? 'Business Notes / Overall Comments / Clarifications' : 'ખાસ નોંધ અને સ્પષ્ટતા વિગતો'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={lang === 'en' ? 'Specify general shift breakdowns or excess shortfalls of the day...' : 'મેનેજર સ્પષ્ટતા, નોટોમાં કઈ વધઘટ હોય અથવા તો અન્ય કોઈ વિગત ઉમેરવા અહીં લખો...'}
              rows={3}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs"
            />
          </div>

        </div>

        {/* Right Column: Physical Currency Notes Clarification */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              <h3 className="font-extrabold text-sm text-slate-900">
                {lang === 'en' ? 'Physical Notes Denominations Tally' : 'રોકડા નોટોની ગણતરી પત્રક'}
              </h3>
            </div>
            
            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-700">
              {lang === 'en' ? 'Cash Box tally' : 'મેળ હિસાબ'}
            </span>
          </div>

          <p className="text-[10px] text-slate-500">
            {lang === 'en' 
              ? 'Enter number of currency notes on hand to automate fast cash drawer calculation audits.' 
              : 'ગલ્લામાં ફિઝિકલ બચેલી નોટોની સંખ્યા નાખો જેથી પાછલી કેશ મિલાન ગણતરી પત્રક આપોઆપ થઈ જાય.'}
          </p>

          {/* Notes Input Matrix */}
          <div className="space-y-2 border border-slate-150 p-3 rounded-xl bg-slate-50/40">
            {[
              { multiplier: 500, key: 'n500' as const },
              { multiplier: 100, key: 'n100' as const },
              { multiplier: 50, key: 'n50' as const },
              { multiplier: 20, key: 'n20' as const },
              { multiplier: 10, key: 'n10' as const },
              { multiplier: 5, key: 'n5' as const },
              { multiplier: 2, key: 'n2' as const },
              { multiplier: 1, key: 'n1' as const }
            ].map(({ multiplier, key }) => {
              const currentCount = denoms[key] || 0;
              const rowTotal = currentCount * multiplier;

              return (
                <div key={multiplier} className="flex items-center justify-between gap-3 text-xs border-b border-dashed border-slate-200 pb-2 last:border-b-0 last:pb-0 font-sans">
                  <div className="flex items-center gap-2 w-24 shrink-0 font-bold text-slate-700">
                    <span className="text-[10px] bg-slate-150 text-slate-700 w-9 text-center py-0.5 rounded font-mono border border-slate-250 shadow-3xs">
                      ₹{multiplier}
                    </span>
                    <span className="text-slate-400">✖</span>
                  </div>

                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={currentCount === 0 ? '' : currentCount}
                    onChange={(e) => handleDenomChange(key, e.target.value)}
                    className="w-full max-w-[100px] text-center bg-white border border-slate-250 rounded px-2.5 py-1 text-xs font-mono font-extrabold focus:border-amber-400"
                  />

                  <div className="w-28 text-right font-mono text-slate-900 font-extrabold">
                    ₹{rowTotal.toLocaleString('en-IN')}
                  </div>
                </div>
              );
            })}

            {/* Total Denominations Sum Panel */}
            <div className="pt-3 border-t-2 border-dashed border-slate-300 flex justify-between items-center bg-white p-2.5 rounded-lg border shadow-3xs">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                {lang === 'en' ? 'Notes Count Sum Total:' : 'નોટોની કુલ રકમ (Total):'}
              </span>
              <span className="text-base font-black text-rose-600 font-mono animate-pulse">
                ₹{noteSum.toLocaleString('en-IN', { minimumFractionDigits: 1 })}
              </span>
            </div>
          </div>

          {/* Action validation responses */}
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-700 text-xs rounded-lg">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs rounded-lg flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-5 h-5" />
              {successMessage}
            </div>
          )}

          {/* Core submission tool action button */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <span>Saving Day Entry...</span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>
                  {existingClosing 
                    ? (lang === 'en' ? 'Save & Update Today Reconciliation' : 'ડેઇલી મેળ અપડેટ કરો')
                    : (lang === 'en' ? 'Save & Set Today Reconciliation' : 'ડેઇલી મેળ સેવ કરો')
                  }
                </span>
              </>
            )}
          </button>

          {existingClosing && (
            <div className="p-3 bg-slate-50 rounded-xl border border-dashed flex items-center gap-2 text-[10px] text-slate-450">
              <Info className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>
                Last tally updated by <strong>{existingClosing.lastUpdatedBy || 'N/A'}</strong> on <strong>{existingClosing.lastUpdatedAt ? new Date(existingClosing.lastUpdatedAt).toLocaleTimeString() : 'N/A'}</strong>
              </span>
            </div>
          )}

        </div>

      </form>

      {/* REQUIREMENT 2: PREVIOUS HISABS (HISTORICAL CLOSINGS) LOGS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <FileCheck className="w-5 h-5 text-emerald-600" />
              <span>
                {lang === 'en' ? 'Historical Day Books / Previous Hisabs' : 'મેળ હિસાબ ઇતિહાસ (પાછલા દિવસોના રેકોર્ડ્સ)'}
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {lang === 'en' 
                ? 'Logs of previously saved 24-hours balances. Click edit to load that date into the main form.' 
                : 'ભૂતકાળમાં સેવ કરેલ ગલ્લામેળ પત્રકો. અહીથી કોઈ પણ જૂની તારીખનો મેળ લોડ, સાફ અથવા અપડેટ કરી શકાય છે.'}
            </p>
          </div>

          {/* Search box for previous records */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={lang === 'en' ? 'Search closing date...' : 'તારીખ શોધો... (YYYY-MM-DD)'}
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-hidden focus:border-indigo-400"
            />
          </div>
        </div>

        {filteredHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 font-bold text-slate-500 border-b border-slate-150">
                <tr>
                  <th className="p-3 font-semibold">{lang === 'en' ? 'Closing Date' : 'મેળ તારીખ'}</th>
                  <th className="p-3 text-right font-semibold">{lang === 'en' ? 'Today Collection' : 'આજનો ગલ્લો'}</th>
                  <th className="p-3 text-right font-semibold">{lang === 'en' ? 'Kharcha (Expenses)' : 'કુલ ખર્ચા'}</th>
                  <th className="p-3 text-right font-semibold">{lang === 'en' ? 'Udhar (Credit)' : 'ઉધાર વેચાણ'}</th>
                  <th className="p-3 text-right font-semibold">{lang === 'en' ? 'Online Collection' : 'ઓનલાઇન કલેક્શન'}</th>
                  <th className="p-3 text-right font-semibold">{lang === 'en' ? 'Bank Deposit (Jama)' : 'બેંક જમા'}</th>
                  <th className="p-3 text-right font-semibold">{lang === 'en' ? 'Closing Silak' : 'આખર સિલક'}</th>
                  <th className="p-3 text-right font-semibold">{lang === 'en' ? 'Denominations Total' : 'નોટોની રકમ'}</th>
                  <th className="p-3 text-center font-semibold">{lang === 'en' ? 'Audit Status' : 'મેળ સ્ટેટસ'}</th>
                  <th className="p-3 text-center font-semibold">{lang === 'en' ? 'Actions' : 'નિયંત્રણો'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px] font-bold">
                {filteredHistory.map(hist => {
                  const dif = Math.abs(hist.totalCash - hist.notesTotal);
                  const isMatched = dif < 2;

                  return (
                    <tr key={hist.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-sans text-slate-900 border-l-2 border-slate-200">
                        <span className="flex items-center gap-1 font-bold text-indigo-700">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{hist.date}</span>
                        </span>
                      </td>
                      <td className="p-3 text-right text-slate-900">₹{hist.todayCollection.toLocaleString()}</td>
                      <td className="p-3 text-right text-red-650">₹{hist.kharcha.toLocaleString()}</td>
                      <td className="p-3 text-right text-slate-700">₹{hist.udhar.toLocaleString()}</td>
                      <td className="p-3 text-right text-blue-700">₹{hist.onlineCollection.toLocaleString()}</td>
                      <td className="p-3 text-right text-indigo-800">₹{hist.jama.toLocaleString()}</td>
                      <td className="p-3 text-right text-amber-600">₹{hist.silak.toLocaleString()}</td>
                      <td className="p-3 text-right text-slate-800 font-extrabold">₹{hist.notesTotal.toLocaleString()}</td>
                      
                      {/* Audit Match Stamp */}
                      <td className="p-3 text-center font-sans">
                        {isMatched ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <Check className="w-2.5 h-2.5" />
                            <span>{lang === 'en' ? 'OK Tally' : 'મેળ કમ્પ્લીટ'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-50 text-amber-800 border border-amber-200" title={`Difference: ₹${(hist.totalCash - hist.notesTotal).toFixed(1)}`}>
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Diff: ₹{Math.round(hist.totalCash - hist.notesTotal)}</span>
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="p-3 text-center font-sans">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Load button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDate(hist.date);
                              document.getElementById('day_book_container')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="p-1.5 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer"
                            title={lang === 'en' ? 'Load & Modify Hisab' : 'હિસાબ લોડ કરો'}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete button with safety lock */}
                          <button
                            type="button"
                            disabled={isDeleting === hist.date}
                            onClick={() => {
                              if (window.confirm(lang === 'en' 
                                ? `Are you absolutely sure you want to delete the Daily Book summary for date ${hist.date}?` 
                                : `શું તમે ખરેખર ${hist.date} નો મેળ હિસાબ કાઢી નાખવા માંગો છો?`)) {
                                handleDeleteClosing(hist.date);
                              }
                            }}
                            className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors cursor-pointer"
                            title={lang === 'en' ? 'Delete entry' : 'કાઢી નાખો'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs italic">
            {lang === 'en' ? 'No historical daily closings logs recorded.' : 'કોઈ પાછલા મેળ હિસાબ રેકોર્ડ બુકમાં મળ્યા નથી.'}
          </div>
        )}
      </div>

    </div>
  );
}
