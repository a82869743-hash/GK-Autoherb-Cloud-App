import { useMemo, useState } from 'react';
import { Package, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useInventory } from '../../api/hooks/useInventory';
import { OpsPageTitle, SearchBar, ChipRow, EmptyBlock, Skeleton } from '../../components/ops/ui';

export default function StaffInventoryPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'low'>('all');
  const { data, isLoading } = useInventory({ search, page, limit: 50 });

  const items: any[] = data?.data || [];
  const lowCount = items.filter((r) => r.is_low_stock).length;
  const shown = useMemo(() => (filter === 'low' ? items.filter((r) => r.is_low_stock) : items), [items, filter]);
  const pg = data?.pagination;
  const pages = pg ? Math.max(1, Math.ceil(pg.total / pg.limit)) : 1;

  return (
    <div className="space-y-4">
      <OpsPageTitle kicker="Studio stock" title="Inventory" subtitle={`${pg?.total || 0} products`} />

      <SearchBar
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder="Search products"
      />
      <ChipRow
        value={filter}
        onChange={setFilter}
        items={[
          { key: 'all', label: 'All', count: items.length },
          { key: 'low', label: 'Low stock', count: lowCount },
        ]}
      />

      {isLoading ? (
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[72px]" />)}
        </div>
      ) : !shown.length ? (
        <EmptyBlock icon={<Package size={26} />} title="No products found" text="Try a different search." />
      ) : (
        <div className="app-card divide-y divide-slate-100">
          {shown.map((row) => (
            <div key={row.id} className="flex items-center gap-3 p-3.5">
              <span className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${row.is_low_stock ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                {row.is_low_stock ? <AlertTriangle size={19} /> : <Package size={19} />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-[14.5px] text-slate-900 truncate">{row.product_name}</p>
                <p className={`text-[12px] font-semibold ${row.is_low_stock ? 'text-amber-600' : 'text-emerald-600'}`}>{row.is_low_stock ? 'Low stock' : 'In stock'}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display text-[18px] font-extrabold text-slate-900 leading-none">{parseFloat(row.quantity)}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{row.unit}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="app-btn-outline h-10 px-3"><ChevronLeft size={16} /> Prev</button>
          <span className="text-[13px] font-semibold text-slate-500">Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="app-btn-outline h-10 px-3">Next <ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}
