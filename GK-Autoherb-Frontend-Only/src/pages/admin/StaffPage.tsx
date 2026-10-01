import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Phone, ShieldCheck, UserCheck, UserX, Award, ArrowRight } from 'lucide-react';
import { useStaffList, useCreateStaff } from '../../api/hooks/useStaff';
import { useUIStore } from '../../store/uiStore';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import StatusBadge from '../../components/shared/StatusBadge';
import EmptyState from '../../components/shared/EmptyState';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';

export default function StaffPage() {
  const navigate = useNavigate();
  const toast = useUIStore(s => s.toast);
  const { data: staff, isLoading } = useStaffList();
  const createMutation = useCreateStaff();

  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', mobile: '', password: '', specialisations: '', email: '' });

  const staffList = staff || [];
  const filtered = staffList.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.mobile.includes(search) ||
    (s.specialisations && s.specialisations.toLowerCase().includes(search.toLowerCase()))
  );

  const presentCount = staffList.filter(s => s.today_attendance === 'present').length;
  const absentCount = staffList.filter(s => s.today_attendance === 'absent' || s.today_attendance === 'leave').length;
  const specialistCount = staffList.filter(s => Boolean(s.specialisations)).length;

  const handleCreate = async () => {
    if (!form.name || !form.mobile || !form.password) {
      toast('error', 'Name, mobile, and password are required');
      return;
    }
    try {
      await createMutation.mutateAsync(form);
      toast('success', 'Staff member added successfully');
      setShowAdd(false);
      setForm({ name: '', mobile: '', password: '', specialisations: '', email: '' });
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed to create staff');
    }
  };

  if (isLoading) return <SkeletonLoader lines={6} />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-14 font-sans antialiased text-slate-900">
      {/* ─── Top Bar ─── */}
      <AdminHeaderBar
        title="Staff & Technicians"
        subtitle="Manage detailing personnel, certifications, and operational attendance"
        badge={`${staffList.length} members`}
        actions={
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#D32F2F] text-white font-semibold text-xs shadow-md shadow-red-600/20 hover:bg-[#b71c1c] transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminMetricCard
            title="Total Workforce"
            value={`${staffList.length}`}
            subtitle="Registered crew & techs"
            icon={<Users className="w-5 h-5 text-[#D32F2F]" />}
            variant="red"
            trend={{ text: `${staffList.length} team`, positive: true }}
          />
          <AdminMetricCard
            title="Present On Bay"
            value={`${presentCount}`}
            subtitle="Active on floor today"
            icon={<UserCheck className="w-5 h-5 text-emerald-600" />}
            variant="emerald"
            trend={{ text: `${staffList.length > 0 ? Math.round((presentCount / staffList.length) * 100) : 0}% turn-out`, positive: true }}
          />
          <AdminMetricCard
            title="Absent / Leave"
            value={`${absentCount}`}
            subtitle="Off duty / unverified"
            icon={<UserX className="w-5 h-5 text-amber-600" />}
            variant={absentCount > 0 ? "amber" : "emerald"}
            trend={{ text: `${absentCount} away`, positive: absentCount === 0 }}
          />
          <AdminMetricCard
            title="Certified Specialists"
            value={`${specialistCount}`}
            subtitle="PPF, Ceramic, Paint techs"
            icon={<Award className="w-5 h-5 text-purple-600" />}
            variant="purple"
            trend={{ text: 'Multi-skilled', positive: true }}
          />
        </div>

        {/* Search Input Bar */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by staff name, mobile, specialization..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] font-medium transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="text-xs text-slate-400 font-medium self-end sm:self-center">
            Showing {filtered.length} of {staffList.length} staff
          </span>
        </div>

        {!filtered.length ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-sm">
            <Users size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No staff members found</h3>
            <p className="text-xs text-slate-400 mt-1">Try refining your search or add a new team member.</p>
          </div>
        ) : (
          <>
            {/* ─── Mobile View: Native Staff Cards (< md) ─── */}
            <div className="block md:hidden space-y-3">
              {filtered.map((s: any) => (
                <div
                  key={s.id}
                  onClick={() => navigate(`/admin/staff/${s.id}`)}
                  className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm active:scale-[0.99] transition-all space-y-3 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#b71c1c] flex items-center justify-center font-bold text-sm border border-red-100">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{s.name}</h3>
                        {s.email && <p className="text-[11px] text-slate-400">{s.email}</p>}
                      </div>
                    </div>
                    {s.today_attendance ? (
                      <StatusBadge status={s.today_attendance} />
                    ) : (
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                        Not marked
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <a
                      href={`tel:${s.mobile}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 active:scale-95 transition-all"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#D32F2F]" />
                      <span>{s.mobile}</span>
                    </a>

                    {s.specialisations ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-[#b71c1c] border border-red-100 truncate max-w-[150px]">
                        {s.specialisations}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">General Detailing</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ─── Desktop View: Staff Table (>= md) ─── */}
            <div className="hidden md:block bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                      <th className="px-5 py-4">Technician Details</th>
                      <th className="px-5 py-4">Mobile Contact</th>
                      <th className="px-5 py-4">Specialisations</th>
                      <th className="px-5 py-4">Today's Attendance</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((s: any) => (
                      <tr
                        key={s.id}
                        className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                        onClick={() => navigate(`/admin/staff/${s.id}`)}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-2xl bg-red-50 text-[#b71c1c] border border-red-100 flex items-center justify-center font-bold text-xs">
                              {s.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-xs leading-tight">{s.name}</p>
                              {s.email && <p className="text-[11px] text-slate-400">{s.email}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{s.mobile}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {s.specialisations ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-[#b71c1c] border border-red-100">
                              {s.specialisations}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {s.today_attendance ? (
                            <StatusBadge status={s.today_attendance} />
                          ) : (
                            <span className="text-[11px] text-slate-400">Not marked</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#D32F2F] hover:text-[#991b1b]">
                            Profile <ArrowRight className="w-3 h-3" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Staff Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Staff Member">
        <div className="space-y-4 py-1">
          <Input label="Full Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ramesh Parmar" />
          <Input label="Mobile Number *" value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} placeholder="9876543210" />
          <Input label="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="ramesh@gkautoherb.com" />
          <Input label="Password *" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" />
          <Textarea label="Specialisations" value={form.specialisations} onChange={e => setForm({ ...form, specialisations: e.target.value })} placeholder="PPF Installation, Ceramic Coating, Interior Deep Clean" />
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} loading={createMutation.isPending}>Add Staff Member</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
