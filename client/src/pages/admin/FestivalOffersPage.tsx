import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PartyPopper, Send, CalendarClock, Users, Loader2, X, CheckCircle2, Clock } from 'lucide-react';
import api from '../../api/axiosInstance';
import { useUIStore } from '../../store/uiStore';
import { OpsPageTitle, SectionTitle, EmptyBlock, Skeleton } from '../../components/ops/ui';

const PRESETS: { festival: string; emoji: string; message: string }[] = [
  { festival: 'Diwali', emoji: '🪔', message: 'Happy Diwali from GK AutoHerb! 🪔 Make your car shine brighter than the lights — special festive prices on foam wash, polish and ceramic coating this week.' },
  { festival: 'Navratri', emoji: '💃', message: 'Navratri special at GK AutoHerb! 💃 Get your car garba-ready with our premium wash and interior spa at festive prices.' },
  { festival: 'Dussehra', emoji: '🏹', message: 'Happy Dussehra! 🏹 Celebrate victory with a showroom-fresh car — festive offers on detailing at GK AutoHerb.' },
  { festival: 'Holi', emoji: '🎨', message: 'Happy Holi! 🎨 Colours on your car? Our post-Holi deep wash and paint-safe cleaning takes them off gently.' },
  { festival: 'Raksha Bandhan', emoji: '🪢', message: 'Happy Raksha Bandhan! 🪢 Gift your sibling a sparkling car — special Rakhi offer on premium washes.' },
  { festival: 'Ganesh Chaturthi', emoji: '🐘', message: 'Ganpati Bappa Morya! 🐘 Start the festive season with a fresh, clean car — Ganesh Chaturthi offers at GK AutoHerb.' },
  { festival: 'Makar Sankranti', emoji: '🪁', message: 'Happy Uttarayan! 🪁 Kite strings and dust on your car? Get a full body wash and polish at Sankranti prices.' },
  { festival: 'Independence Day', emoji: '🇮🇳', message: 'Happy Independence Day! 🇮🇳 Freedom offer on ceramic coating and PPF — protect your car for years.' },
  { festival: 'New Year', emoji: '🎉', message: 'Happy New Year from GK AutoHerb! 🎉 Start the year with a spotless car — New Year offers on all detailing packages.' },
  { festival: 'Christmas', emoji: '🎄', message: 'Merry Christmas! 🎄 Treat your car this season — festive offers on washes and interior detailing.' },
  { festival: 'Eid', emoji: '🌙', message: 'Eid Mubarak from GK AutoHerb! 🌙 Celebrate with a sparkling car — special Eid offers this week.' },
  { festival: 'Monsoon', emoji: '🌧️', message: 'Monsoon is here! 🌧️ Protect your paint from rain and mud — monsoon offers on underbody anti-rust coating and ceramic wash.' },
];

const AUDIENCES = [
  { key: 'all', label: 'All customers' },
  { key: 'recent', label: 'Visited in 60 days' },
  { key: 'inactive', label: 'Not visited in 60 days' },
  { key: 'package', label: 'Package members' },
] as const;

type Campaign = {
  id: number; title: string; festival?: string; message: string; coupon_code?: string; audience: string;
  scheduled_at: string; status: 'scheduled' | 'sending' | 'sent' | 'cancelled'; recipients: number; sent_count: number;
};

