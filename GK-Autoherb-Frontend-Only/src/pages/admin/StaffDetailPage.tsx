import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, Calendar, CheckSquare, IndianRupee, Download, Award, Clock, ShieldCheck, DollarSign } from 'lucide-react';
import { useStaffDetail, useUpdateStaff, useStaffAttendance, useMarkAttendance, useStaffPayments, useAddPayment, useCompletePayment } from '../../api/hooks/useStaff';
import { useUIStore } from '../../store/uiStore';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import StatusBadge from '../../components/shared/StatusBadge';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import Tabs from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Modal from '../../components/ui/Modal';
import DataTable from '../../components/ui/DataTable';
import { formatINR } from '../../utils/formatters';

const tabs = [
  { key: 'profile', label: 'Profile & Settings' },
  { key: 'attendance', label: 'Attendance Log' },
  { key: 'payments', label: 'Payments Tracker' },
];

export default function StaffDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useUIStore(s => s.toast);
  const staffId = parseInt(id || '0');

  const { data: staff, isLoading: isStaffLoading } = useStaffDetail(staffId);
  const { data: attendance, isLoading: isAttLoading } = useStaffAttendance(staffId);
  const { data: payments, isLoading: isPayLoading } = useStaffPayments(staffId);

  const updateMutation = useUpdateStaff();
  const markAttMutation = useMarkAttendance();
  const addPayMutation = useAddPayment();
  const completePayMutation = useCompletePayment();

  const [activeTab, setActiveTab] = useState('profile');
  const [showAttModal, setShowAttModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  const [attForm, setAttForm] = useState({ att_date: new Date().toISOString().slice(0, 10), status: 'present', note: '', check_in_time: '', check_out_time: '' });
  const [payForm, setPayForm] = useState({ amount: '', purpose: '', payment_date: new Date().toISOString().slice(0, 10) });
  const [profileForm, setProfileForm] = useState({ name: '', mobile: '', email: '', specialisations: '' });

  useState(() => {
    if (staff) {
      setProfileForm({
        name: staff.name || '',
        mobile: staff.mobile || '',
        email: staff.email || '',
        specialisations: staff.profile?.specialisations || '',
      });
    }
  });

  if (isStaffLoading) return <SkeletonLoader lines={8} />;
  if (!staff) return <div className="p-12 text-center text-slate-500 font-bold">Staff member not found.</div>;

  const handleUpdateProfile = async () => {
    try {
      await updateMutation.mutateAsync({ id: staffId, ...profileForm });
      toast('success', 'Profile updated successfully');
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Failed to update profile');
    }
  };

  const handleMarkAttendance = async () => {
    try {
      await markAttMutation.mutateAsync({ staffId, ...attForm });
      toast('success', 'Attendance marked');
      setShowAttModal(false);
    } catch(err: any) {
      toast('error', err?.response?.data?.error || 'Failed to mark attendance');
    }
  };

  const handleAddPayment = async () => {
    if (!payForm.amount || !payForm.purpose) {
      toast('error', 'Please fill all required fields');
      return;
    }
    try {
      await addPayMutation.mutateAsync({ staffId, amount: parseFloat(payForm.amount), purpose: payForm.purpose, payment_date: payForm.payment_date });
      toast('success', 'Payment recorded');
      setShowPayModal(false);
      setPayForm({ amount: '', purpose: '', payment_date: new Date().toISOString().slice(0, 10) });
    } catch(err: any) {
      toast('error', err?.response?.data?.error || 'Failed to add payment');
    }
  };

  const handleCompletePayment = async (pid: number) => {
    try {
      await completePayMutation.mutateAsync({ staffId, paymentId: pid });
      toast('success', 'Payment marked as completed');
    } catch(err: any) {
      toast('error', err?.response?.data?.error || 'Failed to complete payment');
    }
  };

  const presentDays = (attendance || []).filter((a: any) => a.status === 'present').length;
  const totalPaid = (payments || []).filter((p: any) => p.status === 'completed').reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-14 font-sans antialiased text-slate-900">
      <AdminHeaderBar
        title={staff.name}
        subtitle={`Staff ID #${staffId} • ${staff.mobile} ${staff.email ? `• ${staff.email}` : ''}`}
        badge={staff.profile?.specialisations ? staff.profile.specialisations.split(',')[0] : 'Technician'}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin/staff')}
              className="px-3.5 py-2 rounded-2xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Staff</span>
            </button>
            <a
              href={`tel:${staff.mobile}`}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#D32F2F] text-white text-xs font-bold shadow-md shadow-red-600/20 hover:bg-[#b71c1c] transition-all active:scale-95"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call Technician</span>
            </a>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminMetricCard
            title="Days Present"
            value={`${presentDays}`}
            subtitle="Recorded shifts"
            icon={<Calendar className="w-5 h-5 text-emerald-600" />}
            variant="emerald"
            trend={{ text: `${(attendance || []).length} logged`, positive: true }}
          />
          <AdminMetricCard
            title="Disbursed Payouts"
            value={formatINR(totalPaid)}
            subtitle="Salaries & advances paid"
            icon={<IndianRupee className="w-5 h-5 text-[#D32F2F]" />}
            variant="red"
            trend={{ text: `${(payments || []).length} entries`, positive: true }}
          />
          <AdminMetricCard
            title="Specialisations"
            value={staff.profile?.specialisations ? 'Multi-Tier' : 'General'}
            subtitle={staff.profile?.specialisations || 'Detailing crew'}
            icon={<Award className="w-5 h-5 text-purple-600" />}
            variant="purple"
            trend={{ text: 'Skills verified', positive: true }}
          />
          <AdminMetricCard
            title="Account Status"
            value="Active Crew"
            subtitle="Operational detailing bay"
            icon={<ShieldCheck className="w-5 h-5 text-sky-600" />}
            variant="sky"
            trend={{ text: 'Verified', positive: true }}
          />
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-3xl p-1.5 border border-slate-100 shadow-sm inline-flex">
          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {activeTab === 'profile' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm max-w-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 mb-2">Edit Technician Profile</h3>
            <div className="space-y-4">
              <Input label="Full Name" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} />
              <Input label="Mobile" value={profileForm.mobile} onChange={e => setProfileForm({...profileForm, mobile: e.target.value})} />
              <Input label="Email" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} />
              <Textarea label="Specialisations (comma separated)" value={profileForm.specialisations} onChange={e => setProfileForm({...profileForm, specialisations: e.target.value})} />
              <div className="pt-2">
                <Button variant="primary" onClick={handleUpdateProfile} loading={updateMutation.isPending}>Save Changes</Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#D32F2F]" /> Attendance Log
              </h3>
              <button
                onClick={() => setShowAttModal(true)}
                className="px-4 py-2 rounded-2xl bg-[#D32F2F] text-white font-semibold text-xs shadow-md shadow-red-600/20 hover:bg-[#b71c1c] transition-all active:scale-95"
              >
                Mark Attendance
              </button>
            </div>
            {isAttLoading ? <SkeletonLoader lines={3} /> : (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-2">
                <DataTable
                  columns={[
                    { key: 'att_date', header: 'Date', render: (row: any) => new Date(row.att_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
                    { key: 'status', header: 'Status', render: (row: any) => <StatusBadge status={row.status} /> },
                    { key: 'check_in_time', header: 'Check In', render: (row: any) => row.check_in_time ? new Date(row.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' },
                    { key: 'check_out_time', header: 'Check Out', render: (row: any) => row.check_out_time ? new Date(row.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' },
                    { key: 'note', header: 'Note', render: (row: any) => row.note || '—' }
                  ]}
                  data={attendance || []}
                  keyExtractor={(r: any) => r.id}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-[#D32F2F]" /> Payments Tracker
              </h3>
              <button
                onClick={() => setShowPayModal(true)}
                className="px-4 py-2 rounded-2xl bg-[#D32F2F] text-white font-semibold text-xs shadow-md shadow-red-600/20 hover:bg-[#b71c1c] transition-all active:scale-95"
              >
                Add Payment Entry
              </button>
            </div>
            {isPayLoading ? <SkeletonLoader lines={3} /> : (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-2">
                <DataTable
                  columns={[
                    { key: 'payment_date', header: 'Date', render: (row: any) => new Date(row.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
                    { key: 'purpose', header: 'Purpose' },
                    { key: 'amount', header: 'Amount', render: (row: any) => formatINR(parseFloat(row.amount)) },
                    { key: 'status', header: 'Status', render: (row: any) => <StatusBadge status={row.status} /> },
                    { key: 'actions', header: 'Action', render: (row: any) => 
                      row.status === 'pending' ? (
                        <button
                          onClick={() => handleCompletePayment(row.id)}
                          disabled={completePayMutation.isPending}
                          className="px-3 py-1 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 active:scale-95 transition-all shadow-sm"
                        >
                          Mark Paid
                        </button>
                      ) : <span className="text-xs font-bold text-emerald-600">Completed</span>
                    }
                  ]}
                  data={payments || []}
                  keyExtractor={(r: any) => r.id}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Attendance Modal */}
      <Modal open={showAttModal} onClose={() => setShowAttModal(false)} title="Mark Attendance">
        <div className="space-y-4 py-1">
          <Input label="Date" type="date" value={attForm.att_date} onChange={e => setAttForm({...attForm, att_date: e.target.value})} />
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
            <select 
              className="w-full px-3.5 py-2 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F]"
              value={attForm.status} onChange={e => setAttForm({...attForm, status: e.target.value})}
            >
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="half_day">Half Day</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Check-In Time" type="time" value={attForm.check_in_time} onChange={e => setAttForm({...attForm, check_in_time: e.target.value})} />
            <Input label="Check-Out Time" type="time" value={attForm.check_out_time} onChange={e => setAttForm({...attForm, check_out_time: e.target.value})} />
          </div>
          <Input label="Note (Optional)" value={attForm.note} onChange={e => setAttForm({...attForm, note: e.target.value})} placeholder="e.g. Bay 2 PPF lead" />
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowAttModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleMarkAttendance} loading={markAttMutation.isPending}>Save Attendance</Button>
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal open={showPayModal} onClose={() => setShowPayModal(false)} title="Add Payment Entry">
        <div className="space-y-4 py-1">
          <Input label="Amount (₹) *" type="number" value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} placeholder="e.g. 5000" />
          <Input label="Purpose *" value={payForm.purpose} onChange={e => setPayForm({...payForm, purpose: e.target.value})} placeholder="e.g. Salary Advance, Incentive, Overtime" />
          <Input label="Date *" type="date" value={payForm.payment_date} onChange={e => setPayForm({...payForm, payment_date: e.target.value})} />
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowPayModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAddPayment} loading={addPayMutation.isPending}>Save Payment</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
