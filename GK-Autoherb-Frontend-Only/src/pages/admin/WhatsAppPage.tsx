import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Send, Users, CheckCircle, XCircle, Search, Clock, Smartphone, MessageSquare } from 'lucide-react';
import { useWhatsAppMessages, useWhatsAppStats, useSendWhatsApp } from '../../api/hooks/useWhatsApp';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import { PageTransition, AnimatedModal } from '../../components/ui/Animations';

export default function WhatsAppPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showSendModal, setShowSendModal] = useState(false);
  const [messageForm, setMessageForm] = useState({ phone: '', message: '', customer_id: '' });

  const { data: messagesData, isLoading } = useWhatsAppMessages({ status: statusFilter });
  const { data: statsData } = useWhatsAppStats();
  const sendWhatsApp = useSendWhatsApp();

  const handleSendMessage = () => {
    sendWhatsApp.mutate(messageForm, {
      onSuccess: () => {
        setShowSendModal(false);
        setMessageForm({ phone: '', message: '', customer_id: '' });
      }
    });
  };

  const stats = statsData?.data || {};

  const filteredMessages = (messagesData?.data || []).filter((m: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (m.phone && m.phone.toLowerCase().includes(q)) ||
      (m.customer_name && m.customer_name.toLowerCase().includes(q)) ||
      (m.message_body && m.message_body.toLowerCase().includes(q))
    );
  });

  return (
    <PageTransition className="space-y-6 max-w-[1400px] mx-auto pb-28 lg:pb-12">
      <AdminHeaderBar
        title="WhatsApp Gateway"
        subtitle="Direct studio communications, booking confirmations, and delivery notifications"
        badge="Gateway Online"
        actions={
          <button
            onClick={() => setShowSendModal(true)}
            className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <Send size={14} />
            Send WhatsApp
          </button>
        }
      />

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminMetricCard
          title="Total Dispatched"
          value={stats.total || 0}
          subtitle="All campaign & alert triggers"
          icon={MessageCircle}
          variant="red"
          trend="Lifetime gateway traffic"
        />
        <AdminMetricCard
          title="Delivered"
          value={stats.delivered || 0}
          subtitle="Delivered to customer device"
          icon={CheckCircle}
          variant="emerald"
          trend="Successful handshake"
        />
        <AdminMetricCard
          title="Queued / In Transit"
          value={(stats.pending || 0) + (stats.sent || 0)}
          subtitle="Pending delivery receipt"
          icon={Clock}
          variant="amber"
          trend="Processing on gateway"
        />
        <AdminMetricCard
          title="Failed / Undelivered"
          value={stats.failed || 0}
          subtitle="Invalid number or unreachable"
          icon={XCircle}
          variant="rose"
          trend="Bounce threshold"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-5 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search by customer name, mobile, or keywords..." 
            className="w-full h-11 pl-10 pr-4 text-xs font-medium border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all" 
          />
        </div>
        <select 
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value)} 
          className="h-11 px-4 text-xs font-bold border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 text-slate-700"
        >
          <option value="">All Statuses</option>
          <option value="sent">Sent</option>
          <option value="delivered">Delivered</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Messages Table Container */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Mobile View */}
        <div className="block md:hidden divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium">Loading message logs...</div>
          ) : !filteredMessages.length ? (
            <div className="text-center py-16 p-6">
              <MessageCircle size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-800 text-sm font-bold">No WhatsApp messages found</p>
              <p className="text-slate-400 text-xs mt-1">Sent reminders and notifications will appear here</p>
            </div>
          ) : (
            filteredMessages.map((m: any) => (
              <div key={m.id} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                    <Users size={14} className="text-slate-400" />
                    <span>{m.customer_name || 'Direct Recipient'}</span>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider
                    ${m.status === 'sent' || m.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                      m.status === 'failed' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                  >
                    {m.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-mono text-emerald-600 font-bold">{m.phone}</span>
                  <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg font-bold uppercase">{m.message_type || 'Custom'}</span>
                </div>
                <p className="text-xs text-slate-700 bg-slate-50 rounded-2xl p-3 leading-relaxed border border-slate-100 font-medium">{m.message_body}</p>
                <p className="text-[10px] text-slate-400 text-right">{new Date(m.created_at).toLocaleString('en-IN')}</p>
              </div>
            ))
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="p-4 pl-6">Recipient</th>
                <th className="p-4">Phone Number</th>
                <th className="p-4 max-w-[360px]">Message Content</th>
                <th className="p-4 text-center">Category</th>
                <th className="p-4 text-center">Gateway Status</th>
                <th className="p-4 pr-6 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="py-4 px-6">
                      <div className="h-5 bg-slate-100 rounded-xl animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filteredMessages.map((m: any, i: number) => (
                <motion.tr key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-4 pl-6">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <Users size={14} className="text-slate-400" />
                      {m.customer_name || 'Direct Recipient'}
                    </div>
                  </td>
                  <td className="p-4 font-mono text-xs font-bold text-slate-700">{m.phone}</td>
                  <td className="p-4 text-slate-600 text-xs max-w-[360px] truncate font-medium" title={m.message_body}>
                    {m.message_body}
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-[10px] px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-xl uppercase tracking-wider">
                      {m.message_type || 'Custom'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full border font-black uppercase tracking-wider
                      ${m.status === 'sent' || m.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        m.status === 'failed' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="p-4 pr-6 text-right text-slate-400 text-xs font-medium">
                    {new Date(m.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {!filteredMessages.length && !isLoading && (
            <div className="text-center py-16">
              <MessageCircle size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-800 text-base font-bold">No messages recorded</p>
              <p className="text-slate-400 text-xs mt-1">Sent alerts and direct messages will be cataloged here</p>
            </div>
          )}
        </div>
      </div>

      {/* Send Message Modal */}
      <AnimatedModal isOpen={showSendModal} onClose={() => setShowSendModal(false)}>
        <div className="p-6 sm:p-7 max-w-md w-full bg-white rounded-3xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Dispatch WhatsApp Message</h3>
              <p className="text-xs text-slate-400">Send an immediate WhatsApp notification to any customer</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Mobile Number (with Country Code)</label>
              <input 
                value={messageForm.phone} 
                onChange={e => setMessageForm(p => ({ ...p, phone: e.target.value }))} 
                className="w-full h-11 border border-slate-200 rounded-2xl px-4 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50 focus:bg-white font-mono" 
                placeholder="e.g. 919876543210" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Message Content</label>
              <textarea 
                value={messageForm.message} 
                onChange={e => setMessageForm(p => ({ ...p, message: e.target.value }))} 
                className="w-full border border-slate-200 rounded-2xl p-3.5 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50 focus:bg-white resize-none" 
                placeholder="Type your message here..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => setShowSendModal(false)}
                className="h-10 px-4 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSendMessage} 
                className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
              >
                <Send size={13} />
                Send Now
              </button>
            </div>
          </div>
        </div>
      </AnimatedModal>
    </PageTransition>
  );
}
