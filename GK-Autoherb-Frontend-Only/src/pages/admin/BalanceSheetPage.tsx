import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Download, Calendar, IndianRupee, Receipt, PieChart, Plus, Sparkles, ShieldCheck } from 'lucide-react';
import { useBalanceSheet, useExpenses, useExpenseCategories, useCreateExpense } from '../../api/hooks/useBalanceSheet';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import { AnimatedModal, RippleButton } from '../../components/ui/Animations';
import { Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from 'recharts';

const COLORS = ['#D32F2F', '#D32F2F', '#059669', '#D97706', '#E11D48', '#7C3AED', '#0284C7', '#475569'];

export default function BalanceSheetPage() {
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
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

  const chartData = sheet?.expenses?.by_category?.map((c: any, i: number) => ({ name: c.category, value: parseFloat(c.total), fill: COLORS[i % COLORS.length] })) || [];

  return (
    <div className="space-y-6 pb-28 lg:pb-12 max-w-[1600px] mx-auto font-sans">
      {/* Header Bar */}
      <AdminHeaderBar
        title="Balance Sheet & Profit/Loss Audit"
        subtitle="Consolidated studio income streams, operational disbursements, and profit margins"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-2xl px-3 py-1.5 text-xs">
              <Calendar size={13} className="text-slate-400" />
              <input 
                type="date" 
                value={dateRange.from} 
                onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))} 
                className="bg-transparent border-none outline-none text-xs text-slate-800 font-medium p-0" 
              />
              <span className="text-slate-400 text-xs font-bold">to</span>
              <input 
                type="date" 
                value={dateRange.to} 
                onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))} 
                className="bg-transparent border-none outline-none text-xs text-slate-800 font-medium p-0" 
              />
            </div>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#D32F2F] hover:bg-[#b71c1c] text-white font-bold text-xs shadow-md shadow-red-200 transition-all active:scale-95"
            >
              <Plus size={16} />
              <span>Record Expense</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminMetricCard
          label="Gross Studio Revenue"
          value={`₹${(sheet?.income?.total || 0).toLocaleString('en-IN')}`}
          trend={{ text: 'All operational streams', positive: true }}
          icon={<IndianRupee size={20} />}
          accentColor="emerald"
        />
        <AdminMetricCard
          label="Total Operating Expenses"
          value={`₹${(sheet?.expenses?.total || 0).toLocaleString('en-IN')}`}
          trend={{ text: 'Overheads & procurement', positive: false }}
          icon={<TrendingDown size={20} />}
          accentColor="rose"
        />
        <AdminMetricCard
          label="Net Operating Profit"
          value={`₹${(sheet?.net_profit || 0).toLocaleString('en-IN')}`}
          trend={{ text: sheet?.net_profit >= 0 ? 'Surplus net positive' : 'Deficit', positive: sheet?.net_profit >= 0 }}
          icon={<Wallet size={20} />}
          accentColor="indigo"
        />
        <AdminMetricCard
          label="Studio Operating Margin"
          value={`${parseFloat(sheet?.profit_margin || '0').toFixed(1)}%`}
          trend={{ text: 'Net retention ratio', positive: parseFloat(sheet?.profit_margin || '0') > 0 }}
          icon={<PieChart size={20} />}
          accentColor="purple"
        />
      </div>

      {/* Income & Expense Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <ArrowUpRight size={18} className="text-emerald-600" />
            <span>Revenue Breakdown Channels</span>
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Job Card Detailing Revenue', value: sheet?.income?.job_revenue, color: '#D32F2F' },
              { label: 'Package & Membership Sales', value: sheet?.income?.package_revenue, color: '#059669' },
              { label: 'Express Counter & Manual Bills', value: sheet?.income?.bill_revenue, color: '#D97706' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs sm:text-sm font-semibold text-slate-700">{item.label}</span>
                </div>
                <span className="text-sm font-black text-slate-900">₹{(item.value || 0).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <ArrowDownRight size={18} className="text-rose-600" />
            <span>Expense Distribution Portfolio</span>
          </h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <RechartsPie>
                <Pie data={chartData} cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3} dataKey="value" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {chartData.map((entry: any, index: number) => <Cell key={index} fill={entry.fill} />)}
                </Pie>
                <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
              </RechartsPie>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs font-medium text-slate-400 text-center py-12">No expense entries found for the selected interval.</p>
          )}
        </div>
      </div>

      {/* Recent Expenses Table */}
      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Receipt size={18} className="text-[#D32F2F]" />
            <span>Recent Operational Disbursements</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-4 px-6">Disbursement Date</th>
                <th className="py-4 px-6">Cost Center / Category</th>
                <th className="py-4 px-6">Disbursement Description</th>
                <th className="py-4 px-6 text-right">Net Amount</th>
                <th className="py-4 px-6 text-right">GST Component</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(expensesData?.data || []).slice(0, 10).map((exp: any) => (
                <tr key={exp.id} className="hover:bg-red-50/30 transition-colors">
                  <td className="py-4 px-6 text-slate-600 text-xs font-medium">
                    {new Date(exp.expense_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                      {exp.category_name}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-800 text-xs font-medium">{exp.description || '—'}</td>
                  <td className="py-4 px-6 text-right font-black text-slate-900 text-sm">
                    ₹{parseFloat(exp.amount).toLocaleString('en-IN')}
                  </td>
                  <td className="py-4 px-6 text-right text-slate-500 text-xs font-medium">
                    ₹{parseFloat(exp.gst_amount || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
              {(!expensesData?.data?.length) && (
                <tr>
                  <td colSpan={5} className="text-center text-slate-400 py-10 text-xs font-medium">
                    No operating expenses logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
