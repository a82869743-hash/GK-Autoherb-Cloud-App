import { useEffect, useState } from 'react';
import { Bot, CheckCircle2, AlertTriangle, Send, Loader2, PlugZap, Copy, MessageCircle, Search } from 'lucide-react';
import { useReplyInbox, useSimulateIncoming, useUpdateInbox, useWhatsAppInbox, useWhatsAppProviderStatus } from '../../api/hooks/useAdminAutomation';
import { useUIStore } from '../../store/uiStore';
import { createSocket } from '../../lib/socket';
import { useAuthStore } from '../../store/authStore';
import { useQueryClient } from '@tanstack/react-query';

const CATEGORIES: { key: string; label: string; tone: string }[] = [
  { key: 'all', label: 'All', tone: 'bg-slate-100 text-slate-700' },
  { key: 'confirmation', label: 'Confirmed', tone: 'bg-emerald-50 text-emerald-700' },
  { key: 'cancellation', label: 'Cancelled', tone: 'bg-red-50 text-red-700' },
  { key: 'reschedule', label: 'Reschedule', tone: 'bg-amber-50 text-amber-700' },
  { key: 'complaint', label: 'Complaints', tone: 'bg-rose-100 text-rose-800' },
  { key: 'status_query', label: 'Status', tone: 'bg-sky-50 text-sky-700' },
  { key: 'pricing_query', label: 'Pricing', tone: 'bg-violet-50 text-violet-700' },
  { key: 'booking_query', label: 'Booking', tone: 'bg-indigo-50 text-indigo-700' },
  { key: 'feedback', label: 'Feedback', tone: 'bg-teal-50 text-teal-700' },
  { key: 'greeting', label: 'Hello', tone: 'bg-slate-100 text-slate-600' },
  { key: 'other', label: 'Other', tone: 'bg-slate-100 text-slate-600' },
];
const toneOf = (k: string) => CATEGORIES.find((c) => c.key === k)?.tone || 'bg-slate-100 text-slate-600';
const labelOf = (k: string) => CATEGORIES.find((c) => c.key === k)?.label || k;

