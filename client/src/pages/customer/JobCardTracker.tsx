import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, Circle, Loader2, Car, Clock } from 'lucide-react';
import api from '../../api/axiosInstance';
import { createSocket } from '../../lib/socket';

/**
 * Public live tracker for a job card (opened from the WhatsApp link — no login).
 * Shows the studio pipeline: received → inspection → washing → … → delivered.
 */
export default function JobCardTracker() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const token = params.get('t') || '';
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await api.get(`/public/job/${id}`, { params: { t: token } });
      setData(res.data.data);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Tracking link is invalid');
    }
  };

  useEffect(() => {
    load();
    const poll = setInterval(load, 30000);
    const socket = createSocket();
    socket.on('job_stage_updated', (e: any) => {
      if (Number(e?.job_cart_id) === Number(id)) load();
    });
    return () => {
      clearInterval(poll);
      socket.disconnect();
    };
  }, [id, token]);

  if (error) {
    return (
      <div className="min-h-[100dvh] bg-[#f3f4f6] flex items-center justify-center p-6">
        <div className="app-card p-8 text-center max-w-sm">
          <Car className="mx-auto text-slate-300" size={40} />
          <p className="font-display font-bold mt-3">{error}</p>
          <p className="text-sm text-slate-500 mt-1">Ask the studio to resend your tracking link.</p>
        </div>
      </div>
    );
  }
  if (!data) {
    return <div className="min-h-[100dvh] flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;
  }

  const current = data.timeline.find((t: any) => t.current);

  return (
    <div className="min-h-[100dvh] bg-[#f3f4f6]">
      <div className="mx-auto max-w-md">
        <div className="bg-gradient-to-br from-[#111] via-[#1d1d1d] to-[#7f0000] text-white px-5 pt-8 pb-10 rounded-b-[32px]">
          <img src="/assets/logo.png" alt="GK AutoHerb" className="h-8 w-8 rounded-lg bg-white p-1" />
          <p className="mt-5 text-[12px] font-bold uppercase tracking-[0.16em] text-white/60">Live status</p>
          <h1 className="font-display text-[28px] font-extrabold leading-tight mt-1">{current?.label || 'In progress'}</h1>
          <p className="text-sm text-white/70 mt-1">{current?.note}</p>
          <div className="mt-5 flex items-center gap-2 rounded-2xl bg-white/10 px-3.5 py-2.5 text-sm">
            <Car size={17} />
            <span className="font-semibold">{data.vehicle.brand} {data.vehicle.model}</span>
            <span className="text-white/60">· {data.vehicle.registration_no}</span>
          </div>
        </div>

        <div className="px-4 -mt-5 pb-10 space-y-3">
          <div className="app-card p-5">
            <ol className="relative">
              {data.timeline.map((st: any, i: number) => {
                const last = i === data.timeline.length - 1;
                return (
                  <li key={st.key} className="relative flex gap-3 pb-5 last:pb-0">
                    {!last && <span className={`absolute left-[11px] top-6 bottom-0 w-0.5 ${st.done ? 'bg-[#D32F2F]' : 'bg-slate-200'}`} />}
                    <span className="relative z-10 mt-0.5">
                      {st.done ? (
                        <CheckCircle2 size={24} className="text-[#D32F2F] fill-white" />
                      ) : st.current ? (
                        <span className="flex h-6 w-6 items-center justify-center">
                          <span className="absolute h-6 w-6 rounded-full bg-red-200 animate-ping" />
                          <span className="relative h-4 w-4 rounded-full bg-[#D32F2F] ring-4 ring-red-100" />
                        </span>
                      ) : (
                        <Circle size={24} className="text-slate-300" />
                      )}
                    </span>
                    <span className="flex-1">
                      <span className={`block font-display font-bold ${st.done || st.current ? 'text-slate-900' : 'text-slate-400'}`}>{st.label}</span>
                      {st.at && (
                        <span className="block text-xs text-slate-500 flex items-center gap-1">
                          <Clock size={11} /> {new Date(st.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                        </span>
                      )}
                      {st.current && <span className="block text-[13px] text-slate-600 mt-0.5">{st.note}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          {data.services?.length > 0 && (
            <div className="app-card p-5">
              <p className="font-display font-bold text-slate-900 mb-2">Work on your car</p>
              <div className="flex flex-wrap gap-2">
                {data.services.map((s: string) => (
                  <span key={s} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{s}</span>
                ))}
              </div>
            </div>
          )}

          <Link to="/login" className="block text-center text-sm font-semibold text-[#D32F2F] pt-2">Open the GK AutoHerb app →</Link>
        </div>
      </div>
    </div>
  );
}
