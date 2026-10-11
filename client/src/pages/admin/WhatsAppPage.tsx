import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageCircle, Send, Users, CheckCircle, XCircle, Search, Clock, 
  Smartphone, MessageSquare, RotateCw, Edit2, FileText, Check, AlertCircle 
} from 'lucide-react';
import { 
  useWhatsAppMessages, useWhatsAppStats, useSendWhatsApp, 
  useWhatsAppTemplates, useUpdateWhatsAppTemplate, useTestWhatsAppTemplate, useRetryWhatsAppNotification 
} from '../../api/hooks/useWhatsApp';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import { PageTransition, AnimatedModal } from '../../components/ui/Animations';

export default function WhatsAppPage() {
  const [activeTab, setActiveTab] = useState<'logs' | 'templates'>('logs');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showSendModal, setShowSendModal] = useState(false);
  const [messageForm, setMessageForm] = useState({ phone: '', message: '', customer_id: '' });

  // Template edit / test states
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [templateBody, setTemplateBody] = useState('');
  const [testModal, setTestModal] = useState<any | null>(null);
  const [testPhone, setTestPhone] = useState('919408424541');

  const { data: messagesData, isLoading } = useWhatsAppMessages({ status: statusFilter });
  const { data: statsData } = useWhatsAppStats();
  const { data: templates = [], isLoading: loadingTemplates } = useWhatsAppTemplates();
  const sendWhatsApp = useSendWhatsApp();
  const updateTemplate = useUpdateWhatsAppTemplate();
  const testTemplate = useTestWhatsAppTemplate();
  const retryNotification = useRetryWhatsAppNotification();

  const handleSendMessage = () => {
    sendWhatsApp.mutate(messageForm, {
      onSuccess: () => {
        setShowSendModal(false);
        setMessageForm({ phone: '', message: '', customer_id: '' });
      }
    });
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;
    updateTemplate.mutate({ id: editingTemplate.id, body: templateBody }, {
      onSuccess: () => setEditingTemplate(null)
    });
  };

  const handleSendTest = () => {
    if (!testModal || !testPhone.trim()) return;
    testTemplate.mutate({
      id: testModal.id,
      recipient_number: testPhone.trim(),
      variables: {
        customer_name: 'Gaurav Patel',
        service_name: 'Foam Wash & Ceramic Wax',
        booking_date: new Date().toLocaleDateString('en-IN'),
        booking_time: '11:00 AM',
        invoice_number: 'GKA-2026-108',
        amount: '1,500',
        coupon_code: 'FESTIVE200',
        discount_amount: '200',
        rating: '5',
      }
    }, {
      onSuccess: () => setTestModal(null)
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

  const filteredTemplates = templates.filter((t: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.template_name && t.template_name.toLowerCase().includes(q)) ||
      (t.body && t.body.toLowerCase().includes(q))
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

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'logs'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <MessageCircle size={14} />
          <span>Dispatch Logs ({filteredMessages.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'templates'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <FileText size={14} />
          <span>Automated Event Templates ({templates.length})</span>
        </button>
      </div>

      {activeTab === 'logs' ? (
        <>
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
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider
                          ${m.status === 'sent' || m.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                            m.status === 'failed' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                        >
                          {m.status}
                        </span>
                        {m.status === 'failed' && (
                          <button
                            type="button"
                            onClick={() => retryNotification.mutate(m.id)}
                            className="p-1 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                            title="Retry sending"
                          >
                            <RotateCw size={12} className={retryNotification.isPending ? 'animate-spin' : ''} />
                          </button>
                        )}
                      </div>
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
                        <div className="inline-flex items-center gap-1.5">
                          <span className={`text-[10px] px-2.5 py-1 rounded-full border font-black uppercase tracking-wider
                            ${m.status === 'sent' || m.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                              m.status === 'failed' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                          >
                            {m.status}
                          </span>
                          {m.status === 'failed' && (
                            <button
                              type="button"
                              onClick={() => retryNotification.mutate(m.id)}
                              disabled={retryNotification.isPending}
                              className="p-1 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                              title="Retry delivery"
                            >
                              <RotateCw size={12} className={retryNotification.isPending ? 'animate-spin' : ''} />
                            </button>
                          )}
                        </div>
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
        </>
      ) : (
        /* Event Templates Tab */
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Search templates by event name or body..." 
                className="w-full h-11 pl-10 pr-4 text-xs font-medium border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all" 
              />
            </div>
            <p className="text-xs text-slate-400 font-bold">
              {filteredTemplates.length} Event Triggers Available
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingTemplates ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="h-44 bg-slate-100 rounded-3xl animate-pulse" />
              ))
            ) : filteredTemplates.map((t: any) => (
              <div 
                key={t.id} 
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:border-slate-200 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900 font-mono">
                          {t.name || t.template_name}
                        </span>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {t.channel || 'whatsapp'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Auto-triggered on: <span className="font-semibold text-slate-600">{t.event_trigger || t.name}</span>
                      </p>
                    </div>

                    {/* Active toggle */}
                    <button
                      type="button"
                      onClick={() => updateTemplate.mutate({ id: t.id, is_active: !t.is_active })}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                        t.is_active 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {t.is_active ? 'Active' : 'Disabled'}
                    </button>
                  </div>

                  <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-mono text-slate-700 leading-relaxed whitespace-pre-wrap line-clamp-4">
                    {t.body}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Template #{t.id}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTemplate(t);
                        setTemplateBody(t.body);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Edit2 size={12} />
                      <span>Edit Body</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestModal(t)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <Send size={12} />
                      <span>Test Send</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Edit Template Modal */}
      <AnimatedModal isOpen={!!editingTemplate} onClose={() => setEditingTemplate(null)}>
        <div className="p-6 sm:p-7 max-w-lg w-full bg-white rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <Edit2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Edit Template: {editingTemplate?.name}
              </h3>
              <p className="text-xs text-slate-400">Modify dynamic variables and template text</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Template Body (Supports {'{{variable}}'})</label>
              <textarea
                value={templateBody}
                onChange={e => setTemplateBody(e.target.value)}
                rows={6}
                className="w-full border border-slate-200 rounded-2xl p-3.5 text-xs font-mono font-medium focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-800 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertCircle size={13} /> Available Placeholder Variables:
              </p>
              <p className="font-mono text-[10px]">
                {'{{customer_name}}'}, {'{{service_name}}'}, {'{{booking_date}}'}, {'{{booking_time}}'}, {'{{invoice_number}}'}, {'{{amount}}'}, {'{{coupon_code}}'}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="h-10 px-4 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={updateTemplate.isPending}
                className="h-10 px-5 bg-slate-900 hover:bg-black text-white rounded-2xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <Check size={14} />
                {updateTemplate.isPending ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      </AnimatedModal>

      {/* Test Send Template Modal */}
      <AnimatedModal isOpen={!!testModal} onClose={() => setTestModal(null)}>
        <div className="p-6 sm:p-7 max-w-md w-full bg-white rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Send size={18} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Test Dispatch: {testModal?.name}
              </h3>
              <p className="text-xs text-slate-400">Send a sample message with mock values</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Recipient Phone (Country Code e.g. 91...)</label>
              <input
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                className="w-full h-11 border border-slate-200 rounded-2xl px-4 text-xs font-bold font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50 focus:bg-white"
                placeholder="919408424541"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-mono text-slate-600 line-clamp-4">
              {testModal?.body}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTestModal(null)}
                className="h-10 px-4 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendTest}
                disabled={testTemplate.isPending}
                className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
              >
                <Send size={13} />
                {testTemplate.isPending ? 'Sending...' : 'Send Test'}
              </button>
            </div>
          </div>
        </div>
      </AnimatedModal>
    </PageTransition>
  );
}
