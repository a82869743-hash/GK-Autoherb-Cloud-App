import { useState } from 'react';
import { CheckCircle2, Circle, Loader2, Send, Link2, ChevronRight } from 'lucide-react';
import { useStageDefinitions, useUpdateJobStage } from '../../api/hooks/useAdminAutomation';
import { useJobStages } from '../../api/hooks/useCustomerApp';
import { useUIStore } from '../../store/uiStore';

/** Move a job card through the studio pipeline; each move updates the customer's live tracker + WhatsApp. */
export default function JobStagePanel({ jobId, disabled = false }: { jobId: number; disabled?: boolean }) {
  const toast = useUIStore((s) => s.toast);
  const { data: defs = [] } = useStageDefinitions();
  const { data: stages, refetch } = useJobStages(jobId);
  const update = useUpdateJobStage();
  const [note, setNote] = useState('');
  const [notify, setNotify] = useState(true);
  const current = stages?.current || 'received';
  const currentIdx = defs.findIndex((d: any) => d.key === current);

  const move = async (stage: string) => {
    try {
      const r = await update.mutateAsync({ id: jobId, stage, note: note.trim() || undefined, notify });
      toast('success', r.message + (notify ? ' — customer notified' : ''));
      setNote('');
      refetch();
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Could not update stage');
    }
  };

  const next = currentIdx >= 0 ? defs[currentIdx + 1] : defs[0];
  const pct = defs.length > 1 && currentIdx >= 0 ? Math.round((currentIdx / (defs.length - 1)) * 100) : 0;
  const last = stages?.history?.length ? stages.history[stages.history.length - 1] : null;

  return (
    <section className="app-card p-4 space-y-3.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-[16px] font-extrabold text-slate-900">Progress</h3>
        <span className="text-[11.5px] font-semibold text-slate-500 flex items-center gap-1"><Link2 size={12} /> Customer sees this live</span>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-display text-[19px] font-extrabold text-[#D32F2F]">{defs[currentIdx]?.label || 'Received'}</p>
          <span className="text-[12px] font-bold text-slate-400">{pct}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#e53935] to-[#b71c1c] transition-all" style={{ width: `${Math.max(pct, 4)}%` }} />
        </div>
      </div>

      {next && !disabled && (
        <button onClick={() => move(next.key)} disabled={update.isPending} className="app-btn-primary w-full">
          {update.isPending ? <Loader2 size={17} className="animate-spin" /> : <ChevronRight size={18} />}
          Move to {next.label}
        </button>
      )}

      <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar">
        {defs.map((d: any, i: number) => {
          const done = i < currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <button
              key={d.key}
              disabled={disabled || update.isPending || isCurrent}
              onClick={() => move(d.key)}
              title={d.note}
              className={`app-chip shrink-0 h-8 text-[12px] ${
                isCurrent ? 'bg-[#D32F2F] border-[#D32F2F] text-white' : done ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'app-chip-off'
              }`}
            >
              {done ? <CheckCircle2 size={13} /> : isCurrent ? <span className="h-2 w-2 rounded-full bg-white animate-pulse" /> : <Circle size={13} />}
              {d.label}
            </button>
          );
        })}
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note for the customer (optional)"
        className="app-input h-11 text-[14px]"
      />
      <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-600">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 accent-[#D32F2F]" />
        <Send size={13} /> Send WhatsApp update to customer
      </label>

      {last && (
        <p className="text-[11.5px] text-slate-400">
          Last update {new Date(last.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
          {last.changed_by_name ? ` by ${last.changed_by_name}` : ''}
        </p>
      )}
    </section>
  );
}
