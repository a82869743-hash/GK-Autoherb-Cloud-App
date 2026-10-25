import { useEffect, useMemo, useState } from 'react';
import { Cake, Heart, Send, Plus, Pencil, Trash2, Loader2, Gift, Search, X, Clock, CheckCircle2 } from 'lucide-react';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import {
  useDeleteGreetingCampaign, useGreetingCampaigns, useGreetingLogs, useSaveGreetingCampaign, useSendGreeting, useUpcomingOccasions,
} from '../../api/hooks/useAdminAutomation';
import { useUIStore } from '../../store/uiStore';
import api from '../../api/axiosInstance';

const VARS = ['{{customer_name}}', '{{offer_text}}', '{{offer_code}}', '{{valid_till}}', '{{booking_url}}'];
const EMPTY = { occasion: 'birthday', customer_id: null as number | null, customer_label: '', title: '', message_body: '', offer_code: '', discount_percent: '', discount_amount: '', valid_days: 7, is_active: true };

function preview(body: string, name = 'Rahul', c?: any) {
  const pct = Number(c?.discount_percent);
  const amt = Number(c?.discount_amount);
  const offer = pct ? `${pct}% off your next service` : amt ? `₹${amt} off your next service` : '';
  return (body || '')
    .replace(/\{\{\s*customer_name\s*\}\}/g, name)
    .replace(/\{\{\s*offer_text\s*\}\}/g, offer)
    .replace(/\{\{\s*offer_code\s*\}\}/g, c?.offer_code ? `${String(c.offer_code).toUpperCase()}1234` : '')
    .replace(/\{\{\s*valid_till\s*\}\}/g, new Date(Date.now() + (Number(c?.valid_days) || 7) * 864e5).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }))
    .replace(/\{\{\s*booking_url\s*\}\}/g, `${window.location.origin}/customer/bookings/new`);
}

