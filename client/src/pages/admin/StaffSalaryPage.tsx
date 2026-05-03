import { useState, useEffect } from 'react';
import { Users, FileText, Check, Settings, Save, AlertTriangle } from 'lucide-react';
import AdminTopBar from '../../components/layout/AdminTopBar';
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

  return (
    <>
      <AdminTopBar
        title="Staff Salary Management"
        subtitle="Calculate and manage monthly payroll"
      />

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="font-bold text-[#5f5e5e] text-sm whitespace-nowrap">Select Month:</label>
          <input 
            type="month" 
            value={monthYear} 
            onChange={(e) => setMonthYear(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#D32F2F] text-sm font-medium w-full sm:w-auto"
          />
        </div>
        
        <Button onClick={handleGenerate} loading={generating} icon={<Settings size={16} />}>
          Generate / Recalculate
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : salaries.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileText size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-bold text-[#1c1b1b] mb-1">No Salary Records Found</p>
            <p className="text-sm">Click "Generate / Recalculate" to calculate salaries for {monthYear}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-[#5f5e5e] font-bold">
                  <th className="p-4">Staff Name</th>
                  <th className="p-4">Base Salary</th>
                  <th className="p-4">Bonus</th>
                  <th className="p-4">Deductions</th>
                  <th className="p-4 bg-red-50 text-[#D32F2F]">Final Salary</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {salaries.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-[#1c1b1b]">{s.staff_name}</p>
                      <p className="text-xs text-gray-500">{s.staff_mobile}</p>
                    </td>
                    
                    {editId === s.id ? (
                      <>
                        <td className="p-4">
                          <input type="number" value={editForm.base_salary} onChange={e => setEditForm({...editForm, base_salary: parseFloat(e.target.value) || 0})} className="w-24 px-2 py-1 border rounded text-sm" />
                        </td>
                        <td className="p-4">
                          <input type="number" value={editForm.bonus} onChange={e => setEditForm({...editForm, bonus: parseFloat(e.target.value) || 0})} className="w-20 px-2 py-1 border rounded text-sm" />
                        </td>
                        <td className="p-4">
                          <input type="number" value={editForm.deductions} onChange={e => setEditForm({...editForm, deductions: parseFloat(e.target.value) || 0})} className="w-20 px-2 py-1 border rounded text-sm" />
                        </td>
                        <td className="p-4 font-black text-[#D32F2F]">
                          {formatINR(getFinalSalary())}
                        </td>
                        <td className="p-4">
                          <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="px-2 py-1 border rounded text-xs uppercase font-bold">
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                          </select>
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleSave(s.id)} className="text-green-600 hover:text-green-800 font-bold text-xs uppercase bg-green-50 px-3 py-1.5 rounded flex items-center gap-1 inline-flex">
                            <Save size={14} /> Save
                          </button>
                          <button onClick={() => setEditId(null)} className="ml-2 text-gray-500 hover:text-gray-700 font-bold text-xs uppercase px-3 py-1.5 rounded inline-flex">
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-4 font-medium text-[#1c1b1b]">{formatINR(s.base_salary)}</td>
                        <td className="p-4 font-medium text-green-600">{parseFloat(s.bonus) > 0 ? `+${formatINR(s.bonus)}` : '—'}</td>
                        <td className="p-4 font-medium text-red-500">{parseFloat(s.deductions) > 0 ? `-${formatINR(s.deductions)}` : '—'}</td>
                        <td className="p-4 font-black text-[#D32F2F] bg-red-50/30">{formatINR(s.final_salary)}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${s.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => startEdit(s)} className="text-blue-600 hover:underline font-bold text-xs uppercase">
                            Edit
                          </button>
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
    </>
  );
}
