/**
 * Money screens (accounts, payments, balance sheet): a list that is a table on desktop and
 * tidy cards on phones, a period picker with quick presets, and a small amount badge.
 */
import { ReactNode } from 'react';
import { ChevronRight, Inbox } from 'lucide-react';
import { Skeleton } from '../customer/ui';

export interface LedgerCol<T> {
  label: string;
  cell: (row: T) => ReactNode;
  align?: 'right';
}

export interface LedgerCard {
  title: ReactNode;
  subtitle?: ReactNode;
  amount?: ReactNode;
  tone?: 'in' | 'out' | 'neutral';
  badge?: ReactNode;
  footer?: ReactNode;
}

const AMOUNT_TONE = { in: 'text-emerald-600', out: 'text-[#D32F2F]', neutral: 'text-slate-900' };

export function LedgerList<T extends { id?: number | string }>({
  title,
  action,
  rows,
  cols,
  card,
  loading,
  empty = 'Nothing here yet',
  onRowClick,
}: {
  title?: ReactNode;
  action?: ReactNode;
  rows: T[];
  cols: LedgerCol<T>[];
  card: (row: T) => LedgerCard;
  loading?: boolean;
  empty?: string;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="space-y-2.5">
      {(title || action) && (
        <div className="flex items-center justify-between gap-3">
          {title ? <p className="font-display text-[16px] font-extrabold text-slate-900">{title}</p> : <span />}
          {action}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[68px] rounded-2xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="app-card px-4 py-10 text-center">
          <span className="mx-auto h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center"><Inbox size={22} /></span>
          <p className="text-[13px] font-semibold text-slate-500 mt-2">{empty}</p>
        </div>
      ) : (
        <>
          {/* Phones: cards */}
          <div className="space-y-2 lg:hidden">
            {rows.map((row, i) => {
              const c = card(row);
              const Tag = onRowClick ? 'button' : 'div';
              return (
                <Tag
                  key={row.id ?? i}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className="app-card w-full p-3.5 text-left block active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-extrabold text-slate-900 truncate">{c.title}</div>
                      {c.subtitle && <div className="text-[12px] text-slate-500 mt-0.5 truncate">{c.subtitle}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      {c.amount !== undefined && (
                        <div className={`font-display text-[15px] font-extrabold ${AMOUNT_TONE[c.tone || 'neutral']}`}>{c.amount}</div>
                      )}
                      {c.badge && <div className="mt-1">{c.badge}</div>}
                    </div>
                    {onRowClick && <ChevronRight size={16} className="text-slate-300 shrink-0 mt-0.5" />}
                  </div>
                  {c.footer && <div className="mt-2.5 pt-2.5 border-t border-slate-100">{c.footer}</div>}
                </Tag>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden lg:block app-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13px]">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {cols.map((c) => (
                      <th key={c.label} className={`px-4 py-3 ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, i) => (
                    <tr
                      key={row.id ?? i}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-red-50/40' : 'hover:bg-slate-50/70'}`}
                    >
                      {cols.map((c) => (
                        <td key={c.label} className={`px-4 py-3 text-slate-700 ${c.align === 'right' ? 'text-right' : ''}`}>{c.cell(row)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const TAG_TONES: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700',
  red: 'bg-red-50 text-[#D32F2F]',
  amber: 'bg-amber-50 text-amber-700',
  slate: 'bg-slate-100 text-slate-600',
  blue: 'bg-sky-50 text-sky-700',
  purple: 'bg-purple-50 text-purple-700',
};

/** Small rounded label. */
export function Tag({ tone = 'slate', children }: { tone?: keyof typeof TAG_TONES | string; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-bold whitespace-nowrap ${TAG_TONES[tone] || TAG_TONES.slate}`}>{children}</span>;
}

const iso = (d: Date) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};

/** Date range with Today / 7 days / This month / Last month presets. */
export function PeriodPicker({ value, onChange }: { value: { from_date: string; to_date: string }; onChange: (v: { from_date: string; to_date: string }) => void }) {
  const now = new Date();
  const presets = [
    { label: 'Today', from: iso(now), to: iso(now) },
    { label: '7 days', from: iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)), to: iso(now) },
    { label: 'This month', from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) },
    { label: 'Last month', from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: iso(new Date(now.getFullYear(), now.getMonth(), 0)) },
  ];
  const active = presets.find((p) => p.from === value.from_date && p.to === value.to_date)?.label;
  return (
    <div className="app-card p-3 space-y-2.5">
      <div className="-mx-3 px-3 flex gap-2 overflow-x-auto no-scrollbar">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange({ from_date: p.from, to_date: p.to })}
            className={`app-chip ${active === p.label ? 'app-chip-on' : 'app-chip-off'}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={value.from_date}
          onChange={(e) => onChange({ ...value, from_date: e.target.value })}
          className="min-w-0 flex-1 h-10 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-[13px] font-semibold text-slate-800"
        />
        <span className="text-[12px] font-bold text-slate-400">to</span>
        <input
          type="date"
          value={value.to_date}
          onChange={(e) => onChange({ ...value, to_date: e.target.value })}
          className="min-w-0 flex-1 h-10 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-[13px] font-semibold text-slate-800"
        />
      </div>
    </div>
  );
}

/** Dark summary card with 2–3 headline numbers. */
export function MoneyHero({ kicker, items }: { kicker: string; items: { label: string; value: ReactNode; tone?: 'in' | 'out' }[] }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#141414] via-[#231313] to-[#6d0d0d] p-5 text-white shadow-app">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#D32F2F]/25 blur-2xl" />
      <p className="relative text-[11px] font-bold uppercase tracking-[0.16em] text-[#ff8a80]">{kicker}</p>
      <div className={`relative mt-3 grid gap-4 ${items.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {items.map((it) => (
          <div key={it.label} className="min-w-0">
            <p className="text-[11px] text-white/60 font-semibold leading-tight">{it.label}</p>
            <p className={`font-display text-[19px] font-extrabold mt-1 truncate ${it.tone === 'in' ? 'text-emerald-300' : it.tone === 'out' ? 'text-[#ff8a80]' : ''}`}>{it.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