export default function GreetingsPage() {
  const toast = useUIStore((s) => s.toast);
  const [tab, setTab] = useState<'upcoming' | 'campaigns' | 'logs'>('upcoming');
  const [days, setDays] = useState(30);
  const { data: upcoming, isLoading } = useUpcomingOccasions(days);
  const { data: campaigns = [] } = useGreetingCampaigns();
  const { data: logs = [] } = useGreetingLogs();
  const saveCampaign = useSaveGreetingCampaign();
  const deleteCampaign = useDeleteGreetingCampaign();
  const sendGreeting = useSendGreeting();

  const [editing, setEditing] = useState<any>(null);
  const [sendFor, setSendFor] = useState<any>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [custSearch, setCustSearch] = useState('');
  const [custResults, setCustResults] = useState<any[]>([]);

  useEffect(() => {
    if (!editing || custSearch.trim().length < 2) { setCustResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await api.get('/customers', { params: { search: custSearch.trim(), limit: 8 } });
        setCustResults(r.data.data || []);
      } catch { setCustResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [custSearch, editing]);

  const defaultFor = (occasion: string) => campaigns.find((c: any) => c.occasion === occasion && !c.customer_id);
  const totals = upcoming?.totals || {};
  const list = upcoming?.data || [];
  const todayCount = list.filter((u: any) => u.days_away === 0).length;

  const openSend = (u: any) => {
    setSendFor(u);
    const personal = campaigns.find((c: any) => c.customer_id === u.id && c.occasion === u.occasion && c.is_active);
    setCustomMessage((personal || defaultFor(u.occasion))?.message_body || '');
  };

  const doSend = async () => {
    try {
      const r = await sendGreeting.mutateAsync({ customer_id: sendFor.id, occasion: sendFor.occasion, message: customMessage });
      toast('success', r.message);
      if (r.data?.wa_link && r.data?.whatsapp !== 'sent') window.open(r.data.wa_link, '_blank');
      setSendFor(null);
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Could not send');
    }
  };

  const doSave = async () => {
    if (!editing.message_body.trim()) return toast('error', 'Write the message');
    try {
      await saveCampaign.mutateAsync({
        id: editing.id,
        occasion: editing.occasion,
        customer_id: editing.customer_id,
        title: editing.title || (editing.customer_id ? `${editing.occasion === 'birthday' ? 'Birthday' : 'Anniversary'} offer for ${editing.customer_label}` : `Default ${editing.occasion} wish`),
        message_body: editing.message_body,
        offer_code: editing.offer_code || null,
        discount_percent: editing.discount_percent || null,
        discount_amount: editing.discount_amount || null,
        valid_days: editing.valid_days,
        is_active: editing.is_active,
      });
      toast('success', 'Saved');
      setEditing(null);
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Could not save');
    }
  };

  const personalCampaigns = useMemo(() => campaigns.filter((c: any) => c.customer_id), [campaigns]);

  return (
    <div className="space-y-5">
      <AdminHeaderBar title="Birthday & Anniversary Wishes" subtitle="Automatic WhatsApp wishes at 9 AM on the day, with a personal gift coupon" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Today's occasions", value: todayCount, icon: Gift, tone: 'text-[#D32F2F] bg-red-50' },
          { label: `Next ${days} days`, value: list.length, icon: Clock, tone: 'text-amber-600 bg-amber-50' },
          { label: 'Customers with birthday', value: totals.with_birthday || 0, icon: Cake, tone: 'text-pink-600 bg-pink-50' },
          { label: 'Customers with anniversary', value: totals.with_anniversary || 0, icon: Heart, tone: 'text-rose-600 bg-rose-50' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
            <span className={`h-10 w-10 rounded-xl flex items-center justify-center ${tone}`}><Icon size={20} /></span>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 leading-none">{value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          { k: 'upcoming', l: 'Upcoming' },
          { k: 'campaigns', l: `Messages & offers (${campaigns.length})` },
          { k: 'logs', l: 'Sent log' },
        ].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k as any)} className={`px-4 py-2 rounded-2xl text-xs font-bold ${tab === t.k ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{t.l}</button>
        ))}
        {tab === 'upcoming' && (
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="ml-auto h-9 rounded-xl border border-slate-200 px-3 text-xs font-bold">
            <option value={7}>Next 7 days</option>
            <option value={30}>Next 30 days</option>
            <option value={90}>Next 90 days</option>
            <option value={366}>Whole year</option>
          </select>
        )}
        {tab === 'campaigns' && (
          <button onClick={() => { setEditing({ ...EMPTY }); setCustSearch(''); }} className="ml-auto h-9 px-4 rounded-xl bg-[#D32F2F] text-white text-xs font-bold flex items-center gap-1.5">
            <Plus size={14} /> Personal offer for a customer
          </button>
        )}
      </div>

      {tab === 'upcoming' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
          ) : list.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500">No birthdays or anniversaries in this period. Customers add these dates from their app profile.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {list.map((u: any) => (
                <div key={`${u.occasion}-${u.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className={`h-10 w-10 rounded-xl flex items-center justify-center ${u.occasion === 'birthday' ? 'bg-pink-50 text-pink-600' : 'bg-rose-50 text-rose-600'}`}>
                    {u.occasion === 'birthday' ? <Cake size={19} /> : <Heart size={19} />}
                  </span>
                  <div className="flex-1 min-w-[160px]">
                    <p className="font-bold text-sm text-slate-900">{u.name} <span className="text-xs font-normal text-slate-400">· {u.mobile}</span></p>
                    <p className="text-xs text-slate-500">
                      {u.occasion === 'birthday' ? 'Birthday' : 'Anniversary'} on {new Date(`${u.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })} ·{' '}
                      <b className={u.days_away === 0 ? 'text-[#D32F2F]' : ''}>{u.days_away === 0 ? 'Today' : u.days_away === 1 ? 'Tomorrow' : `in ${u.days_away} days`}</b>
                    </p>
                  </div>
                  {u.has_personal_offer > 0 && <span className="text-[10px] font-bold uppercase rounded-full bg-violet-50 text-violet-700 px-2 py-0.5">Personal offer</span>}
                  {u.sent_this_year > 0 ? (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1"><CheckCircle2 size={14} /> Sent this year</span>
                  ) : (
                    <span className="text-xs text-slate-400">Auto-sends at 9 AM</span>
                  )}
                  <button
                    onClick={() => { setEditing({ ...EMPTY, occasion: u.occasion, customer_id: u.id, customer_label: u.name, message_body: defaultFor(u.occasion)?.message_body || '', offer_code: defaultFor(u.occasion)?.offer_code || '', discount_percent: defaultFor(u.occasion)?.discount_percent || '' }); setCustSearch(''); }}
                    className="h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700"
                  >
                    Custom offer
                  </button>
                  <button onClick={() => openSend(u)} className="h-9 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5">
                    <Send size={13} /> Send now
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'campaigns' && (
        <div className="grid md:grid-cols-2 gap-3">
          {['birthday', 'anniversary'].map((occ) => {
            const c = defaultFor(occ);
            return (
              <div key={occ} className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-900 flex items-center gap-2">{occ === 'birthday' ? <Cake size={17} className="text-pink-600" /> : <Heart size={17} className="text-rose-600" />} Default {occ} wish</p>
                  {c && <button onClick={() => setEditing({ ...EMPTY, ...c, discount_percent: c.discount_percent || '', discount_amount: c.discount_amount || '', offer_code: c.offer_code || '', is_active: !!c.is_active })} className="text-xs font-bold text-[#D32F2F] flex items-center gap-1"><Pencil size={13} /> Edit</button>}
                </div>
                {c ? (
                  <>
                    <p className="mt-2 text-sm text-slate-700 bg-emerald-50/60 rounded-xl p-3 whitespace-pre-line">{preview(c.message_body, 'Rahul', c)}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {c.is_active ? 'Active' : 'Paused'} · {c.discount_percent ? `${Number(c.discount_percent)}% off` : c.discount_amount ? `₹${Number(c.discount_amount)} off` : 'No offer'} · code {c.offer_code || '—'} · valid {c.valid_days} days
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500 mt-2">Not set up.</p>
                )}
              </div>
            );
          })}
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <p className="px-4 py-3 font-bold text-slate-900 border-b border-slate-100">Personal offers ({personalCampaigns.length})</p>
            {personalCampaigns.length === 0 ? (
              <p className="p-6 text-sm text-slate-500 text-center">Pick a customer and give them their own message & offer for their birthday or anniversary.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {personalCampaigns.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                    {c.occasion === 'birthday' ? <Cake size={17} className="text-pink-600" /> : <Heart size={17} className="text-rose-600" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900">{c.customer_name} <span className="font-normal text-xs text-slate-400">{c.customer_mobile}</span></p>
                      <p className="text-xs text-slate-500 truncate">{c.discount_percent ? `${Number(c.discount_percent)}% off` : c.discount_amount ? `₹${Number(c.discount_amount)} off` : 'Wish only'} · {c.message_body}</p>
                    </div>
                    <button onClick={() => setEditing({ ...EMPTY, ...c, customer_label: c.customer_name, discount_percent: c.discount_percent || '', discount_amount: c.discount_amount || '', offer_code: c.offer_code || '', is_active: !!c.is_active })} className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><Pencil size={15} /></button>
                    <button onClick={() => confirm('Delete this personal offer?') && deleteCampaign.mutate(c.id)} className="h-8 w-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-500"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {logs.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500">No wishes sent yet.</p>
          ) : (
            logs.map((l: any) => (
              <div key={l.id} className="px-4 py-3">
                <p className="text-sm font-bold text-slate-900">{l.customer_name} · <span className="font-normal text-slate-500 capitalize">{l.occasion}</span></p>
                <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-line">{l.message_body}</p>
                <p className="text-[11px] text-slate-400 mt-1">{new Date(l.sent_at).toLocaleString('en-IN')} · {l.sent_via}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Send now */}
      {sendFor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setSendFor(null)}>
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900">Send {sendFor.occasion} wish to {sendFor.name}</h3>
              <button onClick={() => setSendFor(null)} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center"><X size={16} /></button>
            </div>
            <textarea value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} rows={5} className="w-full rounded-2xl border border-slate-200 p-3 text-sm" />
            <p className="text-[11px] text-slate-500">Variables: {VARS.join(' ')} — a personal single-use coupon is created automatically when the offer has a code.</p>
            <div className="rounded-2xl bg-emerald-50/70 p-3 text-sm whitespace-pre-line text-slate-700">{preview(customMessage, sendFor.name.split(' ')[0], campaigns.find((c: any) => c.customer_id === sendFor.id && c.occasion === sendFor.occasion) || defaultFor(sendFor.occasion))}</div>
            <button onClick={doSend} disabled={sendGreeting.isPending} className="w-full h-11 rounded-xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2">
              {sendGreeting.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send on WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Create / edit campaign */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setEditing(null)}>
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 space-y-3 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900">{editing.id ? 'Edit' : 'New'} {editing.customer_id || !editing.id ? 'personal' : 'default'} {editing.occasion} message</h3>
              <button onClick={() => setEditing(null)} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="flex gap-2">
              {['birthday', 'anniversary'].map((o) => (
                <button key={o} onClick={() => setEditing({ ...editing, occasion: o })} className={`flex-1 h-10 rounded-xl text-sm font-bold capitalize border ${editing.occasion === o ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600'}`}>{o}</button>
              ))}
            </div>
            {(editing.customer_id || !editing.id) && (
              <div>
                <label className="text-xs font-bold text-slate-700">Customer</label>
                {editing.customer_id ? (
                  <div className="mt-1 flex items-center justify-between rounded-xl border border-slate-200 px-3 h-10 text-sm">
                    <span className="font-semibold">{editing.customer_label}</span>
                    {!editing.id && <button onClick={() => setEditing({ ...editing, customer_id: null, customer_label: '' })} className="text-xs text-slate-500">Change</button>}
                  </div>
                ) : (
                  <div className="relative mt-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={custSearch} onChange={(e) => setCustSearch(e.target.value)} placeholder="Search name or mobile" className="w-full h-10 rounded-xl border border-slate-200 pl-9 pr-3 text-sm" />
                    {custResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                        {custResults.map((c) => (
                          <button key={c.id} onClick={() => { setEditing({ ...editing, customer_id: c.id, customer_label: c.name }); setCustResults([]); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50">
                            {c.name} <span className="text-xs text-slate-400">{c.mobile}</span>
                            {(c.date_of_birth || c.anniversary_date) && <span className="block text-[11px] text-slate-500">{c.date_of_birth ? `🎂 ${c.date_of_birth}` : ''} {c.anniversary_date ? `💐 ${c.anniversary_date}` : ''}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-slate-700">Message</label>
              <textarea value={editing.message_body} onChange={(e) => setEditing({ ...editing, message_body: e.target.value })} rows={5} className="mt-1 w-full rounded-2xl border border-slate-200 p-3 text-sm" placeholder="Happy Birthday {{customer_name}}! …" />
              <div className="flex flex-wrap gap-1 mt-1">
                {VARS.map((v) => (
                  <button key={v} onClick={() => setEditing({ ...editing, message_body: `${editing.message_body}${editing.message_body.endsWith(' ') || !editing.message_body ? '' : ' '}${v}` })} className="text-[10px] font-mono rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-600">{v}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-700">Coupon code prefix</label>
                <input value={editing.offer_code} onChange={(e) => setEditing({ ...editing, offer_code: e.target.value.toUpperCase() })} placeholder="BDAY" className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3 text-sm font-mono" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Valid for (days)</label>
                <input type="number" min={1} value={editing.valid_days} onChange={(e) => setEditing({ ...editing, valid_days: Number(e.target.value) })} className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3 text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Discount %</label>
                <input type="number" min={0} max={100} value={editing.discount_percent} onChange={(e) => setEditing({ ...editing, discount_percent: e.target.value, discount_amount: '' })} className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3 text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">or Flat ₹ off</label>
                <input type="number" min={0} value={editing.discount_amount} onChange={(e) => setEditing({ ...editing, discount_amount: e.target.value, discount_percent: '' })} className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3 text-sm" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={!!editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Active
            </label>
            <div className="rounded-2xl bg-emerald-50/70 p-3 text-sm whitespace-pre-line text-slate-700">{preview(editing.message_body, (editing.customer_label || 'Rahul').split(' ')[0], editing)}</div>
            <button onClick={doSave} disabled={saveCampaign.isPending || (!editing.id && !editing.customer_id)} className="w-full h-11 rounded-xl bg-[#D32F2F] text-white font-bold text-sm disabled:opacity-50">
              {saveCampaign.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
