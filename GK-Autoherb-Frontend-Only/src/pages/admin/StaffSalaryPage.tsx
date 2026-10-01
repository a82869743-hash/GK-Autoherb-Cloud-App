import { useState, useEffect } from 'react';
import { Users, FileText, Check, Settings, Save, AlertTriangle, Download, Plus, DollarSign, Calendar, ShieldCheck, Clock } from 'lucide-react';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import Button from '../../components/ui/Button';
import api from '../../api/axiosInstance';
import toast from 'react-hot-toast';
import { formatINR } from '../../utils/formatters';

export default function StaffSalaryPage() {
  const [monthYear, setMonthYear] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [salaries, setSalaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);

  // Custom salary modal
  const [showAdd, setShowAdd] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [addForm, setAddForm] = useState({ staff_id: '', base_salary: 0, bonus: 0, deductions: 0, status: 'paid', notes: '' });
  
  // Editing state
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    base_salary: 0,
    bonus: 0,
    deductions: 0,
    status: 'pending',
    notes: ''
  });

  const fetchSalaries = async () => {
    setLoading(true);
    try {
      const res = await api.get('/salary', { params: { month_year: monthYear } });
      setSalaries(res.data.data || []);
      setEditId(null);
    } catch (err) {
      setSalaries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaries();
    api.get('/staff').then(res => setStaffList(res.data.data || [])).catch(() => {});
  }, [monthYear]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      await api.post('/salary/calculate', { month_year: monthYear });
      toast.success('Salary records generated successfully');
      fetchSalaries();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to generate salaries');
    } finally {
      setGenerating(false);
    }
  };

  const startEdit = (s: any) => {
    setEditId(s.id);
    setEditForm({
      base_salary: parseFloat(s.base_salary),
      bonus: parseFloat(s.bonus),
      deductions: parseFloat(s.deductions),
      status: s.status,
      notes: s.notes || ''
    });
  };

  const handleSave = async (id: number) => {
    try {
      await api.put(`/salary/${id}`, editForm);
      toast.success('Salary updated');
      fetchSalaries();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update');
    }
  };

  const getFinalSalary = () => {
    return editForm.base_salary + editForm.bonus - editForm.deductions;
  };

  const handleDownload = async (s: any) => {
    setDownloading(s.id);
    try {
      const tokenStr = sessionStorage.getItem('gk-auth-v1') || localStorage.getItem('gk-auth-v1');
      let token = '';
      if (tokenStr) token = JSON.parse(tokenStr).state?.token || '';
      
      const API = import.meta.env.VITE_API_URL || '';
      const url = `${API}/salary/${s.id}/slip?token=${token}`;
      
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Failed');
      const blob = await resp.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `SAL-${s.month_year}-${s.id}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      toast.error('Could not generate PDF');
    } finally {
      setDownloading(null);
    }
  };

  const handleCreateSalary = async () => {
    if (!addForm.staff_id) return toast.error('Select a staff member');
    try {
      await api.post('/salary', { ...addForm, month_year: monthYear });
      toast.success('Salary record created');
      setShowAdd(false);
      fetchSalaries();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create');
    }
  };

  const totalPayroll = salaries.reduce((acc, s) => acc + (parseFloat(s.final_salary) || 0), 0);
  const totalPaid = salaries.filter(s => s.status === 'paid').reduce((acc, s) => acc + (parseFloat(s.final_salary) || 0), 0);
  const totalPending = salaries.filter(s => s.status === 'pending').reduce((acc, s) => acc + (parseFloat(s.final_salary) || 0), 0);
  const paidCount = salaries.filter(s => s.status === 'paid').length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-14 font-sans antialiased text-slate-900">
      <AdminHeaderBar
        title="Staff Salary & Payroll Management"
        subtitle={`Calculate and manage detailing staff payroll for ${monthYear}`}
        badge={`${salaries.length} records`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Custom Salary</span>
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#D32F2F] text-white text-xs font-bold shadow-md shadow-red-600/20 hover:bg-[#b71c1c] transition-all active:scale-95 disabled:opacity-50"
            >
              <Settings className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
              <span>Auto Generate</span>
            </button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminMetricCard
            title="Total Monthly Payroll"
            value={formatINR(totalPayroll)}
            subtitle="Gross wage liability"
            icon={<DollarSign className="w-5 h-5 text-[#D32F2F]" />}
            variant="red"
            trend={{ text: `${salaries.length} technicians`, positive: true }}
          />
          <AdminMetricCard
            title="Disbursed (Paid)"
            value={formatINR(totalPaid)}
            subtitle="Completed transfers"
            icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
            variant="emerald"
            trend={{ text: `${paidCount} settled`, positive: true }}
          />
          <AdminMetricCard
            title="Pending Payouts"
            value={formatINR(totalPending)}
            subtitle="Awaiting clearance"
            icon={<Clock className="w-5 h-5 text-amber-600" />}
            variant={totalPending > 0 ? "amber" : "emerald"}
            trend={{ text: `${salaries.length - paidCount} pending`, positive: totalPending === 0 }}
          />
          <AdminMetricCard
            title="Cycle Period"
            value={monthYear}
            subtitle="Payroll billing month"
            icon={<Calendar className="w-5 h-5 text-purple-600" />}
            variant="purple"
            trend={{ text: 'Active Cycle', positive: true }}
          />
        </div>

        {/* Month Selector Bar */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <label className="font-bold text-xs uppercase text-slate-400 tracking-wider whitespace-nowrap">Payroll Month:</label>
            <input 
              type="month" 
              value={monthYear} 
              onChange={(e) => setMonthYear(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-bold text-slate-800 focus:ring-2 focus:ring-red-500/20"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Showing payroll ledger for {salaries.length} technicians
          </span>
        </div>

        {/* ─── Mobile View: Salary Cards (< md) ─── */}
        <div className="block md:hidden space-y-3">
          {loading ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-sm">
              <p className="text-xs text-slate-400 font-medium animate-pulse">Loading payroll records...</p>
            </div>
          ) : salaries.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-sm">
              <FileText size={36} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No salary records found</p>
              <p className="text-xs text-slate-400 mt-1">Tap Auto Generate to calculate salaries for {monthYear}</p>
            </div>
          ) : (
            salaries.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{s.staff_name}</h3>
                    <p className="text-xs text-slate-400">{s.staff_mobile}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${s.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                    {s.status}
                  </span>
                </div>

                {editId === s.id ? (
                  <div className="space-y-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Base</span>
                        <input type="number" value={editForm.base_salary} onChange={e => setEditForm({...editForm, base_salary: parseFloat(e.target.value) || 0})} className="w-full p-1.5 border border-slate-200 rounded-xl bg-white text-xs" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Bonus</span>
                        <input type="number" value={editForm.bonus} onChange={e => setEditForm({...editForm, bonus: parseFloat(e.target.value) || 0})} className="w-full p-1.5 border border-slate-200 rounded-xl bg-white text-xs" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Deduct</span>
                        <input type="number" value={editForm.deductions} onChange={e => setEditForm({...editForm, deductions: parseFloat(e.target.value) || 0})} className="w-full p-1.5 border border-slate-200 rounded-xl bg-white text-xs" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="p-1.5 border border-slate-200 rounded-xl text-xs bg-white">
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                      </select>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleSave(s.id)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl font-bold text-xs">Save</button>
                        <button onClick={() => setEditId(null)} className="px-2 py-1.5 text-slate-400 text-xs">Cancel</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 text-xs text-slate-500">
                    <div>
                      <span className="text-[10px] uppercase block font-semibold text-slate-400">Base</span>
                      <span className="font-bold text-slate-800">{formatINR(s.base_salary)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase block font-semibold text-slate-400">Bonus</span>
                      <span className="font-bold text-emerald-600">{parseFloat(s.bonus) > 0 ? `+${formatINR(s.bonus)}` : '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase block font-semibold text-slate-400">Deduct</span>
                      <span className="font-bold text-rose-500">{parseFloat(s.deductions) > 0 ? `-${formatINR(s.deductions)}` : '—'}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Net Pay</span>
                    <div className="text-base font-black text-slate-900">
                      {formatINR(s.final_salary)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => startEdit(s)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold active:scale-95 transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDownload(s)}
                      disabled={downloading === s.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#D32F2F] text-white text-xs font-bold hover:bg-[#b71c1c] active:scale-95 disabled:opacity-50 transition-all shadow-sm"
                    >
                      <Download size={13} />
                      <span>Slip</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ─── Desktop View: Full Table (>= md) ─── */}
        <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium animate-pulse">Loading payroll records...</div>
          ) : salaries.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileText size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-slate-800 mb-1">No Salary Records Found</p>
              <p className="text-xs">Click "Auto Generate" to calculate salaries for {monthYear}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-100 uppercase tracking-wider text-slate-400 font-bold text-[11px]">
                    <th className="p-4">Technician Details</th>
                    <th className="p-4">Base Salary</th>
                    <th className="p-4">Bonus / Inc</th>
                    <th className="p-4">Deductions</th>
                    <th className="p-4 text-[#D32F2F]">Final Salary</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salaries.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-slate-900 leading-tight">{s.staff_name}</p>
                        <p className="text-[11px] text-slate-400">{s.staff_mobile}</p>
                      </td>
                      
                      {editId === s.id ? (
                        <>
                          <td className="p-4">
                            <input type="number" value={editForm.base_salary} onChange={e => setEditForm({...editForm, base_salary: parseFloat(e.target.value) || 0})} className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                          </td>
                          <td className="p-4">
                            <input type="number" value={editForm.bonus} onChange={e => setEditForm({...editForm, bonus: parseFloat(e.target.value) || 0})} className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                          </td>
                          <td className="p-4">
                            <input type="number" value={editForm.deductions} onChange={e => setEditForm({...editForm, deductions: parseFloat(e.target.value) || 0})} className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                          </td>
                          <td className="p-4 font-black text-[#D32F2F]">
                            {formatINR(getFinalSalary())}
                          </td>
                          <td className="p-4">
                            <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="px-2 py-1 border border-slate-200 rounded-xl text-xs uppercase font-bold">
                              <option value="pending">Pending</option>
                              <option value="paid">Paid</option>
                            </select>
                          </td>
                          <td className="p-4 text-right">
                            <button onClick={() => handleSave(s.id)} className="text-emerald-700 font-bold text-xs uppercase bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl inline-flex items-center gap-1">
                              <Save size={13} /> Save
                            </button>
                            <button onClick={() => setEditId(null)} className="ml-2 text-slate-400 font-bold text-xs uppercase px-3 py-1.5 rounded-xl inline-flex hover:bg-slate-100">
                              Cancel
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-4 font-medium text-slate-700">{formatINR(s.base_salary)}</td>
                          <td className="p-4 font-medium text-emerald-600">{parseFloat(s.bonus) > 0 ? `+${formatINR(s.bonus)}` : '—'}</td>
                          <td className="p-4 font-medium text-rose-500">{parseFloat(s.deductions) > 0 ? `-${formatINR(s.deductions)}` : '—'}</td>
                          <td className="p-4 font-black text-slate-900">{formatINR(s.final_salary)}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${s.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => startEdit(s)} className="text-[#D32F2F] hover:text-[#991b1b] font-bold text-xs">
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDownload(s)} 
                                disabled={downloading === s.id}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                              >
                                <Download size={13} />
                                <span>Slip</span>
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Custom Salary Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-sm">Create Custom Salary Entry</h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Staff Member</label>
                <select 
                  value={addForm.staff_id} 
                  onChange={e => setAddForm({...addForm, staff_id: e.target.value})}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-red-500/20 text-xs font-medium bg-slate-50"
                >
                  <option value="">Select Staff Member</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.mobile})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Base Salary (₹)</label>
                  <input type="number" value={addForm.base_salary} onChange={e => setAddForm({...addForm, base_salary: parseFloat(e.target.value) || 0})} className="w-full px-3.5 py-2 border border-slate-200 rounded-2xl text-xs bg-slate-50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bonus (₹)</label>
                  <input type="number" value={addForm.bonus} onChange={e => setAddForm({...addForm, bonus: parseFloat(e.target.value) || 0})} className="w-full px-3.5 py-2 border border-slate-200 rounded-2xl text-xs bg-slate-50" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Deductions (₹)</label>
                  <input type="number" value={addForm.deductions} onChange={e => setAddForm({...addForm, deductions: parseFloat(e.target.value) || 0})} className="w-full px-3.5 py-2 border border-slate-200 rounded-2xl text-xs bg-slate-50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                  <select value={addForm.status} onChange={e => setAddForm({...addForm, status: e.target.value})} className="w-full px-3.5 py-2 border border-slate-200 rounded-2xl text-xs font-bold uppercase bg-slate-50">
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
              <div className="bg-red-50/80 p-3.5 rounded-2xl border border-red-100 flex justify-between items-center">
                <span className="text-xs font-bold text-[#b71c1c] uppercase">Final Net Salary</span>
                <span className="font-black text-lg text-[#7f1d1d]">{formatINR(addForm.base_salary + addForm.bonus - addForm.deductions)}</span>
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleCreateSalary}>Create Salary Slip</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
