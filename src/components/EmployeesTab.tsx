/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { translations, LanguageCode } from '../translations';
import { SystemState, Employee, UserSession } from '../types';
import { Users, UserPlus, Trash2, Edit3, MessageSquare, ShieldCheck, UserCog, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface EmployeesTabProps {
  state: SystemState;
  lang: LanguageCode;
  session: UserSession;
  onPostAction: (actionType: string, url: string, payload: any) => Promise<void>;
}

export default function EmployeesTab({ state, lang, session, onPostAction }: EmployeesTabProps) {
  const t = translations[lang];
  const isAdmin = session.role === 'admin';

  // Local state managers
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'employee'>('employee');
  const [errorMsg, setErrorMsg] = useState('');

  const handleOpenAdd = () => {
    setIsEditing(null);
    setName('');
    setMobile('');
    setRole('employee');
    setErrorMsg('');
    setShowForm(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setIsEditing(emp.id);
    setName(emp.name);
    setMobile(emp.mobile);
    setRole(emp.role);
    setErrorMsg('');
    setShowForm(true);
  };

  // Submit employee modification to Express server
  const handleSubmitEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) {
      setErrorMsg(lang === 'en' ? 'Full Name and 10-Digit Mobile are required.' : 'પોલિસી મુજબ નામ અને મોબાઇલ નંબર આપવો ફરજિયાત છે.');
      return;
    }
    if (mobile.trim().length !== 10 || isNaN(Number(mobile))) {
      setErrorMsg(lang === 'en' ? 'Enter a valid 10-digit mobile number.' : '૧૦ આંકડાનો સાચો મોબાઇલ નંબર લખો.');
      return;
    }

    const payload = {
      action: isEditing ? 'edit' : 'add',
      userId: session.employeeId,
      userName: session.name,
      employee: {
        id: isEditing || undefined,
        name: name.trim(),
        mobile: mobile.trim(),
        role
      }
    };

    try {
      await onPostAction('configure employee', '/api/employees', payload);
      setShowForm(false);
      setName('');
      setMobile('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Server update failure.');
    }
  };

  // Turn profile active state off (Soft delete to keep relational logs)
  const handleDeleteEmployee = async (emp: Employee) => {
    if (emp.id === session.employeeId) {
      alert(lang === 'en' ? 'You cannot remove your own session.' : 'તમે તમારી પોતાની આઈડી બંધ કરી શકો નહીં.');
      return;
    }

    if (!window.confirm(lang === 'en' ? `Are you sure you want to delete ${emp.name}?` : `શું તમે ખરેખર ${emp.name} કર્મચારી પ્રોફાઇલ રદ કરવા માંગો છો?`)) {
      return;
    }

    const payload = {
      action: 'delete',
      userId: session.employeeId,
      userName: session.name,
      employee: { id: emp.id, name: emp.name }
    };

    try {
      await onPostAction('deactivate employee', '/api/employees', payload);
    } catch (err: any) {
      alert(err.message || 'Failed to remove employee.');
    }
  };

  return (
    <div className="space-y-6" id="employees_tab">
      
      {/* Table Header and Register Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 font-sans">
            <Users className="text-teal-400 w-5 h-5 animate-pulse" />
            {t.employeeList}
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            {lang === 'en' ? 'Configure pump operators, attendants, managers, and login parameters' : 'પેટ્રોલ પંપના કર્મચારીઓ અને મેનેજરોની પ્રોફાઇલ, મોબાઇલ નંબર અને એક્સેસ સ્તર.'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-900 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-md cursor-pointer transition-all"
            id="register_emp_btn"
          >
            <UserPlus className="w-4 h-4" />
            {t.addEmployee}
          </button>
        )}
      </div>

      {/* Verification modal for Adding/Editing employees */}
      {showForm && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4 max-w-lg shadow-2xl"
        >
          <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2 text-teal-400">
            <UserCog className="w-4 h-4" />
            {isEditing ? t.editEmployee : t.addEmployee}
          </h3>

          {errorMsg && (
            <div className="p-2.5 bg-red-400/10 border border-red-500/20 text-red-400 text-xs rounded-lg text-center font-bold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmitEmployee} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1.5">{t.name}</label>
              <input
                type="text"
                placeholder="e.g. Bhargav Akbari"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500 font-sans"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1.5">{t.mobileNumber}</label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="98xxxxxx06"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1.5">{t.staffRole}</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  <option value="employee">{t.employeeRole}</option>
                  <option value="manager">{t.managerRole}</option>
                  <option value="admin">{t.adminRole}</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/30 text-[10.5px] text-slate-400 leading-relaxed space-y-1">
              <span className="font-bold text-slate-300 block mb-1">Authorization Security PIN:</span>
              <p>• {t.adminRole} PIN: <span className="font-mono text-teal-400 font-bold bg-slate-800 px-1.5 py-0.5 rounded">1234</span></p>
              <p>• {t.managerRole} PIN: <span className="font-mono text-teal-400 font-bold bg-slate-800 px-1.5 py-0.5 rounded">5678</span></p>
              <p>• {t.employeeRole} PIN: <span className="font-mono text-teal-400 font-bold bg-slate-800 px-1.5 py-0.5 rounded">0000</span></p>
              <p className="text-[10px] text-slate-500 italic mt-1">Managers can save shift readings, while Admins enjoy global configuration controls.</p>
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

      {/* Employees Register List */}
      <div className="bg-slate-800/90 rounded-2xl border border-slate-700/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-400 font-semibold tracking-wider font-sans bg-slate-900/30">
                <th className="py-3 px-4">{t.name}</th>
                <th className="py-3 px-4">{t.mobileNumber}</th>
                <th className="py-3 px-4">{t.role}</th>
                <th className="py-3 px-4">{t.status}</th>
                <th className="py-3 px-4 text-center">Bypass PIN</th>
                {isAdmin && <th className="py-3 px-4 text-right">{t.actions}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40 text-slate-300 font-sans">
              {state.employees.map((emp) => (
                <tr key={emp.id} className={`hover:bg-slate-700/20 transition-colors ${!emp.active ? 'opacity-40' : ''}`}>
                  <td className="py-3.5 px-4 font-semibold text-slate-200 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    {emp.name}
                  </td>
                  <td className="py-3.5 px-4 font-mono">{emp.mobile}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${
                      emp.role === 'admin' 
                        ? 'bg-red-400/10 text-red-400 border border-red-500/20' 
                        : emp.role === 'manager' 
                          ? 'bg-amber-400/10 text-amber-400 border border-amber-500/20' 
                          : 'bg-teal-400/10 text-teal-300 border border-teal-500/20'
                    }`}>
                      {emp.role === 'admin' ? t.adminRole : emp.role === 'manager' ? t.managerRole : t.employeeRole}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`text-[10px] font-bold ${emp.active ? 'text-green-400' : 'text-slate-500'}`}>
                      {emp.active ? t.active : t.inactive}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-slate-50 relative font-bold">
                    <span className="bg-slate-900/50 px-2 py-0.5 rounded border border-slate-700/30 text-[11px] text-teal-400">
                      {emp.role === 'admin' ? '1234' : emp.role === 'manager' ? '5678' : '0000'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="p-1.5 hover:bg-teal-500/10 text-teal-400 hover:text-teal-300 border border-slate-700 rounded transition-colors cursor-pointer"
                          title={t.edit}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {emp.active && (
                          <button
                            onClick={() => handleDeleteEmployee(emp)}
                            className="p-1.5 hover:bg-red-500/10 text-red-500 hover:text-red-400 border border-slate-700 rounded transition-colors cursor-pointer"
                            title={t.delete}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
