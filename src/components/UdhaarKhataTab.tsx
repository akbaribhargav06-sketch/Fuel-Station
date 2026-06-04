import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  UserPlus, 
  Receipt, 
  Send, 
  FileText, 
  Phone, 
  Car, 
  Coins, 
  AlertCircle, 
  CheckCircle2, 
  UserCheck, 
  TrendingDown, 
  X, 
  Calculator,
  Eye,
  CalendarDays,
  Check,
  MessageSquare
} from 'lucide-react';
import { SystemState, Customer, CreditTransaction, UserSession } from '../types';

interface UdhaarKhataTabProps {
  state: SystemState;
  lang: 'en' | 'gu';
  session: UserSession;
  onPostAction: (actionType: string, url: string, payload: any) => Promise<void>;
  onRefreshState: () => void;
}

export default function UdhaarKhataTab({ 
  state, 
  lang, 
  session, 
  onPostAction, 
  onRefreshState 
}: UdhaarKhataTabProps) {
  // Local state managers
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustId, setSelectedCustId] = useState<string>('all');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form states - Customer
  const [custForm, setCustForm] = useState({
    name: '',
    mobile: '',
    vehicleNo: '',
    creditLimit: '100000',
  });

  // Form states - Invoice Entry
  const [invoiceForm, setInvoiceForm] = useState({
    customerId: '',
    fuelType: 'diesel' as 'petrol' | 'diesel',
    liters: '50',
    rate: '',
    amount: '',
    invoiceNo: '',
    operatorId: '',
    notes: '',
  });

  const activeCustomers = (state.customers || []).filter(c => c.active);
  const activeEmployees = state.employees.filter(e => e.active);
  const transactions = state.creditTransactions || [];

  // Prepopulate rate based on selected fuelType
  const handleFuelTypeChange = (type: 'petrol' | 'diesel') => {
    const matchedTank = state.tanks.find(t => t.fuelType === type);
    const rate = matchedTank ? matchedTank.customRate : 100;
    
    const litersNum = parseFloat(invoiceForm.liters) || 0;
    const amountVal = (litersNum * rate).toFixed(2);

    setInvoiceForm(prev => ({
      ...prev,
      fuelType: type,
      rate: String(rate),
      amount: amountVal
    }));
  };

  const handleLitersChange = (litersStr: string) => {
    const litNum = parseFloat(litersStr) || 0;
    const rateNum = parseFloat(invoiceForm.rate) || 0;
    const amountVal = (litNum * rateNum).toFixed(2);
    setInvoiceForm(prev => ({
      ...prev,
      liters: litersStr,
      amount: amountVal
    }));
  };

  const handleAmountChange = (amountStr: string) => {
    const amtNum = parseFloat(amountStr) || 0;
    const rateNum = parseFloat(invoiceForm.rate) || 1;
    const litersVal = (amtNum / rateNum).toFixed(2);
    setInvoiceForm(prev => ({
      ...prev,
      amount: amountStr,
      liters: litersVal
    }));
  };

  // Open the Invoice Modal
  const openInvoiceModal = (custId?: string) => {
    const defaultCust = custId || (activeCustomers[0]?.id || '');
    const defaultFuel = 'diesel';
    const matchedTank = state.tanks.find(t => t.fuelType === defaultFuel);
    const rate = matchedTank ? matchedTank.customRate : 92.15;
    const liters = '50';
    const amount = (50 * rate).toFixed(2);
    const generatedInvoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const defaultOperator = activeEmployees.find(e => e.role === 'employee')?.id || activeEmployees[0]?.id || '';

    setInvoiceForm({
      customerId: defaultCust,
      fuelType: defaultFuel,
      liters,
      rate: String(rate),
      amount,
      invoiceNo: generatedInvoiceNumber,
      operatorId: defaultOperator,
      notes: '',
    });
    setErrorMessage('');
    setSuccessMessage('');
    setIsInvoiceModalOpen(true);
  };

  // Calculate Running credit details per customer
  const getCustomerBalance = (custId: string) => {
    return transactions
      .filter(t => t.customerId === custId)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  // Create Whatsapp Message & URL Helper
  const getWhatsAppURL = (tx: CreditTransaction, currentBalance: number, customer: Customer) => {
    const cleanPhone = customer.mobile.replace(/\D/g, '');
    const mobileNo = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    
    const engMsg = `Dear ${customer.name},\n🧾 Invoice Summary Added:\n- Invoice No: ${tx.invoiceNo}\n- Fuel Type: ${tx.fuelType.toUpperCase()}\n- Litres: ${tx.liters} L\n- Fuel Rate: ₹${tx.rate}/L\n- Invoice Amount: ₹${tx.amount.toLocaleString('en-IN')}\n\n💼 Outstanding Balance: ₹${currentBalance.toLocaleString('en-IN')}\n📍 Thank you for choosing Petrol Pump!`;
    
    const gujMsg = `પ્રિય ${customer.name},\n🧾 ઉધાર બિલ એન્ટ્રીની વિગત:\n- બિલ નંબર: ${tx.invoiceNo}\n- ઇંધણ: ${tx.fuelType === 'petrol' ? 'પેટ્રોલ' : 'ડીઝલ'}\n- લીટર: ${tx.liters} L\n- ભાવ: ₹${tx.rate}/L\n- કુલ રકમ: ₹${tx.amount.toLocaleString('en-IN')}\n\n💼 બાકી કુલ રકમ: ₹${currentBalance.toLocaleString('en-IN')}\n📍 પેટ્રોલ પંપ બુકિંગ બદલ આભાર!`;
    
    const message = lang === 'en' ? engMsg : gujMsg;
    return `https://api.whatsapp.com/send?phone=${mobileNo}&text=${encodeURIComponent(message)}`;
  };

  // Submit Operations
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custForm.name || !custForm.mobile) {
      setErrorMessage(lang === 'en' ? 'Name and mobile are required.' : 'નામ અને મોબાઈલ નંબર ફરજિયાત છે.');
      return;
    }
    try {
      await onPostAction('add customer', '/api/customers', {
        action: 'add',
        customer: custForm,
        userId: session.employeeId,
        userName: session.name
      });
      setSuccessMessage(lang === 'en' ? 'Customer account added successfully!' : 'ગ્રાહક ખાતું સફળતાપૂર્વક ઉમેરવામાં આવ્યું!');
      setCustForm({ name: '', mobile: '', vehicleNo: '', creditLimit: '100000' });
      setTimeout(() => {
        setIsCustomerModalOpen(false);
        setSuccessMessage('');
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred.');
    }
  };

  const handleAddInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.customerId || !invoiceForm.liters || !invoiceForm.amount || !invoiceForm.invoiceNo) {
      setErrorMessage(lang === 'en' ? 'Please complete all invoice inputs.' : 'કૃપા કરીને બધી વિગતો ભરો.');
      return;
    }

    const selectedCust = state.customers?.find(c => c.id === invoiceForm.customerId);
    const balance = getCustomerBalance(invoiceForm.customerId);
    const amountVal = parseFloat(invoiceForm.amount) || 0;
    
    if (selectedCust && selectedCust.creditLimit && (balance + amountVal) > selectedCust.creditLimit) {
      const confirmProceed = window.confirm(
        lang === 'en' 
          ? `Warning: This invoice (₹${amountVal}) exceeds the client credit limit of ₹${selectedCust.creditLimit.toLocaleString('en-IN')}. Do you still want to proceed?` 
          : `ચેતવણી: આ બિલ રકમથી ગ્રાહકની ઉધાર મર્યાદા (₹${selectedCust.creditLimit.toLocaleString('en-IN')}) ઓળંગાઈ જશે. શું તમે આગળ વધવા માંગો છો?`
      );
      if (!confirmProceed) return;
    }

    try {
      const payloadTx = {
        customerId: invoiceForm.customerId,
        fuelType: invoiceForm.fuelType,
        liters: parseFloat(invoiceForm.liters) || 0,
        rate: parseFloat(invoiceForm.rate) || 0,
        amount: amountVal,
        invoiceNo: invoiceForm.invoiceNo,
        operatorId: invoiceForm.operatorId,
        notes: invoiceForm.notes,
        date: new Date().toISOString().split('T')[0],
      };

      // Server creates trade record
      await onPostAction('create credit entry', '/api/credit-transactions', {
        action: 'add',
        transaction: payloadTx,
        userId: session.employeeId,
        userName: session.name
      });

      // Fetch newly computed state
      onRefreshState();

      // Automatically trigger WhatsApp URL
      if (selectedCust) {
        const newBalance = balance + amountVal;
        const tempTxObject = {
          ...payloadTx,
          id: `tx_temp_${Date.now()}`,
          whatsappSent: false
        };
        const waURL = getWhatsAppURL(tempTxObject as any, newBalance, selectedCust);
        
        // Open whatsapp link
        const link = document.createElement('a');
        link.href = waURL;
        link.target = '_blank';
        link.rel = 'noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Mark whatsapp sent in backend silently
        fetch('/api/credit-transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'mark-whatsapp',
            transaction: { id: `tx_temp_${Date.now()}` }, // this will sync when real statement renders
            userId: session.employeeId,
            userName: session.name
          })
        }).then(() => onRefreshState()).catch(e => console.error(e));
      }

      setSuccessMessage(lang === 'en' ? 'Invoice created and WhatsApp prompt redirected!' : 'ઉધાર એન્ટ્રી ઉમેરાઇ અને વૉટ્સએપ મોકલવા રીડાયરેક્ટ થયું!');
      setTimeout(() => {
        setIsInvoiceModalOpen(false);
        setSuccessMessage('');
      }, 1500);

    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while saving ledger details.');
    }
  };

  // Filter accounts
  const filteredCustomers = activeCustomers.filter(cust => {
    const rawSearch = searchTerm.toLowerCase();
    return (
      cust.name.toLowerCase().includes(rawSearch) ||
      cust.mobile.includes(rawSearch) ||
      (cust.vehicleNo || '').toLowerCase().includes(rawSearch)
    );
  });

  const displayedTransactions = selectedCustId === 'all' 
    ? transactions 
    : transactions.filter(t => t.customerId === selectedCustId);

  // High-level ledger metrics
  const totalOutstanding = activeCustomers.reduce((sum, c) => sum + getCustomerBalance(c.id), 0);
  const activeAccountsCount = activeCustomers.length;
  const totalTxCount = transactions.length;

  return (
    <div className="space-y-6" id="udhaar_khata_container">
      
      {/* Visual Header / Heading with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2.5 text-slate-900">
            <Coins className="w-6 h-6 text-emerald-500 animate-pulse" />
            <span>{lang === 'en' ? 'Udhaar Khata (Credit Ledger Accounts Book)' : 'ઉધાર ખાતું અને ગ્રાહક લેજર બુક'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'en' 
              ? 'Add permanent credit clients, generate running invoices, and initiate WhatsApp balance alerts instantly on entries.' 
              : 'કાયમી જમા-ઉધાર ગ્રાહકોનું ખાતું, બાકી લેણાં, ત્વરિત ઈન્વોઈસ અને વૉટ્સએપ પર આપોઆપ આપલે અહેવાલ.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsCustomerModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 border border-slate-700 text-white rounded-lg hover:bg-slate-800 text-xs font-semibold cursor-pointer transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>{lang === 'en' ? 'New Customer' : 'નવો ગ્રાહક'}</span>
          </button>
          
          <button
            onClick={() => openInvoiceModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-semibold cursor-pointer shadow transition-all"
          >
            <Receipt className="w-4 h-4" />
            <span>{lang === 'en' ? 'New Credit Entry' : 'નવી ઉધાર એન્ટ્રી'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-red-500/10 text-red-600 rounded-xl">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
              {lang === 'en' ? 'Total Outstanding Balance' : 'કુલ બાકી ઉઘરાણી'}
            </span>
            <span className="text-xl font-black text-slate-900 block mt-0.5">
              ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
              {lang === 'en' ? 'Active Credit Ledger Accounts' : 'એક્ટિવ ગ્રાહક ખાતાઓ'}
            </span>
            <span className="text-xl font-black text-slate-900 block mt-0.5">
              {activeAccountsCount} {lang === 'en' ? 'Clients' : 'ગ્રાહકો'}
            </span>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
              {lang === 'en' ? 'Total Transactions Logged' : 'કુલ થયેલ વ્યવહારો'}
            </span>
            <span className="text-xl font-black text-slate-900 block mt-0.5">
              {totalTxCount} {lang === 'en' ? 'Invoices' : 'બિલ બુક'}
            </span>
          </div>
        </div>
      </div>

      {/* Main ledger grid section: Left is customers lists, Right is statements log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Customers Accounts List */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-2 flex-wrap gap-2">
            <h3 className="font-bold text-sm text-slate-800">
              {lang === 'en' ? 'Customer Book' : 'ગ્રાહકોની યાદી'}
            </h3>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
              {filteredCustomers.length} Listed
            </span>
          </div>

          {/* Search Inputs */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={lang === 'en' ? 'Search by name, vehicle GJ-0...' : 'નામ, વાહન નંબર કે મોબાઈલથી સર્ચ'}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          {/* Customer list scrollable pane */}
          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                {lang === 'en' ? 'No customers found.' : 'કોઈ ગ્રાહક મળ્યા નથી.'}
              </div>
            ) : (
              filteredCustomers.map(cust => {
                const balance = getCustomerBalance(cust.id);
                const isSelected = selectedCustId === cust.id;
                const limitProgress = cust.creditLimit ? Math.min(100, (balance / cust.creditLimit) * 100) : 0;
                
                return (
                  <div
                    key={cust.id}
                    onClick={() => setSelectedCustId(isSelected ? 'all' : cust.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-50/50 border-blue-400 shadow-sm' 
                        : 'bg-slate-50/40 border-slate-150 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                          {cust.name}
                        </h4>
                        
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1 font-mono">
                          <span className="flex items-center gap-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {cust.mobile}
                          </span>
                          {cust.vehicleNo && (
                            <span className="flex items-center gap-0.5 bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                              <Car className="w-3 h-3 text-slate-400" />
                              {cust.vehicleNo}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Outstanding</span>
                        <span className="text-xs font-black text-rose-600 block mt-0.5">
                          ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 1 })}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar of Credit Limit */}
                    {cust.creditLimit ? (
                      <div className="mt-3 pt-2.5 border-t border-slate-100">
                        <div className="flex justify-between text-[9px] text-slate-400 font-mono mb-1">
                          <span>Limit: ₹{cust.creditLimit.toLocaleString('en-IN')}</span>
                          <span className={limitProgress > 80 ? 'text-red-500 font-bold' : ''}>
                            {limitProgress.toFixed(0)}% Used
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              limitProgress > 85 ? 'bg-red-500' : limitProgress > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${limitProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* Quick Add entries shortcuts */}
                    <div className="flex items-center justify-end gap-1.5 mt-2.5 pt-2 border-t border-dashed border-slate-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openInvoiceModal(cust.id);
                        }}
                        className="p-1 px-2.5 bg-white border border-slate-200 rounded-md text-[10px] hover:bg-slate-100 text-slate-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-emerald-500" />
                        <span>Add Voucher</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Statement logs & invoices statement */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-2 gap-2">
            <div>
              <h3 className="font-bold text-sm text-slate-800">
                {selectedCustId === 'all' 
                  ? (lang === 'en' ? 'All Transactions Ledger' : 'કુલ ઉધાર ખાતાવહી લોગ')
                  : `${activeCustomers.find(c => c.id === selectedCustId)?.name}'s Ledger Statement`
                }
              </h3>
              <p className="text-[10px] text-slate-500">
                {selectedCustId === 'all' 
                  ? (lang === 'en' ? 'Showing master statements across all credit clients.' : 'તમામ ગ્રાહકોના થયેલ ઓવરઓલ વ્યવહાર અહેવાલ.')
                  : (lang === 'en' ? 'Showing statements logs matching this selected account only.' : 'પસંદ કરેલ ગ્રાહકના સિંગલ ખાતાના જમા-ઉધાર વ્યવહારો.')
                }
              </p>
            </div>

            {selectedCustId !== 'all' && (
              <button
                onClick={() => setSelectedCustId('all')}
                className="text-[10px] text-blue-600 hover:underline border border-blue-200 px-2 py-0.5 rounded cursor-pointer"
              >
                Clear Filter (All Clients)
              </button>
            )}
          </div>

          {/* Statement table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-[9px] uppercase font-bold text-slate-500 px-3 py-2 text-left">Date</th>
                  <th className="text-[9px] uppercase font-bold text-slate-500 px-3 py-2 text-left">Invoice</th>
                  {selectedCustId === 'all' && (
                    <th className="text-[9px] uppercase font-bold text-slate-500 px-3 py-2 text-left">Customer</th>
                  )}
                  <th className="text-[9px] uppercase font-bold text-slate-500 px-3 py-2 text-left">Fuel & Qty</th>
                  <th className="text-[9px] uppercase font-bold text-slate-500 px-3 py-2 text-right">Amount</th>
                  <th className="text-[9px] uppercase font-bold text-slate-500 px-3 py-2 text-center">Alerts</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {displayedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={selectedCustId === 'all' ? 6 : 5} className="text-center py-12 text-xs text-slate-400">
                      No matching credit invoices recorded yet.
                    </td>
                  </tr>
                ) : (
                  [...displayedTransactions].reverse().map(tx => {
                    const custObj = state.customers?.find(c => c.id === tx.customerId);
                    const runningBal = getCustomerBalance(tx.customerId);
                    const whatsappMsgUrl = custObj ? getWhatsAppURL(tx, runningBal, custObj) : '#';

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap font-mono">{tx.date}</td>
                        <td className="px-3 py-2.5 text-xs font-semibold text-slate-800 whitespace-nowrap">
                          {tx.invoiceNo}
                          {tx.notes && (
                            <span className="block text-[8px] text-slate-400 font-normal">{tx.notes}</span>
                          )}
                        </td>
                        {selectedCustId === 'all' && (
                          <td className="px-3 py-2.5 text-xs text-slate-800 font-bold whitespace-nowrap">
                            {custObj?.name || 'Unknown'}
                            <span className="block text-[8px] text-slate-400 font-normal">{custObj?.vehicleNo}</span>
                          </td>
                        )}
                        <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                          <span className={`inline-block px-1 rounded text-[8px] font-bold mr-1 ${
                            tx.fuelType === 'petrol' ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-amber-50 text-amber-850 border border-amber-200'
                          }`}>
                            {tx.fuelType.toUpperCase()}
                          </span>
                          <span className="font-mono text-slate-900 font-bold">{tx.liters} L</span>
                          <span className="block text-[8px] text-slate-400">@ ₹{tx.rate}/L</span>
                        </td>
                        <td className="px-3 py-2.5 text-xs font-extrabold text-rose-600 text-right font-mono whitespace-nowrap">
                          ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-center whitespace-nowrap">
                          <a
                            href={whatsappMsgUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => {
                              // notify server we processed whatsapp push
                              fetch('/api/credit-transactions', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  action: 'mark-whatsapp',
                                  transaction: { id: tx.id },
                                  userId: session.employeeId,
                                  userName: session.name
                                })
                              }).then(() => onRefreshState());
                            }}
                            className={`inline-flex items-center gap-1 p-1 px-2 rounded font-semibold text-[10px] cursor-pointer transition-colors shadow-xs ${
                              tx.whatsappSent 
                                ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100' 
                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                            title="Resend WhatsApp invoice link"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>{tx.whatsappSent ? 'Resend' : 'Send'}</span>
                          </a>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODAL: ADD CLIENT/CUSTOMER */}
      <AnimatePresence>
        {isCustomerModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 max-w-sm w-full rounded-2xl shadow-xl overflow-hidden p-6 relative"
            >
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-black text-slate-900 flex items-center gap-2 mb-4">
                <UserCheck className="w-5 h-5 text-blue-500" />
                <span>{lang === 'en' ? 'Add Udhaar Customer Account' : 'ઉમેરો નવો ગ્રાહક લોગ બુક'}</span>
              </h3>

              <form onSubmit={handleAddCustomer} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Customer / Pump Client Name</label>
                  <input
                    type="text"
                    required
                    value={custForm.name}
                    onChange={(e) => setCustForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Sardar Heavy Transport Ltd"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Mobile No (For Whatsapp Notifications)</label>
                  <input
                    type="tel"
                    required
                    pattern="[0-9]{10}"
                    value={custForm.mobile}
                    onChange={(e) => setCustForm(prev => ({ ...prev, mobile: e.target.value }))}
                    placeholder="10-digit Phone No, eg 9876543210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Primary Vehicle Registration No (Optional)</label>
                  <input
                    type="text"
                    value={custForm.vehicleNo}
                    onChange={(e) => setCustForm(prev => ({ ...prev, vehicleNo: e.target.value.toUpperCase() }))}
                    placeholder="e.g. GJ-01-XX-1234"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Assigned Credit Limit (₹)</label>
                  <input
                    type="number"
                    value={custForm.creditLimit}
                    onChange={(e) => setCustForm(prev => ({ ...prev, creditLimit: e.target.value }))}
                    placeholder="Default 100,000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-lg text-xs font-mono"
                  />
                </div>

                {errorMessage && (
                  <div className="p-2.5 bg-red-550/10 border border-red-500/20 text-red-700 text-[11px] rounded-lg">
                    {errorMessage}
                  </div>
                )}

                {successMessage && (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-[11px] rounded-lg flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {successMessage}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 text-white font-semibold text-xs rounded-lg hover:bg-blue-700 shadow flex items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{lang === 'en' ? 'Add Customer Account' : 'ખાતું ખોલો'}</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: NEW CREDIT INVOICE ENTRY / VOUCHER */}
      <AnimatePresence>
        {isInvoiceModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 max-w-md w-full rounded-2xl shadow-xl overflow-hidden p-6 relative"
            >
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-base font-black text-slate-900 flex items-center gap-2 mb-4">
                <Receipt className="w-5 h-5 text-emerald-500" />
                <span>{lang === 'en' ? 'New Credit Entry (ઉધાર બિલ એન્ટ્રી)' : 'નવી ઉધાર વેચાણ એન્ટ્રી'}</span>
              </h2>

              <form onSubmit={handleAddInvoice} className="space-y-4">
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Select Customer</label>
                    <select
                      required
                      value={invoiceForm.customerId}
                      onChange={(e) => setInvoiceForm(prev => ({ ...prev, customerId: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold"
                    >
                      <option value="">-- Customer --</option>
                      {activeCustomers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Voucher/Invoice No</label>
                    <input
                      type="text"
                      required
                      value={invoiceForm.invoiceNo}
                      onChange={(e) => setInvoiceForm(prev => ({ ...prev, invoiceNo: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pb-2 border-b border-dashed">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Fuel Category</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleFuelTypeChange('diesel')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded border transition-all cursor-pointer ${
                          invoiceForm.fuelType === 'diesel' 
                            ? 'bg-amber-100 border-amber-400 text-amber-850' 
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        Diesel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFuelTypeChange('petrol')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded border transition-all cursor-pointer ${
                          invoiceForm.fuelType === 'petrol' 
                            ? 'bg-blue-100 border-blue-400 text-blue-850' 
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        Petrol
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Fuel Rate (₹/Litre)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={invoiceForm.rate}
                      onChange={(e) => {
                        const rateVal = e.target.value;
                        const litersNum = parseFloat(invoiceForm.liters) || 0;
                        setInvoiceForm(prev => ({
                          ...prev,
                          rate: rateVal,
                          amount: (litersNum * (parseFloat(rateVal) || 0)).toFixed(2)
                        }));
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Liters and Total calculations */}
                <div className="p-3 bg-slate-50 rounded-xl space-y-3 border border-slate-150">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Calculator className="w-4 h-4 text-teal-600" />
                    <span>Dynamic Entry Calculator</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] uppercase font-semibold text-slate-500 mb-0.5">Liters (L)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={invoiceForm.liters}
                        onChange={(e) => handleLitersChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase font-semibold text-slate-500 mb-0.5">Invoice Amount (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={invoiceForm.amount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-mono text-rose-600 font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Attendant On Duty</label>
                    <select
                      required
                      value={invoiceForm.operatorId}
                      onChange={(e) => setInvoiceForm(prev => ({ ...prev, operatorId: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs"
                    >
                      <option value="">-- Attendant --</option>
                      {activeEmployees.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Notes / Fleet Details (Vehicle)</label>
                    <input
                      type="text"
                      value={invoiceForm.notes}
                      onChange={(e) => setInvoiceForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="e.g. GJ-01-XX-4455 Container fill"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-2.5 bg-red-400/10 border border-red-500/20 text-red-700 text-[11px] rounded-lg">
                    {errorMessage}
                  </div>
                )}

                {successMessage && (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-[11px] rounded-lg flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 animate-bounce" />
                    {successMessage}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2 bg-teal-600 text-white font-bold text-xs rounded-lg hover:bg-teal-700 flex items-center justify-center gap-1.5 shadow cursor-pointer transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>{lang === 'en' ? 'Add & Open WhatsApp Notification' : 'બચત કરો અને વૉટ્સએપ મોકલો'}</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
