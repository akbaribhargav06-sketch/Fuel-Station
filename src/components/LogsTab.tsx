/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { translations, LanguageCode } from '../translations';
import { SystemState } from '../types';
import { FileText, ShieldAlert, History } from 'lucide-react';

interface LogsTabProps {
  state: SystemState;
  lang: LanguageCode;
}

export default function LogsTab({ state, lang }: LogsTabProps) {
  const t = translations[lang];

  return (
    <div className="space-y-6" id="logs_tab">
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <History className="text-teal-400 w-5 h-5" />
          {t.systemLogs}
        </h2>
        <p className="text-slate-400 text-xs mt-1">
          {lang === 'en' ? 'Audit trail showing operator logins, shift transitions, and state changes' : 'કર્મચારીઓ દ્વારા કરેલી એન્ટ્રીઓ, સુધારા પત્રકો અને વકરાના ફેરફારો વિગતવાર ઓડિટ લોગ પત્રક.'}
        </p>
      </div>

      <div className="bg-slate-800/90 rounded-2xl border border-slate-700/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-900/30 text-slate-400 font-semibold tracking-wider font-sans">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Authorized User</th>
                <th className="py-3 px-4">Audit Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40 text-slate-300 font-sans">
              {state.logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-700/20 text-xs text-slate-300">
                  <td className="py-3 px-4 font-mono text-slate-405">
                    {new Date(log.timestamp).toLocaleString(undefined, { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      second: '2-digit'
                    })}
                  </td>
                  <td className="py-3 px-4 text-slate-200">
                    <span className="font-semibold">{log.userName}</span>
                    <span className="text-[10px] text-slate-500 block">ID: {log.userId}</span>
                  </td>
                  <td className="py-3 px-4 max-w-md font-sans text-slate-300 font-mono tracking-tight text-[11.5px]">
                    {log.action}
                  </td>
                </tr>
              ))}

              {state.logs.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-12 text-slate-405 text-sm">
                    {t.noData}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
