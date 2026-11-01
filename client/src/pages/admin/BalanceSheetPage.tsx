import { useState } from 'react';
import { OpsPageTitle } from '../../components/ops/ui';
import { Skeleton } from '../../components/customer/ui';
import { LedgerList, Tag, MoneyHero } from '../../components/ops/ledger';
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Download, Calendar, IndianRupee, Receipt, PieChart, Plus, Sparkles, ShieldCheck, BarChart3, Loader2 } from 'lucide-react';
import { useBalanceSheet, useExpenses, useExpenseCategories, useCreateExpense, downloadBalanceSheet } from '../../api/hooks/useBalanceSheet';
import { AnimatedModal, RippleButton } from '../../components/ui/Animations';
import { Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const COLORS = ['#D32F2F', '#D32F2F', '#059669', '#D97706', '#E11D48', '#7C3AED', '#0284C7', '#475569'];

export default function BalanceSheetPage() {
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [activePreset, setActivePreset] = useState<'all' | 'today' | 'week' | 'month' | '6m'>('all');
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category_id: '', amount: '', description: '', expense_date: new Date().toISOString().split('T')[0], payment_method: 'cash', gst_amount: '0' });

  const { data: sheet, isLoading } = useBalanceSheet(dateRange.from ? dateRange : undefined);
  const { data: expensesData } = useExpenses();
  const { data: categories } = useExpenseCategories();
  const createExpense = useCreateExpense();

  const handleCreateExpense = () => {
    createExpense.mutate({ ...expenseForm, amount: parseFloat(expenseForm.amount), gst_amount: parseFloat(expenseForm.gst_amount || '0') }, {
      onSuccess: () => { setShowExpenseModal(false); setExpenseForm({ category_id: '', amount: '', description: '', expense_date: new Date().toISOString().split('T')[0], payment_method: 'cash', gst_amount: '0' }); }
    });
  };

  const handlePresetChange = (preset: 'all' | 'today' | 'week' | 'month' | '6m') => {
    setActivePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (preset === 'all') {
      setDateRange({ from: '', to: '' });
    } else if (preset === 'today') {
      setDateRange({ from: todayStr, to: todayStr });
    } else if (preset === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setDateRange({ from: d.toISOString().split('T')[0], to: todayStr });
    } else if (preset === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setDateRange({ from: startOfMonth, to: todayStr });
    } else if (preset === '6m') {
      const d = new Date();
      d.setMonth(d.getMonth() - 6);
      setDateRange({ from: d.toISOString().split('T')[0], to: todayStr });
    }
  };

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    setExporting(format);
    try {
      await downloadBalanceSheet({
        from: dateRange.from || undefined,
        to: dateRange.to || undefined,
        format
      });
    } catch (err) {
      console.error('Balance sheet export error:', err);
    } finally {
      setExporting(null);
    }
  };

  const chartData = sheet?.expenses?.by_category?.map((c: any, i: number) => ({ name: c.category, value: parseFloat(c.total), fill: COLORS[i % COLORS.length] })) || [];
  const monthlyTrendData = sheet?.monthly_trend || [];

  const inr = (v: any) => `₹${(Number(v) || 0).toLocaleString('en-IN')}`;
  const profit = Number(sheet?.net_profit || 0);
  const margin = parseFloat(sheet?.profit_margin || '0');
  const incomeRows = [
    { label: 'Job cards', value: sheet?.income?.job_revenue, color: '#D32F2F' },
    { label: 'Packages', value: sheet?.income?.package_revenue, color: '#059669' },
    { label: 'Counter bills', value: sheet?.income?.bill_revenue, color: '#D97706' },
    { label: 'Product sales', value: sheet?.income?.trade_revenue, color: '#7C3AED' },
  ];
  const incomeMax = Math.max(1, ...incomeRows.map((r) => Number(r.value) || 0));

  return (
    <div className="space-y-4 pb-28 lg:pb-12 max-w-[1200px] mx-auto">
      <OpsPageTitle
        kicker="Balance sheet"
        title="Profit & loss"
        subtitle={dateRange.from ? `${dateRange.from} → ${dateRange.to || 'today'}` : 'All time'}
        action={
          <button
            onClick={() => setShowExpenseModal(true)}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-2xl bg-[#D32F2F] text-white text-[12px] font-bold shadow-md shadow-red-200 active:scale-95 transition-transform"
          >
            <Plus size={15} /> Expense
          </button>
        }
      />

      {/* Period */}
      <div className="app-card p-3 space-y-2.5">
        <div className="-mx-3 px-3 flex gap-2 overflow-x-auto no-scrollbar">
          {([
            { key: 'all', label: 'All time' },
            { key: 'today', label: 'Today' },
            { key: 'week', label: '7 days' },
            { key: 'month', label: 'This month' },
            { key: '6m', label: '6 months' },
          ] as const).map((p) => (
            <button key={p.key} onClick={() => handlePresetChange(p.key)} className={`app-chip ${activePreset === p.key && (p.key !== 'all' || !dateRange.from) ? 'app-chip-on' : 'app-chip-off'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateRange.from} onChange={e => { setDateRange(p => ({ ...p, from: e.target.value })); setActivePreset('all'); }} className="min-w-0 flex-1 h-10 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-[13px] font-semibold text-slate-800" />
          <span className="text-[12px] font-bold text-slate-400">to</span>
          <input type="date" value={dateRange.to} onChange={e => { setDateRange(p => ({ ...p, to: e.target.value })); setActivePreset('all'); }} className="min-w-0 flex-1 h-10 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-[13px] font-semibold text-slate-800" />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-[120px] rounded-3xl" />
      ) : (
        <MoneyHero
          kicker={profit >= 0 ? 'In profit' : 'In loss'}
          items={[
            { label: 'Income', value: inr(sheet?.income?.total), tone: 'in' },
            { label: 'Expenses', value: inr(sheet?.expenses?.total), tone: 'out' },
            { label: `Net · ${margin.toFixed(1)}%`, value: inr(profit), tone: profit >= 0 ? 'in' : 'out' },
          ]}
        />
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <button onClick={() => handleExport('xlsx')} disabled={!!exporting} className="app-card h-12 inline-flex items-center justify-center gap-2 text-[13px] font-bold text-slate-700 disabled:opacity-60">
          {exporting === 'xlsx' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} className="text-[#D32F2F]" />} Excel
        </button>
        <button onClick={() => handleExport('pdf')} disabled={!!exporting} className="app-card h-12 inline-flex items-center justify-center gap-2 text-[13px] font-bold text-slate-700 disabled:opacity-60">
          {exporting === 'pdf' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} className="text-[#D32F2F]" />} PDF
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Income breakdown */}
        <div className="app-card p-4 space-y-3">
          <p className="font-display text-[16px] font-extrabold text-slate-900 flex items-center gap-2"><ArrowUpRight size={17} className="text-emerald-600" /> Where money came from</p>
          {incomeRows.map((r) => (
            <div key={r.label}>
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-semibold text-slate-600 flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />{r.label}</span>
                <span className="font-extrabold text-slate-900">{inr(r.value)}</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${((Number(r.value) || 0) / incomeMax) * 100}%`, backgroundColor: r.color }} />
              </div>
            </div>
          ))}
          {Number(sheet?.income?.sales_returns || 0) > 0 && (
            <div className="flex items-center justify-between text-[13px] pt-2 border-t border-slate-100">
              <span className="font-semibold text-slate-500">Less: returns</span>
              <span className="font-extrabold text-[#D32F2F]">−{inr(sheet?.income?.sales_returns)}</span>
            </div>
          )}
        </div>

        {/* Expense split */}
        <div className="app-card p-4">
          <p className="font-display text-[16px] font-extrabold text-slate-900 flex items-center gap-2"><ArrowDownRight size={17} className="text-[#D32F2F]" /> Where money went</p>
          {chartData.length > 0 ? (
            <div className="flex items-center gap-4 mt-2">
              <div className="w-[140px] h-[140px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie data={chartData} cx="50%" cy="50%" outerRadius={66} innerRadius={42} paddingAngle={2} dataKey="value">
                      {chartData.map((entry: any, index: number) => <Cell key={index} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => inr(v)} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                {chartData.slice(0, 6).map((c: any) => (
                  <div key={c.name} className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="flex items-center gap-1.5 min-w-0"><span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: c.fill }} /><span className="truncate font-semibold text-slate-600">{c.name}</span></span>
                    <span className="font-bold text-slate-900 shrink-0">{inr(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-slate-400 text-center py-10">No expenses in this period</p>
          )}
        </div>
      </div>

      {/* Monthly trend */}
      <div className="app-card p-4">
        <p className="font-display text-[16px] font-extrabold text-slate-900 flex items-center gap-2"><BarChart3 size={17} className="text-[#D32F2F]" /> Last 6 months</p>
        {monthlyTrendData.length > 0 ? (
          <div className="h-[240px] mt-2 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrendData} margin={{ top: 10, right: 6, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis width={44} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}k` : Number(v)}`} />
                <Tooltip
                  formatter={(val: any, name: any) => [inr(val), name === 'income' ? 'Income' : name === 'expense' ? 'Expenses' : 'Profit']}
                  contentStyle={{ borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Legend formatter={(v) => (v === 'income' ? 'Income' : v === 'expense' ? 'Expenses' : 'Profit')} wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                <Bar dataKey="income" fill="#059669" radius={[6, 6, 0, 0]} maxBarSize={26} />
                <Bar dataKey="expense" fill="#D32F2F" radius={[6, 6, 0, 0]} maxBarSize={26} />
                <Bar dataKey="profit" fill="#1c1b1b" radius={[6, 6, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-[13px] text-slate-400 text-center py-10">Not enough history yet</p>
        )}
      </div>

      <LedgerList
        title="Recent expenses"
        rows={(expensesData?.data || []).slice(0, 10)}
        empty="No expenses logged yet"
        cols={[
          { label: 'Date', cell: (e: any) => new Date(e.expense_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
          { label: 'Category', cell: (e: any) => <Tag>{e.category_name}</Tag> },
          { label: 'Description', cell: (e: any) => <span className="text-slate-600">{e.description || '—'}</span> },
          { label: 'Amount', align: 'right', cell: (e: any) => <span className="font-extrabold text-slate-900">{inr(e.amount)}</span> },
          { label: 'GST', align: 'right', cell: (e: any) => inr(e.gst_amount) },
        ]}
        card={(e: any) => ({
          title: e.description || e.category_name,
          subtitle: `${new Date(e.expense_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · ${e.category_name}${Number(e.gst_amount) ? ` · GST ${inr(e.gst_amount)}` : ''}`,
          amount: inr(e.amount),
          tone: 'out',
        })}
      />

      {/* Add Expense Modal */}
      <AnimatedModal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)}>
        <div className="p-6 font-sans">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Record Operating Expense</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Cost Center Category *</label>
              <select 
                value={expenseForm.category_id} 
                onChange={e => setExpenseForm(p => ({ ...p, category_id: e.target.value }))} 
                className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold bg-slate-50 focus:bg-white outline-none"
              >
                <option value="">Select Category</option>
                {(categories || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Net Amount (₹) *</label>
                <input 
                  type="number" 
                  value={expenseForm.amount} 
                  onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))} 
                  className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 bg-slate-50 focus:bg-white" 
                  placeholder="0.00" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">GST Component (₹)</label>
                <input 
                  type="number" 
                  value={expenseForm.gst_amount} 
                  onChange={e => setExpenseForm(p => ({ ...p, gst_amount: e.target.value }))} 
                  className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 bg-slate-50 focus:bg-white" 
                  placeholder="0.00" 
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Disbursement Date</label>
              <input 
                type="date" 
                value={expenseForm.expense_date} 
                onChange={e => setExpenseForm(p => ({ ...p, expense_date: e.target.value }))} 
                className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Description & Justification</label>
              <input 
                value={expenseForm.description} 
                onChange={e => setExpenseForm(p => ({ ...p, description: e.target.value }))} 
                className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white" 
                placeholder="Reason, vendor, or invoice details..." 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Disbursement Channel</label>
              <select 
                value={expenseForm.payment_method} 
                onChange={e => setExpenseForm(p => ({ ...p, payment_method: e.target.value }))} 
                className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold bg-slate-50 focus:bg-white"
              >
                <option value="cash">Cash Outflow</option>
                <option value="upi">UPI Account</option>
                <option value="card">Company Card</option>
                <option value="net_banking">Bank NEFT/RTGS</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setShowExpenseModal(false)} 
                className="px-4 py-2 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleCreateExpense} 
                className="px-5 py-2.5 bg-[#D32F2F] hover:bg-[#b71c1c] text-white text-xs font-bold rounded-2xl shadow-sm transition-all"
              >
                Save Expense
              </button>
            </div>
          </div>
        </div>
      </AnimatedModal>
    </div>
  );
}