const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function FestivalOffersPage() {
  const toast = useUIStore((s) => s.toast);
  const qc = useQueryClient();
  const [festival, setFestival] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [coupon, setCoupon] = useState('');
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]['key']>('all');
  const [when, setWhen] = useState<'now' | 'later'>('later');
  const [at, setAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return toLocalInput(d);
  });

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['festival-campaigns'],
    queryFn: async (): Promise<Campaign[]> => (await api.get('/festival-campaigns')).data.data || [],
    refetchInterval: (q) => ((q.state.data as Campaign[] | undefined)?.some((c) => c.status === 'sending') ? 4000 : false),
  });
  const { data: reach } = useQuery({
    queryKey: ['festival-audience', audience],
    queryFn: async () => (await api.get('/festival-campaigns/audience-count', { params: { audience } })).data.data?.count as number,
  });

  const create = useMutation({
    mutationFn: async () =>
      (
        await api.post('/festival-campaigns', {
          title: title || `${festival || 'Special'} offer`,
          festival: festival || null,
          message,
          coupon_code: coupon,
          audience,
          send_now: when === 'now',
          scheduled_at: when === 'later' ? new Date(at).toISOString() : undefined,
        })
      ).data,
    onSuccess: (r) => {
      toast('success', r.message || 'Saved');
      setFestival('');
      setTitle('');
      setMessage('');
      setCoupon('');
      qc.invalidateQueries({ queryKey: ['festival-campaigns'] });
    },
    onError: (e: any) => toast('error', e?.response?.data?.error || 'Could not save the campaign'),
  });
  const cancel = useMutation({
    mutationFn: async (id: number) => (await api.post(`/festival-campaigns/${id}/cancel`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['festival-campaigns'] }),
  });

  useEffect(() => {
    const p = PRESETS.find((x) => x.festival === festival);
    if (p) {
      setMessage(p.message);
      setTitle(`${p.festival} offer`);
    }
  }, [festival]);

  const preview = useMemo(
    () => `${message || 'Your offer message…'}\n\n${coupon ? `🎁 Use code *${coupon.toUpperCase()}* at checkout.\n` : ''}Book now: <link to services>\n- Team GK AutoHerb`,
    [message, coupon]
  );

  const confirmSend = () => {
    if (!message.trim()) return toast('error', 'Write the offer message');
    if (when === 'now' && !confirm(`Send this WhatsApp to ${reach ?? 'all'} customers now?`)) return;
    create.mutate();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-28 font-sans">
      <OpsPageTitle kicker="WhatsApp" title="Festival offers" subtitle="Send a festive offer to your customers now, or schedule it for the morning of the festival." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
        <section className="app-card p-4 space-y-4 min-w-0">
          <div>
            <p className="app-label">Festival</p>
            <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar">
              {PRESETS.map((p) => (
                <button key={p.festival} onClick={() => setFestival(p.festival === festival ? '' : p.festival)} className={`app-chip shrink-0 ${festival === p.festival ? 'app-chip-on' : 'app-chip-off'}`}>
                  {p.emoji} {p.festival}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="app-label">Campaign name (only you see this)</label>
            <input className="app-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Diwali offer 2026" />
          </div>
          <div>
            <label className="app-label">Message</label>
            <textarea className="app-input h-auto py-3 resize-none" rows={5} maxLength={900} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Pick a festival above or write your own offer…" />
            <p className="mt-1 text-right text-[11.5px] text-slate-400">{message.length}/900</p>
          </div>
          <div>
            <label className="app-label">Coupon code (optional)</label>
            <input className="app-input uppercase" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="e.g. DIWALI20" />
            <p className="mt-1 text-[11.5px] text-slate-400">Create the code in Coupons first.</p>
          </div>

          <div>
            <p className="app-label">Send to</p>
            <div className="grid grid-cols-2 gap-2">
              {AUDIENCES.map((a) => (
                <button key={a.key} onClick={() => setAudience(a.key)} className={`rounded-xl border px-3 py-2.5 text-left text-[13px] font-semibold ${audience === a.key ? 'border-[#111] bg-[#111] text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
                  {a.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-600">
              <Users size={14} /> {reach === undefined ? 'Counting…' : `${reach} customer${reach === 1 ? '' : 's'}`} · customers who opted out of offers are skipped
            </p>
          </div>

          <div>
            <p className="app-label">When</p>
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
              {(['later', 'now'] as const).map((k) => (
                <button key={k} onClick={() => setWhen(k)} className={`h-10 rounded-xl text-[13px] font-display font-bold ${when === k ? 'bg-white text-slate-900 shadow-app' : 'text-slate-500'}`}>
                  {k === 'now' ? 'Send now' : 'Schedule'}
                </button>
              ))}
            </div>
            {when === 'later' && <input type="datetime-local" className="app-input mt-2" value={at} onChange={(e) => setAt(e.target.value)} />}
          </div>

          <button onClick={confirmSend} disabled={create.isPending} className="app-btn-primary w-full">
            {create.isPending ? <Loader2 size={17} className="animate-spin" /> : when === 'now' ? <Send size={17} /> : <CalendarClock size={17} />}
            {when === 'now' ? 'Send now' : 'Schedule offer'}
          </button>
        </section>

        <section className="space-y-3 min-w-0">
          <SectionTitle>Preview</SectionTitle>
          <div className="rounded-3xl bg-[#e7ddd4] p-4">
            <div className="ml-auto max-w-[92%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm bg-[#dcf8c6] px-3.5 py-2.5 text-[13.5px] leading-snug text-slate-900 shadow-sm">{preview}</div>
          </div>
          <p className="text-[12px] text-slate-500">
            Before the WhatsApp API is connected, messages are queued in Admin → WhatsApp with a one-tap send link. For the live API, Meta must approve the "Festival Offer" template first.
          </p>
        </section>
      </div>

      <section className="space-y-3">
        <SectionTitle>Campaigns</SectionTitle>
        {isLoading ? (
          <Skeleton className="h-24" />
        ) : !campaigns.length ? (
          <EmptyBlock icon={<PartyPopper size={26} />} title="No campaigns yet" text="Schedule your first festival offer above." />
        ) : (
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {campaigns.map((c) => (
              <div key={c.id} className="app-card p-3.5 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display font-extrabold text-[15px] text-slate-900 truncate">{c.title}</p>
                    <p className="text-[12px] text-slate-500">
                      {new Date(c.scheduled_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} · {AUDIENCES.find((a) => a.key === c.audience)?.label}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      c.status === 'sent' ? 'bg-emerald-50 text-emerald-700' : c.status === 'sending' ? 'bg-sky-50 text-sky-700' : c.status === 'cancelled' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {c.status === 'sent' ? <CheckCircle2 size={12} /> : c.status === 'sending' ? <Loader2 size={12} className="animate-spin" /> : <Clock size={12} />}
                    {c.status === 'sent' ? `Sent ${c.sent_count}/${c.recipients}` : c.status === 'sending' ? 'Sending' : c.status === 'cancelled' ? 'Cancelled' : 'Scheduled'}
                  </span>
                </div>
                <p className="mt-2 text-[12.5px] text-slate-600 line-clamp-2 break-words">{c.message}</p>
                {c.coupon_code && <p className="mt-1 text-[12px] font-bold text-[#D32F2F]">Code {c.coupon_code}</p>}
                {c.status === 'scheduled' && (
                  <button onClick={() => cancel.mutate(c.id)} className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-bold text-slate-500">
                    <X size={14} /> Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
