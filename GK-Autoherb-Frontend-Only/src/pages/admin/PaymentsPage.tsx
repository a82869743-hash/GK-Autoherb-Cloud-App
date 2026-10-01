import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, IndianRupee, Clock, CheckCircle, XCircle, RefreshCw, Plus, Search, Filter, Download, MessageCircle, QrCode, TrendingUp, Sparkles, ShieldCheck, User } from 'lucide-react';
import { usePayments, usePaymentStats, useCreatePayment, useCreateRefund, useAdvancePayments, useSendPaymentReminder, useCreateRazorpayOrder, useVerifyRazorpayPayment, useWalletBalance } from '../../api/hooks/usePayments';
import AdminHeaderBar from '../../components/admin/AdminHeaderBar';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import { AnimatedModal, RippleButton } from '../../components/ui/Animations';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/axiosInstance';

const STATUS_BADGES: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  captured: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
  refunded: 'bg-purple-50 text-purple-700 border-purple-200',
  partial_refund: 'bg-red-50 text-[#b71c1c] border-red-200',
};

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'advance'>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ customer_id: '', job_cart_id: '', amount: '', wallet_spend: '', payment_method: 'cash', notes: '' });
  const [customersList, setCustomersList] = useState<any[]>([]);

  useEffect(() => {
    if (showPayModal) {
      api.get('/search/customers?limit=100').then(res => {
        setCustomersList(res.data?.data || []);
      }).catch(err => console.error(err));
    }
  }, [showPayModal]);
  
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<any>(null);
  const [refundForm, setRefundForm] = useState({ amount: '', reason: '' });
  const createRefund = useCreateRefund();

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
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_123',
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
                toast.success('Payment recorded via Razorpay!'); 
                setShowPayModal(false); 
                setPayForm({ customer_id: '', job_cart_id: '', amount: '', wallet_spend: '', payment_method: 'cash', notes: '' }); 
              },
              onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to record payment')
            });
          } catch {
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: '',
          contact: ''
        },
        theme: {
          color: '#D32F2F'
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate Razorpay payment');
    }
  };

  const handleCreatePayment = () => {
    if (!payForm.customer_id) {
      toast.error('Select a customer');
      return;
    }
    const totalAmount = (parseFloat(payForm.amount) || 0) + (parseFloat(payForm.wallet_spend) || 0);
    if (totalAmount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
    
    createPayment.mutate({
      ...payForm,
      amount: parseFloat(payForm.amount) || 0,
      wallet_spend: parseFloat(payForm.wallet_spend) || 0
    }, {
      onSuccess: () => { 
        toast.success('Payment recorded successfully!'); 
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

  const handleOpenRefundModal = (payment: any) => {
    setSelectedPaymentForRefund(payment);
    setRefundForm({ amount: payment.amount.toString(), reason: '' });
    setShowRefundModal(true);
  };

  const handleCreateRefund = () => {
    if (!selectedPaymentForRefund) return;
    const refundAmt = parseFloat(refundForm.amount) || 0;
    if (refundAmt <= 0) {
      toast.error('Enter a valid refund amount');
      return;
    }
    if (refundAmt > parseFloat(selectedPaymentForRefund.amount)) {
      toast.error('Refund amount cannot exceed payment amount');
      return;
    }

    createRefund.mutate({
      payment_id: selectedPaymentForRefund.id,
      amount: refundAmt,
      reason: refundForm.reason
    }, {
      onSuccess: () => {
        toast.success('Refund processed successfully');
        setShowRefundModal(false);
        setSelectedPaymentForRefund(null);
        setRefundForm({ amount: '', reason: '' });
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error || 'Failed to process refund');
      }
    });
  };

  const handleDownloadInvoice = (paymentId: number) => {
    const token = useAuthStore.getState().token;
    window.open(`/api/payments/${paymentId}/invoice?token=${token}`, '_blank');
  };

  const filteredPayments = (paymentsData?.data || []).filter((p: any) => 
    !search || p.customer_name?.toLowerCase().includes(search.toLowerCase()) || p.customer_mobile?.includes(search)
  );

  const filteredAdvances = (advanceData || []).filter((ap: any) =>
    !search || ap.customer_name?.toLowerCase().includes(search.toLowerCase()) || ap.customer_mobile?.includes(search)
  );

  return (
    <div className="space-y-6 pb-28 lg:pb-12 max-w-[1600px] mx-auto font-sans">
      {/* Header Bar */}
      <AdminHeaderBar
        title="Payments & Cashflow Ledger"
        subtitle="Track collections, online gateways, advance customer deposits, and payment reconciliation"
        actions={
          <button
            onClick={() => setShowPayModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#D32F2F] hover:bg-[#b71c1c] text-white font-bold text-xs shadow-md shadow-red-200 transition-all active:scale-95"
          >
            <Plus size={16} />
            <span>Record Payment</span>
          </button>
        }
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminMetricCard
          label="Today's Collection"
          value={`₹${(stats?.today_collected || 0).toLocaleString('en-IN')}`}
          trend={{ text: 'Daily cashflow', positive: true }}
          icon={<IndianRupee size={20} />}
          accentColor="emerald"
        />
        <AdminMetricCard
          label="Monthly Revenue"
          value={`₹${(stats?.month_collected || 0).toLocaleString('en-IN')}`}
          trend={{ text: 'Calendar month gross', positive: true }}
          icon={<CreditCard size={20} />}
          accentColor="indigo"
        />
        <AdminMetricCard
          label="Pending Receivables"
          value={`₹${(stats?.pending_amount || 0).toLocaleString('en-IN')}`}
          trend={{ text: 'Awaiting clearance', positive: false }}
          icon={<Clock size={20} />}
          accentColor="amber"
        />
        <AdminMetricCard
          label="Advance Deposit Due"
          value={`₹${(stats?.total_balance_due || 0).toLocaleString('en-IN')}`}
          trend={{ text: 'Outstanding job balances', positive: false }}
          icon={<RefreshCw size={20} />}
          accentColor="purple"
        />
      </div>

      {/* Tabs & Search Bar */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab('all')}
            className={`flex-1 sm:flex-none px-5 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'all' ? 'bg-white text-[#b71c1c] shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            All Transactions
          </button>
          <button 
            onClick={() => setActiveTab('advance')}
            className={`flex-1 sm:flex-none px-5 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'advance' ? 'bg-white text-[#b71c1c] shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Advance Deposits
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search customer, phone, ref..."
              className="w-full pl-10 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200/90 rounded-2xl focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] outline-none font-medium"
            />
          </div>
          {activeTab === 'all' && (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200/90 rounded-2xl px-3.5 py-2 outline-none font-bold text-slate-700 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
            </select>
          )}
        </div>
      </div>

      {/* Mobile Card List View (< md) */}
      <div className="block md:hidden space-y-3">
        {activeTab === 'all' ? (
          loadingPayments ? (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-10 text-center">
              <RefreshCw size={24} className="animate-spin text-[#D32F2F] mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">Loading payments...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-10 text-center">
              <CreditCard size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No payments recorded</p>
            </div>
          ) : (
            filteredPayments.map((p: any) => (
              <div
                key={p.id}
                className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{p.customer_name || 'Walk-in'}</div>
                    <div className="text-xs text-slate-400">{p.customer_mobile || 'No phone'}</div>
                  </div>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full border font-bold capitalize ${STATUS_BADGES[p.payment_status] || 'bg-slate-100 text-slate-700'}`}>
                    {p.payment_status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="capitalize text-slate-500 font-medium">{p.payment_type}</span>
                    <span>•</span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded-md font-mono text-[10px] font-bold uppercase">{p.payment_method}</span>
                  </div>
                  <div className="text-base font-black text-slate-900">
                    ₹{parseFloat(p.amount).toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {(p.payment_status === 'captured' || p.payment_status === 'completed' || p.payment_status === 'partial_refund') && (
                      <button
                        onClick={() => handleOpenRefundModal(p)}
                        className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold active:scale-95 transition-all"
                      >
                        Refund
                      </button>
                    )}
                    <button
                      onClick={() => handleDownloadInvoice(p.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#D32F2F] text-white text-xs font-bold hover:bg-[#b71c1c] active:scale-95 transition-all shadow-sm"
                    >
                      <Download size={13} />
                      <span>Receipt</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )
        ) : (
          loadingAdvances ? (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-10 text-center">
              <RefreshCw size={24} className="animate-spin text-[#D32F2F] mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">Loading advances...</p>
            </div>
          ) : filteredAdvances.length === 0 ? (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-10 text-center">
              <CreditCard size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No active advances found</p>
            </div>
          ) : (
            filteredAdvances.map((ap: any) => (
              <div
                key={ap.id}
                className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{ap.customer_name || 'N/A'}</div>
                    <div className="text-xs text-slate-400">{ap.customer_mobile}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Total Bill</div>
                    <div className="text-xs font-bold text-slate-800">₹{parseFloat(ap.total_amount).toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Advance Paid</span>
                    <span className="font-bold text-emerald-600">₹{parseFloat(ap.advance_amount).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Balance Due</span>
                    <span className="font-bold text-rose-500">₹{parseFloat(ap.balance_due).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Due: {ap.due_date ? new Date(ap.due_date).toLocaleDateString('en-IN') : '—'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {ap.advance_payment_id && (
                      <button
                        onClick={() => handleDownloadInvoice(ap.advance_payment_id)}
                        className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
                        title="Download Receipt"
                      >
                        <Download size={14} />
                      </button>
                    )}
                    {parseFloat(ap.balance_due) > 0 && (
                      <button
                        onClick={() => handleSendReminder(ap.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 active:scale-95 transition-all shadow-sm"
                      >
                        <MessageCircle size={13} />
                        <span>Remind</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* Desktop View: Data Table (>= md) */}
      <div className="hidden md:block rounded-3xl border border-slate-200/80 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-4 px-6">Customer Profile</th>
                {activeTab === 'all' ? (
                  <>
                    <th className="py-4 px-6">Payment Category & Channel</th>
                    <th className="py-4 px-6 text-right">Received Amount</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6">Transaction Date</th>
                  </>
                ) : (
                  <>
                    <th className="py-4 px-6 text-right">Invoice Total</th>
                    <th className="py-4 px-6 text-right">Advance Paid</th>
                    <th className="py-4 px-6 text-right">Balance Due</th>
                    <th className="py-4 px-6">Settlement Due Date</th>
                  </>
                )}
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeTab === 'all' ? (
                loadingPayments ? (
                  [...Array(5)].map((_, i) => <tr key={i}><td colSpan={6} className="py-4 px-6"><div className="h-4 bg-slate-100 rounded-xl animate-pulse" /></td></tr>)
                ) : filteredPayments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-red-50/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900">{p.customer_name || 'Walk-in Client'}</div>
                      <div className="text-[11px] text-slate-400 font-medium">{p.customer_mobile || '—'}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="capitalize text-slate-600 font-semibold text-xs mb-1">{p.payment_type}</div>
                      <span className="text-[10px] px-2.5 py-0.5 bg-slate-100 rounded-md font-mono font-bold uppercase text-slate-700">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-black text-slate-900 text-sm">
                      ₹{parseFloat(p.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-bold capitalize ${STATUS_BADGES[p.payment_status] || 'bg-slate-100'}`}>
                        {p.payment_status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-600 text-xs font-medium">
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-1.5 items-center">
                        {(p.payment_status === 'captured' || p.payment_status === 'completed' || p.payment_status === 'partial_refund') && (
                          <button
                            onClick={() => handleOpenRefundModal(p)}
                            className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all"
                            title="Initiate Refund"
                          >
                            Refund
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadInvoice(p.id)}
                          className="p-2 rounded-xl border border-red-200 text-[#D32F2F] hover:bg-red-50 transition-all shadow-2xs"
                          title="Download Receipt"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                loadingAdvances ? (
                  [...Array(5)].map((_, i) => <tr key={i}><td colSpan={6} className="py-4 px-6"><div className="h-4 bg-slate-100 rounded-xl animate-pulse" /></td></tr>)
                ) : filteredAdvances.map((ap: any) => (
                  <tr key={ap.id} className="hover:bg-red-50/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900">{ap.customer_name || 'Client'}</div>
                      <div className="text-[11px] text-slate-400 font-medium">{ap.customer_mobile}</div>
                    </td>
                    <td className="py-4 px-6 text-right text-slate-700 font-medium">₹{parseFloat(ap.total_amount).toLocaleString('en-IN')}</td>
                    <td className="py-4 px-6 text-right text-emerald-600 font-bold">₹{parseFloat(ap.advance_amount).toLocaleString('en-IN')}</td>
                    <td className="py-4 px-6 text-right text-rose-600 font-black">₹{parseFloat(ap.balance_due).toLocaleString('en-IN')}</td>
                    <td className="py-4 px-6 text-slate-600 text-xs font-medium">{ap.due_date ? new Date(ap.due_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-1.5 items-center">
                        {ap.advance_payment_id && (
                          <button 
                            onClick={() => handleDownloadInvoice(ap.advance_payment_id)}
                            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all"
                            title="Download Receipt"
                          >
                            <Download size={14} />
                          </button>
                        )}
                        {parseFloat(ap.balance_due) > 0 && (
                          <button
                            onClick={() => handleSendReminder(ap.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 active:scale-95 transition-all shadow-sm flex items-center gap-1"
                          >
                            <MessageCircle size={13} />
                            <span>Remind</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {((activeTab === 'all' && !filteredPayments.length && !loadingPayments) || (activeTab === 'advance' && !filteredAdvances.length && !loadingAdvances)) && (
            <p className="text-center text-slate-400 py-12 text-xs font-bold">No payment records found.</p>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      <AnimatedModal isOpen={showPayModal} onClose={() => setShowPayModal(false)}>
        <div className="p-6 font-sans max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Record Customer Payment</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Select Customer *</label>
              <select
                value={payForm.customer_id}
                onChange={e => setPayForm(p => ({ ...p, customer_id: e.target.value }))}
                className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 outline-none"
              >
                <option value="">-- Select Registered Client --</option>
                {customersList.map((c: any) => (
                  <option key={c.id || c.mobile || c.name} value={c.id || ''}>
                    {c.name} {c.mobile ? `(${c.mobile})` : ''} {c.vehicle_reg_no ? `— [${c.vehicle_reg_no}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Job Card Reference ID (optional)</label>
              <input 
                value={payForm.job_cart_id} 
                onChange={e => setPayForm(p => ({ ...p, job_cart_id: e.target.value }))} 
                className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold bg-slate-50 focus:bg-white" 
                placeholder="e.g. 101" 
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Cash / Online Amount (₹) *</label>
                <input 
                  type="number" 
                  value={payForm.amount} 
                  onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} 
                  className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-black text-slate-900 bg-slate-50 focus:bg-white" 
                  placeholder="0.00" 
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Wallet Spend (₹)</label>
                  {walletBalance !== undefined && <span className="text-xs font-bold text-[#D32F2F]">Balance: ₹{walletBalance}</span>}
                </div>
                <input 
                  type="number" 
                  value={payForm.wallet_spend} 
                  onChange={e => setPayForm(p => ({ ...p, wallet_spend: e.target.value }))} 
                  className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-black text-slate-900 bg-slate-50 focus:bg-white" 
                  placeholder="0.00" 
                  max={walletBalance || 0} 
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Payment Channel</label>
                <select 
                  value={payForm.payment_method} 
                  onChange={e => setPayForm(p => ({ ...p, payment_method: e.target.value }))} 
                  className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white"
                >
                  <option value="cash">Cash Counter</option>
                  <option value="upi">UPI / QR Scan</option>
                  <option value="card">Debit / Credit Card POS</option>
                  <option value="net_banking">Direct Bank IMPS/NEFT</option>
                </select>
              </div>
            </div>

            {payForm.payment_method === 'upi' && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#7f1d1d]">UPI Instant QR Scan</p>
                  <p className="text-xs text-[#b71c1c] mt-0.5">Show QR to client for ₹{payForm.amount || '0'}</p>
                </div>
                <div className="bg-white p-2 rounded-xl border border-red-200 shadow-xs">
                  <img src="/qr.jpg" alt="UPI QR Code" className="w-20 h-20 object-contain" />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Internal Remarks / Notes</label>
              <input 
                value={payForm.notes} 
                onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))} 
                className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white" 
                placeholder="Optional transaction reference or notes..." 
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setShowPayModal(false)} 
                className="px-4 py-2 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleRazorpayPayment} 
                className="px-4 py-2 rounded-2xl border border-red-300 text-[#D32F2F] hover:bg-red-50 text-xs font-bold transition-all"
              >
                Online Gateway
              </button>
              <button 
                type="button" 
                onClick={handleCreatePayment} 
                className="px-5 py-2.5 rounded-2xl bg-[#D32F2F] hover:bg-[#b71c1c] text-white text-xs font-bold shadow-sm transition-all"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      </AnimatedModal>

      {/* Refund Modal */}
      <AnimatedModal isOpen={showRefundModal} onClose={() => setShowRefundModal(false)}>
        <div className="p-6 font-sans">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Initiate Payment Refund</h3>
          <div className="space-y-4">
            {selectedPaymentForRefund && (
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs space-y-1">
                <div><span className="font-bold text-slate-500">Customer:</span> <span className="font-bold text-slate-900">{selectedPaymentForRefund.customer_name}</span></div>
                <div><span className="font-bold text-slate-500">Method:</span> <span className="uppercase font-bold text-slate-900">{selectedPaymentForRefund.payment_method}</span></div>
                <div><span className="font-bold text-slate-500">Original Amount:</span> <span className="font-black text-slate-900">₹{parseFloat(selectedPaymentForRefund.amount).toLocaleString('en-IN')}</span></div>
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Refund Amount (₹) *</label>
              <input 
                type="number" 
                value={refundForm.amount} 
                onChange={e => setRefundForm(p => ({ ...p, amount: e.target.value }))} 
                className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-bold bg-slate-50 focus:bg-white" 
                placeholder="0.00" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Reason for Refund *</label>
              <textarea 
                value={refundForm.reason} 
                onChange={e => setRefundForm(p => ({ ...p, reason: e.target.value }))} 
                className="w-full border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white resize-none" 
                rows={3} 
                placeholder="Explain the reason for authorizing this refund..." 
              />
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setShowRefundModal(false)} 
                className="px-4 py-2 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleCreateRefund} 
                disabled={createRefund.isPending} 
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-2xl shadow-sm transition-all"
              >
                Confirm Refund
              </button>
            </div>
          </div>
        </div>
      </AnimatedModal>
    </div>
  );
}
