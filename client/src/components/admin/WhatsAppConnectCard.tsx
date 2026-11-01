import { CheckCircle2, Loader2, Smartphone, Unplug, ShieldCheck, Moon } from 'lucide-react';
import { useWhatsAppGateway, useDisconnectWhatsApp } from '../../api/hooks/useAdminAutomation';
import { useUIStore } from '../../store/uiStore';

/** Admin → WhatsApp: link the studio phone by QR, see status, disconnect. */
export default function WhatsAppConnectCard() {
  const toast = useUIStore((s) => s.toast);
  const { data, isLoading } = useWhatsAppGateway();
  const disconnect = useDisconnectWhatsApp();

  if (isLoading) return <div className="app-card p-5 h-40 animate-pulse" />;
  if (!data?.configured) return null;

  const onDisconnect = () => {
    if (!window.confirm('Disconnect the studio WhatsApp? Messages will stop until you scan again.')) return;
    disconnect.mutate(undefined, {
      onSuccess: (r: any) => toast('success', r?.message || 'Disconnected'),
      onError: () => toast('error', 'Could not disconnect'),
    });
  };

  return (
    <div className={`rounded-3xl border p-5 ${data.connected ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start gap-3">
        <span className={`h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center ${data.connected ? 'bg-emerald-600 text-white' : 'bg-[#111] text-white'}`}>
          {data.connected ? <CheckCircle2 size={22} /> : <Smartphone size={22} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-slate-900">
            {data.connected ? 'Studio WhatsApp connected' : !data.running ? 'WhatsApp service is offline' : 'Connect studio WhatsApp'}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            {data.connected
              ? `Sending from +${data.phone}. Reminders and updates go out automatically with safe gaps.`
              : !data.running
                ? 'The WhatsApp service on the server is not running. Ask your developer to restart gk-wa-gateway.'
                : 'Open WhatsApp on the studio phone → Settings → Linked devices → Link a device, then scan this code.'}
          </p>
        </div>
        {data.connected && (
          <button onClick={onDisconnect} disabled={disconnect.isPending} className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 disabled:opacity-60">
            {disconnect.isPending ? <Loader2 size={14} className="animate-spin" /> : <Unplug size={14} />} Disconnect
          </button>
        )}
      </div>

      {!data.connected && data.running && (
        <div className="mt-4 flex flex-col items-center">
          {data.qr ? (
            <>
              <img src={data.qr} alt="WhatsApp link QR" className="h-64 w-64 rounded-2xl border border-slate-200 bg-white p-2" />
              <p className="mt-2 text-[11px] text-slate-500">The code refreshes by itself every few seconds. Keep this page open while scanning.</p>
            </>
          ) : (
            <div className="h-64 w-64 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
              <Loader2 className="animate-spin" size={20} /> Preparing QR code…
            </div>
          )}
        </div>
      )}

      {data.connected && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-white border border-slate-100 p-2.5">
            <p className="font-display text-lg font-extrabold text-slate-900">{data.sent?.today ?? 0}</p>
            <p className="text-[11px] text-slate-500">Sent today</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-100 p-2.5">
            <p className="font-display text-lg font-extrabold text-slate-900">{(data.queue?.high ?? 0) + (data.queue?.bulk ?? 0)}</p>
            <p className="text-[11px] text-slate-500">Waiting</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-100 p-2.5">
            <p className="font-display text-lg font-extrabold text-slate-900 flex items-center justify-center gap-1">
              {data.quiet_now ? <><Moon size={15} /> Night</> : <><ShieldCheck size={15} /> Safe</>}
            </p>
            <p className="text-[11px] text-slate-500">{data.quiet_now ? 'Reminders wait till 9 am' : 'Sending mode'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
