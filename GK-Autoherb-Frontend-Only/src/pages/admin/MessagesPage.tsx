import { useState } from 'react';
import { Mail, Send, Activity, Users, MessageSquare, CheckCircle, Smartphone, ExternalLink, Sparkles } from 'lucide-react';
import { useMessagesLog, useSendBulkMessage, useMessagePreview } from '../../api/hooks/useMessages';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import Modal from '../../components/ui/Modal';
import Textarea from '../../components/ui/Textarea';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/shared/EmptyState';
import { useUIStore } from '../../store/uiStore';

export default function MessagesPage() {
  const toast = useUIStore((s) => s.toast);
  const { data, isLoading } = useMessagesLog();
  const sendBulkMut = useSendBulkMessage();

  const [modalOpen, setModalOpen] = useState(false);
  const [msgType, setMsgType] = useState('bulk_promotion');
  const [channel, setChannel] = useState('whatsapp');
  const [audience, setAudience] = useState('all');
  const [content, setContent] = useState('');

  const { data: previewData, isLoading: previewLoading } = useMessagePreview(msgType);
  const logs = data?.data || [];

  const handleSend = async () => {
    if (!content.trim()) {
      toast('error', 'Message content is required');
      return;
    }
    try {
      const res = await sendBulkMut.mutateAsync({
        message_type: msgType,
        channel,
        target_audience: audience,
        message_content: content
      });
      toast('success', `Campaign launched: Sent to ${res.data.sent} clients. Failed: ${res.data.failed}`);
      setModalOpen(false);
      setContent('');
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed to dispatch bulk campaign');
    }
  };

  const deliveryRate = logs.length 
    ? Math.round((logs.filter((l: any) => l.status === 'sent').length / logs.length) * 100) 
    : 0;

  return (
    <div className="space-y-6 pb-28 lg:pb-12 max-w-[1400px] mx-auto">
      <AdminHeaderBar
        title="Broadcast & Campaigns"
        subtitle="Manage promotional customer broadcasts, WhatsApp blasts, and review historical delivery logs"
        badge="Campaign Engine"
        actions={
          <button
            onClick={() => setModalOpen(true)}
            className="h-10 px-4 bg-[#D32F2F] hover:bg-[#b71c1c] text-white rounded-2xl text-xs font-bold shadow-md shadow-red-600/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <Send size={14} />
            New Campaign
          </button>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AdminMetricCard
          title="Campaigns Dispatched"
          value={logs.length}
          subtitle="Total individual message events"
          icon={Mail}
          variant="red"
          trend="Lifetime outreach"
        />
        <AdminMetricCard
          title="Delivery Success Rate"
          value={`${deliveryRate}%`}
          subtitle="Confirmed delivered to devices"
          icon={Activity}
          variant={deliveryRate > 80 ? "emerald" : "amber"}
          trend={{ text: `${deliveryRate}% deliverability`, positive: deliveryRate > 80 }}
        />
        <AdminMetricCard
          title="Targeted Audience"
          value={previewLoading ? '...' : previewData?.data?.target_count || 0}
          subtitle="Clients matching selected criteria"
          icon={Users}
          variant="purple"
          trend="Audience segment reach"
        />
      </div>

      {/* Messages Log Container */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Campaign Delivery Trail</h3>
            <p className="text-xs text-slate-400 mt-0.5">Real-time status updates from the messaging gateways</p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
            {logs.length} Records
          </span>
        </div>

        {isLoading ? (
          <div className="p-6 grid gap-4 grid-cols-1 md:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : !logs.length ? (
          <div className="text-center py-20 p-6">
            <Mail size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-800 font-bold text-base">No campaign logs recorded</p>
            <p className="text-slate-400 text-xs mt-1">Start a new campaign above to broadcast offers or updates to customers</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log: any) => {
              const waLink = log.response_data?.wa_link;
              return (
                <div key={log.id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-slate-900">{log.customer_name || 'Walk-in Client'}</span>
                      <span className="text-xs font-mono text-slate-400">({log.mobile})</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        log.status === 'sent' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                        log.status === 'failed' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 
                        log.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {log.status}
                      </span>
                      {log.template_name && (
                        <span className="px-2.5 py-0.5 bg-red-50 text-[#b71c1c] rounded-full text-[10px] font-bold border border-red-100">
                          {log.template_name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 font-medium max-w-xl leading-relaxed">{log.message_preview}</p>
                    {log.channel === 'whatsapp' && waLink && (
                      <a 
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 transition-all shadow-sm"
                      >
                        <ExternalLink size={12} /> Send via WhatsApp Direct
                      </a>
                    )}
                  </div>
                  <div className="sm:text-right shrink-0">
                    <span className="text-xs uppercase font-extrabold text-[#D32F2F] bg-red-50 px-2 py-0.5 rounded-lg border border-red-100 inline-block tracking-wider">
                      {log.channel}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      {new Date(log.sent_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Campaign Modal */}
      <Modal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title="Compose New Campaign" 
        size="md"
        footer={
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={() => setModalOpen(false)}
              className="h-10 px-4 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={handleSend} 
              disabled={sendBulkMut.isPending}
              className="h-10 px-5 bg-[#D32F2F] hover:bg-[#b71c1c] text-white rounded-2xl text-xs font-bold shadow-md shadow-red-600/20 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Send size={13} />
              {sendBulkMut.isPending ? 'Broadcasting...' : 'Launch Broadcast'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Campaign Objective</label>
              <select 
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 text-xs font-bold focus:ring-2 focus:ring-red-500/20 focus:bg-white text-slate-700" 
                value={msgType} 
                onChange={e => setMsgType(e.target.value)}
              >
                <option value="bulk_promotion">Studio Seasonal Promotion</option>
                <option value="bulk_free_wash">Complimentary Wash Voucher</option>
                <option value="bulk_credits">Store Credits Voucher</option>
                <option value="bulk_reengagement">Inactive Client Re-engagement</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Delivery Channel</label>
              <select 
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 text-xs font-bold focus:ring-2 focus:ring-red-500/20 focus:bg-white text-slate-700" 
                value={channel} 
                onChange={e => setChannel(e.target.value)}
              >
                <option value="whatsapp">WhatsApp Business API</option>
                <option value="sms">Transactional SMS Gateway</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Message Copy</label>
            <textarea 
              value={content} 
              onChange={e => setContent(e.target.value)} 
              placeholder="Type your message text here. Dynamic tags: {{customer_name}}, {{credits}} are supported."
              className="w-full h-32 p-3.5 text-xs font-medium border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 resize-none leading-relaxed" 
            />
          </div>
          <p className="text-[11px] text-slate-400 italic">
            Automated pacing limits apply to prevent carrier spam filtering.
          </p>
        </div>
      </Modal>
    </div>
  );
}