export default function WhatsAppInboxPanel() {
  const toast = useUIStore((s) => s.toast);
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('needs_attention');
  const [search, setSearch] = useState('');
  const { data, isLoading } = useWhatsAppInbox({ category, status, search: search || undefined });
  const { data: provider } = useWhatsAppProviderStatus();
  const update = useUpdateInbox();
  const reply = useReplyInbox();
  const simulate = useSimulateIncoming();
  const [replyFor, setReplyFor] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sim, setSim] = useState({ phone: '', message: 'YES' });
  const [simResult, setSimResult] = useState<any>(null);

  // New WhatsApp messages appear instantly
  useEffect(() => {
    const socket = createSocket(token);
    socket.on('whatsapp_inbox', () => qc.invalidateQueries({ queryKey: ['wa-inbox'] }));
    return () => {
      socket.disconnect();
    };
  }, [token]);

  const items = data?.data || [];
  const counts = data?.counts || [];
  const needsAttention = counts.filter((c: any) => c.status === 'needs_attention').reduce((n: number, c: any) => n + Number(c.n), 0);
  const countFor = (cat: string) => counts.filter((c: any) => (cat === 'all' || c.category === cat) && (status === 'all' || c.status === status)).reduce((n: number, c: any) => n + Number(c.n), 0);

  return (
    <div className="space-y-4">
      {/* Connection status */}
      <div className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${provider?.connected ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/60'}`}>
        <PlugZap className={provider?.connected ? 'text-emerald-600' : 'text-amber-600'} size={22} />
        <div className="flex-1 text-sm">
          <p className="font-bold text-slate-900">{provider?.connected ? 'WhatsApp Cloud API connected' : 'WhatsApp API not connected yet — messages are queued'}</p>
          <p className="text-slate-600 text-xs mt-0.5">
            {provider?.connected
              ? 'Messages and replies go out automatically. Incoming replies are handled by the auto-bot.'
              : 'Add WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN and WHATSAPP_APP_SECRET to server/.env, then point the Meta webhook to the URL below. Everything else is ready.'}
          </p>
        </div>
        {provider?.webhook_url && (
          <button
            onClick={() => { navigator.clipboard?.writeText(provider.webhook_url); toast('success', 'Webhook URL copied'); }}
            className="text-xs font-mono bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-2 max-w-full truncate"
          >
            <Copy size={13} /> {provider.webhook_url}
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Inbox */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><MessageCircle size={18} className="text-emerald-600" /> Incoming WhatsApp</h3>
              <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
                {[
                  { k: 'needs_attention', l: `Needs reply${needsAttention ? ` (${needsAttention})` : ''}` },
                  { k: 'auto_resolved', l: 'Bot handled' },
                  { k: 'all', l: 'All' },
                ].map((o) => (
                  <button key={o.k} onClick={() => setStatus(o.k)} className={`px-3 py-1.5 rounded-lg ${status === o.k ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>{o.l}</button>
                ))}
              </div>
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search phone, name or message" className="w-full h-10 rounded-xl border border-slate-200 pl-9 pr-3 text-sm" />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold border ${category === c.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600'}`}
                >
                  {c.label} <span className="opacity-60">{countFor(c.key)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto">
            {isLoading ? (
              <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
            ) : items.length === 0 ? (
              <p className="p-10 text-center text-sm text-slate-500">Nothing here. {status === 'needs_attention' ? 'The bot has handled everything 🎉' : ''}</p>
            ) : (
              items.map((m: any) => (
                <div key={m.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm flex items-center justify-center shrink-0">
                      {(m.customer_name || m.contact_name || '?').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{m.customer_name || m.contact_name || 'Unknown'}</span>
                        <span className="text-xs text-slate-400">+{m.phone}</span>
                        <span className={`text-[10px] font-bold uppercase rounded-full px-2 py-0.5 ${toneOf(m.category)}`}>{labelOf(m.category)}</span>
                        {m.status === 'needs_attention' ? (
                          <span className="text-[10px] font-bold text-amber-700 flex items-center gap-1"><AlertTriangle size={11} /> Needs reply</span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1"><CheckCircle2 size={11} /> {m.status === 'resolved' ? `Resolved${m.handled_by_name ? ` by ${m.handled_by_name}` : ''}` : 'Bot handled'}</span>
                        )}
                        <span className="text-[11px] text-slate-400 ml-auto">{new Date(m.received_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                      </div>
                      <p className="mt-1.5 text-sm text-slate-800 bg-slate-50 rounded-xl rounded-tl-sm px-3 py-2 inline-block">{m.message_body}</p>
                      {m.auto_reply && (
                        <p className="mt-1.5 text-xs text-slate-600 flex gap-1.5"><Bot size={13} className="text-[#D32F2F] shrink-0 mt-0.5" /> <span className="whitespace-pre-line">{m.auto_reply}</span></p>
                      )}
                      {m.auto_action && <p className="mt-1 text-[11px] font-semibold text-slate-500">Action: {m.auto_action.replace(/_/g, ' ')}{m.booking_id ? ` · booking #${m.booking_id}` : ''}</p>}

                      {replyFor === m.id ? (
                        <div className="mt-2 flex gap-2">
                          <input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Type a reply…" className="flex-1 h-10 rounded-xl border border-slate-200 px-3 text-sm" autoFocus />
                          <button
                            disabled={!replyText.trim() || reply.isPending}
                            onClick={async () => {
                              try {
                                const r = await reply.mutateAsync({ id: m.id, message: replyText.trim() });
                                toast('success', r.message);
                                if (r.data?.wa_link && r.data?.status !== 'sent') window.open(r.data.wa_link, '_blank');
                                setReplyFor(null);
                                setReplyText('');
                              } catch (err: any) {
                                toast('error', err?.response?.data?.error || 'Reply failed');
                              }
                            }}
                            className="h-10 px-4 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Send size={14} /> Send
                          </button>
                        </div>
                      ) : (
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => { setReplyFor(m.id); setReplyText(''); }} className="text-xs font-bold text-emerald-700 hover:underline">Reply</button>
                          {m.status !== 'resolved' && (
                            <button onClick={() => update.mutate({ id: m.id, status: 'resolved' })} className="text-xs font-bold text-slate-500 hover:underline">Mark resolved</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bot simulator */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 h-fit space-y-3">
          <h3 className="font-bold text-slate-900 flex items-center gap-2"><Bot size={18} className="text-[#D32F2F]" /> Test the auto-bot</h3>
          <p className="text-xs text-slate-500">Send a pretend customer message — the bot classifies it, acts on the booking and replies exactly as it will on WhatsApp.</p>
          <input value={sim.phone} onChange={(e) => setSim({ ...sim, phone: e.target.value })} placeholder="Customer mobile (10 digits)" className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm" />
          <div className="flex flex-wrap gap-1.5">
            {['YES', 'NO', 'RESCHEDULE', 'Is my car ready?', 'What are your prices?', 'Not happy with polish'].map((t) => (
              <button key={t} onClick={() => setSim({ ...sim, message: t })} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${sim.message === t ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600'}`}>{t}</button>
            ))}
          </div>
          <textarea value={sim.message} onChange={(e) => setSim({ ...sim, message: e.target.value })} rows={2} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <button
            disabled={!sim.phone || !sim.message || simulate.isPending}
            onClick={async () => {
              try {
                setSimResult(await simulate.mutateAsync(sim));
              } catch (err: any) {
                toast('error', err?.response?.data?.error || 'Bot failed');
              }
            }}
            className="w-full h-10 rounded-xl bg-[#D32F2F] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {simulate.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Simulate incoming message
          </button>
          {simResult && (
            <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1">
              <p><b>Category:</b> {labelOf(simResult.category)} · <b>Status:</b> {simResult.status.replace('_', ' ')}</p>
              {simResult.action && <p><b>Action:</b> {simResult.action.replace(/_/g, ' ')}{simResult.booking_id ? ` (booking #${simResult.booking_id})` : ''}</p>}
              <p className="whitespace-pre-line text-slate-700"><b>Reply:</b> {simResult.auto_reply}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
