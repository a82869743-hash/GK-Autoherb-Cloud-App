import { useState, useEffect } from 'react';
import api from '../../api/axiosInstance';
import { CheckCircle, Loader2, PackageOpen, User, Car, Clock } from 'lucide-react';

export default function PackageApprovalsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<number | null>(null);

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

  const handleApprove = async (id: number) => {
    if (!window.confirm('Approve this package request? This will generate an invoice.')) return;
    setApprovingId(id);
    try {
      const res = await api.put(\`/packages/requests/\${id}/approve\`);
      if (res.data.success) {
        alert('Package approved successfully!');
        fetchRequests(); // refresh list
      }
    } catch (err) {
      console.error(err);
      alert('Failed to approve package');
    } finally {
      setApprovingId(null);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1c1b1b] flex items-center gap-2">
          <PackageOpen className="text-[#D32F2F] w-7 h-7" />
          Package Approvals
        </h1>
        <p className="text-sm text-[#5f5e5e] mt-1">Review and approve customer package purchases to activate them.</p>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-500" /> Pending Requests
        </h2>
        {pendingRequests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <PackageOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No pending package requests.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingRequests.map(req => (
              <div key={req.id} className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden flex flex-col">
                <div className="bg-orange-50 p-4 border-b border-orange-100 flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{req.package_name}</h3>
                    <div className="text-sm font-bold text-orange-600 mt-1">₹{req.price}</div>
                  </div>
                  <span className="bg-orange-200 text-orange-800 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Pending</span>
                </div>
                <div className="p-4 space-y-3 flex-1">
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{req.customer_name}</div>
                      <div className="text-gray-500">{req.customer_mobile}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Car className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{req.brand} {req.model}</div>
                      <div className="text-gray-500">{req.registration_no || 'No Reg'}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                    Requested on: {new Date(req.created_at).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100">
                  <button
                    onClick={() => handleApprove(req.id)}
                    disabled={approvingId === req.id}
                    className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {approvingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Approve Package
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" /> Recently Approved
        </h2>
        {approvedRequests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500 font-medium">No approved packages yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="p-4">Package</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Vehicle</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Approved At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {approvedRequests.map(req => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-900">{req.package_name}</td>
                    <td className="p-4">
                      <div>{req.customer_name}</div>
                      <div className="text-gray-500 text-xs">{req.customer_mobile}</div>
                    </td>
                    <td className="p-4">
                      <div>{req.brand} {req.model}</div>
                      <div className="text-gray-500 text-xs">{req.registration_no || 'No Reg'}</div>
                    </td>
                    <td className="p-4 font-bold text-gray-900">₹{req.price}</td>
                    <td className="p-4 text-gray-500">
                      {new Date(req.approved_at || req.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
