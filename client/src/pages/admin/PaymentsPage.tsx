import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, IndianRupee, Clock, CheckCircle, XCircle, RefreshCw, Plus, Search, Filter, Download, MessageCircle, QrCode } from 'lucide-react';
import { usePayments, usePaymentStats, useCreatePayment, useCreateRefund, useAdvancePayments, useSendPaymentReminder, useCreateRazorpayOrder, useVerifyRazorpayPayment, useWalletBalance } from '../../api/hooks/usePayments';
import PremiumPageHeader from '../../components/shared/PremiumPageHeader';
import PremiumStatCard from '../../components/shared/PremiumStatCard';
import { PageTransition, AnimatedCard, RippleButton, AnimatedModal } from '../../components/ui/Animations';
import { toast } from 'react-hot-toast';

const STATUS_BADGES: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  refunded: 'bg-purple-50 text-purple-700 border-purple-200',
};

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'advance'>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ customer_id: '', job_cart_id: '', amount: '', wallet_spend: '', payment_method: 'cash', notes: '' });

  const { data: paymentsData, isLoading: loadingPayments } = usePayments({ status: statusFilter });
  const { data: advanceData, isLoading: loadingAdvances } = useAdvancePayments('advance_paid');
  const { data: stats } = usePaymentStats();
  const createPayment = useCreatePayment();
  const sendReminder = useSendPaymentReminder();
  const createOrder = useCreateRazorpayOrder();
  const verifyPayment = useVerifyRazorpayPayment();

  const { data: walletBalance } = useWalletBalance(payForm.customer_id);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayPayment = async () => {
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    const res = await loadRazorpayScript();
    if (!res) {
      toast.error('Razorpay SDK failed to load. Are you online?');
      return;
    }

    try {
      const orderRes = await createOrder.mutateAsync({ amount: parseFloat(payForm.amount) });
      if (!orderRes.success) throw new Error(orderRes.error || 'Failed to create order');

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_123', // Fallback for dev
        amount: orderRes.data.amount,
        currency: orderRes.data.currency,
        name: 'GK AutoHerb',
        description: 'Payment for Services',
        order_id: orderRes.data.id,
        handler: async function (response: any) {
          try {
            await verifyPayment.mutateAsync({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            
            createPayment.mutate({ 
              ...payForm, 
              amount: parseFloat(payForm.amount) || 0,
              wallet_spend: parseFloat(payForm.wallet_spend) || 0,
              payment_method: 'online', 
              transaction_ref: response.razorpay_payment_id 
            }, {
              onSuccess: () => { 
                toast.success('Payment completed & recorded successfully!');
                setShowPayModal(false); 
                setPayForm({ customer_id: '', job_cart_id: '', amount: '', wallet_spend: '', payment_method: 'cash', notes: '' }); 
              }
            });
          } catch (err: any) {
            toast.error(err.response?.data?.error || 'Payment verification failed');
          }
        },
        theme: { color: '#2196F3' }
      };
      
      const rzp1 = new (window as any).Razorpay(options);
      rzp1.on('payment.failed', function (response: any) {
        toast.error(`Payment Failed: ${response.error.description}`);
      });
      rzp1.open();
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize payment gateway');
    }
  };

  const handleCreatePayment = () => {
    const finalAmount = parseFloat(payForm.amount) || 0;
    const walletSpend = parseFloat(payForm.wallet_spend) || 0;
    
    if (finalAmount <= 0 && walletSpend <= 0) {
      toast.error('Enter a valid amount or wallet spend');
      return;
    }

    createPayment.mutate({ ...payForm, amount: finalAmount, wallet_spend: walletSpend }, {
      onSuccess: () => { 
        toast.success('Payment recorded successfully');
        setShowPayModal(false); 
        setPayForm({ customer_id: '', job_cart_id: '', amount: '', wallet_spend: '', payment_method: 'cash', notes: '' }); 
      },
      onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to record payment')
    });
  };

  const handleSendReminder = (id: number) => {
    toast.promise(
      sendReminder.mutateAsync(id),
      {
        loading: 'Sending reminder...',
        success: 'Reminder sent via WhatsApp',
        error: 'Failed to send reminder'
      }
    );
  };

  const handleDownloadInvoice = (paymentId: number) => {
    const token = localStorage.getItem('token');
    window.open(`/api/payments/${paymentId}/invoice?token=${token}`, '_blank');
  };

  const filteredPayments = (paymentsData?.data || []).filter((p: any) => 
    !search || p.customer_name?.toLowerCase().includes(search.toLowerCase()) || p.customer_mobile?.includes(search)
  );

  const filteredAdvances = (advanceData || []).filter((ap: any) =>
    !search || ap.customer_name?.toLowerCase().includes(search.toLowerCase()) || ap.customer_mobile?.includes(search)
  );

  return (
    <PageTransition className="p-4 sm:p-6 max-w-7xl mx-auto">
      <PremiumPageHeader
        title="Payments"
        subtitle="Track all transactions, advances, and refunds"
        icon={CreditCard}
        iconColor="#2196F3"
        accentGradient="from-blue-600 to-blue-500"
        badge="LIVE"
        actions={<RippleButton onClick={() => setShowPayModal(true)} variant="primary"><Plus size={14} className="mr-1" /> Record Payment</RippleButton>}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <PremiumStatCard title="Today's Collection" value={stats?.today_collected || 0} prefix="₹" icon={IndianRupee} color="#4CAF50" gradient="from-emerald-500/10 to-emerald-400/5" />
        <PremiumStatCard title="Monthly Revenue" value={stats?.month_collected || 0} prefix="₹" icon={CreditCard} color="#2196F3" gradient="from-blue-500/10 to-blue-400/5" delay={0.1} />
        <PremiumStatCard title="Pending Amount" value={stats?.pending_amount || 0} prefix="₹" icon={Clock} color="#FF9800" gradient="from-amber-500/10 to-amber-400/5" delay={0.2} />
        <PremiumStatCard title="Balance Due (Advances)" value={stats?.total_balance_due || 0} prefix="₹" icon={RefreshCw} color="#9C27B0" gradient="from-purple-500/10 to-purple-400/5" delay={0.3} />
      </div>

      {/* Tabs & Filters */}
      <AnimatedCard className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" delay={0.2}>
        <div className="flex gap-2 bg-gray-50 p-1 rounded-xl w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab('all')}
            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            All Payments
          </button>
          <button 
            onClick={() => setActiveTab('advance')}
            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'advance' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Advance Payments
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          </div>
          {activeTab === 'all' && (
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500/20">
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
            </select>
          )}
        </div>
      </AnimatedCard>

      {/* Payments Table */}
      <AnimatedCard className="bg-white rounded-2xl border border-gray-100 overflow-hidden" delay={0.3}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                {activeTab === 'all' ? (
                  <>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Type & Method</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  </>
                ) : (
                  <>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Total</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Advance</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Balance Due</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Due Date</th>
                  </>
                )}
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeTab === 'all' ? (
                loadingPayments ? (
                  [...Array(5)].map((_, i) => <tr key={i}><td colSpan={6} className="py-4 px-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>)
                ) : filteredPayments.map((p: any, i: number) => (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-4"><div className="font-medium text-[#1c1b1b]">{p.customer_name || 'N/A'}</div><div className="text-[11px] text-gray-400">{p.customer_mobile}</div></td>
                    <td className="py-3 px-4">
                      <div className="capitalize text-gray-600 mb-1">{p.payment_type}</div>
                      <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-lg font-medium uppercase">{p.payment_method}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#1c1b1b]">₹{parseFloat(p.amount).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-center"><span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${STATUS_BADGES[p.payment_status] || 'bg-gray-50'}`}>{p.payment_status}</span></td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="py-3 px-4 text-right">
                      <div title="Download Receipt" className="inline-block">
                        <RippleButton variant="ghost" className="text-blue-600 hover:bg-blue-50 p-2" onClick={() => handleDownloadInvoice(p.id)}>
                          <Download size={16} />
                        </RippleButton>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                loadingAdvances ? (
                  [...Array(5)].map((_, i) => <tr key={i}><td colSpan={6} className="py-4 px-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>)
                ) : filteredAdvances.map((ap: any, i: number) => (
                  <motion.tr key={ap.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="border-b border-gray-50 hover:bg-purple-50/30 transition-colors">
                    <td className="py-3 px-4"><div className="font-medium text-[#1c1b1b]">{ap.customer_name || 'N/A'}</div><div className="text-[11px] text-gray-400">{ap.customer_mobile}</div></td>
                    <td className="py-3 px-4 text-right text-gray-600 font-medium">₹{parseFloat(ap.total_amount).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-bold">₹{parseFloat(ap.advance_amount).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-right text-red-500 font-bold">₹{parseFloat(ap.balance_due).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{ap.due_date ? new Date(ap.due_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="py-3 px-4 text-right">
                      {parseFloat(ap.balance_due) > 0 && (
                        <RippleButton variant="ghost" className="text-green-600 hover:bg-green-50 px-3 py-1.5 text-xs font-medium" onClick={() => handleSendReminder(ap.id)}>
                          <MessageCircle size={14} className="mr-1 inline" /> Remind
                        </RippleButton>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
          {((activeTab === 'all' && !filteredPayments.length && !loadingPayments) || (activeTab === 'advance' && !filteredAdvances.length && !loadingAdvances)) && (
            <p className="text-center text-gray-400 py-12 text-sm">No records found</p>
          )}
        </div>
      </AnimatedCard>

      {/* Record Payment Modal */}
      <AnimatedModal isOpen={showPayModal} onClose={() => setShowPayModal(false)}>
        <div className="p-6">
          <h3 className="text-xl font-bold text-[#1c1b1b] mb-6">Record Payment</h3>
          <div className="space-y-4">
            <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Customer ID</label>
              <input value={payForm.customer_id} onChange={e => setPayForm(p => ({ ...p, customer_id: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Enter customer ID" />
            </div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Job Cart ID (optional)</label>
              <input value={payForm.job_cart_id} onChange={e => setPayForm(p => ({ ...p, job_cart_id: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Job cart ID" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Amount to Pay (₹)</label>
                <input type="number" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="0.00" />
              </div>
              <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1 flex justify-between">
                <span>Wallet Spend (₹)</span>
                {walletBalance !== undefined && <span className="text-blue-600">Bal: ₹{walletBalance}</span>}
                </label>
                <input type="number" value={payForm.wallet_spend} onChange={e => setPayForm(p => ({ ...p, wallet_spend: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="0.00" max={walletBalance || 0} />
              </div>
              <div className="col-span-2"><label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Method (For 'Amount to Pay')</label>
                <select value={payForm.payment_method} onChange={e => setPayForm(p => ({ ...p, payment_method: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm">
                  <option value="cash">Cash</option><option value="upi">UPI / QR Code</option><option value="card">Card</option><option value="net_banking">Net Banking</option>
                </select>
              </div>
            </div>
            
            <AnimatePresence>
              {payForm.payment_method === 'upi' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between mt-2">
                    <div>
                      <p className="text-sm font-semibold text-blue-900">UPI Payment</p>
                      <p className="text-xs text-blue-700">Display QR to customer for ₹{payForm.amount || '0'}</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=gkautoherb@axisbank&pn=GK Auto Herb&am=${payForm.amount || 0}&cu=INR`)}`} 
                        alt="UPI QR Code"
                        className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Notes</label>
              <input value={payForm.notes} onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Optional notes..." />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <RippleButton variant="ghost" onClick={() => setShowPayModal(false)}>Cancel</RippleButton>
              <RippleButton variant="ghost" onClick={handleRazorpayPayment} className="border border-blue-500 text-blue-600 hover:bg-blue-50">Pay via Razorpay</RippleButton>
              <RippleButton variant="primary" onClick={handleCreatePayment}>Record Manual Payment</RippleButton>
            </div>
          </div>
        </div>
      </AnimatedModal>
    </PageTransition>
  );
}
