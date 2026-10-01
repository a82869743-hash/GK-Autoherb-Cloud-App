import { useState } from 'react';
import { 
  Bot, MessageSquare, Phone, User, Search, Filter, Sparkles, 
  Clock, Plus, Trash2, Edit3, CheckCircle2, AlertCircle, ArrowRight,
  Send, RefreshCw, ExternalLink, HelpCircle, Shield, Layers, Eye
} from 'lucide-react';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import { 
  useAdminChatbotStats, 
  useAdminChatbotConversations, 
  useAdminChatbotMessages, 
  useAdminChatbotReply, 
  useAdminChatbotKnowledge, 
  useAdminSaveKnowledge, 
  useAdminDeleteKnowledge,
  ChatbotKnowledgeItem
} from '../../api/hooks/useChatbot';
import { useUIStore } from '../../store/uiStore';
import { formatTime } from '../../utils/formatters';

export default function AdminChatbotPage() {
  const toast = useUIStore((s) => s.toast);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<'all' | 'lead_captured' | 'active'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);

  // Right sidebar tab: 'profile' | 'knowledge'
  const [rightTab, setRightTab] = useState<'profile' | 'knowledge'>('profile');

  // Admin reply text
  const [adminReplyText, setAdminReplyText] = useState('');

  // Knowledge base form modal
  const [editingKb, setEditingKb] = useState<Partial<ChatbotKnowledgeItem> | null>(null);
  const [kbModalOpen, setKbModalOpen] = useState(false);

  // Queries & Mutations
  const { data: stats } = useAdminChatbotStats();
  const { data: convsData, isLoading: loadingConvs, refetch: refetchConvs } = useAdminChatbotConversations({
    status: statusFilter,
    search: searchTerm,
  });

  const conversations = convsData?.conversations || [];
  const currentConvId = selectedConvId || (conversations.length > 0 ? conversations[0].id : null);

  const { data: transcriptData, isLoading: loadingTranscript } = useAdminChatbotMessages(currentConvId);
  const replyMut = useAdminChatbotReply();

  const { data: knowledgeList = [], refetch: refetchKnowledge } = useAdminChatbotKnowledge();
  const saveKbMut = useAdminSaveKnowledge();
  const deleteKbMut = useAdminDeleteKnowledge();

  const activeConv = transcriptData?.conversation || conversations.find(c => c.id === currentConvId);
  const messages = transcriptData?.messages || [];

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentConvId || !adminReplyText.trim() || replyMut.isPending) return;

    try {
      await replyMut.mutateAsync({
        conversationId: currentConvId,
        message: adminReplyText.trim()
      });
      setAdminReplyText('');
      toast('success', 'Admin message posted to customer conversation');
    } catch {
      toast('error', 'Failed to send admin message');
    }
  };

  const handleSaveKb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKb?.keywords || !editingKb?.question || !editingKb?.answer) {
      toast('error', 'Keywords, question, and answer are required');
      return;
    }

    try {
      await saveKbMut.mutateAsync(editingKb);
      toast('success', editingKb.id ? 'Knowledge item updated' : 'New knowledge rule created');
      setKbModalOpen(false);
      setEditingKb(null);
    } catch {
      toast('error', 'Failed to save knowledge item');
    }
  };

  const handleDeleteKb = async (id: number) => {
    if (!confirm('Are you sure you want to delete this knowledge rule?')) return;
    try {
      await deleteKbMut.mutateAsync(id);
      toast('success', 'Knowledge rule deleted');
    } catch {
      toast('error', 'Failed to delete knowledge rule');
    }
  };

  return (
    <div className="space-y-6 pb-28 lg:pb-12 max-w-[1650px] mx-auto font-sans">
      <AdminHeaderBar
        title="AI Chatbot Monitoring Channel"
        subtitle="Live conversation transcripts, customer queries, lead capture, and real-time studio knowledge tuning"
        badge="Real-Time AI Channel"
      >
        <button
          onClick={() => {
            setEditingKb({
              category: 'general',
              keywords: '',
              question: '',
              answer: '',
              action_url: '',
              action_label: '',
              is_active: 1
            });
            setKbModalOpen(true);
          }}
          className="px-4 py-2.5 bg-[#D32F2F] hover:bg-[#b71c1c] text-white text-xs font-bold rounded-2xl shadow-sm hover:shadow transition-all inline-flex items-center gap-1.5 active:scale-95"
        >
          <Plus size={15} />
          <span>+ Add Knowledge Rule</span>
        </button>
      </AdminHeaderBar>

      {/* ─── Top 4 KPI Metrics ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <AdminMetricCard
          label="Total Bot Conversations"
          value={stats?.total_conversations || 0}
          icon={<Bot size={18} />}
          trend="Live Sessions"
        />
        <AdminMetricCard
          label="Leads Captured"
          value={stats?.leads_captured || 0}
          icon={<Sparkles size={18} />}
          trend="Callbacks & Quotes"
        />
        <AdminMetricCard
          label="Total Messages Exchanged"
          value={stats?.total_messages || 0}
          icon={<MessageSquare size={18} />}
          trend="Customer Inquiries"
        />
        <AdminMetricCard
          label="Active Knowledge Rules"
          value={stats?.active_knowledge_items || knowledgeList.length}
          icon={<HelpCircle size={18} />}
          trend="Studio FAQs"
        />
      </div>

      {/* ─── Main 3-Panel Split Workspace ─────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[700px]">
        
        {/* Panel 1: Conversations Feed (Left - 3.5 Cols) */}
        <div className="lg:col-span-4 border-r border-slate-200/80 flex flex-col h-[700px]">
          {/* Header & Search */}
          <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/40 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                Customer Inquiries ({conversations.length})
              </span>
              <button
                onClick={() => refetchConvs()}
                className="w-7 h-7 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
                title="Refresh Feed"
              >
                <RefreshCw size={13} />
              </button>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by customer, phone, or question..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 pt-1">
              {[
                { id: 'all', label: 'All Chats' },
                { id: 'lead_captured', label: '⭐ Leads Captured' },
                { id: 'active', label: 'General' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setStatusFilter(pill.id as any)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${
                    statusFilter === pill.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingConvs ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">No chat sessions match your search.</div>
            ) : (
              conversations.map((c) => {
                const isSelected = c.id === currentConvId;
                const isLead = c.lead_status === 'lead_captured';
                const displayName = c.customer_name || c.auth_user_name || 'Guest Inquirer';
                const phone = c.customer_phone || c.auth_user_mobile;

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedConvId(c.id)}
                    className={`w-full text-left p-4 transition-all flex items-start gap-3 hover:bg-slate-50 ${
                      isSelected ? 'bg-red-50/50 border-l-4 border-l-[#D32F2F]' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {displayName.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-extrabold text-xs text-slate-900 truncate">
                          {displayName}
                        </span>
                        {c.last_message_time && (
                          <span className="text-[10px] text-slate-400 whitespace-nowrap font-medium">
                            {formatTime(c.last_message_time)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mb-1">
                        {phone && <span>{phone}</span>}
                        {c.message_count !== undefined && (
                          <span className="px-1.5 py-0.2 bg-slate-100 rounded text-[9px] font-bold text-slate-600 font-sans">
                            {c.message_count} msgs
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 truncate font-medium">
                        {c.last_message || c.summary || 'Started chat conversation...'}
                      </p>

                      {isLead && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
                          <Sparkles size={10} />
                          <span>Lead Captured</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Panel 2: Transcript Viewer (Center - 5 Cols) */}
        <div className="lg:col-span-5 border-r border-slate-200/80 flex flex-col h-[700px] bg-slate-50/30">
          {activeConv ? (
            <>
              {/* Transcript Header */}
              <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#D32F2F] flex items-center justify-center font-bold">
                    <User size={18} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">
                      {activeConv.customer_name || activeConv.auth_user_name || 'Guest User'}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono">
                      {activeConv.customer_phone || activeConv.auth_user_mobile || 'Unidentified Contact'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeConv.customer_phone && (
                    <a
                      href={`tel:${activeConv.customer_phone}`}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Phone size={13} />
                      <span>Call Client</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Message Chronological Stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
                {loadingTranscript ? (
                  <div className="p-8 text-center text-slate-400 text-xs font-medium">Loading chat transcript...</div>
                ) : messages.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs font-medium">No messages yet.</div>
                ) : (
                  messages.map((m, idx) => {
                    const isBot = m.sender === 'bot';
                    const isAdmin = m.sender === 'admin';
                    const meta = m.metadata;

                    return (
                      <div key={idx} className={`flex flex-col ${isBot ? 'items-start' : isAdmin ? 'items-center' : 'items-end'}`}>
                        <div className="flex items-center gap-2 mb-1 px-1 text-[10px] font-bold text-slate-400">
                          <span>{isAdmin ? '🛡️ Admin Note' : isBot ? '🤖 GK AI Bot' : '👤 Customer'}</span>
                          {m.created_at && <span>• {formatTime(m.created_at)}</span>}
                          {meta?.intent && (
                            <span className="px-1.5 py-0.2 bg-slate-200/70 text-slate-600 rounded text-[9px]">
                              intent: {meta.intent}
                            </span>
                          )}
                        </div>

                        <div className={`max-w-[90%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                          isAdmin
                            ? 'bg-amber-500 text-white font-medium shadow-sm'
                            : isBot
                            ? 'bg-white text-slate-800 border border-slate-200 shadow-xs'
                            : 'bg-slate-900 text-white font-medium shadow-xs'
                        }`}>
                          <div className="whitespace-pre-wrap">{m.message}</div>

                          {meta?.actionUrl && (
                            <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] font-bold text-[#D32F2F] flex items-center gap-1">
                              <ExternalLink size={12} />
                              <span>Link Provided: {meta.actionLabel || meta.actionUrl}</span>
                            </div>
                          )}

                          {meta?.chips && meta.chips.length > 0 && (
                            <div className="mt-2 pt-1 flex flex-wrap gap-1">
                              {meta.chips.map((c, i) => (
                                <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-semibold">
                                  {c}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Admin Intervene / Reply Composer */}
              <form onSubmit={handleSendAdminReply} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  value={adminReplyText}
                  onChange={(e) => setAdminReplyText(e.target.value)}
                  placeholder="Send direct message from Admin into this chat..."
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={!adminReplyText.trim() || replyMut.isPending}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-[#D32F2F] text-white text-xs font-bold rounded-2xl transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-xs shrink-0"
                >
                  <Send size={13} />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Bot size={40} className="text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-700">Select a Conversation</p>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Choose a customer conversation from the left feed to view all questions and bot replies in real-time.
              </p>
            </div>
          )}
        </div>

        {/* Panel 3: Knowledge Base & Lead Controls (Right - 3.5 Cols) */}
        <div className="lg:col-span-3 flex flex-col h-[700px] bg-white">
          {/* Header Switcher */}
          <div className="p-4 border-b border-slate-100 flex items-center gap-2 shrink-0">
            <button
              onClick={() => setRightTab('profile')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                rightTab === 'profile'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Customer Info
            </button>
            <button
              onClick={() => setRightTab('knowledge')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                rightTab === 'knowledge'
                  ? 'bg-[#D32F2F] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Bot Knowledge Base
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {rightTab === 'profile' ? (
              activeConv ? (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Lead Metadata</span>
                    <div>
                      <span className="text-xs text-slate-500 font-medium">Customer Name</span>
                      <p className="text-sm font-black text-slate-900">{activeConv.customer_name || activeConv.auth_user_name || 'Guest'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-medium">Contact Mobile</span>
                      <p className="text-xs font-mono font-bold text-slate-800">{activeConv.customer_phone || activeConv.auth_user_mobile || 'None provided'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-medium">Lead Status</span>
                      <div className="mt-1">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          activeConv.lead_status === 'lead_captured' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {activeConv.lead_status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {activeConv.customer_phone && (
                    <div className="space-y-2">
                      <a
                        href={`tel:${activeConv.customer_phone}`}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
                      >
                        <Phone size={14} />
                        <span>Call Customer Now</span>
                      </a>
                    </div>
                  )}

                  <div className="p-4 bg-red-50/70 border border-red-100 rounded-2xl space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-700">Inquiry Routing</span>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      Whenever the bot detects callback requests or phone numbers, it creates a studio lead in the database and notifies this channel.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-10">No customer selected.</p>
              )
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Active Rules ({knowledgeList.length})
                  </span>
                  <button
                    onClick={() => {
                      setEditingKb({
                        category: 'general',
                        keywords: '',
                        question: '',
                        answer: '',
                        action_url: '',
                        action_label: '',
                        is_active: 1
                      });
                      setKbModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-[#D32F2F] hover:underline"
                  >
                    + Add New
                  </button>
                </div>

                <div className="space-y-2.5">
                  {knowledgeList.map((kb) => (
                    <div key={kb.id} className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 rounded-2xl space-y-1.5 transition-all text-left">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-md text-[9px] font-bold uppercase tracking-wider">
                          {kb.category}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditingKb(kb); setKbModalOpen(true); }}
                            className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-700 flex items-center justify-center hover:bg-white"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={() => kb.id && handleDeleteKb(kb.id)}
                            className="w-6 h-6 rounded-lg text-slate-400 hover:text-red-600 flex items-center justify-center hover:bg-white"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs font-extrabold text-slate-900 leading-snug">{kb.question}</p>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed font-medium">{kb.answer}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Triggers: {kb.keywords}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Knowledge Item Edit / Create Modal ───────────────────── */}
      {kbModalOpen && editingKb && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">
                {editingKb.id ? 'Edit Knowledge Rule' : 'Add Knowledge Rule'}
              </h3>
              <button
                onClick={() => { setKbModalOpen(false); setEditingKb(null); }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveKb} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={editingKb.category || 'general'}
                  onChange={(e) => setEditingKb({ ...editingKb, category: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-semibold bg-slate-50 focus:bg-white outline-none"
                >
                  <option value="general">General Help</option>
                  <option value="services">Services & Detailing</option>
                  <option value="packages">Membership Packages</option>
                  <option value="products">Store Products & Stock</option>
                  <option value="helpline">Helpline & Studio Info</option>
                  <option value="pickup_drop">Pickup & Valet Delivery</option>
                  <option value="loyalty">Loyalty Rewards</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Trigger Keywords (comma separated)</label>
                <input
                  type="text"
                  value={editingKb.keywords || ''}
                  onChange={(e) => setEditingKb({ ...editingKb, keywords: e.target.value })}
                  placeholder="e.g. ceramic, 9h, glass coating, durability"
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-medium bg-slate-50 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Question / Intent</label>
                <input
                  type="text"
                  value={editingKb.question || ''}
                  onChange={(e) => setEditingKb({ ...editingKb, question: e.target.value })}
                  placeholder="e.g. How long does the 9H Ceramic coating last?"
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-medium bg-slate-50 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bot Answer Reply</label>
                <textarea
                  rows={4}
                  value={editingKb.answer || ''}
                  onChange={(e) => setEditingKb({ ...editingKb, answer: e.target.value })}
                  placeholder="Enter the official answer the AI bot will speak to customers..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs font-medium bg-slate-50 focus:bg-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Action Link (Optional)</label>
                  <input
                    type="text"
                    value={editingKb.action_url || ''}
                    onChange={(e) => setEditingKb({ ...editingKb, action_url: e.target.value })}
                    placeholder="e.g. /customer"
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-medium bg-slate-50 focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Action Button Text</label>
                  <input
                    type="text"
                    value={editingKb.action_label || ''}
                    onChange={(e) => setEditingKb({ ...editingKb, action_label: e.target.value })}
                    placeholder="e.g. View Service Menu"
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-medium bg-slate-50 focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => { setKbModalOpen(false); setEditingKb(null); }}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveKbMut.isPending}
                  className="flex-1 py-2.5 bg-[#D32F2F] hover:bg-[#b71c1c] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles size={14} />
                  <span>Save Rule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
