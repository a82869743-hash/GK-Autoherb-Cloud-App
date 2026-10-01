import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Search, Filter, Clock, User, Activity, AlertTriangle, Eye, RefreshCw, KeyRound, Database } from 'lucide-react';
import { useAuditLogs, useAuditSummary } from '../../api/hooks/useAudit';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import { PageTransition, AnimatedModal } from '../../components/ui/Animations';

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  update: 'bg-sky-50 text-sky-700 border-sky-200',
  delete: 'bg-rose-50 text-rose-700 border-rose-200',
  login: 'bg-purple-50 text-purple-700 border-purple-200',
  logout: 'bg-slate-100 text-slate-600 border-slate-200',
  payment: 'bg-amber-50 text-amber-700 border-amber-200',
};

const ACTION_ICONS: Record<string, React.ElementType> = {
  create: Activity,
  update: Activity,
  delete: AlertTriangle,
  login: KeyRound,
  logout: User,
  payment: Database,
};

export default function AuditLogPage() {
  const [filters, setFilters] = useState({ action: '', entity_type: '', from: '', to: '' });
  const [detailModal, setDetailModal] = useState<any>(null);
  const { data: logsData, isLoading, refetch } = useAuditLogs(
    Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
  );
  const { data: summary } = useAuditSummary();

  const formatTime = (d: string) => {
    const dt = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - dt.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const getActionCount = (action: string) => {
    if (!summary?.actions) return 0;
    const item = summary.actions.find((a: any) => a.action?.toLowerCase() === action.toLowerCase());
    return item ? item.count : 0;
  };

  return (
    <PageTransition className="space-y-6 max-w-[1400px] mx-auto pb-28 lg:pb-12">
      <AdminHeaderBar
        title="Security & System Audit Logs"
        subtitle="Immutable event ledger, credential access trails, and entity modifications"
        badge="Zero Trust Audit"
        actions={
          <button
            onClick={() => refetch()}
            className="h-10 px-4 bg-white border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <AdminMetricCard
          title="Create Events"
          value={getActionCount('create')}
          subtitle="New entities initialized"
          icon={Activity}
          variant="emerald"
          trend="Insert operations"
        />
        <AdminMetricCard
          title="Modifications"
          value={getActionCount('update')}
          subtitle="Entity updates recorded"
          icon={Activity}
          variant="sky"
          trend="Patch operations"
        />
        <AdminMetricCard
          title="Deletions & Voids"
          value={getActionCount('delete')}
          subtitle="Protected records removed"
          icon={AlertTriangle}
          variant="rose"
          trend="High security"
        />
        <AdminMetricCard
          title="Authentication Trails"
          value={getActionCount('login') + getActionCount('logout')}
          subtitle="Studio staff sign-ins"
          icon={Shield}
          variant="red"
          trend="Session security"
        />
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-5 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <select 
            value={filters.action} 
            onChange={e => setFilters(p => ({ ...p, action: e.target.value }))}
            className="w-full h-11 pl-10 pr-4 text-xs font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 text-slate-700"
          >
            <option value="">All Action Types</option>
            <option value="create">Create Records</option>
            <option value="update">Update Records</option>
            <option value="delete">Delete Records</option>
            <option value="login">Authentication Logins</option>
            <option value="payment">Payment Transactions</option>
          </select>
        </div>

        <select 
          value={filters.entity_type} 
          onChange={e => setFilters(p => ({ ...p, entity_type: e.target.value }))}
          className="h-11 px-4 text-xs font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 text-slate-700 min-w-[150px]"
        >
          <option value="">All Entities</option>
          <option value="job_cart">Job Carts</option>
          <option value="payment">Payments</option>
          <option value="user">User Accounts</option>
          <option value="booking">Bookings</option>
          <option value="inventory">Inventory</option>
        </select>

        <div className="flex items-center gap-2">
          <input 
            type="date" 
            value={filters.from} 
            onChange={e => setFilters(p => ({ ...p, from: e.target.value }))}
            className="h-11 text-xs font-medium border border-slate-200 rounded-2xl px-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20" 
          />
          <span className="text-slate-400 text-xs font-bold">to</span>
          <input 
            type="date" 
            value={filters.to} 
            onChange={e => setFilters(p => ({ ...p, to: e.target.value }))}
            className="h-11 text-xs font-medium border border-slate-200 rounded-2xl px-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20" 
          />
        </div>

        {(filters.action || filters.entity_type || filters.from) && (
          <button 
            type="button" 
            onClick={() => setFilters({ action: '', entity_type: '', from: '', to: '' })}
            className="h-11 px-4 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Audit Timeline Card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Clock size={18} className="text-[#D32F2F]" />
            Security Audit Timeline
          </h3>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
            {logsData?.pagination?.total || 0} Total Events
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="p-4 pl-6 flex gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-100 rounded-xl w-2/3" />
                  <div className="h-3 bg-slate-50 rounded-xl w-1/3" />
                </div>
              </div>
            ))
          ) : (logsData?.data || []).map((log: any, i: number) => {
            const IconComp = ACTION_ICONS[log.action] || Activity;
            const colorClass = ACTION_COLORS[log.action] || 'bg-slate-50 text-slate-600 border-slate-200';
            return (
              <motion.div 
                key={log.id} 
                initial={{ opacity: 0, x: -6 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: i * 0.02 }}
                className="p-4 pl-6 flex items-start gap-4 hover:bg-slate-50/70 transition-colors cursor-pointer group"
                onClick={() => setDetailModal(log)}
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm ${colorClass}`}>
                  <IconComp size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-extrabold text-slate-900 capitalize">{log.action}</span>
                    <span className="text-[10px] px-2.5 py-0.5 bg-slate-100 rounded-full text-slate-600 font-bold capitalize">
                      {log.entity_type?.replace('_', ' ')}
                    </span>
                    {log.entity_id && <span className="text-[11px] font-mono text-slate-400">#{log.entity_id}</span>}
                  </div>
                  <p className="text-xs text-slate-500">
                    Triggered by <span className="font-bold text-slate-700">{log.user_name || 'System Daemon'}</span>
                    {log.user_role && <span className="text-slate-400"> ({log.user_role})</span>}
                  </p>
                </div>
                <div className="text-right shrink-0 pr-2">
                  <p className="text-[11px] font-medium text-slate-400">{formatTime(log.created_at)}</p>
                  <Eye size={15} className="text-slate-300 group-hover:text-[#D32F2F] mt-1 ml-auto transition-colors" />
                </div>
              </motion.div>
            );
          })}
          {!logsData?.data?.length && !isLoading && (
            <div className="p-16 text-center">
              <Shield size={42} className="mx-auto text-slate-200 mb-3" />
              <p className="text-slate-800 font-bold text-base">No audit events found</p>
              <p className="text-slate-400 text-xs mt-1">Audit trail entries will appear as system actions execute</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatedModal isOpen={!!detailModal} onClose={() => setDetailModal(null)}>
        {detailModal && (
          <div className="p-6 sm:p-7 max-w-lg w-full bg-white rounded-3xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#D32F2F] flex items-center justify-center font-bold">
                <Shield size={20} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 capitalize">
                  {detailModal.action} — {detailModal.entity_type?.replace('_', ' ')}
                </h3>
                <p className="text-xs text-slate-400">Full audit event record verification</p>
              </div>
            </div>
            
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Event ID</span>
                <span className="font-mono font-bold text-slate-800">#{detailModal.id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Operator User</span>
                <span className="font-bold text-slate-800">{detailModal.user_name || 'System Engine'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Granted Role</span>
                <span className="font-bold text-[#b71c1c] bg-red-50 px-2 py-0.5 rounded-md capitalize">{detailModal.user_role || 'Daemon'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Entity Primary Key</span>
                <span className="font-mono font-bold text-slate-800">#{detailModal.entity_id || '—'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Origin IP Address</span>
                <span className="font-mono text-slate-700">{detailModal.ip_address || 'Internal (127.0.0.1)'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Recorded Timestamp</span>
                <span className="font-medium text-slate-800">{new Date(detailModal.created_at).toLocaleString('en-IN')}</span>
              </div>
              {detailModal.details && (
                <div className="pt-2">
                  <p className="text-slate-500 font-bold mb-1.5">Payload Diff</p>
                  <pre className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-[11px] text-slate-700 overflow-x-auto max-h-44 font-mono leading-relaxed">
                    {typeof detailModal.details === 'string' ? detailModal.details : JSON.stringify(detailModal.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-6">
              <button 
                type="button" 
                onClick={() => setDetailModal(null)}
                className="h-10 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold shadow-sm transition-all"
              >
                Close Audit Inspector
              </button>
            </div>
          </div>
        )}
      </AnimatedModal>
    </PageTransition>
  );
}
