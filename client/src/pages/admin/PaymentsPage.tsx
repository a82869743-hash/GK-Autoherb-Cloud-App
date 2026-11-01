import { useState, useEffect } from 'react';
import { Clock, RefreshCw, Plus, Download, MessageCircle } from 'lucide-react';
import { usePayments, usePaymentStats, useCreatePayment, useCreateRefund, useAdvancePayments, useSendPaymentReminder, useCreateRazorpayOrder, useVerifyRazorpayPayment, useWalletBalance } from '../../api/hooks/usePayments';
import { OpsPageTitle, StatTile, SegmentedTabs, SearchBar } from '../../components/ops/ui';
import { LedgerList, Tag, MoneyHero } from '../../components/ops/ledger';
import { AnimatedModal } from '../../components/ui/Animations';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/axiosInstance';

const STATUS_TONES: Record<string, string> = {
  completed: 'green',
  captured: 'green',
  pending: 'amber',
  failed: 'red',
  refunded: 'purple',
  partial_refund: 'red',
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

  const inr = (v: any) => `₹${(parseFloat(v) || 0).toLocaleString('en-IN')}`;
  const day = (d: any) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  const canRefund = (p: any) => ['captured', 'completed', 'partial_refund'].includes(p.payment_status);
  const statusTag = (s: string) => <Tag tone={STATUS_TONES[s] || 'slate'}>{(s || '').replace(/_/g, ' ')}</Tag>;

  return (
    <div className="space-y-4 pb-28 lg:pb-12 max-w-[1200px] mx-auto">
      <OpsPageTitle
        kicker="Payments"
        title="Collections"
        subtitle="Payments received, refunds and advance balances"
        action={
          <button
            onClick={() => setShowPayModal(true)}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-2xl bg-[#D32F2F] text-white text-[12px] font-bold shadow-md shadow-red-200 active:scale-95 transition-transform"
          >
            <Plus size={15} /> Record
          </button>
        }
      />

      <MoneyHero
        kicker="Collected"
        items={[
          { label: 'Today', value: inr(stats?.today_collected), tone: 'in' },
          { label: 'This month', value: inr(stats?.month_collected), tone: 'in' },
        ]}
      />
      <div className="grid grid-cols-2 gap-2.5">
        <StatTile label="Pending" value={inr(stats?.pending_amount)} icon={Clock} tone="amber" hint="Awaiting clearance" onClick={() => { setActiveTab('all'); setStatusFilter('pending'); }} />
        <StatTile label="Balance due" value={inr(stats?.total_balance_due)} icon={RefreshCw} tone="purple" hint="After advances" onClick={() => setActiveTab('advance')} />
      </div>

      <SegmentedTabs
        value={activeTab}
        onChange={(v) => setActiveTab(v)}
        options={[
          { value: 'all', label: 'All payments' },
          { value: 'advance', label: 'Advances' },
        ]}
      />

      <div className="flex gap-2">
        <div className="flex-1 min-w-0"><SearchBar value={search} onChange={setSearch} placeholder="Search name or phone" /></div>
        {activeTab === 'all' && (
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-11 shrink-0 rounded-2xl border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-700"
          >
            <option value="">All</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
          </select>
        )}
      </div>

      {activeTab === 'all' ? (
        <LedgerList
          loading={loadingPayments}
          rows={filteredPayments}
          empty={search || statusFilter ? 'No payments match your search' : 'No payments recorded yet'}
          cols={[
            { label: 'Customer', cell: (p: any) => <div><p className="font-bold text-slate-900">{p.customer_name || 'Walk-in'}</p><p className="text-[12px] text-slate-400">{p.customer_mobile || '—'}</p></div> },
            { label: 'For', cell: (p: any) => <span className="capitalize">{p.payment_type}</span> },
            { label: 'Method', cell: (p: any) => <Tag>{(p.payment_method || '').toUpperCase()}</Tag> },
            { label: 'Amount', align: 'right', cell: (p: any) => <span className="font-extrabold text-slate-900">{inr(p.amount)}</span> },
            { label: 'Status', cell: (p: any) => statusTag(p.payment_status) },
            { label: 'Date', cell: (p: any) => day(p.paid_at) },
            {
              label: 'Actions', align: 'right', cell: (p: any) => (
                <div className="flex justify-end gap-1.5">
                  {canRefund(p) && <button onClick={() => handleOpenRefundModal(p)} className="h-8 px-2.5 rounded-xl border border-slate-200 text-[12px] font-bold text-slate-600 hover:bg-slate-50">Refund</button>}
                  <button onClick={() => handleDownloadInvoice(p.id)} className="h-8 w-8 rounded-xl bg-red-50 text-[#D32F2F] inline-flex items-center justify-center" title="Receipt"><Download size={14} /></button>
                </div>
              ),
            },
          ]}
          card={(p: any) => ({
            title: p.customer_name || 'Walk-in',
            subtitle: `${day(p.paid_at)} · ${(p.payment_method || '').toUpperCase()} · ${p.payment_type || ''}`,
            amount: inr(p.amount),
            tone: p.payment_status === 'refunded' ? 'out' : 'neutral',
            badge: statusTag(p.payment_status),
            footer: (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-slate-400">{p.customer_mobile || 'No phone'}</span>
                <div className="flex gap-1.5">
                  {canRefund(p) && <button onClick={() => handleOpenRefundModal(p)} className="h-8 px-3 rounded-xl border border-slate-200 text-[12px] font-bold text-slate-600">Refund</button>}
                  <button onClick={() => handleDownloadInvoice(p.id)} className="h-8 px-3 rounded-xl bg-red-50 text-[#D32F2F] text-[12px] font-bold inline-flex items-center gap-1"><Download size={13} /> Receipt</button>
                </div>
              </div>
            ),
          })}
        />
      ) : (
        <LedgerList
          loading={loadingAdvances}
          rows={filteredAdvances}
          empty={search ? 'No advances match your search' : 'No open advances'}
          cols={[
            { label: 'Customer', cell: (a: any) => <div><p className="font-bold text-slate-900">{a.customer_name || 'Customer'}</p><p className="text-[12px] text-slate-400">{a.customer_mobile}</p></div> },
            { label: 'Bill', align: 'right', cell: (a: any) => inr(a.total_amount) },
            { label: 'Advance', align: 'right', cell: (a: any) => <span className="font-bold text-emerald-600">{inr(a.advance_amount)}</span> },
            { label: 'Balance', align: 'right', cell: (a: any) => <span className="font-extrabold text-[#D32F2F]">{inr(a.balance_due)}</span> },
            { label: 'Due', cell: (a: any) => day(a.due_date) },
            {
              label: 'Actions', align: 'right', cell: (a: any) => (
                <div className="flex justify-end gap-1.5">
                  {a.advance_payment_id && <button onClick={() => handleDownloadInvoice(a.advance_payment_id)} className="h-8 w-8 rounded-xl border border-slate-200 text-slate-600 inline-flex items-center justify-center" title="Receipt"><Download size={14} /></button>}
                  {parseFloat(a.balance_due) > 0 && <button onClick={() => handleSendReminder(a.id)} className="h-8 px-3 rounded-xl bg-emerald-600 text-white text-[12px] font-bold inline-flex items-center gap-1"><MessageCircle size={13} /> Remind</button>}
                </div>
              ),
            },
          ]}
          card={(a: any) => ({
            title: a.customer_name || 'Customer',
            subtitle: `Bill ${inr(a.total_amount)} · paid ${inr(a.advance_amount)} · due ${day(a.due_date)}`,
            amount: inr(a.balance_due),
            tone: parseFloat(a.balance_due) > 0 ? 'out' : 'in',
            badge: <span className="text-[11px] font-semibold text-slate-400">balance</span>,
            footer: (a.advance_payment_id || parseFloat(a.balance_due) > 0) ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-slate-400">{a.customer_mobile}</span>
                <div className="flex gap-1.5">
                  {a.advance_payment_id && <button onClick={() => handleDownloadInvoice(a.advance_payment_id)} className="h-8 px-3 rounded-xl border border-slate-200 text-[12px] font-bold text-slate-600 inline-flex items-center gap-1"><Download size={13} /> Receipt</button>}
                  {parseFloat(a.balance_due) > 0 && <button onClick={() => handleSendReminder(a.id)} className="h-8 px-3 rounded-xl bg-emerald-600 text-white text-[12px] font-bold inline-flex items-center gap-1"><MessageCircle size={13} /> Remind</button>}
                </div>
              </div>
            ) : undefined,
          })}
        />
      )}

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
