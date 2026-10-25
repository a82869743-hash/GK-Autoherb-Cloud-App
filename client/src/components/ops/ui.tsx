/**
 * Building blocks for the staff and admin apps — same look as the customer app
 * (grey shell, white rounded cards, red/black accents, display font).
 */
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronRight, LucideIcon } from 'lucide-react';

export { BottomSheet, SegmentedTabs, StatusPill, EmptyBlock, Skeleton, SectionTitle } from '../customer/ui';

/** Big page title with optional subtitle and a right-hand action. */
export function OpsPageTitle({ title, subtitle, action, kicker }: { title: string; subtitle?: ReactNode; action?: ReactNode; kicker?: string }) {
  return (
    <div className="flex items-end justify-between gap-3 pt-1 pb-1">
      <div className="min-w-0">
        {kicker && <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#D32F2F]">{kicker}</p>}
        <h1 className="font-display text-[24px] leading-tight font-extrabold text-slate-900">{title}</h1>
        {subtitle && <p className="text-[13px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Dark hero card (used at the top of dashboards). */
export function OpsHero({ kicker, title, subtitle, children, img = '/services/gk/foam_wash_premium.jpg' }: { kicker?: string; title: ReactNode; subtitle?: ReactNode; children?: ReactNode; img?: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-black text-white shadow-app">
      <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/55 to-[#7f0000]/60" />
      <div className="relative p-5">
        {kicker && <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#ff8a80]">{kicker}</p>}
        <h2 className="font-display text-[22px] leading-tight font-extrabold mt-1">{title}</h2>
        {subtitle && <p className="text-[13px] text-white/75 mt-1">{subtitle}</p>}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}

const TONES: Record<string, string> = {
  red: 'bg-red-50 text-[#D32F2F]',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  blue: 'bg-sky-50 text-sky-600',
  slate: 'bg-slate-100 text-slate-600',
  purple: 'bg-purple-50 text-purple-600',
};

/** Small KPI tile for 2-column grids. */
export function StatTile({ label, value, hint, icon: Icon, tone = 'red', to, onClick }: { label: string; value: ReactNode; hint?: ReactNode; icon?: LucideIcon; tone?: keyof typeof TONES | string; to?: string; onClick?: () => void }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12px] font-semibold text-slate-500 leading-tight">{label}</span>
        {Icon && (
          <span className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${TONES[tone] || TONES.red}`}>
            <Icon size={16} />
          </span>
        )}
      </div>
      <div className="font-display text-[22px] font-extrabold text-slate-900 mt-1 leading-none">{value}</div>
      {hint && <div className="text-[11px] font-semibold text-slate-400 mt-1.5 truncate">{hint}</div>}
    </>
  );
  const cls = 'app-card p-3.5 block text-left active:scale-[0.99] transition-transform';
  if (to) return <Link to={to} className={cls}>{body}</Link>;
  if (onClick) return <button onClick={onClick} className={cls}>{body}</button>;
  return <div className={cls}>{body}</div>;
}

/** Icon tile for quick-action grids (4 per row). */
export function ActionTile({ label, icon: Icon, to, onClick, tone = 'red', badge }: { label: string; icon: LucideIcon; to?: string; onClick?: () => void; tone?: string; badge?: ReactNode }) {
  const body = (
    <>
      <span className={`relative h-12 w-12 rounded-2xl flex items-center justify-center ${TONES[tone] || TONES.red}`}>
        <Icon size={22} />
        {badge ? (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D32F2F] text-white text-[10px] font-bold flex items-center justify-center">{badge}</span>
        ) : null}
      </span>
      <span className="text-[11.5px] font-display font-bold text-slate-700 text-center leading-tight">{label}</span>
    </>
  );
  const cls = 'flex flex-col items-center gap-1.5 active:scale-95 transition-transform';
  if (to) return <Link to={to} className={cls}>{body}</Link>;
  return <button onClick={onClick} className={cls}>{body}</button>;
}

/** Pill search input. */
export function SearchBar({ value, onChange, placeholder = 'Search' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="app-input pl-10 bg-white" />
    </div>
  );
}

/** Horizontal scroll row of filter chips with optional counts. */
export function ChipRow<T extends string>({ items, value, onChange }: { items: { key: T; label: string; count?: number }[]; value: T; onChange: (k: T) => void }) {
  return (
    <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar">
      {items.map((c) => (
        <button key={c.key} onClick={() => onChange(c.key)} className={`app-chip ${value === c.key ? 'app-chip-on' : 'app-chip-off'}`}>
          {c.label}
          {c.count !== undefined && (
            <span className={`rounded-full px-1.5 text-[11px] ${value === c.key ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{c.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Tappable list row card. */
export function RowCard({ to, onClick, left, title, subtitle, right, children }: { to?: string; onClick?: () => void; left?: ReactNode; title: ReactNode; subtitle?: ReactNode; right?: ReactNode; children?: ReactNode }) {
  const body = (
    <>
      <div className="flex items-center gap-3">
        {left}
        <div className="flex-1 min-w-0">
          <div className="font-display font-extrabold text-[15px] text-slate-900 truncate">{title}</div>
          {subtitle && <div className="text-[12.5px] text-slate-500 truncate">{subtitle}</div>}
        </div>
        {right ?? ((to || onClick) && <ChevronRight size={18} className="text-slate-300 shrink-0" />)}
      </div>
      {children}
    </>
  );
  const cls = 'app-card block p-3.5 text-left w-full active:scale-[0.99] transition-transform';
  if (to) return <Link to={to} className={cls}>{body}</Link>;
  if (onClick) return <button onClick={onClick} className={cls}>{body}</button>;
  return <div className={cls}>{body}</div>;
}
