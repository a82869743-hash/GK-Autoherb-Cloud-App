import { useState, useEffect } from 'react';
import api from '../../api/axiosInstance';
import { CheckCircle, XCircle, Loader2, PackageOpen, User, Car, Clock, AlertTriangle, Download, ShieldCheck, DollarSign, ArrowRight } from 'lucide-react';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useAuthStore } from '../../store/authStore';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import VehicleBrandBadge from '../../components/admin/VehicleBrandBadge';
import { formatINR } from '../../utils/formatters';

export default function PackageApprovalsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectModalId, setRejectModalId] = useState<number | null>(null);
  const [approveModalId, setApproveModalId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const fetchRequests = async () => {
    try {
      const res = await api.get('/packages/requests');
      if (res.data.success) {
        setRequests(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApproveClick = (id: number) => {
    setApproveModalId(id);
  };

  const handleConfirmApprove = async () => {
    if (!approveModalId) return;
    setApprovingId(approveModalId);
    try {
      const res = await api.put(`/packages/requests/${approveModalId}/approve`);
      if (res.data.success) {
        setApproveModalId(null);
        fetchRequests();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to approve package');
    } finally {
      setApprovingId(null);
    }
  };

  const openRejectModal = (id: number) => {
    setRejectModalId(id);
    setRejectionReason('');
  };

  const handleReject = async () => {
    if (!rejectModalId) return;
    setRejectingId(rejectModalId);
    try {
      const res = await api.put(`/packages/requests/${rejectModalId}/reject`, {
        rejection_reason: rejectionReason.trim(),
      });
      if (res.data.success) {
        alert('Package request rejected. Customer will be notified via SMS.');
        setRejectModalId(null);
        setRejectionReason('');
        fetchRequests();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to reject package request');
    } finally {
      setRejectingId(null);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');
  const totalApprovedValue = approvedRequests.reduce((acc, r) => acc + (parseFloat(r.price) || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#D32F2F]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-14 font-sans antialiased text-slate-900">
      <AdminHeaderBar
        title="Package Purchase Approvals"
        subtitle="Review, approve, or reject customer membership package requests"
        badge={`${requests.length} total`}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminMetricCard
            title="Pending Review"
            value={`${pendingRequests.length}`}
            subtitle="Awaiting studio verification"
            icon={<Clock className="w-5 h-5 text-amber-600" />}
            variant={pendingRequests.length > 0 ? "amber" : "emerald"}
            trend={{ text: `${pendingRequests.length} urgent`, positive: pendingRequests.length === 0 }}
          />
          <AdminMetricCard
            title="Approved Memberships"
            value={`${approvedRequests.length}`}
            subtitle="Active customer subscriptions"
            icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
            variant="emerald"
            trend={{ text: 'Active packages', positive: true }}
          />
          <AdminMetricCard
            title="Rejected Submissions"
            value={`${rejectedRequests.length}`}
            subtitle="Invalid or unverified"
            icon={<XCircle className="w-5 h-5 text-rose-600" />}
            variant="rose"
            trend={{ text: `${rejectedRequests.length} closed`, positive: false }}
          />
          <AdminMetricCard
            title="Approved Volume"
            value={formatINR(totalApprovedValue)}
            subtitle="Package revenue collected"
            icon={<DollarSign className="w-5 h-5 text-purple-600" />}
            variant="purple"
            trend={{ text: 'Subscription revenue', positive: true }}
          />
        </div>

        {/* ─── Tab Bar ─── */}
        <div className="bg-white rounded-3xl p-1.5 border border-slate-100 shadow-sm inline-flex items-center gap-1">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'pending'
                ? 'bg-[#D32F2F] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending</span>
            {pendingRequests.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'approved'
                ? 'bg-[#D32F2F] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Approved</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${activeTab === 'approved' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {approvedRequests.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'rejected'
                ? 'bg-[#D32F2F] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${activeTab === 'rejected' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {rejectedRequests.length}
            </span>
          </button>
        </div>

        {/* ─── PENDING TAB ─── */}
        {activeTab === 'pending' && (
          <div>
            {pendingRequests.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-sm">
                <PackageOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800">No Pending Requests</h3>
                <p className="text-xs text-slate-400 mt-1">All customer package submissions have been reviewed.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {pendingRequests.map(req => (
                  <div key={req.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col justify-between hover:shadow-md transition-all">
                    <div>
                      <div className="bg-slate-50/70 p-5 border-b border-slate-100 flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-900 text-base leading-tight">{req.package_name}</h3>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-sm font-black text-[#D32F2F]">{formatINR(req.price)}</span>
                            {req.pricing_type && (
                              <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-full border ${req.pricing_type === 'premium' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{req.pricing_type}</span>
                            )}
                          </div>
                        </div>
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Pending</span>
                      </div>
                      
                      <div className="p-5 space-y-3">
                        <div className="flex items-start gap-2.5">
                          <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          <div className="text-xs">
                            <div className="font-bold text-slate-900">{req.customer_name}</div>
                            <div className="text-slate-400 font-mono mt-0.5">{req.customer_mobile}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <VehicleBrandBadge brand={req.brand || 'Hyundai'} model={req.model} regNo={req.registration_no} size="sm" />
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <span className="text-xs font-semibold text-slate-500">Payment Status:</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                            req.payment_status === 'captured'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {req.payment_status === 'captured' ? 'PAID' : 'PENDING'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                          Requested: {new Date(req.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    <div className="p-5 bg-slate-50/60 border-t border-slate-100 flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveClick(req.id)}
                          disabled={approvingId === req.id}
                          className="flex-1 flex justify-center items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        >
                          {approvingId === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          Approve
                        </button>
                        <button
                          onClick={() => openRejectModal(req.id)}
                          className="flex-1 flex justify-center items-center gap-2 px-4 py-2 border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold rounded-2xl hover:bg-rose-100 transition-all active:scale-95"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          const token = useAuthStore.getState().token;
                          window.open(`/api/packages/requests/${req.id}/invoice?token=${token}`, '_blank');
                        }}
                        className="w-full flex justify-center items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-2xl hover:bg-slate-100 transition-colors shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        Download Invoice
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── APPROVED TAB ─── */}
        {activeTab === 'approved' && (
          <div>
            {approvedRequests.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-sm">
                <p className="text-slate-400 font-bold text-sm">No approved packages yet.</p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden overflow-x-auto">
                <table className="w-full min-w-[800px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/60 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                      <th className="p-4">Package</th>
                      <th className="p-4">Tier</th>
                      <th className="p-4">Customer Details</th>
                      <th className="p-4">Assigned Vehicle</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Payment</th>
                      <th className="p-4">Approved At</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {approvedRequests.map(req => (
                      <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-4 font-bold text-slate-900">{req.package_name}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-full border ${req.pricing_type === 'premium' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{req.pricing_type || 'basic'}</span>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{req.customer_name}</div>
                          <div className="text-slate-400 text-[11px]">{req.customer_mobile}</div>
                        </td>
                        <td className="p-4">
                          <VehicleBrandBadge brand={req.brand || 'Hyundai'} model={req.model} regNo={req.registration_no} size="sm" />
                        </td>
                        <td className="p-4 font-black text-slate-900">{formatINR(req.price)}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            req.payment_status === 'captured'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {req.payment_status === 'captured' ? 'PAID' : 'PENDING'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500">
                          {new Date(req.approved_at || req.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              const token = useAuthStore.getState().token;
                              window.open(`/api/packages/requests/${req.id}/invoice?token=${token}`, '_blank');
                            }}
                            className="text-[#D32F2F] hover:text-[#991b1b] font-bold text-xs inline-flex items-center gap-1 bg-red-50 border border-red-100 px-3 py-1.5 rounded-xl hover:bg-red-100 transition-colors shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── REJECTED TAB ─── */}
        {activeTab === 'rejected' && (
          <div>
            {rejectedRequests.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-sm">
                <p className="text-slate-400 font-bold text-sm">No rejected requests.</p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden overflow-x-auto">
                <table className="w-full min-w-[800px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/60 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                      <th className="p-4">Package</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Vehicle</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Rejection Reason</th>
                      <th className="p-4">Rejected At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rejectedRequests.map(req => (
                      <tr key={req.id} className="hover:bg-rose-50/30 transition-colors">
                        <td className="p-4 font-bold text-slate-900">{req.package_name}</td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{req.customer_name}</div>
                          <div className="text-slate-400 text-[11px]">{req.customer_mobile}</div>
                        </td>
                        <td className="p-4">
                          <VehicleBrandBadge brand={req.brand || 'Hyundai'} model={req.model} regNo={req.registration_no} size="sm" />
                        </td>
                        <td className="p-4 font-black text-slate-900">{formatINR(req.price)}</td>
                        <td className="p-4">
                          <div className="flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <span className="text-rose-600 text-xs font-semibold">{req.rejection_reason || 'No reason provided'}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-500 text-xs">
                          {new Date(req.updated_at || req.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── REJECTION REASON MODAL ─── */}
      {rejectModalId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="bg-rose-50 px-6 py-4 border-b border-rose-100">
              <h3 className="text-base font-bold text-rose-800 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                Reject Package Request
              </h3>
              <p className="text-xs text-rose-600 mt-1">The customer will be notified via SMS regarding rejection reason.</p>
            </div>
            <div className="p-6">
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                Rejection Reason (Optional)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., UTR payment reference mismatch, Duplicate request..."
                rows={3}
                className="w-full border border-slate-200 bg-slate-50 rounded-2xl p-3 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none resize-none"
              />
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => { setRejectModalId(null); setRejectionReason(''); }}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-2xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={rejectingId !== null}
                className="flex-1 flex justify-center items-center gap-2 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-2xl hover:bg-rose-700 transition-colors disabled:opacity-50 shadow-md shadow-rose-600/20 active:scale-95"
              >
                {rejectingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={approveModalId !== null}
        onClose={() => setApproveModalId(null)}
        onConfirm={handleConfirmApprove}
        title="Approve Package"
        description="Are you sure you want to approve this package request? This will generate an official tax invoice and activate the member pass."
        confirmText="Approve"
        isDestructive={false}
        loading={approvingId !== null}
      />
    </div>
  );
}
