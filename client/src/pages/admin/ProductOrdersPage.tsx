import { useState, useEffect } from 'react';
import { ShoppingBag, Check, X, Search, RefreshCw, Clock, CreditCard, DollarSign, CheckCircle2, ShieldAlert, AlertCircle, QrCode } from 'lucide-react';
import api from '../../api/axiosInstance';
import { useUIStore } from '../../store/uiStore';
import PremiumPageHeader from '../../components/shared/PremiumPageHeader';
import PremiumStatCard from '../../components/shared/PremiumStatCard';

// 15 product templates to resolve product images for display in admin
const PRODUCT_TEMPLATES = [
  { dbName: 'MICROFIBER 40*60 800 GSM', image: '/products/microfiber_40x60_800gsm.png' },
  { dbName: 'MICROFIBER 40*40 450 GSM 2PCS - SMOOTH FUR', image: '/products/microfiber_40x40_smooth_fur.png' },
  { dbName: 'MICROFIBER 40*40 450 GSM 2PCS - HEAVY FUR', image: '/products/microfiber_40x40_heavy_fur.png' },
  { dbName: 'ASTONISH PREMIUM DAMPING - 2.8 PLUS', image: '/products/astonish_damping_2.8_plus.png' },
  { dbName: 'SIDE CONSOL', image: '/products/side_consol.png' },
  { dbName: 'SIDE CONSOL FIX', image: '/products/side_consol_fix.png' },
  { dbName: 'HOOK', image: '/products/hook.png' },
  { dbName: 'TISSU COVER', image: '/products/tissue_cover.png' },
  { dbName: 'TISSU COVER HEAVY', image: '/products/tissue_cover_heavy.png' },
  { dbName: 'ST COVER', image: '/products/seat_cover.png' },
  { dbName: 'MEMORY NECK REST - ASTONISH', image: '/products/memory_neck_rest.png' },
  { dbName: 'MEMORY CUSION PILLOW - ASTONISH', image: '/products/memory_cushion_pillow.png' },
  { dbName: 'TYRE INFLATOR (14)', image: '/products/tyre_inflator.png' },
  { dbName: 'TYRE INFLATOR (13)', image: '/products/tyre_inflator.png' },
  { dbName: 'PORTABLE CAR VACUUM CLEANER', image: '/products/car_vacuum.png' },
  { dbName: 'CROSS BODY BAG', image: '/products/cross_body_bag.png' }
];

