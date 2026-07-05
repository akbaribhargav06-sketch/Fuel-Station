import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  Search, 
  ChevronRight, 
  Download, 
  Share2, 
  Printer, 
  CheckCircle, 
  AlertTriangle, 
  Fuel, 
  User, 
  FileText, 
  TrendingUp, 
  Plus 
} from 'lucide-react';
import { SystemState, UserSession, Customer, Nozzle } from '../types';

interface FillerUdhaarTabProps {
  state: SystemState;
  session: UserSession;
  lang: 'en' | 'gu';
  onPostAction: (desc: string, url: string, payload: any) => Promise<any>;
  onRefreshState: () => void;
}

export default function FillerUdhaarTab({
  state,
  session,
  lang,
  onPostAction,
  onRefreshState
}: FillerUdhaarTabProps) {
  // Primary Form states
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedNozzleId, setSelectedNozzleId] = useState('');
  const [liters, setLiters] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  
  // Search / Filtering
  const [searchQuery, setSearchQuery] = useState('');
  
  // Status states
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTx, setSuccessTx] = useState<any | null>(null);

  // Active open record check
  const activeRecord = state.records.find(r => r.status === 'open');

  // Filter and load active customers
  const activeCustomers = (state.customers || []).filter(c => c.active);
  const filteredCustomers = activeCustomers.filter(c => {
    const rawSearch = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(rawSearch) ||
      (c.vehicleNo || '').toLowerCase().includes(rawSearch) ||
      (c.mobile || '').includes(rawSearch)
    );
  });

  // Calculate current customer outstanding balance
  const getCustomerBalance = (custId: string) => {
    const txs = state.creditTransactions || [];
    return txs
      .filter(t => t.customerId === custId)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  };

  // Selected details
  const selectedCustomer = activeCustomers.find(c => c.id === selectedCustomerId);
  const selectedNozzle = state.nozzles.find(n => n.id === selectedNozzleId);
  
  // Fetch rate based on selected nozzle
  let customRate = 0;
  if (selectedNozzle) {
    const tank = state.tanks.find(t => t.id === selectedNozzle.tankId);
    if (tank) {
      customRate = tank.customRate;
    }
  }

  // Pre-select nozzle if operator has claimed some in active shift or has profile assigned nozzles
  useEffect(() => {
    if (session.employeeId && session.role === 'employee') {
      const loggedInEmp = state.employees.find(e => e.id === session.employeeId);
      const profileNozIds = loggedInEmp?.assignedNozzles || [];
      const myActiveNozIds = state.nozzles
        .filter(n => n.active && profileNozIds.includes(n.id))
        .map(n => n.id);

      if (myActiveNozIds.length > 0 && !selectedNozzleId) {
        setSelectedNozzleId(myActiveNozIds[0]);
      } else if (activeRecord) {
        const operatorNozzles = Object.keys(activeRecord.nozzleEntries).filter(nozId => {
          return activeRecord.nozzleEntries[nozId].operatorId === session.employeeId;
        });
        if (operatorNozzles.length > 0 && !selectedNozzleId) {
          setSelectedNozzleId(operatorNozzles[0]);
        }
      }
    } else if (state.nozzles.length > 0 && !selectedNozzleId) {
      setSelectedNozzleId(state.nozzles[0].id);
    }
  }, [activeRecord, session.employeeId, state.nozzles, state.employees, selectedNozzleId, session.role]);

  // Handle Liters Input -> Auto-calculate Amount
  const handleLitersChange = (val: string) => {
    setLiters(val);
    const parsedLiters = parseFloat(val);
    if (!isNaN(parsedLiters) && parsedLiters > 0 && customRate > 0) {
      const calcAmount = (parsedLiters * customRate).toFixed(2);
      setAmount(calcAmount);
    } else {
      setAmount('');
    }
  };

  // Handle Amount Input -> Auto-calculate Liters
  const handleAmountChange = (val: string) => {
    setAmount(val);
    const parsedAmount = parseFloat(val);
    if (!isNaN(parsedAmount) && parsedAmount > 0 && customRate > 0) {
      const calcLiters = (parsedAmount / customRate).toFixed(2);
      setLiters(calcLiters);
    } else {
      setLiters('');
    }
  };

  // Auto-recalculate when nozzle/rate changes
  useEffect(() => {
    if (liters && customRate > 0) {
      const parsedLiters = parseFloat(liters);
      if (!isNaN(parsedLiters) && parsedLiters > 0) {
        setAmount((parsedLiters * customRate).toFixed(2));
      }
    }
  }, [selectedNozzleId, customRate]);

  // Generate WhatsApp Message URL
  const getWhatsAppURL = (tx: any, customer: Customer) => {
    const totalBal = getCustomerBalance(customer.id) + tx.amount;
    const isEng = lang === 'en';
    const text = isEng
      ? `*CREDIT TRANSACTION RECEIPT*\n\n` +
        `*Pump:* ${state.tanks[0]?.name ? state.tanks[0].name.split(' ')[0] : 'Sri Balaji'} Petroleum\n` +
        `*Invoice:* ${tx.invoiceNo}\n` +
        `*Date:* ${tx.date}\n` +
        `*Client:* ${customer.name}\n` +
        `*Vehicle:* ${customer.vehicleNo || 'N/A'}\n` +
        `*Fuel:* ${tx.fuelType.toUpperCase()}\n` +
        `*Liters:* ${tx.liters} L\n` +
        `*Rate:* ₹${tx.rate}/L\n` +
        `*Amount:* ₹${tx.amount.toFixed(2)}\n\n` +
        `*Current Outstanding Balance:* ₹${totalBal.toFixed(2)}\n\n` +
        `Thank you for your business! Please pay outstanding credit on time.`
      : `*ઉધાર બિલ પાવતી*\n\n` +
        `*પંપ:* પેટ્રોલિયમ સર્વિસ સ્ટેશન\n` +
        `*બિલ નં:* ${tx.invoiceNo}\n` +
        `*તારીખ:* ${tx.date}\n` +
        `*ગ્રાહક:* ${customer.name}\n` +
        `*વાહન નં:* ${customer.vehicleNo || 'N/A'}\n` +
        `*બળતણ:* ${tx.fuelType === 'petrol' ? 'પેટ્રોલ' : 'ડીઝલ'}\n` +
        `*લીટર:* ${tx.liters} L\n` +
        `*ભાવ:* ₹${tx.rate}/L\n` +
        `*કુલ રકમ:* ₹${tx.amount.toFixed(2)}\n\n` +
        `*ચાલુ બાકી રકમ (કુલ ઉધાર):* ₹${totalBal.toFixed(2)}\n\n` +
        `આભાર! કૃપા કરીને સમયસર ચુકવણી કરો.`;

    return `https://wa.me/91${customer.mobile}?text=${encodeURIComponent(text)}`;
  };

  // Generate & Download Thermal Receipt HTML Blob
  const handleDownloadReceipt = (tx: any, customer: Customer) => {
    const totalBal = getCustomerBalance(customer.id) + tx.amount;
    const companyName = "Shree Petroleum & Fuel Station";
    const nozzleNum = selectedNozzle?.nozzleNumber || "N/A";
    
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt-${tx.invoiceNo}</title>
        <style>
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 80mm;
            margin: 0 auto;
            padding: 10px;
            color: #000;
            background-color: #fff;
            font-size: 13px;
            line-height: 1.4;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .header {
            margin-bottom: 15px;
          }
          .title {
            font-size: 16px;
            font-weight: bold;
            margin: 5px 0;
            text-transform: uppercase;
          }
          .separator {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          td {
            padding: 2px 0;
            vertical-align: top;
          }
          .footer {
            margin-top: 20px;
            font-size: 11px;
          }
          @media print {
            body { width: 100%; margin: 0; padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="text-center header">
          <div class="bold" style="font-size: 18px;">⭐⭐⭐⭐⭐</div>
          <div class="title">${companyName}</div>
          <div>National Highway Bypass, Gujarat</div>
          <div>Mobile: +91 98765 43210</div>
          <div class="bold">CREDIT SALE SLIP / ઉધાર કાપલી</div>
        </div>

        <div class="separator"></div>

        <table>
          <tr><td>Invoice No:</td><td class="text-right bold">${tx.invoiceNo}</td></tr>
          <tr><td>Date/Time:</td><td class="text-right">${tx.date} / ${new Date().toLocaleTimeString()}</td></tr>
          <tr><td>Operator:</td><td class="text-right">${session.name}</td></tr>
          <tr><td>Nozzle Assigned:</td><td class="text-right">${nozzleNum}</td></tr>
        </table>

        <div class="separator"></div>

        <table>
          <tr><td class="bold">CREDIT CLIENT / ગ્રાહક:</td></tr>
          <tr><td class="bold" style="font-size: 14px; padding-left: 5px;">${customer.name}</td></tr>
          <tr><td style="padding-left: 5px;">Vehicle: ${customer.vehicleNo || 'N/A'}</td></tr>
          <tr><td style="padding-left: 5px;">Mobile: +91 ${customer.mobile}</td></tr>
        </table>

        <div class="separator"></div>

        <table>
          <tr class="bold">
            <td>ITEM</td>
            <td class="text-right">QTY</td>
            <td class="text-right">RATE</td>
            <td class="text-right">AMOUNT</td>
          </tr>
          <tr class="separator"><td colspan="4"></td></tr>
          <tr>
            <td class="bold">${tx.fuelType.toUpperCase()}</td>
            <td class="text-right">${tx.liters} L</td>
            <td class="text-right">₹${tx.rate.toFixed(2)}</td>
            <td class="text-right bold">₹${tx.amount.toFixed(2)}</td>
          </tr>
        </table>

        <div class="separator"></div>

        <table style="font-size: 14px;">
          <tr class="bold">
            <td>SLIP TOTAL:</td>
            <td class="text-right">₹${tx.amount.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Previous Balance:</td>
            <td class="text-right">₹${(totalBal - tx.amount).toFixed(2)}</td>
          </tr>
          <tr class="bold" style="border-top: 1px solid #000;">
            <td>NET OUTSTANDING:</td>
            <td class="text-right">₹${totalBal.toFixed(2)}</td>
          </tr>
        </table>

        <div class="separator"></div>

        <div class="footer text-center">
          <p class="bold">Verified Credit Account Limit Approved</p>
          <p style="margin-top: 25px;">_______________________<br>Client Signature / ડ્રાઈવર સહી</p>
          <p style="margin-top: 25px;">_______________________<br>Authorized Sign / ઓપરેટર સહી</p>
          <div class="separator"></div>
          <p class="bold">Thank You! Please Pay Dues Timely.</p>
          <p>Powered by PumpFlow Pro ERP</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([receiptHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Receipt_${tx.invoiceNo}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedCustomerId) {
      setErrorMsg(lang === 'en' ? 'Please select a credit party/customer.' : 'કૃપા કરીને ઉધાર પાર્ટી/ગ્રાહક પસંદ કરો.');
      return;
    }

    if (!selectedNozzleId) {
      setErrorMsg(lang === 'en' ? 'Please select a fuel nozzle.' : 'કૃપા કરીને બળતણ નોઝલ પસંદ કરો.');
      return;
    }

    const litersNum = parseFloat(liters);
    if (isNaN(litersNum) || litersNum <= 0) {
      setErrorMsg(lang === 'en' ? 'Please enter a valid liter quantity.' : 'કૃપા કરીને સાચા લીટર દાખલ કરો.');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg(lang === 'en' ? 'Please enter a valid amount.' : 'કૃપા કરીને સાચી રકમ દાખલ કરો.');
      return;
    }

    if (!selectedCustomer) return;
    if (!selectedNozzle) return;

    // Check credit limit
    const currentOutstanding = getCustomerBalance(selectedCustomer.id);
    if (selectedCustomer.creditLimit && (currentOutstanding + amountNum > selectedCustomer.creditLimit)) {
      const confirmExceed = window.confirm(
        lang === 'en'
          ? `Warning: This customer outstanding will be ₹${(currentOutstanding + amountNum).toFixed(2)}, which exceeds their Credit Limit of ₹${selectedCustomer.creditLimit.toFixed(2)}. Do you still want to proceed?`
          : `ચેતવણી: આ ગ્રાહકનું કુલ ઉધાર ₹${(currentOutstanding + amountNum).toFixed(2)} થશે, જે તેમની નિયત ઉધાર મર્યાદા ₹${selectedCustomer.creditLimit.toFixed(2)} થી વધારે છે. શું તમે આગળ વધવા માંગો છો?`
      );
      if (!confirmExceed) return;
    }

    setIsSubmitting(true);

    const invoiceNo = `SLIP-${Date.now().toString().slice(-6)}`;
    const txPayload = {
      action: 'add',
      transaction: {
        customerId: selectedCustomerId,
        date: new Date().toISOString().split('T')[0],
        fuelType: selectedNozzle.fuelType,
        liters: litersNum,
        rate: customRate,
        amount: amountNum,
        invoiceNo: invoiceNo,
        operatorId: session.employeeId,
        notes: notes.trim() || `Credit entry logged at Pump by ${session.name}`,
        nozzleId: selectedNozzleId // Crucial! Triggers auto-adding in daily record nozzle draft
      },
      userId: session.employeeId,
      userName: session.name
    };

    try {
      // 1. Post Credit Transaction
      await onPostAction('add credit entry via quick panel', '/api/credit-transactions', txPayload);
      
      const newTxObject = {
        ...txPayload.transaction,
        id: `tx_temp_${Date.now()}`
      };

      // 2. Trigger receipt download instantly
      handleDownloadReceipt(newTxObject, selectedCustomer);

      // 3. Set success state to show success screen
      setSuccessTx(newTxObject);
      setSuccessMsg(
        lang === 'en' 
          ? 'Credit Entry saved and Thermal Receipt downloaded!' 
          : 'ઉધાર એન્ટ્રી સફળતાપૂર્વક નોંધી લેવામાં આવી છે અને પાવતી ડાઉનલોડ થઈ ગઈ છે!'
      );
      
      // Refresh global app state to sync dashboard, accounts ledger and records
      onRefreshState();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving credit entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form to add another transaction
  const handleReset = () => {
    setSelectedCustomerId('');
    setLiters('');
    setAmount('');
    setNotes('');
    setSuccessTx(null);
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Render Success Screen
  if (successTx && selectedCustomer) {
    const totalBal = getCustomerBalance(selectedCustomer.id);
    return (
      <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-6 md:p-10 max-w-lg mx-auto text-center space-y-6" id="success_receipt_card">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center border-4 border-emerald-500/20 text-emerald-500 animate-bounce">
            <CheckCircle className="w-12 h-12" />
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-black text-slate-900">
            {lang === 'en' ? 'Transaction Saved!' : 'એન્ટ્રી સેવ થઈ ગઈ છે!'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {lang === 'en' 
              ? `Invoice Number: ${successTx.invoiceNo}` 
              : `પાવતી નંબર: ${successTx.invoiceNo}`}
          </p>
        </div>

        {/* Mini Receipt Details Block */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-left space-y-3 font-mono text-sm text-slate-700">
          <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
            <span className="text-slate-400">{lang === 'en' ? 'Client:' : 'ગ્રાહક:'}</span>
            <span className="font-bold text-slate-800">{selectedCustomer.name}</span>
          </div>
          <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
            <span className="text-slate-400">{lang === 'en' ? 'Vehicle:' : 'વાહન:'}</span>
            <span className="font-bold text-slate-800">{selectedCustomer.vehicleNo || 'N/A'}</span>
          </div>
          <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
            <span className="text-slate-400">{lang === 'en' ? 'Fuel / Qty:' : 'બળતણ / લીટર:'}</span>
            <span className="font-bold text-slate-800">{successTx.liters} L {successTx.fuelType.toUpperCase()}</span>
          </div>
          <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
            <span className="text-slate-400">{lang === 'en' ? 'Rate:' : 'ભાવ:'}</span>
            <span className="font-bold text-slate-800">₹{successTx.rate.toFixed(2)}/L</span>
          </div>
          <div className="flex justify-between border-b border-dashed border-slate-200 pb-2 text-base">
            <span className="font-bold text-emerald-600">{lang === 'en' ? 'Total Amount:' : 'કુલ રકમ:'}</span>
            <span className="font-black text-emerald-600">₹{successTx.amount.toFixed(2)}</span>
          </div>
          {session.role !== 'employee' && (
            <div className="flex justify-between text-slate-500 text-xs">
              <span>{lang === 'en' ? 'Net Outstanding:' : 'કુલ બાકી ઉધાર:'}</span>
              <span className="font-bold text-rose-500">₹{totalBal.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Actions for Success */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Send Whatsapp */}
          <a
            href={getWhatsAppURL(successTx, selectedCustomer)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer text-sm"
          >
            <Share2 className="w-4 h-4" />
            <span>{lang === 'en' ? 'Share on WhatsApp' : 'વોટ્સએપ પર મોકલો'}</span>
          </a>

          {/* Re-download Receipt */}
          <button
            type="button"
            onClick={() => handleDownloadReceipt(successTx, selectedCustomer)}
            className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer text-sm"
          >
            <Download className="w-4 h-4" />
            <span>{lang === 'en' ? 'Download Slip Receipt' : 'પાવતી ડાઉનલોડ કરો'}</span>
          </button>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl transition-all cursor-pointer text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'en' ? 'New Credit Entry (નવી ઉધાર એન્ટ્રી)' : 'નવી ઉધાર એન્ટ્રી ઉમેરો'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto" id="filler_udhaar_tab_container">
      {/* Tab Title Block */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl p-5 shadow-lg shadow-emerald-500/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2.5">
            <Coins className="w-7 h-7 animate-pulse text-yellow-300" />
            <span>{lang === 'en' ? 'Quick Credit (Udhaar) Entry Panel' : 'ઓપરેટર ઉધાર એન્ટ્રી પૅનલ'}</span>
          </h2>
          <p className="text-xs text-emerald-100 mt-1 max-w-xl font-medium">
            {lang === 'en' 
              ? 'Filler boy module to instantly record client credit fuels, download thermal printing receipts, and auto-inject into manager totals.'
              : 'ઓપરેટર માટે સીધી ઉધાર એન્ટ્રી નોંધવા, પ્રિન્ટ સ્લિપ ડાઉનલોડ કરવા અને દૈનિક હિસાબમાં રકમ ઉમેરવાનું ઝડપી સાધન.'}
          </p>
        </div>
        
        {/* Shift Warning/Status */}
        {activeRecord ? (
          <span className="bg-emerald-400/20 text-emerald-100 border border-emerald-300/30 px-3.5 py-1.5 rounded-full text-xs font-bold font-mono tracking-wide">
            ● {lang === 'en' ? `Shift Active: ${activeRecord.shiftId.replace('shift_', 'Shift ')}` : `શિફ્ટ ચાલુ: ${activeRecord.shiftId.replace('shift_', 'શિફ્ટ ')}`}
          </span>
        ) : (
          <span className="bg-rose-500/20 text-rose-200 border border-rose-400/30 px-3.5 py-1.5 rounded-full text-xs font-bold animate-pulse">
            ⚠️ {lang === 'en' ? 'NO SHIFT OPEN' : 'શિફ્ટ ચાલુ નથી'}
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl text-red-800 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Form Left, Quick Info Right */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Side Form (3 cols) */}
        <form onSubmit={handleSubmit} className="lg:col-span-3 bg-white border border-slate-200/80 shadow-md rounded-2xl p-5 md:p-6 space-y-6">
          
          {/* STEP 1: Search & Select Customer */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-500" />
              <span>{lang === 'en' ? 'Select Credit Customer / Party (ગ્રાહક પસંદ કરો)' : 'ઉધાર લેનાર ગ્રાહક / પાર્ટી પસંદ કરો'}</span>
            </label>
            
            {/* Search inputs */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder={lang === 'en' ? 'Search by name, vehicle number...' : 'નામ અથવા વાહન નંબર વડે શોધો...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium"
              />
            </div>

            {/* Customer List Box */}
            <div className="border border-slate-100 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-50 bg-slate-50/50">
              {filteredCustomers.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs font-medium">
                  {lang === 'en' ? 'No matching parties found' : 'કોઈ પાર્ટી મળી નથી'}
                </div>
              ) : (
                filteredCustomers.map(cust => {
                  const balance = getCustomerBalance(cust.id);
                  const isSelected = selectedCustomerId === cust.id;
                  const isOverLimit = cust.creditLimit ? (balance >= cust.creditLimit) : false;
                  
                  return (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(cust.id);
                        setSearchQuery(''); // clear query on selection
                      }}
                      className={`w-full text-left p-3 flex justify-between items-center transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-emerald-50 border-l-4 border-emerald-500' 
                          : 'hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                          <span>{cust.name}</span>
                          {cust.vehicleNo && (
                            <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded font-mono">
                              {cust.vehicleNo}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                          {lang === 'en' ? `Mobile: ${cust.mobile}` : `મોબાઇલ: ${cust.mobile}`}
                        </div>
                      </div>
                      
                      {session.role !== 'employee' && (
                        <div className="text-right space-y-0.5">
                          <div className={`text-xs font-bold ${isOverLimit ? 'text-red-500' : 'text-slate-600'}`}>
                            ₹{balance.toLocaleString()}
                          </div>
                          {cust.creditLimit && (
                            <div className="text-[10px] text-slate-400">
                              Limit: ₹{cust.creditLimit.toLocaleString()}
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* STEP 2: Select Nozzle (Fuel Type & Rate lookup) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Fuel className="w-4 h-4 text-emerald-500" />
                <span>{lang === 'en' ? 'Select Nozzle (નોઝલ)' : 'નોઝલ પસંદ કરો'}</span>
              </label>
              <select
                value={selectedNozzleId}
                onChange={(e) => setSelectedNozzleId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-sm font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="">{lang === 'en' ? '-- Choose Nozzle --' : '-- નોઝલ પસંદ કરો --'}</option>
                {state.nozzles
                  .filter(n => n.active)
                  .filter(noz => {
                    if (session.role === 'employee') {
                      const loggedInEmp = state.employees.find(e => e.id === session.employeeId);
                      if (loggedInEmp?.assignedNozzles) {
                        return loggedInEmp.assignedNozzles.includes(noz.id);
                      }
                      return activeRecord?.nozzleEntries[noz.id]?.operatorId === session.employeeId;
                    }
                    return true;
                  })
                  .map(noz => {
                    const tank = state.tanks.find(t => t.id === noz.tankId);
                    const rateStr = tank ? `(₹${tank.customRate}/L)` : '';
                    const assignedLabel = activeRecord?.nozzleEntries[noz.id]?.operatorId === session.employeeId
                      ? `⭐ ${lang === 'en' ? 'Assigned' : 'ફાળવેલ'}`
                      : '';
                    return (
                      <option key={noz.id} value={noz.id}>
                        {noz.nozzleNumber} - {noz.fuelType.toUpperCase()} {rateStr} {assignedLabel}
                      </option>
                    );
                  })}
              </select>
            </div>

            {/* Display Locked Rate Banner */}
            <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3.5 flex flex-col justify-center">
              <span className="text-slate-400 text-xs font-semibold">
                {lang === 'en' ? 'Fuel Custom Rate:' : 'બળતણ વર્તમાન લિટર ભાવ:'}
              </span>
              <span className="text-2xl font-black text-emerald-600 font-mono">
                {customRate > 0 ? `₹${customRate.toFixed(2)}/L` : '₹0.00'}
              </span>
            </div>
          </div>

          {/* STEP 3: Dual input Liters or Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-800 font-mono">
                {lang === 'en' ? 'Liters (લીટર)' : 'લીટર જથ્થો (Liters)'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={liters}
                  onChange={(e) => handleLitersChange(e.target.value)}
                  disabled={!selectedNozzleId}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2.5 text-slate-800 text-base font-bold font-mono focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-bold font-mono">
                  L
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-800 font-mono">
                {lang === 'en' ? 'Total Amount (રકમ)' : 'કુલ રકમ (રૂપિયા)'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  disabled={!selectedNozzleId}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-6 pr-3 py-2.5 text-slate-800 text-base font-bold font-mono focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 font-bold font-mono">
                  ₹
                </span>
              </div>
            </div>
          </div>

          {/* Notes / Remarks */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-500" />
              <span>{lang === 'en' ? 'Notes / Slip Coupon Code (નોંધ)' : 'ઉધાર પાવતી સંબંધી અન્ય વિગત કે નોંધ'}</span>
            </label>
            <input
              type="text"
              placeholder={lang === 'en' ? 'Driver name, slip number, coupon remarks...' : 'ડ્રાઈવરનું નામ, કુપન કોડ વગેરે...'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-sm font-medium focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black py-3 px-6 rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer text-base disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>
                  {lang === 'en' 
                    ? 'Save Entry & Download Receipt (પાવતી)' 
                    : 'એન્ટ્રી સેવ કરો અને કાપલી ડાઉનલોડ કરો'}
                </span>
              </>
            )}
          </button>
        </form>

        {/* Right Side Info: Selected Customer Summary Box (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200/80 shadow-md rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              {lang === 'en' ? 'Selected Party Summary' : 'પસંદ કરેલ ગ્રાહક વિગતો'}
            </h3>

            {selectedCustomer ? (
              <div className="space-y-4">
                {/* Name */}
                <div className="space-y-1">
                  <span className="text-slate-400 text-xs font-semibold block">{lang === 'en' ? 'Customer Name:' : 'ગ્રાહકનું નામ:'}</span>
                  <span className="text-base font-black text-slate-800 block">{selectedCustomer.name}</span>
                </div>

                {/* Mobile / Vehicle */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-slate-400 text-xs font-semibold block">{lang === 'en' ? 'Mobile:' : 'મોબાઇલ નંબર:'}</span>
                    <span className="text-sm font-bold text-slate-700 block font-mono">+91 {selectedCustomer.mobile}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 text-xs font-semibold block">{lang === 'en' ? 'Vehicle No:' : 'ગાડી નંબર:'}</span>
                    <span className="text-sm font-bold text-slate-700 block font-mono">{selectedCustomer.vehicleNo || 'N/A'}</span>
                  </div>
                </div>

                {/* Outstanding & Limit Bar */}
                {session.role !== 'employee' && (
                  <div className="border-t border-slate-50 pt-3 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-semibold">{lang === 'en' ? 'Current Outstanding:' : 'હાલનું બાકી ઉધાર:'}</span>
                      <span className="font-black text-rose-500 font-mono">₹{getCustomerBalance(selectedCustomer.id).toLocaleString()}</span>
                    </div>

                    {selectedCustomer.creditLimit ? (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                          <span>{lang === 'en' ? 'Approved Limit:' : 'મંજૂર ક્રેડિટ મર્યાદા:'}</span>
                          <span>₹{selectedCustomer.creditLimit.toLocaleString()}</span>
                        </div>
                        {/* Visual Progress bar */}
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              (getCustomerBalance(selectedCustomer.id) / selectedCustomer.creditLimit) >= 1
                                ? 'bg-red-500'
                                : (getCustomerBalance(selectedCustomer.id) / selectedCustomer.creditLimit) >= 0.8
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ 
                              width: `${Math.min(100, (getCustomerBalance(selectedCustomer.id) / selectedCustomer.creditLimit) * 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium italic block">
                        * {lang === 'en' ? 'No limit set for this client' : 'આ ગ્રાહક માટે કોઈ ઉધાર મર્યાદા નથી'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400 text-sm font-medium">
                {lang === 'en' 
                  ? 'No customer selected. Choose a party from the list to see their credit summary.' 
                  : 'ગ્રાહક પસંદ કરેલ નથી. માહિતી જોવા ડાબી બાજુથી ગ્રાહક પસંદ કરો.'}
              </div>
            )}
          </div>

          {/* Quick instructions and features block */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>{lang === 'en' ? 'How it works' : 'કેવી રીતે કામ કરશે?'}</span>
            </h4>
            <ul className="text-xs text-slate-500 space-y-2 list-disc pl-4 font-medium leading-relaxed">
              <li>
                {lang === 'en'
                  ? 'Select the party/vehicle. It filters from active customers registered by Admin.'
                  : 'ગ્રાહક પસંદ કરો. એડમિને બનાવેલ તમામ એક્ટિવ ગ્રાહકો અહીં બતાવશે.'}
              </li>
              <li>
                {lang === 'en'
                  ? 'Pick the fuel nozzle. This fetches the custom rate per liter instantly.'
                  : 'પેટ્રોલ/ડીઝલ માટે નોઝલ સિલેક્ટ કરો જેથી તે મુજબ વર્તમાન લિટરનો સાચો ભાવ આપમેળે આવી જાય.'}
              </li>
              <li>
                {lang === 'en'
                  ? 'Enter Liters OR Amount. The other field auto-calculates in real-time.'
                  : 'લીટર અથવા રકમ લખો, બીજું ખાનું આપમેળે ગણતરી કરી લેશે.'}
              </li>
              <li>
                {lang === 'en'
                  ? 'Click save! A beautiful thermal print-receipt downloads instantly to your mobile.'
                  : 'એન્ટ્રી સેવ કરતાં જ પ્રિન્ટ કરી શકાય તેવી સ્લિપ ડાઉનલોડ થશે.'}
              </li>
              <li>
                {lang === 'en'
                  ? 'Total Credit amount automatically gets added to daily shift records.'
                  : 'કુલ ઉધાર રકમ આપમેળે દૈનિક હિસાબ અને નોઝલ એન્ટ્રીમાં ઉમેરાઈ જશે.'}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
