import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axiosInstance';
import { UserCircle, Car, ArrowLeft, Loader2, Send, History, Calendar, ClipboardList, Package, Clock, RefreshCw } from 'lucide-react';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [activePackage, setActivePackage] = useState<any>(null);
  const [packageHistory, setPackageHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      const [resCust, resPkg, resPkgHistory] = await Promise.all([
        api.get(`/customers/${id}`),
        api.get(`/packages/active?user_id=${id}`).catch(() => ({ data: { success: false, data: null } })),
        api.get(`/user-packages/history?user_id=${id}`).catch(() => ({ data: { success: false, data: [] } })),
      ]);
      if (resCust.data.success) {
        setData(resCust.data.data);
      }
      if (resPkg.data && resPkg.data.success && resPkg.data.data) {
        setActivePackage(resPkg.data.data);
      }
      // Package history — filter out the active one
      const allPkgs = resPkgHistory.data?.data || [];
      const activePkgId = resPkg.data?.data?.id;
      setPackageHistory(allPkgs.filter((p: any) => p.id !== activePkgId));
    } catch (err) {
      console.error(err);
      alert('Failed to load customer details.');
      navigate('/admin/customers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSubmittingNote(true);
    try {
      const res = await api.post(`/customers/${id}/notes`, { note: newNote });
      if (res.data.success) {
        setData((prev: any) => ({
          ...prev,
          notes: [res.data.data, ...prev.notes]
        }));
        setNewNote('');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to add note');
    } finally {
      setSubmittingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <button 
        onClick={() => navigate('/admin/customers')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Details & Vehicles */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-800 h-24"></div>
            <div className="px-6 pb-6 relative">
              <div className="absolute -top-10 bg-white p-1.5 rounded-full shadow-md">
                <UserCircle className="w-16 h-16 text-gray-300 bg-white rounded-full" />
              </div>
              <div className="pt-10">
                <h2 className="text-xl font-bold text-gray-900">{data.name}</h2>
                <p className="text-sm text-gray-500 mb-4">Customer ID: CUST-{data.id}</p>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-gray-50 pb-2">
                    <span className="text-gray-500">Mobile</span>
                    <span className="font-medium text-gray-900">{data.mobile || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-2">
                    <span className="text-gray-500">Email</span>
                    <span className="font-medium text-gray-900">{data.email || '—'}</span>
                  </div>
                  <div className="flex justify-between pb-2">
                    <span className="text-gray-500">Joined</span>
                    <span className="font-medium text-gray-900">
                      {new Date(data.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Package */}
          {activePackage && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-purple-600" />
                Active Package
              </h3>
              <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl relative">
                <div className="font-bold text-gray-900">{activePackage.package_name}</div>
                {activePackage.start_date && activePackage.end_date && (
                  <div className="text-xs text-gray-500 mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span>Purchased On:</span>
                      <span className="font-medium text-gray-900">{new Date(activePackage.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Valid Till:</span>
                      <span className="font-medium text-gray-900">{new Date(activePackage.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                )}
                {activePackage.usage && activePackage.usage.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-purple-200/50 space-y-1.5">
                    {activePackage.usage.map((u: any) => (
                      <div key={u.service_name} className="flex justify-between text-xs">
                        <span className="text-gray-600">{u.service_name}</span>
                        <span className={`font-bold ${u.remaining > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{u.remaining} left</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Package History */}
          {packageHistory.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-gray-400" />
                  Package History
                </h3>
                <div className="flex gap-2">
                  <a
                    href={`${api.defaults.baseURL}/user-packages/export?user_id=${id}&format=pdf&token=${localStorage.getItem('token')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors border border-red-100 flex items-center gap-1"
                  >
                    PDF
                  </a>
                  <a
                    href={`${api.defaults.baseURL}/user-packages/export?user_id=${id}&format=excel&token=${localStorage.getItem('token')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors border border-green-100 flex items-center gap-1"
                  >
                    Excel
                  </a>
                </div>
              </div>
              <div className="space-y-3">
                {packageHistory.map((pkg: any) => {
                  const isExpired = pkg.status === 'expired' || (pkg.end_date && new Date(pkg.end_date) < new Date());
                  return (
                    <div key={pkg.id} className={`p-3 rounded-xl border relative ${isExpired ? 'bg-gray-50 border-gray-100 opacity-70' : 'bg-blue-50 border-blue-100'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900 text-sm">{pkg.package_name || pkg.name || 'Package'}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          isExpired ? 'bg-gray-200 text-gray-500' : pkg.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {pkg.status || (isExpired ? 'Expired' : 'Active')}
                        </span>
                      </div>
                      {pkg.start_date && (
                        <div className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-3">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(pkg.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          {pkg.end_date && (
                            <span>→ {new Date(pkg.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vehicles List */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Car className="w-5 h-5 text-red-600" />
              Registered Vehicles
            </h3>
            {data.vehicles.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No vehicles registered.</p>
            ) : (
              <div className="space-y-3">
                {data.vehicles.map((v: any) => (
                  <div key={v.id} className="p-3 bg-gray-50 border border-gray-100 rounded-xl relative">
                    {v.is_primary === 1 && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 bg-green-100 text-green-800 text-[10px] font-bold uppercase rounded">Primary</span>
                    )}
                    <div className="font-bold text-gray-900">{v.brand} {v.model}</div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                      <span className="bg-white px-2 py-0.5 rounded border border-gray-200">{v.registration_no || 'No Reg'}</span>
                      <span className="uppercase">{v.category ? v.category.replace('_', ' ') : 'UNKNOWN'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: CRM History Notes */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[calc(100vh-12rem)] min-h-[500px]">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <History className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-gray-900">CRM History Notes</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 space-y-6 relative">
              {data.notes.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                  <ClipboardList className="w-12 h-12 mb-2 opacity-50" />
                  <p>No notes yet. Add the first note below.</p>
                </div>
              ) : (
                data.notes.map((note: any) => (
                  <div key={note.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0 shadow-sm border border-red-200">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="w-0.5 h-full bg-gray-200 my-1"></div>
                    </div>
                    <div className="flex-1 bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-2">
                      <div className="text-xs text-gray-500 mb-2 font-medium">
                        {new Date(note.created_at).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: 'numeric', minute: '2-digit', hour12: true
                        })}
                      </div>
                      <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {note.note}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Note Input */}
            <div className="p-4 border-t border-gray-100 bg-white">
              <form onSubmit={handleAddNote} className="flex gap-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Type a note about this customer (e.g. car year of registration, preferences, complaints)..."
                  className="flex-1 border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none h-14"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddNote(e);
                    }
                  }}
                ></textarea>
                <button
                  type="submit"
                  disabled={!newNote.trim() || submittingNote}
                  className="px-6 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {submittingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span className="hidden sm:inline">Add</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