export default function ProductOrdersPage() {
  const toast = useUIStore((s) => s.toast);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalCount: 0,
    pendingCount: 0,
    completedCount: 0,
    totalRevenue: 0
  });

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/products/orders?page=${page}&limit=50${statusFilter ? `&status=${statusFilter}` : ''}`);
      const data = res.data?.data || [];
      setOrders(data);
      setTotalOrders(res.data?.pagination?.total || 0);

      // Compute stats
      const totalCount = data.length;
      let pendingCount = 0;
      let completedCount = 0;
      let totalRevenue = 0;

      data.forEach((o: any) => {
        if (o.payment_status === 'pending') pendingCount++;
        if (o.payment_status === 'completed') {
          completedCount++;
          totalRevenue += parseFloat(o.total_amount) || 0;
        }
      });

      setStats({
        totalCount,
        pendingCount,
        completedCount,
        totalRevenue
      });

    } catch (err) {
      console.error('Error loading orders:', err);
      toast('error', 'Failed to load product orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [page, statusFilter]);

  const handleConfirmQrPayment = async (orderId: number) => {
    const confirm = window.confirm("Are you sure you want to confirm this QR payment? This will update the payment status to 'completed' and deduct stock quantity from inventory.");
    if (!confirm) return;

    try {
      setActionLoading(orderId);
      await api.post(`/products/orders/${orderId}/confirm`);
      toast('success', 'Payment confirmed! Stock deducted and B2C transaction logged.');
      loadOrders();
    } catch (err: any) {
      toast('error', err.response?.data?.error || 'Failed to confirm payment.');
    } finally {
      setActionLoading(null);
    }
  };

  const getProductImage = (dbName: string) => {
    const match = PRODUCT_TEMPLATES.find((t) => t.dbName.toUpperCase() === dbName.toUpperCase());
    return match?.image || 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=200';
  };

  const filteredOrders = orders.filter((o) => {
    const term = search.toLowerCase();
    return (
      o.customer_name?.toLowerCase().includes(term) ||
      o.customer_mobile?.includes(term) ||
      o.product_name?.toLowerCase().includes(term) ||
      o.qr_transaction_id?.toLowerCase().includes(term) ||
      o.razorpay_payment_id?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <PremiumPageHeader
        title="Product Orders"
        subtitle="Manage B2C product purchases, confirm QR codes, and view sales details."
        icon={ShoppingBag}
      />

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <PremiumStatCard
          icon={ShoppingBag}
          title="Total Orders"
          value={totalOrders}
          color="#3B82F6"
        />
        <PremiumStatCard
          icon={Clock}
          title="Pending Verification"
          value={stats.pendingCount}
          color="#F59E0B"
        />
        <PremiumStatCard
          icon={CheckCircle2}
          title="Successful Sales"
          value={stats.completedCount}
          color="#10B981"
        />
        <PremiumStatCard
          icon={DollarSign}
          title="Store Revenue"
          value={stats.totalRevenue}
          prefix="₹"
          color="#D32F2F"
        />
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by customer, product, reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-11 pr-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent font-medium"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto self-stretch sm:self-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F] font-bold text-gray-600 bg-white flex-1 sm:flex-none"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending Verification</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>

          <button
            onClick={loadOrders}
            className="h-11 w-11 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
            title="Refresh list"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="animate-spin text-gray-400" size={32} />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <AlertCircle size={40} className="mx-auto text-gray-300" />
            <p className="font-bold text-gray-700">No orders found</p>
            <p className="text-xs text-gray-400">Try matching filters or search queries</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4 text-center">Qty</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Payment Method / Ref</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm font-medium text-gray-800">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Product Details & Cart Breakdown */}
                    <td className="px-6 py-4">
                      {order.items_json ? (
                        <div className="space-y-1">
                          <div className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                            <ShoppingBag size={14} className="text-amber-500" />
                            <span>Cart Order ({(() => {
                              try { return JSON.parse(order.items_json).length; } catch { return 1; }
                            })()} items)</span>
                          </div>
                          <div className="space-y-1 text-xs text-gray-600">
                            {(() => {
                              try {
                                const items = JSON.parse(order.items_json);
                                return items.map((it: any, i: number) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <span className="font-bold text-gray-800">• {it.product_name}</span>
                                    <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-black">x{it.quantity}</span>
                                    <span className="text-[11px] text-gray-500">₹{it.total_price}</span>
                                  </div>
                                ));
                              } catch {
                                return <span>{order.product_name}</span>;
                              }
                            })()}
                          </div>
                          {order.shipping_address && (
                            <p className="text-[10px] text-blue-600 font-bold mt-1">📍 Delivery: {order.shipping_address}</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <img
                            src={getProductImage(order.product_name)}
                            alt={order.product_name}
                            className="w-10 h-10 object-cover rounded-lg border border-gray-100 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=100';
                            }}
                          />
                          <div>
                            <div className="font-extrabold text-gray-900 leading-tight">{order.product_name}</div>
                            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                              SKU: {order.sku || '—'}
                            </span>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Customer CRM info */}
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-bold text-gray-900">{order.customer_name}</div>
                        <div className="text-[11px] text-gray-500 font-mono">{order.customer_mobile}</div>
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="px-6 py-4 text-center text-gray-700 font-bold">
                      {parseInt(order.quantity)}
                    </td>

                    {/* Total Price */}
                    <td className="px-6 py-4">
                      <div className="font-extrabold text-gray-900">₹{order.total_amount}</div>
                      <div className="text-[10px] text-gray-400">₹{order.unit_price} / unit</div>
                    </td>

                    {/* Method & Ref */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-gray-700 text-xs uppercase">
                        {order.payment_method === 'razorpay' ? (
                          <CreditCard size={14} className="text-[#D32F2F]" />
                        ) : (
                          <QrCode size={14} className="text-[#D32F2F]" />
                        )}
                        {order.payment_method}
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono mt-0.5 max-w-[150px] truncate" title={order.razorpay_payment_id || order.qr_transaction_id || '—'}>
                        Ref: {order.razorpay_payment_id || order.qr_transaction_id || '—'}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          order.payment_status === 'completed'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : order.payment_status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {order.payment_status === 'completed' ? (
                          <>
                            <CheckCircle2 size={12} />
                            Completed
                          </>
                        ) : order.payment_status === 'pending' ? (
                          <>
                            <Clock size={12} />
                            Awaiting Verify
                          </>
                        ) : (
                          <>
                            <ShieldAlert size={12} />
                            Failed
                          </>
                        )}
                      </span>
                      <div className="text-[9px] text-gray-400 mt-1 font-semibold">
                        {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="px-6 py-4 text-right">
                      {order.payment_status === 'pending' && order.payment_method === 'qr' ? (
                        <button
                          onClick={() => handleConfirmQrPayment(order.id)}
                          disabled={actionLoading === order.id}
                          className="px-3 py-1.5 bg-[#D32F2F] hover:bg-[#af101a] text-white text-xs font-black rounded-lg transition-all shadow-sm flex items-center gap-1 inline-flex"
                        >
                          {actionLoading === order.id ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <Check size={12} />
                          )}
                          Confirm Payment
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No Action Needed</span>
                      )}
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
