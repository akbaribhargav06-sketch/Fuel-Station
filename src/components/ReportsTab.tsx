/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { translations, LanguageCode } from '../translations';
import { SystemState, DailyShiftRecord, Nozzle, FuelTank, Shift, Employee, UserSession } from '../types';
import { 
  FileText, 
  Search, 
  Printer, 
  Download, 
  Share2, 
  TrendingUp, 
  Database,
  RefreshCw,
  Coins,
  AlertCircle,
  Trash2,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { motion } from 'motion/react';
import { downloadConsolidatedPDF, downloadDailyPDF } from '../utils/pdfGenerator';

interface ReportsTabProps {
  state: SystemState;
  lang: LanguageCode;
  session: UserSession;
  onPostAction: (actionType: string, url: string, payload: any) => Promise<void>;
  onRefreshState: () => void;
}

export default function ReportsTab({ state, lang, session, onPostAction, onRefreshState }: ReportsTabProps) {
  const t = translations[lang];
  const isAdmin = session.role === 'admin';

  // State parameters for filtration
  const [filterStartDate, setFilterStartDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // default 7 days ago
  );
  const [filterEndDate, setFilterEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterShiftId, setFilterShiftId] = useState<'all' | string>('all');
  const [filterEmployeeId, setFilterEmployeeId] = useState<'all' | string>('all');
  const [filterFuelType, setFilterFuelType] = useState<'all' | 'petrol' | 'diesel'>('all');
  const [filterNozzleId, setFilterNozzleId] = useState<'all' | string>('all');

  const [activeSubTab, setActiveSubTab] = useState<'standard' | 'reconciliation'>('reconciliation');
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  const toggleDateExpanded = (dateStr: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [dateStr]: prev[dateStr] === false ? true : false
    }));
  };

  // Backup state
  const [backupString, setBackupString] = useState('');
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState('');

  // Process and filter historical logs
  const filteredRecords = state.records.filter(rec => {
    const recordDate = rec.date;
    if (recordDate < filterStartDate || recordDate > filterEndDate) return false;
    if (filterShiftId !== 'all' && rec.shiftId !== filterShiftId) return false;
    if (filterEmployeeId !== 'all' && rec.attendance[filterEmployeeId] !== 'present') return false;

    // Check if any matching nozzle entries exist
    if (filterFuelType !== 'all' || filterNozzleId !== 'all') {
      const matchNozzles = Object.keys(rec.nozzleEntries).some(nozId => {
        if (filterNozzleId !== 'all' && nozId !== filterNozzleId) return false;
        const nozInfo = state.nozzles.find(n => n.id === nozId);
        if (filterFuelType !== 'all' && nozInfo?.fuelType !== filterFuelType) return false;
        return true;
      });
      return matchNozzles;
    }

    return true;
  });

  // Calculate 24-Hour Consolidated Reconciliation Data
  const getDatesInRange = () => {
    const datesSet = new Set<string>();
    state.records.forEach(r => {
      if (r.date >= filterStartDate && r.date <= filterEndDate) {
        datesSet.add(r.date);
      }
    });
    return Array.from(datesSet).sort((a, b) => b.localeCompare(a));
  };

  const uniqueReconciliationDates = getDatesInRange();

  const getReconciliationForDate = (dateStr: string) => {
    const dayRecords = state.records
      .filter(r => r.date === dateStr)
      .sort((a, b) => {
        const aShift = state.shifts.find(s => s.id === a.shiftId);
        const bShift = state.shifts.find(s => s.id === b.shiftId);
        const aTime = aShift?.startTime || '00:00';
        const bTime = bShift?.startTime || '00:00';
        return aTime.localeCompare(bTime);
      });

    if (dayRecords.length === 0) return null;

    const nozzles = state.nozzles.filter(n => {
      if (filterNozzleId !== 'all' && n.id !== filterNozzleId) return false;
      if (filterFuelType !== 'all' && n.fuelType !== filterFuelType) return false;
      return n.active;
    });

    const nozzleDetails = nozzles.map(noz => {
      const entriesOfNozzle = dayRecords
        .map(r => ({ record: r, entry: r.nozzleEntries[noz.id] }))
        .filter(x => x.entry !== undefined);

      if (entriesOfNozzle.length === 0) return null;

      const firstEntry = entriesOfNozzle[0].entry;
      const lastEntry = entriesOfNozzle[entriesOfNozzle.length - 1].entry;

      // Opening reading is taken from the chronologically first shift entry of the day
      const openingReading = firstEntry.openingReading;
      // Closing reading is taken from the chronologically final shift entry of the day
      const closingReading = lastEntry.closingReading;
      const testingLiters = entriesOfNozzle.reduce((sum, x) => sum + (x.entry.testingLiters || 0), 0);
      const soldLiters = Math.max(0, closingReading - openingReading - testingLiters);

      const cash = entriesOfNozzle.reduce((sum, x) => sum + (x.entry.cash || 0), 0);
      const upi = entriesOfNozzle.reduce((sum, x) => sum + (x.entry.upi || 0), 0);
      const card = entriesOfNozzle.reduce((sum, x) => sum + (x.entry.card || 0), 0);
      const creditSales = entriesOfNozzle.reduce((sum, x) => sum + (x.entry.creditSales || 0), 0);

      const clientNames = entriesOfNozzle
        .map(x => x.entry.creditClient)
        .filter(Boolean)
        .flatMap(nameStr => nameStr.split(', '))
        .filter((v, i, self) => self.indexOf(v) === i)
        .join(', ');

      const totalCollected = cash + upi + card + creditSales;

      const tank = state.tanks.find(t => t.id === noz.tankId);
      const rate = tank ? tank.customRate : 100;
      const expectedAmount = soldLiters * rate;
      const variance = totalCollected - expectedAmount;

      return {
        nozzle: noz,
        openingReading,
        closingReading,
        testingLiters,
        soldLiters,
        cash,
        upi,
        card,
        creditSales,
        clientNames,
        totalCollected,
        expectedAmount,
        variance,
        rate
      };
    }).filter((x): x is NonNullable<typeof x> => x !== null);

    if (nozzleDetails.length === 0) return null;

    const totalSoldLiters = nozzleDetails.reduce((sum, d) => sum + d.soldLiters, 0);
    const totalExpectedAmount = nozzleDetails.reduce((sum, d) => sum + d.expectedAmount, 0);
    const totalCash = nozzleDetails.reduce((sum, d) => sum + d.cash, 0);
    const totalUpi = nozzleDetails.reduce((sum, d) => sum + d.upi, 0);
    const totalCard = nozzleDetails.reduce((sum, d) => sum + d.card, 0);
    const totalCredit = nozzleDetails.reduce((sum, d) => sum + d.creditSales, 0);
    const totalCollected = totalCash + totalUpi + totalCard + totalCredit;
    const totalVariance = totalCollected - totalExpectedAmount;

    return {
      date: dateStr,
      recordsCount: dayRecords.length,
      shiftsList: dayRecords.map(r => {
        const sh = state.shifts.find(s => s.id === r.shiftId);
        return sh ? sh.name : r.shiftId;
      }).filter((v, i, self) => self.indexOf(v) === i).join(', '),
      nozzleDetails,
      totalSoldLiters,
      totalExpectedAmount,
      totalCash,
      totalUpi,
      totalCard,
      totalCredit,
      totalCollected,
      totalVariance
    };
  };

  const dailyReconciliations = uniqueReconciliationDates
    .map(d => getReconciliationForDate(d))
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const cumulativeLiters = dailyReconciliations.reduce((sum, r) => sum + r.totalSoldLiters, 0);
  const cumulativeExpected = dailyReconciliations.reduce((sum, r) => sum + r.totalExpectedAmount, 0);
  const cumulativeCash = dailyReconciliations.reduce((sum, r) => sum + r.totalCash, 0);
  const cumulativeUpi = dailyReconciliations.reduce((sum, r) => sum + r.totalUpi, 0);
  const cumulativeCard = dailyReconciliations.reduce((sum, r) => sum + r.totalCard, 0);
  const cumulativeCredit = dailyReconciliations.reduce((sum, r) => sum + r.totalCredit, 0);
  const cumulativeCollected = cumulativeCash + cumulativeUpi + cumulativeCard + cumulativeCredit;
  const cumulativeVariance = cumulativeCollected - cumulativeExpected;

  const handleDownloadConsolidatedPDF = () => {
    downloadConsolidatedPDF({
      startDate: filterStartDate,
      endDate: filterEndDate,
      lang: lang as 'en' | 'gu',
      cumulativeLiters,
      cumulativeExpected,
      cumulativeCollected,
      cumulativeVariance,
      dailyReconciliations
    });
  };

  const handleDownloadConsolidatedCSV = () => {
    // CSV Header row
    const headers = [
      'Date',
      'Consolidated Shifts',
      'Nozzle / Fuel Type',
      'Opening Reading',
      'Closing Reading',
      'Testing Liters',
      'Net Sold Liters',
      'Rate',
      'Expected Revenue (Rs.)',
      'Cash Collected (Rs.)',
      'UPI Collected (Rs.)',
      'Card Collected (Rs.)',
      'Credit (Rs.)',
      'Total Collected (Rs.)',
      'Variance (Rs.)'
    ];

    const rows: string[][] = [headers];

    dailyReconciliations.forEach(dayRecon => {
      // First, append individual nozzle details
      dayRecon.nozzleDetails.forEach(noz => {
        const nozNum = noz.nozzle.nozzleNumber;
        const cleanNozName = nozNum.toLowerCase().startsWith('nozzle') ? nozNum : `Nozzle ${nozNum}`;
        rows.push([
          dayRecon.date,
          dayRecon.shiftsList,
          `${cleanNozName} (${noz.nozzle.fuelType.toUpperCase()})`,
          noz.openingReading.toFixed(2),
          noz.closingReading.toFixed(2),
          noz.testingLiters.toFixed(1),
          noz.soldLiters.toFixed(1),
          noz.rate.toFixed(2),
          noz.expectedAmount.toFixed(0),
          noz.cash.toFixed(0),
          noz.upi.toFixed(0),
          noz.card.toFixed(0),
          noz.creditSales.toFixed(0),
          noz.totalCollected.toFixed(0),
          noz.variance.toFixed(0)
        ]);
      });

      // Then, append a daily total summary row
      rows.push([
        `${dayRecon.date} (TOTAL)`,
        dayRecon.shiftsList,
        'ALL NOZZLES CONSOLIDATED',
        '-',
        '-',
        '-',
        dayRecon.totalSoldLiters.toFixed(1),
        '-',
        dayRecon.totalExpectedAmount.toFixed(0),
        dayRecon.totalCash.toFixed(0),
        dayRecon.totalUpi.toFixed(0),
        dayRecon.totalCard.toFixed(0),
        dayRecon.totalCredit.toFixed(0),
        dayRecon.totalCollected.toFixed(0),
        dayRecon.totalVariance.toFixed(0)
      ]);

      // Empty separator row
      rows.push(Array(15).fill(''));
    });

    const csvContent = rows.map(e => e.map(val => `"${(val || '').replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reconciliation_Data_${filterStartDate}_to_${filterEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Calculate Aggregations
  let aggregateLitres = 0;
  let aggregateSalesPrice = 0;
  let aggregateCashCollected = 0;
  let aggregateUPI = 0;
  let aggregateCard = 0;
  let aggregateCredit = 0;

  filteredRecords.forEach(rec => {
    Object.keys(rec.nozzleEntries).forEach(nozId => {
      // Apply sub-filters inside entries
      if (filterNozzleId !== 'all' && nozId !== filterNozzleId) return;
      const nozzle = state.nozzles.find(n => n.id === nozId);
      if (filterFuelType !== 'all' && nozzle?.fuelType !== filterFuelType) return;

      const entry = rec.nozzleEntries[nozId];
      if (filterEmployeeId !== 'all' && entry.operatorId !== filterEmployeeId) return;

      const tank = state.tanks.find(t => t.id === nozzle?.tankId);
      const rate = tank ? tank.customRate : 100;
      const soldLitres = Math.max(0, entry.closingReading - entry.openingReading - (entry.testingLiters || 0));

      aggregateLitres += soldLitres;
      aggregateSalesPrice += soldLitres * rate;
      aggregateCashCollected += entry.cash || 0;
      aggregateUPI += entry.upi || 0;
      aggregateCard += entry.card || 0;
      aggregateCredit += entry.creditSales || 0;
    });
  });

  const aggregateCollection = aggregateCashCollected + aggregateUPI + aggregateCard + aggregateCredit;

  // Formulate Profit and Loss
  // Markup parameters: e.g. normal pump operator margin: Petrol custom mark-up/profit ₹3.20/L, Diesel ₹2.50/L
  const petrolMarginPerLitre = 3.65;
  const dieselMarginPerLitre = 2.80;

  let totalPetrolLitres = 0;
  let totalDieselLitres = 0;

  filteredRecords.forEach(rec => {
    Object.keys(rec.nozzleEntries).forEach(nozId => {
      if (filterNozzleId !== 'all' && nozId !== filterNozzleId) return;
      const nozzle = state.nozzles.find(n => n.id === nozId);
      if (!nozzle) return;
      if (filterFuelType !== 'all' && nozzle.fuelType !== filterFuelType) return;
      
      const entry = rec.nozzleEntries[nozId];
      if (filterEmployeeId !== 'all' && entry.operatorId !== filterEmployeeId) return;

      const soldLitres = Math.max(0, entry.closingReading - entry.openingReading - (entry.testingLiters || 0));
      if (nozzle.fuelType === 'petrol') {
        totalPetrolLitres += soldLitres;
      } else {
        totalDieselLitres += soldLitres;
      }
    });
  });

  const estimatedPetrolProfit = totalPetrolLitres * petrolMarginPerLitre;
  const estimatedDieselProfit = totalDieselLitres * dieselMarginPerLitre;
  const totalFuelProfit = estimatedPetrolProfit + estimatedDieselProfit;

  // Export CSV functions
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Shift,Nozzle,Fuel Type,Opening Reading,Closing Reading,Sold Litres,Cash,UPI,Card,Credit Sold,Operator\n";

    filteredRecords.forEach(rec => {
      const shiftName = state.shifts.find(s => s.id === rec.shiftId)?.name || rec.shiftId;
      Object.keys(rec.nozzleEntries).forEach(nozId => {
        if (filterNozzleId !== 'all' && nozId !== filterNozzleId) return;
        const nozInfo = state.nozzles.find(n => n.id === nozId);
        if (filterFuelType !== 'all' && nozInfo?.fuelType !== filterFuelType) return;

        const entry = rec.nozzleEntries[nozId];
        if (filterEmployeeId !== 'all' && entry.operatorId !== filterEmployeeId) return;

        const sold = Math.max(0, entry.closingReading - entry.openingReading - (entry.testingLiters || 0));
        const opName = state.employees.find(e => e.id === entry.operatorId)?.name || entry.operatorId;

        const row = [
          rec.date,
          `"${shiftName}"`,
          `"${nozInfo?.nozzleNumber || nozId}"`,
          nozInfo?.fuelType || 'N/A',
          entry.openingReading,
          entry.closingReading,
          sold.toFixed(2),
          entry.cash,
          entry.upi,
          entry.card,
          entry.creditSales,
          `"${opName}"`
        ].join(",");
        csvContent += row + "\n";
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Petrol_Pump_Report_${filterStartDate}_to_${filterEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // WhatsApp formatted string exporter
  const generateWhatsAppMessage = () => {
    const reportText = `*⛽ PETROL PUMP BOSS DAILY CLOSING REPORT* \n` +
      `-----------------------------------------\n` +
      `📅 *Date Period:* ${filterStartDate} to ${filterEndDate}\n` +
      `📍 *Total Fuel Dispensed:* ${aggregateLitres.toLocaleString(undefined, { maximumFractionDigits: 1 })} L\n` +
      `💰 *Estimated Bill value:* ₹${aggregateSalesPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}\n` +
      `-----------------------------------------\n` +
      `💵 *Cash Proceeds:* ₹${aggregateCashCollected.toLocaleString()}\n` +
      `📱 *UPI GPay/PhonePe:* ₹${aggregateUPI.toLocaleString()}\n` +
      `💳 *POS Cards:* ₹${aggregateCard.toLocaleString()}\n` +
      `📓 *Credit Ledger Diary:* ₹${aggregateCredit.toLocaleString()}\n` +
      `-----------------------------------------\n` +
      `🔥 *Net Estimated Profit Room:* ₹${totalFuelProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}\n` +
      `*Generated via Pump ERP*`;
    
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(reportText)}`;
    window.open(url, '_blank');
  };

  // Trigger Print Layout
  const triggerPrintLayout = () => {
    window.print();
  };

  // Export State Database Backup
  const handleBackupExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `database_pump_backup_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
  };

  // Import State Database Restore File
  const handleRestoreImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreError('');
    setRestoreSuccess('');
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.shifts || !parsed.tanks || !parsed.nozzles || !parsed.employees) {
          setRestoreError('Invalid backup file blueprint schema.');
          return;
        }

        const payload = {
          state: parsed,
          userName: session.name,
          userId: session.employeeId
        };

        const response = await fetch('/api/state/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errData = await response.json();
          setRestoreError(errData.error || 'Server restoration fail.');
          return;
        }

        setRestoreSuccess('State backup restored successfully. Page reloading in 2 seconds...');
        setTimeout(() => {
          onRefreshState();
          setShowBackupModal(false);
        }, 2000);

      } catch (err) {
        setRestoreError('Malformed JSON. File read aborted.');
      }
    };
    fileReader.readAsText(files[0]);
  };

  return (
    <div className="space-y-6" id="reports_tab">
      
      {/* Header operations */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileText className="text-teal-400 w-5 h-5" />
            {t.reports}
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            {lang === 'en' ? 'Review fuel tallies, profit sheets, download excel summaries, print logs' : 'પેટ્રોલ પંપના તમામ વ્યવહારો, ઓપરેટર અહેવાલો, નફો-નુકશાન પત્રક અને ડેટાબેઝ સંભાળ.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowBackupModal(true)}
              className="px-3.5 py-2 hover:bg-teal-500/10 text-teal-300 font-semibold text-xs border border-teal-500/20 rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
              id="backup_panel_trigger"
            >
              <Database className="w-4 h-4" />
              {t.backupRestoreBtn}
            </button>
          )}

          <button
            onClick={generateWhatsAppMessage}
            className="px-3.5 py-2 bg-green-500 hover:bg-green-400 text-slate-900 font-bold text-xs rounded-xl transition-all transform active:scale-95 shadow cursor-pointer flex items-center gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            {t.whatsAppShare}
          </button>
        </div>
      </div>

      {/* 24-Hour Consolidated Subtab Selector */}
      <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-slate-700/40 max-w-lg">
        <button
          onClick={() => setActiveSubTab('reconciliation')}
          className={`flex-1 py-2.5 rounded-xl text-center text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === 'reconciliation'
              ? 'bg-teal-500 text-slate-950 font-extrabold shadow'
              : 'text-slate-400 hover:text-slate-205'
          }`}
        >
          ✨ {lang === 'en' ? '24-Hour Reconciliation' : '૨૪ કલાક મેળ પત્રક'}
        </button>
        <button
          onClick={() => setActiveSubTab('standard')}
          className={`flex-1 py-2.5 rounded-xl text-center text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === 'standard'
              ? 'bg-teal-500 text-slate-950 font-extrabold shadow'
              : 'text-slate-400 hover:text-slate-205'
          }`}
        >
          {lang === 'en' ? 'Standard Logs Report' : 'સામાન્ય રિપોર્ટ અને લોગ્સ'}
        </button>
      </div>

      {activeSubTab === 'reconciliation' ? (
        <div className="space-y-6" id="reconciliation_view">
          
          {/* Quick Date Range selection filter for 24-Hour view */}
          <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl p-5 space-y-4 shadow-sm" id="reconciliation_filters">
            <h3 className="font-semibold text-slate-300 text-xs uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-400" />
              {lang === 'en' ? 'Select Reconciliation Period' : '૨૪ કલાક મેળ ગાળો પસંદ કરો'}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Start Date</label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider mb-1">End Date</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Fuel Category</label>
                <select
                  value={filterFuelType}
                  onChange={(e) => setFilterFuelType(e.target.value as any)}
                  className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs cursor-pointer focus:outline-none"
                >
                  <option value="all">All Petrol & Diesel</option>
                  <option value="petrol">{t.petrol}</option>
                  <option value="diesel">{t.diesel}</option>
                </select>
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Nozzle Output</label>
                <select
                  value={filterNozzleId}
                  onChange={(e) => setFilterNozzleId(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs cursor-pointer focus:outline-none"
                >
                  <option value="all">All Nozzles</option>
                  {state.nozzles.map(n => (
                    <option key={n.id} value={n.id}>{n.nozzleNumber} ({n.fuelType})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Consolidated Overview Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl p-5 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">Total Volume Sold</span>
              <span className="text-2xl font-bold font-mono text-teal-400">{cumulativeLiters.toFixed(1)} L</span>
              <span className="text-[10px] text-slate-500 block">Morning Opening vs Night Closing</span>
            </div>
            
            <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl p-5 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">Expected Revenue</span>
              <span className="text-2xl font-bold font-mono text-slate-200">₹{cumulativeExpected.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              <span className="text-[10px] text-slate-500 block">Liters Sold × Fuel Rate</span>
            </div>

            <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl p-5 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">Actual Consolidated Payments</span>
              <span className="text-2xl font-bold font-mono text-emerald-400">₹{cumulativeCollected.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              <span className="text-[10px] text-slate-500 block">Cash + UPI + Card + Credit</span>
            </div>

            <div className={`bg-slate-800/90 border rounded-2xl p-5 space-y-1 ${
              Math.abs(cumulativeVariance) < 2
                ? 'border-emerald-500/20 text-emerald-400'
                : cumulativeVariance > 0
                ? 'border-blue-500/20 text-blue-400'
                : 'border-rose-500/20 text-rose-400'
            }`}>
              <span className="text-[10px] uppercase font-semibold tracking-wider block">Overall Variance (તફાવત)</span>
              <span className="text-2xl font-bold font-mono">
                {cumulativeVariance >= 0 ? '+' : ''}₹{cumulativeVariance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {Math.abs(cumulativeVariance) < 2 
                  ? (lang === 'en' ? 'Perfect Match' : 'મેળ કમ્પ્લીટ છે') 
                  : cumulativeVariance > 0 
                  ? (lang === 'en' ? 'Surplus (વધારો)' : 'વધારો છે') 
                  : (lang === 'en' ? 'Shortage (ઘાટો)' : 'ઘાટો છે')}
              </span>
            </div>
          </div>

          {/* Daily 24-Hour Consolidated Detail Accordions */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900/10 p-1 rounded-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <TrendingUp className="text-teal-400 w-4 h-4" />
                {lang === 'en' ? 'Daily 24-Hour Consolidated Reconciliation Sheets' : 'દૈનિક ૨૪ કલાક મેળ પત્રકો ની વિગતો'}
              </h3>
              {dailyReconciliations.length > 0 && isAdmin && (
                <div className="flex flex-wrap gap-2 self-start sm:self-auto">
                  <button
                    onClick={handleDownloadConsolidatedCSV}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-teal-300 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer uppercase tracking-wider"
                    title={lang === 'en' ? 'Export CSV for manual bookkeeping' : 'ખાતાવહી માટે સીએસવી નિકાસ'}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
                    {lang === 'en' ? 'Export CSV' : 'સીએસવી નિકાસ'}
                  </button>
                  <button
                    onClick={handleDownloadConsolidatedPDF}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer uppercase tracking-wider"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {lang === 'en' ? 'Download Period PDF' : 'સમયગાળો પીડીએફ ડાઉનલોડ કરો'}
                  </button>
                </div>
              )}
            </div>

            {dailyReconciliations.length === 0 ? (
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl py-12 text-center text-slate-400 text-xs font-medium font-sans">
                {lang === 'en' ? 'No shift records found for the selected period.' : 'પસંદ કરેલા સમયગાળા માટે કોઈ શિફ્ટ એન્ટ્રી મળી નથી.'}
              </div>
            ) : (
              dailyReconciliations.map((dayRecon) => {
                const isExpanded = expandedDates[dayRecon.date] !== false; // default expanded

                return (
                  <div key={dayRecon.date} className="bg-slate-800/90 border border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
                    {/* Accordion Date Header */}
                    <div 
                      onClick={() => toggleDateExpanded(dayRecon.date)}
                      className="p-4 bg-slate-900/40 border-b border-slate-700/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 cursor-pointer select-none hover:bg-slate-900/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="text-teal-400 w-5 h-5 flex-shrink-0" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-100 font-bold text-sm">
                              {new Date(dayRecon.date).toLocaleDateString(lang === 'en' ? 'en-US' : 'gu-IN', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                            <span className="bg-slate-850 text-slate-400 border border-slate-700/50 px-2 py-0.5 rounded text-[9px] font-semibold font-sans">
                              {dayRecon.recordsCount} {lang === 'en' ? 'shifts consolidated' : 'શિફ્ટ મેળવેલ'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {lang === 'en' ? 'Shifts counted:' : 'મેળવેલ શિફ્ટ:'} <span className="text-slate-200 font-medium">{dayRecon.shiftsList}</span>
                          </p>
                        </div>
                      </div>

                      {/* Summary Metrics Pill on Header */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                        <span className="bg-slate-900 px-2.5 py-1 rounded text-teal-400 font-bold">
                          {dayRecon.totalSoldLiters.toFixed(1)} L
                        </span>
                        <span className="bg-slate-900 px-2.5 py-1 rounded text-slate-300">
                          Exp: ₹{dayRecon.totalExpectedAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                        <span className="bg-slate-900 px-2.5 py-1 rounded text-emerald-400 font-bold">
                          Col: ₹{dayRecon.totalCollected.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                        <span className={`px-2.5 py-1 rounded font-extrabold ${
                          Math.abs(dayRecon.totalVariance) < 2
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : dayRecon.totalVariance > 0
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          Diff: {dayRecon.totalVariance >= 0 ? '+' : ''}₹{dayRecon.totalVariance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>

                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadDailyPDF(dayRecon.date, dayRecon, lang as 'en' | 'gu');
                            }}
                            className="px-2 py-1 bg-slate-950/60 hover:bg-slate-950/95 text-teal-400 hover:text-teal-300 border border-teal-500/20 rounded text-[10px] font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                            title={lang === 'en' ? 'Download Daily PDF' : 'આ દિવસની પીડીએફ ડાઉનલોડ'}
                          >
                            <Download className="w-3 h-3" />
                            <span>PDF</span>
                          </button>
                        )}
                        
                        <span className="text-slate-400 font-bold text-xs pl-1">
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    {/* Accordion Table Details */}
                    {isExpanded && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-700/40 bg-slate-900/20 text-slate-400 font-semibold tracking-wider font-sans text-[10px] uppercase">
                              <th className="py-2.5 px-4">Nozzle / Fuel</th>
                              <th className="py-2.5 px-4 text-right">Morning Open (સવાર ઓપન)</th>
                              <th className="py-2.5 px-4 text-right">Night Close (રાત ક્લોઝ)</th>
                              <th className="py-2.5 px-4 text-right">Testing L</th>
                              <th className="py-2.5 px-4 text-right">Sold Volume (ચોખ્ખું વેચાણ)</th>
                              <th className="py-2.5 px-4 text-right">Rate</th>
                              <th className="py-2.5 px-4 text-right">Expected Revenue</th>
                              <th className="py-2.5 px-4 text-right">Collected (Cash / UPI / Card / Credit)</th>
                              <th className="py-2.5 px-4 text-right">Total Collected</th>
                              <th className="py-2.5 px-4 text-right">Nozzle Diff</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700/35 text-slate-300 font-mono text-[11px]">
                            {dayRecon.nozzleDetails.map((nozD) => {
                              return (
                                <tr key={nozD.nozzle.id} className="hover:bg-slate-700/10">
                                  <td className="py-3 px-4 font-sans text-slate-100 font-bold">
                                    {nozD.nozzle.nozzleNumber} 
                                    <span className="block text-[9px] font-semibold text-slate-500 uppercase">{nozD.nozzle.fuelType}</span>
                                  </td>
                                  <td className="py-3 px-4 text-right font-medium text-slate-400">
                                    {nozD.openingReading.toFixed(2)}
                                  </td>
                                  <td className="py-3 px-4 text-right font-medium text-slate-100">
                                    {nozD.closingReading.toFixed(2)}
                                  </td>
                                  <td className="py-3 px-4 text-right text-slate-400 text-[10px]">
                                    {nozD.testingLiters > 0 ? `${nozD.testingLiters.toFixed(1)} L` : '-'}
                                  </td>
                                  <td className="py-3 px-4 text-right font-bold text-teal-400">
                                    {nozD.soldLiters.toFixed(1)} L
                                  </td>
                                  <td className="py-3 px-4 text-right text-slate-500">
                                    ₹{nozD.rate.toFixed(2)}
                                  </td>
                                  <td className="py-3 px-4 text-right font-bold text-slate-300">
                                    ₹{nozD.expectedAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </td>
                                  <td className="py-3 px-4 text-right text-[10px] text-slate-400 font-sans max-w-xs">
                                    <div className="flex flex-col items-end">
                                      <span>Cash: ₹{nozD.cash.toLocaleString()} | UPI: ₹{nozD.upi.toLocaleString()}</span>
                                      <span>Card: ₹{nozD.card.toLocaleString()} | Credit: <span className="text-amber-550 font-bold">₹{nozD.creditSales.toLocaleString()}</span></span>
                                      {nozD.clientNames && (
                                        <span className="text-[9px] text-slate-500 italic block truncate max-w-[200px]" title={nozD.clientNames}>
                                          ({nozD.clientNames})
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-right font-bold text-emerald-400 text-xs">
                                    ₹{nozD.totalCollected.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </td>
                                  <td className={`py-3 px-4 text-right font-extrabold text-xs ${
                                    Math.abs(nozD.variance) < 2
                                      ? 'text-emerald-400'
                                      : nozD.variance > 0
                                      ? 'text-blue-400'
                                      : 'text-rose-400'
                                  }`}>
                                    {nozD.variance >= 0 ? '+' : ''}₹{nozD.variance.toFixed(1)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>
      ) : (
        <>
          {/* Reports Filtrations Segment */}
          <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl p-5 space-y-4 shadow-sm" id="reports_filters_box">
            <h3 className="font-semibold text-slate-300 text-xs uppercase tracking-wider flex items-center gap-2">
              <Search className="w-4 h-4 text-teal-400" />
              {t.filters}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
              {/* Start Date */}
              <div>
                <label className="block text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Start Date</label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono focus:outline-none"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider mb-1">End Date</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono focus:outline-none"
                />
              </div>

              {/* Shift selection filter */}
              <div>
                <label className="block text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Selected Shift</label>
                <select
                  value={filterShiftId}
                  onChange={(e) => setFilterShiftId(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs cursor-pointer focus:outline-none"
                >
                  <option value="all">All Shifts</option>
                  {state.shifts.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Employee/Operator filter */}
              <div>
                <label className="block text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Operator Attendant</label>
                <select
                  value={filterEmployeeId}
                  onChange={(e) => setFilterEmployeeId(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs cursor-pointer focus:outline-none"
                >
                  <option value="all">All Employees</option>
                  {state.employees.filter(e => e.active).map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                  ))}
                </select>
              </div>

              {/* Fuel type */}
              <div>
                <label className="block text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Fuel Category</label>
                <select
                  value={filterFuelType}
                  onChange={(e) => setFilterFuelType(e.target.value as any)}
                  className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs cursor-pointer focus:outline-none"
                >
                  <option value="all">All Petrol & Diesel</option>
                  <option value="petrol">{t.petrol}</option>
                  <option value="diesel">{t.diesel}</option>
                </select>
              </div>

              {/* Nozzle filter */}
              <div>
                <label className="block text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Nozzle Output</label>
                <select
                  value={filterNozzleId}
                  onChange={(e) => setFilterNozzleId(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs cursor-pointer focus:outline-none"
                >
                  <option value="all">All Nozzles</option>
                  {state.nozzles.map(n => (
                    <option key={n.id} value={n.id}>{n.nozzleNumber} ({n.fuelType})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Grid displays: Aggregations & Profit and Loss sheets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Aggregated Statistics Summary card */}
            <div className="bg-slate-800/90 rounded-2xl border border-slate-700/60 p-5 space-y-4">
              <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <TrendingUp className="text-teal-400 w-4 h-4" />
                Filtered Volumetric Fuel Sale
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-900/40 border border-slate-700/30 rounded-xl font-mono">
                  <span className="text-[10px] text-slate-500 block">Dispensed Volume</span>
                  <span className="text-slate-100 text-lg font-bold">{aggregateLitres.toFixed(1)} L</span>
                </div>
                <div className="p-3 bg-slate-900/40 border border-slate-700/30 rounded-xl font-mono">
                  <span className="text-[10px] text-slate-500 block">Calculated Revenue Value</span>
                  <span className="text-slate-105 text-lg font-bold">₹{aggregateSalesPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </div>

              {/* Sub collections breakdown */}
              <div className="space-y-1 text-xs text-slate-400 border-t border-slate-700/40 pt-2 font-mono">
                <div className="flex justify-between">
                  <span>Actual Cash Received (રોકડ જમા):</span>
                  <span className="text-slate-200 font-semibold">₹{aggregateCashCollected.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>UPI Payments Received:</span>
                  <span className="text-slate-200 font-semibold">₹{aggregateUPI.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>POS Debit/Credit Card swiped:</span>
                  <span className="text-slate-200 font-semibold">₹{aggregateCard.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800">
                  <span className="font-sans font-bold text-slate-300">Diary Book Ledger Debit (ઉધાર):</span>
                  <span className="text-amber-400 font-bold">₹{aggregateCredit.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Estimated Profit & Loss Statement card */}
            <div className="bg-slate-800/90 rounded-2xl border border-slate-700/60 p-5 space-y-4">
              <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <Coins className="text-emerald-400 w-4 h-4 animate-bounce" />
                {t.profitLossReport} (નફો અને નુકશાન વિશ્લેષણ)
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-900/40 border border-slate-700/30 rounded-xl font-mono">
                  <span className="text-[10px] text-slate-500 block">{t.totalRevenue} (веચાણ આંક)</span>
                  <span className="text-slate-205 text-lg font-bold">₹{aggregateSalesPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 rounded-xl font-mono">
                  <span className="text-[10px] text-slate-400 block">{t.estimatedProfit} (નફો)</span>
                  <span className="text-lg font-bold">₹{totalFuelProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-400 border-t border-slate-700/40 pt-2 font-mono">
                <div className="flex justify-between">
                  <span>Petrol Volume Dispensed:</span>
                  <span>{totalPetrolLitres.toFixed(1)} L (Margin: ₹{petrolMarginPerLitre.toFixed(2)})</span>
                </div>
                <div className="flex justify-between">
                  <span>Diesel Volume Dispensed:</span>
                  <span>{totalDieselLitres.toFixed(1)} L (Margin: ₹{dieselMarginPerLitre.toFixed(2)})</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800 font-sans text-slate-500 italic">
                  <span>*Profit calculation estimated on standard oil commission margin.</span>
                </div>
              </div>
            </div>
          </div>

          {/* 🪙 SHIFT WISE PAYMENT / PHYSICAL CASH TALLY REPORT PANEL */}
          <div className="bg-slate-800/90 rounded-2xl border border-slate-700/60 overflow-hidden shadow-sm" id="shift_wise_payment_panel">
            <div className="p-4 bg-slate-900/40 border-b border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Coins className="text-amber-400 w-5 h-5" />
                <div>
                  <span className="text-slate-100 font-bold text-xs uppercase tracking-wider block">
                    {lang === 'en' ? 'Shift Wise Payment & Physical Cash Tally Report' : 'શિફ્ટ વાઇઝ પેમેન્ટ અને ભૌતિક કેશ મેળ અહેવાલ'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-sans">
                    {lang === 'en' ? 'Cross-references actual employee note-counts with expected shift system collections' : 'ઓપરેટરો દ્વારા જમા કરાવેલી નોટોની ગણતરી અને સિસ્ટમના હિસાબની સરખામણી'}
                  </span>
                </div>
              </div>
            </div>

            {(() => {
              const rawTallies = state.cashTallies || [];
              
              // Apply top filtration parameters to tallies
              const filteredTallies = rawTallies.filter(t => {
                if (t.date < filterStartDate || t.date > filterEndDate) return false;
                if (filterShiftId !== 'all' && t.shiftId !== filterShiftId) return false;
                if (filterEmployeeId !== 'all' && t.employeeId !== filterEmployeeId) return false;
                return true;
              });

              if (filteredTallies.length === 0) {
                return (
                  <div className="text-center py-12 text-slate-400 text-xs font-medium font-sans">
                    {lang === 'en' ? 'No shift physical cash tallies found for the selected filter criteria.' : 'પસંદ કરેલા ફિલ્ટર માપદંડ માટે કોઈ કેશ મેળ અહેવાલ મળ્યા નથી.'}
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700/40 bg-slate-900/20 text-slate-400 font-semibold tracking-wider font-sans text-[10.5px]">
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Operator Name</th>
                        <th className="py-3 px-4">Shift</th>
                        <th className="py-3 px-4 text-right">Liters Sold</th>
                        <th className="py-3 px-4 text-right">Expected (System)</th>
                        <th className="py-3 px-4 text-right">Physical (Handed Over)</th>
                        <th className="py-3 px-4 text-right">Variance (વધઘટ)</th>
                        <th className="py-3 px-4">Denomination Breakdown</th>
                        {isAdmin && <th className="py-3 px-4 text-center">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/35 text-slate-300 font-mono text-[11px]">
                      {filteredTallies.map((t) => {
                        const dateObj = new Date(t.timestamp);
                        const formattedTime = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                        const formattedDate = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

                        return (
                          <tr key={t.id} className="hover:bg-slate-700/10 text-xs">
                            <td className="py-3.5 px-4 font-sans text-slate-400">
                              <span className="block font-bold text-slate-200">{formattedDate}</span>
                              <span className="text-[10px] text-slate-500">{formattedTime}</span>
                            </td>
                            <td className="py-3.5 px-4 font-sans text-slate-200 font-medium">
                              {t.employeeName}
                            </td>
                            <td className="py-3.5 px-4 font-sans">
                              <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-700/40">
                                {t.shiftName}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-teal-400">
                              {t.litersSold?.toFixed(2) || '0.00'} L
                            </td>
                            <td className="py-3.5 px-4 text-right text-slate-300">
                              <span className="block font-bold">₹{t.totalExpectedCash?.toLocaleString('en-IN') || '0'}</span>
                              <span className="text-[9px] text-slate-500 block font-sans">
                                Fuel: ₹{t.expectedFuelCash?.toLocaleString('en-IN') || '0'} | Oil: ₹{t.expectedOilCash?.toLocaleString('en-IN') || '0'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-slate-100">
                              ₹{t.totalNotesValue?.toLocaleString('en-IN') || '0'}
                            </td>
                            <td className={`py-3.5 px-4 text-right font-extrabold text-xs ${
                              Math.abs(t.difference) < 2
                                ? 'text-emerald-400'
                                : t.difference > 0
                                ? 'text-blue-400'
                                : 'text-rose-400'
                            }`}>
                              {t.difference >= 0 ? '+' : ''}₹{t.difference?.toFixed(2) || '0.00'}
                            </td>
                            <td className="py-3.5 px-4 max-w-xs">
                              <div className="flex flex-wrap gap-1 font-mono text-[9px] text-slate-400 bg-slate-950/40 p-1.5 rounded border border-slate-800/50">
                                {Object.entries(t.denominations).map(([k, v]) => {
                                  if (!v) return null;
                                  const noteValue = k.replace('n', '');
                                  return (
                                    <span key={k} className="bg-slate-900 px-1 py-0.5 rounded text-slate-300 border border-slate-800">
                                      ₹{noteValue}×{v}
                                    </span>
                                  );
                                })}
                                {Object.values(t.denominations).every(v => !v) && (
                                  <span className="text-slate-600 italic font-sans">No physical notes entered</span>
                                )}
                              </div>
                            </td>
                            {isAdmin && (
                              <td className="py-3.5 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await onPostAction('delete cash tally', '/api/cash-tallies', {
                                        action: 'delete',
                                        tally: { id: t.id },
                                        userId: session.employeeId,
                                        userName: session.name
                                      });
                                      onRefreshState();
                                    } catch (err: any) {
                                      // Fail silently
                                    }
                                  }}
                                  className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                                  title="Delete Tally"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>

          {/* Structured report data rows */}
          <div className="bg-slate-800/90 rounded-2xl border border-slate-700/60 overflow-hidden shadow-sm" id="printable_table_container">
            <div className="p-4 bg-slate-900/40 border-b border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <span className="text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                📊 Shift Data Logs
              </span>

              <div className="flex gap-2">
                <button
                  onClick={triggerPrintLayout}
                  className="px-3 py-1.5 bg-slate-750 hover:bg-slate-700 text-slate-250 border border-slate-650 text-[11px] rounded font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  {t.print}
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 bg-slate-750 hover:bg-slate-700 text-teal-400 border border-slate-650 text-[11px] rounded font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t.export}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-700/40 bg-slate-900/20 text-slate-400 font-semibold tracking-wider font-sans">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Shift Type</th>
                    <th className="py-3 px-4">Dispensers (Nozzle)</th>
                    <th className="py-3 px-4 text-right">Sold Volume (L)</th>
                    <th className="py-3 px-4 text-right">Cash Received</th>
                    <th className="py-3 px-4 text-right">UPI Received</th>
                    <th className="py-3 px-4 text-right">Credit Bills</th>
                    <th className="py-3 px-4">Attendant Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/35 text-slate-300 font-mono">
                  {filteredRecords.map((rec) => {
                    const shiftName = state.shifts.find(s => s.id === rec.shiftId)?.name || rec.shiftId;
                    
                    return Object.keys(rec.nozzleEntries).map((nozId, idx) => {
                      if (filterNozzleId !== 'all' && nozId !== filterNozzleId) return null;
                      const noz = state.nozzles.find(n => n.id === nozId);
                      if (filterFuelType !== 'all' && noz?.fuelType !== filterFuelType) return null;

                      const entry = rec.nozzleEntries[nozId];
                      if (filterEmployeeId !== 'all' && entry.operatorId !== filterEmployeeId) return null;

                      const sold = entry.closingReading - entry.openingReading - (entry.testingLiters || 0);
                      const operatorName = state.employees.find(e => e.id === entry.operatorId)?.name || entry.operatorId;

                      return (
                        <tr key={`${rec.id}-${nozId}`} className="hover:bg-slate-700/10 text-xs">
                          <td className="py-3.5 px-4 font-sans text-slate-400">{idx === 0 ? rec.date : ''}</td>
                          <td className="py-3.5 px-4 font-sans text-slate-300">{idx === 0 ? shiftName : ''}</td>
                          <td className="py-3.5 px-4 text-slate-200">
                            {noz?.nozzleNumber || nozId} ({noz?.fuelType})
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-teal-400">{Math.max(0, sold).toFixed(1)} L</td>
                          <td className="py-3.5 px-4 text-right">₹{entry.cash?.toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-right">₹{entry.upi?.toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-right text-amber-500">
                            ₹{entry.creditSales?.toLocaleString() || 0}
                          </td>
                          <td className="py-3.5 px-4 font-sans">{operatorName}</td>
                        </tr>
                      );
                    });
                  })}

                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400 font-sans text-sm">
                        {t.noData}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* DB Backup Modal dialog */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-black/75 flex justify-center items-center p-4 z-50">
          <div className="w-full max-w-lg bg-slate-800 rounded-2xl border border-slate-700 p-6 space-y-6">
            <div className="flex justify-between items-center pb-2 border-b border-slate-700">
              <h3 className="text-slate-100 font-bold text-base flex items-center gap-2">
                <Database className="w-5 h-5 text-teal-400" />
                {t.backupRestoreBtn}
              </h3>
              <button
                onClick={() => setShowBackupModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {restoreError && (
              <div className="bg-red-400/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs font-bold text-center">
                {restoreError}
              </div>
            )}
            {restoreSuccess && (
              <div className="bg-green-400/10 border border-green-500/20 text-green-400 p-3 rounded-lg text-xs font-bold text-center">
                {restoreSuccess}
              </div>
            )}

            {/* Export and download segment */}
            <div className="space-y-2">
              <span className="block text-slate-300 font-semibold text-xs uppercase tracking-wider">{t.backupTitle}</span>
              <p className="text-slate-500 text-xs">
                Downloads the full system schema (employees, nozzles, tanks, shift data records, logs) as a JSON database backup file.
              </p>
              <button
                onClick={handleBackupExport}
                className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Export database.json BackUp
              </button>
            </div>

            {/* Restore segment */}
            <div className="space-y-2 pt-2 border-t border-slate-700/60">
              <span className="block text-slate-300 font-semibold text-xs uppercase tracking-wider">{t.restoreTitle}</span>
              <p className="text-slate-500 text-xs">
                Upload a previously saved database backup file to restore pump metrics and settings.
              </p>
              
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-700 border-dashed rounded-lg cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-3 pb-3">
                    <Database className="w-6 h-6 text-slate-400 mb-1" />
                    <p className="text-xs text-slate-300 font-semibold">{t.selectBackupFile}</p>
                    <p className="text-[10px] text-slate-500">JSON documents only</p>
                  </div>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestoreImport}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
