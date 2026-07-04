/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SystemState, UserSession, InventoryProduct, InventoryTransaction } from '../types';
import { 
  Box, 
  Plus, 
  Search, 
  FileText, 
  TrendingDown, 
  TrendingUp, 
  Info, 
  Calendar, 
  DollarSign, 
  Database, 
  Trash2, 
  Edit3, 
  Layers, 
  Check, 
  AlertCircle,
  Link
} from 'lucide-react';
import { motion } from 'motion/react';

interface InventoryTabProps {
  state: SystemState;
  lang: 'en' | 'gu';
  session: UserSession;
  onPostAction: (actionType: string, url: string, payload: any) => Promise<void>;
}

export default function InventoryTab({ state, lang, session, onPostAction }: InventoryTabProps) {
  const isEn = lang === 'en';

  // State initialization
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'fuel' | 'oil' | 'other'>('all');
  
  // Modals / Forms
  const [showProductModal, setShowProductModal] = useState(false);
  const [productFormMode, setProductFormMode] = useState<'add' | 'edit'>('add');
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null);
  
  const [showTxModal, setShowTxModal] = useState(false);
  const [txFormProduct, setTxFormProduct] = useState<string>('');
  const [txFormType, setTxFormType] = useState<'in' | 'out'>('in');
  const [txFormQty, setTxFormQty] = useState('');
  const [txFormRate, setTxFormRate] = useState('');
  const [txFormNotes, setTxFormNotes] = useState('');
  const [txFormDate, setTxFormDate] = useState(new Date().toISOString().split('T')[0]);

  // Product Form Fields
  const [prodName, setProdName] = useState('');
  const [prodType, setProdType] = useState<'fuel' | 'oil' | 'other'>('oil');
  const [prodUnit, setProdUnit] = useState('Litres');
  const [prodStock, setProdStock] = useState('0');
  const [prodBuyPrice, setProdBuyPrice] = useState('0');
  const [prodSellPrice, setProdSellPrice] = useState('0');
  const [prodLinkedTank, setProdLinkedTank] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Local helper lists
  const products = state.inventory || [];
  const transactions = state.inventoryTransactions || [];

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' ? true : p.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Open Add Product Modal
  const openAddProduct = () => {
    setProductFormMode('add');
    setSelectedProduct(null);
    setProdName('');
    setProdType('oil');
    setProdUnit('Bottles');
    setProdStock('0');
    setProdBuyPrice('');
    setProdSellPrice('');
    setProdLinkedTank('');
    setErrorMsg('');
    setSuccessMsg('');
    setShowProductModal(true);
  };

  // Open Edit Product Modal
  const openEditProduct = (prod: InventoryProduct) => {
    setProductFormMode('edit');
    setSelectedProduct(prod);
    setProdName(prod.name);
    setProdType(prod.type);
    setProdUnit(prod.unit);
    setProdStock(prod.currentStock.toString());
    setProdBuyPrice(prod.buyingPrice.toString());
    setProdSellPrice(prod.sellingPrice.toString());
    setProdLinkedTank(prod.linkedTankId || '');
    setErrorMsg('');
    setSuccessMsg('');
    setShowProductModal(true);
  };

  // Submit Product
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!prodName.trim()) {
      setErrorMsg(isEn ? 'Product name is required.' : 'ઉત્પાદનનું નામ જરૂરી છે.');
      return;
    }

    const payload = {
      action: productFormMode,
      product: {
        id: selectedProduct?.id,
        name: prodName.trim(),
        type: prodType,
        unit: prodUnit.trim(),
        currentStock: parseFloat(prodStock) || 0,
        buyingPrice: parseFloat(prodBuyPrice) || 0,
        sellingPrice: parseFloat(prodSellPrice) || 0,
        linkedTankId: prodLinkedTank || undefined
      },
      userId: session.employeeId,
      userName: session.name
    };

    try {
      await onPostAction(`${productFormMode} product`, '/api/inventory/products', payload);
      setSuccessMsg(isEn ? 'Product saved successfully!' : 'પ્રોડક્ટ સફળતાપૂર્વક સાચવવામાં આવી!');
      setTimeout(() => setShowProductModal(false), 800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Product save failed.');
    }
  };

  // Delete Product
  const handleDeleteProduct = async (prod: InventoryProduct) => {
    const confirm = window.confirm(
      isEn 
        ? `Are you sure you want to delete "${prod.name}"?` 
        : `શું તમે ખરેખર "${prod.name}" ને કાઢી નાખવા માંગો છો?`
    );
    if (!confirm) return;

    try {
      await onPostAction('delete product', '/api/inventory/products', {
        action: 'delete',
        product: prod,
        userId: session.employeeId,
        userName: session.name
      });
    } catch (err: any) {
      alert(err.message || 'Failed to delete product.');
    }
  };

  // Open Inward/Outward stock modal
  const openStockTx = (prodId?: string, forceType?: 'in' | 'out') => {
    setTxFormProduct(prodId || (products[0]?.id || ''));
    setTxFormType(forceType || 'in');
    setTxFormQty('');
    setTxFormRate('');
    setTxFormNotes('');
    setTxFormDate(new Date().toISOString().split('T')[0]);
    setErrorMsg('');
    setSuccessMsg('');
    setShowTxModal(true);
  };

  // Submit Inventory Transaction
  const handleTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const qty = parseFloat(txFormQty);
    const rate = parseFloat(txFormRate);

    if (!txFormProduct) {
      setErrorMsg(isEn ? 'Please select a product.' : 'કૃપા કરીને ઉત્પાદન પસંદ કરો.');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg(isEn ? 'Please enter a valid positive quantity.' : 'કૃપા કરીને સાચી માત્રા દાખલ કરો.');
      return;
    }
    if (isNaN(rate) || rate < 0) {
      setErrorMsg(isEn ? 'Please enter a valid rate.' : 'કૃપા કરીને સાચો ભાવ દાખલ કરો.');
      return;
    }

    const prodObj = products.find(p => p.id === txFormProduct);
    if (!prodObj) return;

    // Check if enough stock for outward
    if (txFormType === 'out' && prodObj.currentStock < qty) {
      setErrorMsg(
        isEn 
          ? `Insufficient Stock! Current stock of ${prodObj.name} is ${prodObj.currentStock} ${prodObj.unit}.` 
          : `અપૂરતો સ્ટોક! ${prodObj.name} નો વર્તમાન સ્ટોક ${prodObj.currentStock} ${prodObj.unit} છે.`
      );
      return;
    }

    const payload = {
      action: 'add',
      transaction: {
        productId: txFormProduct,
        productName: prodObj.name,
        type: txFormType,
        quantity: qty,
        rate: rate,
        totalAmount: qty * rate,
        date: txFormDate,
        notes: txFormNotes.trim() || undefined
      },
      userId: session.employeeId,
      userName: session.name
    };

    try {
      await onPostAction('add stock transaction', '/api/inventory/transactions', payload);
      setSuccessMsg(isEn ? 'Stock transaction recorded successfully!' : 'સ્ટોક ટ્રાન્ઝેક્શન સફળતાપૂર્વક ઉમેરાયું!');
      setTimeout(() => setShowTxModal(false), 800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Transaction logging failed.');
    }
  };

  // Auto rate fetcher for transaction modal
  React.useEffect(() => {
    if (txFormProduct) {
      const prod = products.find(p => p.id === txFormProduct);
      if (prod) {
        setTxFormRate(txFormType === 'in' ? prod.buyingPrice.toString() : prod.sellingPrice.toString());
      }
    }
  }, [txFormProduct, txFormType, products]);

  // Aggregate stats
  const totalFuelStock = products.filter(p => p.type === 'fuel').reduce((acc, p) => acc + p.currentStock, 0);
  const totalOilsStock = products.filter(p => p.type === 'oil').reduce((acc, p) => acc + p.currentStock, 0);
  const totalValuation = products.reduce((acc, p) => acc + (p.currentStock * p.buyingPrice), 0);

  return (
    <div className="space-y-6 animate-fadeIn" id="inventory_tab_view">
      
      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
          <div>
            <span className="text-xs text-slate-500 font-semibold tracking-wider uppercase block">
              {isEn ? 'Total Fuel Inventory' : 'કુલ ઇંધણ સ્ટોક'}
            </span>
            <span className="text-2xl font-black text-teal-600 mt-1 block">
              {totalFuelStock.toLocaleString()} <span className="text-xs text-slate-400 font-normal">Litres</span>
            </span>
            <span className="text-[10px] text-slate-400 mt-2 block">
              {isEn ? 'Includes all synced storage tanks' : 'બધી કનેક્ટ થયેલી સ્ટોરેજ ટાંકીઓ સહિત'}
            </span>
          </div>
          <div className="p-3.5 bg-teal-50 rounded-2xl border border-teal-100 text-teal-600">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
          <div>
            <span className="text-xs text-slate-500 font-semibold tracking-wider uppercase block">
              {isEn ? 'Total Oils Stock' : 'કુલ લ્યુબ્રિકન્ટ્સ તેલ'}
            </span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">
              {totalOilsStock.toLocaleString()} <span className="text-xs text-slate-400 font-normal">Units</span>
            </span>
            <span className="text-[10px] text-slate-400 mt-2 block">
              {isEn ? 'Tracked lubricants & pack oils' : 'ટ્રેક કરેલા તેલ અને ઓઇલ બોટલો'}
            </span>
          </div>
          <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-100 text-amber-600">
            <Box className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
          <div>
            <span className="text-xs text-slate-500 font-semibold tracking-wider uppercase block">
              {isEn ? 'Total Asset Valuation' : 'કુલ માલ કિંમત (ખરીદ ભાવબલા)'}
            </span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">
              ₹ {totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400 mt-2 block">
              {isEn ? 'Based on product buying prices' : 'ઉત્પાદનોના ખરીદ ભલા પર આધારિત'}
            </span>
          </div>
          <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Control Actions & Catalog Grid */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
        
        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Box className="w-5 h-5 text-teal-600" />
              <span>{isEn ? 'Inventory Products' : 'સ્ટોક પ્રોડક્ટ્સ લિસ્ટ'}</span>
            </h2>
            <p className="text-xs text-slate-500">
              {isEn ? 'Track, monitor, and adjust fuel, oil, and packaging inventory' : 'પેટ્રોલ, ડીઝલ અને એન્જિન ઓઇલ સ્ટોકનું નિરીક્ષણ અને મેનેજ કરો'}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap w-full sm:w-auto">
            <button
              onClick={openAddProduct}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4 text-teal-600" />
              <span>{isEn ? 'Add Product' : 'પ્રોડક્ટ ઉમેરો'}</span>
            </button>
            <button
              onClick={() => openStockTx(undefined, 'in')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              <span>{isEn ? 'Record Cargo / Purchase' : 'સ્ટોક ખરીદી (આવક)'}</span>
            </button>
            <button
              onClick={() => openStockTx(undefined, 'out')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
            >
              <TrendingDown className="w-4 h-4" />
              <span>{isEn ? 'Manual Outflow / Issue' : 'મેન્યુઅલ વેચાણ (જાવક)'}</span>
            </button>
          </div>
        </div>

        {/* Filter and Search */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder={isEn ? "Search by product name..." : "નામ દ્વારા પ્રોડક્ટ શોધો..."}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-teal-500 focus:outline-none transition-all"
            />
          </div>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {(['all', 'fuel', 'oil', 'other'] as const).map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize cursor-pointer transition-all ${
                  typeFilter === type 
                    ? 'bg-white text-teal-600 shadow-xs border border-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {type === 'all' ? (isEn ? 'All' : 'બધા') : type}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">{isEn ? 'Product Name' : 'ઉત્પાદન નામ'}</th>
                <th className="p-4">{isEn ? 'Category' : 'શ્રેણી'}</th>
                <th className="p-4 text-right">{isEn ? 'Current Stock' : 'વર્તમાન સ્ટોક'}</th>
                <th className="p-4 text-right">{isEn ? 'Buying Price' : 'ખરીદ કિંમત'}</th>
                <th className="p-4 text-right">{isEn ? 'Selling Price' : 'વેચાણ કિંમત'}</th>
                <th className="p-4 text-center">{isEn ? 'Sync Status' : 'ટાંકી કનેક્શન'}</th>
                <th className="p-4 text-right">{isEn ? 'Actions' : 'પગલાં'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-mono">
                    {isEn ? 'No products registered in this catalog.' : 'સ્ટોક પ્રોડક્ટ્સ લિસ્ટમાં કોઈ ઉત્પાદનો નથી.'}
                  </td>
                </tr>
              ) : (
                filteredProducts.map(prod => {
                  // Resolve linked tank if any
                  const linkedTank = prod.linkedTankId ? state.tanks.find(t => t.id === prod.linkedTankId) : null;
                  
                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                        <Box className={`w-4 h-4 ${
                          prod.type === 'fuel' ? 'text-teal-600' : prod.type === 'oil' ? 'text-amber-500' : 'text-slate-500'
                        }`} />
                        <div>
                          <span>{prod.name}</span>
                          {linkedTank && (
                            <span className="block text-[9px] text-teal-600 font-normal">
                              {isEn ? `Synced with ${linkedTank.name}` : `${linkedTank.name} સાથે કનેક્ટેડ`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider font-mono ${
                          prod.type === 'fuel' 
                            ? 'bg-teal-50 text-teal-700 border border-teal-100' 
                            : prod.type === 'oil'
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {prod.type}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold">
                        <span className={prod.currentStock < 100 ? 'text-red-600' : 'text-slate-800'}>
                          {prod.currentStock.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal ml-1">{prod.unit}</span>
                      </td>
                      <td className="p-4 text-right font-mono text-slate-600">
                        ₹ {prod.buyingPrice.toFixed(2)}
                      </td>
                      <td className="p-4 text-right font-mono text-teal-600 font-bold">
                        ₹ {prod.sellingPrice.toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        {linkedTank ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 font-bold font-mono uppercase">
                            <Link className="w-3 h-3" />
                            Auto Sync
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">Manual Stock</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => openEditProduct(prod)}
                            className="p-1 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded transition-all cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition-all cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction History Log section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            <span>{isEn ? 'Inventory Ledger & Arrivals' : 'આવક-જાવક સ્ટોક રિપોર્ટ (લેઝર)'}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isEn ? 'Complete history of product cargo arrivals, sales and physical dip count adjustments' : 'ઉત્પાદનોના તમામ ખરીદી, વેચાણ અને ફેરફારોનો સમયરેખા રિપોર્ટ'}
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">{isEn ? 'Date' : 'તારીખ'}</th>
                <th className="p-4">{isEn ? 'Product' : 'પ્રોડક્ટ નામ'}</th>
                <th className="p-4">{isEn ? 'Type' : 'પ્રકાર'}</th>
                <th className="p-4 text-right">{isEn ? 'Quantity' : 'જથ્થો'}</th>
                <th className="p-4 text-right">{isEn ? 'Rate' : 'ભાવ (દર)'}</th>
                <th className="p-4 text-right">{isEn ? 'Total Amount' : 'કુલ રકમ'}</th>
                <th className="p-4">{isEn ? 'Transaction Details / Notes' : 'વિગત / નોંધ'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    {isEn ? 'No stock transactions on record.' : 'સ્ટોક ટ્રાન્ઝેક્શન હિસ્ટ્રી ખાલી છે.'}
                  </td>
                </tr>
              ) : (
                [...transactions]
                  .sort((a,b) => b.id.localeCompare(a.id))
                  .map(tx => {
                    const prod = products.find(p => p.id === tx.productId);
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 text-slate-500 text-xs font-sans">
                          {tx.date}
                        </td>
                        <td className="p-4 font-bold text-slate-900 font-sans">
                          {tx.productName}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                            tx.type === 'in' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-red-50 text-red-700 border border-red-100'
                          }`}>
                            {tx.type === 'in' ? (
                              <>
                                <TrendingUp className="w-3 h-3" />
                                {isEn ? 'Inward' : 'આવક'}
                              </>
                            ) : (
                              <>
                                <TrendingDown className="w-3 h-3" />
                                {isEn ? 'Outward' : 'જાવક'}
                              </>
                            )}
                          </span>
                        </td>
                        <td className="p-4 text-right text-slate-900 font-bold">
                          {tx.quantity.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">{prod?.unit}</span>
                        </td>
                        <td className="p-4 text-right text-slate-500">
                          ₹ {tx.rate.toFixed(2)}
                        </td>
                        <td className="p-4 text-right text-teal-600 font-bold">
                          ₹ {tx.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-slate-500 font-sans text-xs max-w-xs truncate" title={tx.notes}>
                          {tx.notes || '-'}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD / EDIT PRODUCT MODAL --- */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fadeIn">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="bg-slate-50 p-5 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-850 text-sm tracking-wider uppercase flex items-center gap-2">
                <Box className="w-4 h-4 text-teal-600" />
                <span>{productFormMode === 'add' ? (isEn ? 'Add New Product' : 'નવી પ્રોડક્ટ ઉમેરો') : (isEn ? 'Edit Product Catalog' : 'પ્રોડક્ટ એડિટ')}</span>
              </h3>
              <button 
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer transition-colors"
              >
                {isEn ? 'Close' : 'બંધ કરો'}
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="p-5 space-y-4">
              
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Product Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                  {isEn ? 'Product Name' : 'પ્રોડક્ટનું નામ'}
                </label>
                <input
                  type="text"
                  placeholder={isEn ? "e.g., Engine Oil Castrol 1L" : "ઉદાહરણ: એન્જીન ઓઇલ કેસ્ટ્રોલ"}
                  value={prodName}
                  onChange={e => setProdName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-teal-500 focus:outline-none transition-all"
                />
              </div>

              {/* Category selector */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    {isEn ? 'Category' : 'શ્રેણી'}
                  </label>
                  <select
                    value={prodType}
                    onChange={e => {
                      const val = e.target.value as 'fuel' | 'oil' | 'other';
                      setProdType(val);
                      if (val === 'fuel') {
                        setProdUnit('Litres');
                      } else if (val === 'oil') {
                        setProdUnit('Bottles');
                      }
                    }}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-teal-500 focus:outline-none transition-all"
                  >
                    <option value="oil">{isEn ? 'Lubricant Oil' : 'ઓઇલ / તેલ'}</option>
                    <option value="fuel">{isEn ? 'Fuel / Petrol / Diesel' : 'ઇંધણ (પેટ્રોલ / ડીઝલ)'}</option>
                    <option value="other">{isEn ? 'Other / Accessories' : 'અન્ય પ્રોડક્ટ્સ'}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    {isEn ? 'Unit' : 'માપદંડ (યુનિટ)'}
                  </label>
                  <input
                    type="text"
                    placeholder="Litres, Bottles, Packs"
                    value={prodUnit}
                    onChange={e => setProdUnit(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-teal-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Linked Tank for Fuel category */}
              {prodType === 'fuel' && (
                <div className="space-y-1.5 p-3 bg-teal-50 border border-teal-100 rounded-xl">
                  <label className="text-[10px] text-teal-600 font-bold uppercase tracking-wider flex items-center gap-1 block">
                    <Link className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Link to Fuel Storage Tank' : 'ટાંકી સાથે લિંક કરો (ઓટો સિંક)'}</span>
                  </label>
                  <p className="text-[9px] text-slate-500 leading-tight mb-2">
                    {isEn ? 'When linked, inventory stock is automatically loaded from the fuel tank dip calculations and updated via operator logs.' : 'લિંક કરવાથી ટાંકીનો સ્ટોક અને સેલ્સ ઓટોમેટીક ઇન્વેન્ટરી સાથે સિંક રહેશે.'}
                  </p>
                  <select
                    value={prodLinkedTank}
                    onChange={e => {
                      setProdLinkedTank(e.target.value);
                      const tank = state.tanks.find(t => t.id === e.target.value);
                      if (tank) {
                        setProdStock(tank.currentStock.toString());
                      }
                    }}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-teal-500 focus:outline-none transition-all"
                  >
                    <option value="">{isEn ? '-- Select Tank to Link (No Sync) --' : '-- લિંક વગર (મેન્યુઅલ ટ્રેકિંગ) --'}</option>
                    {state.tanks.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.fuelType.toUpperCase()})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Stock and Price configurations */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    {isEn ? 'Current Stock' : 'શરૂઆત સ્ટોક'}
                  </label>
                  <input
                    type="number"
                    disabled={prodLinkedTank !== ''}
                    value={prodStock}
                    onChange={e => setProdStock(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-teal-500 focus:outline-none disabled:opacity-40 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    {isEn ? 'Buy Rate (₹)' : 'ખરીદ દર (₹)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Rate"
                    value={prodBuyPrice}
                    onChange={e => setProdBuyPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-teal-500 focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    {isEn ? 'Sale Rate (₹)' : 'વેચાણ દર (₹)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    value={prodSellPrice}
                    onChange={e => setProdSellPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-teal-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Submissions */}
              <div className="flex gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  {isEn ? 'Cancel' : 'રદ કરો'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  {isEn ? 'Save Product' : 'સેવ પ્રોડક્ટ'}
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

      {/* --- RECORD STOCK TRANSACTION MODAL --- */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fadeIn">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="bg-slate-50 p-5 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-850 text-sm tracking-wider uppercase flex items-center gap-2">
                {txFormType === 'in' ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-amber-500" />}
                <span>
                  {txFormType === 'in' 
                    ? (isEn ? 'Record Cargo / Stock Arrival' : 'ખરીદી (સ્ટોક આવક) નોંધી લો') 
                    : (isEn ? 'Record Manual Outward Sale / Issue' : 'વેચાણ (સ્ટોક જાવક) નોંધી લો')}
                </span>
              </h3>
              <button 
                onClick={() => setShowTxModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer transition-colors"
              >
                {isEn ? 'Close' : 'બંધ કરો'}
              </button>
            </div>

            <form onSubmit={handleTxSubmit} className="p-5 space-y-4">
              
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Product selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                  {isEn ? 'Select Product' : 'પ્રોડક્ટ પસંદ કરો'}
                </label>
                <select
                  value={txFormProduct}
                  onChange={e => setTxFormProduct(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-teal-500 focus:outline-none transition-all"
                >
                  <option value="">{isEn ? '-- Select a Product --' : '-- પ્રોડક્ટ પસંદ કરો --'}</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({isEn ? `Stock: ${p.currentStock} ${p.unit}` : `સ્ટોક: ${p.currentStock} ${p.unit}`})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Type configurations */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    {isEn ? 'Transaction Date' : 'નોંધ તારીખ'}
                  </label>
                  <input
                    type="date"
                    value={txFormDate}
                    onChange={e => setTxFormDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-teal-500 focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    {isEn ? 'Direction' : 'દિશા (પ્રકાર)'}
                  </label>
                  <select
                    value={txFormType}
                    onChange={e => setTxFormType(e.target.value as 'in' | 'out')}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-teal-500 focus:outline-none transition-all"
                  >
                    <option value="in">{isEn ? 'Inward Cargo / Purchase' : 'સ્ટોક આવક (ખરીદી)'}</option>
                    <option value="out">{isEn ? 'Outward / Sales Issue' : 'સ્ટોક જાવક (વેચાણ)'}</option>
                  </select>
                </div>
              </div>

              {/* Quantity and Rates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    {isEn ? 'Quantity' : 'જથ્થો (માત્રા)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={txFormQty}
                    onChange={e => setTxFormQty(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-teal-500 focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    {isEn ? 'Rate Per Unit (₹)' : 'ભાવ દર પ્રતિ યુનિટ (₹)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={txFormRate}
                    onChange={e => setTxFormRate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-teal-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Calculated Total Info box */}
              {parseFloat(txFormQty) > 0 && parseFloat(txFormRate) > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                  <span className="text-slate-500">{isEn ? 'Total Bill Value:' : 'કુલ બિલ કિંમત:'}</span>
                  <span className="text-teal-600 font-black font-mono">
                    ₹ {(parseFloat(txFormQty) * parseFloat(txFormRate)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {/* Remarks Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                  {isEn ? 'Remarks / Notes' : 'વિગત / નોંધ / સંદર્ભ'}
                </label>
                <textarea
                  placeholder={isEn ? "e.g., Tanker Cargo Invoice #9482, Castrol Dealer Purchase..." : "ઉદાહરણ: ટેન્કર ડિલિવરી ચલણ નંબર, ડિસ્ટ્રીબ્યુટર બિલ..."}
                  value={txFormNotes}
                  onChange={e => setTxFormNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all resize-none"
                />
              </div>

              {/* Submissions */}
              <div className="flex gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTxModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  {isEn ? 'Cancel' : 'રદ કરો'}
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2 font-bold text-xs rounded-xl cursor-pointer transition-colors ${
                    txFormType === 'in' 
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                      : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
                >
                  {isEn ? 'Log Transaction' : 'ટ્રાન્ઝેક્શન સેવ કરો'}
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
