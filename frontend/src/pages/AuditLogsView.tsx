import React, { useEffect, useState } from 'react';
import { fetchAuditLogs } from '../services/api';
import { History, ShieldCheck } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchAuditLogs().then(setLogs).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100">Decision Support Audit Trail</h1>
        <p className="text-xs text-slate-400 mt-1">Immutable audit logs of all optimization model executions, adversarial safety rejections & authority reviews.</p>
      </div>

      <div className="bg-command-card border border-command-border rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading audit trail...</div>
        ) : (
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold border-b border-command-border">
              <tr>
                <th className="py-3 px-4">Audit ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Model / Reason</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {logs.map((log) => (
                <tr key={log.audit_id} className="hover:bg-slate-800/50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-400">{log.audit_id}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{log.timestamp}</td>
                  <td className="py-3 px-4 font-bold text-blue-400">{log.event}</td>
                  <td className="py-3 px-4 font-semibold text-slate-100">{log.habitation || log.site}</td>
                  <td className="py-3 px-4 text-slate-400">{log.model_version || log.reason}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-amber-300">
                      {log.status || 'LOGGED'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
