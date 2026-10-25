import { useState } from 'react';
import { 
  Tag, Plus, Search, Copy, Check, Share2, ToggleLeft, ToggleRight, 
  Trash2, Edit2, Users, AlertCircle, Percent, DollarSign, Calendar
} from 'lucide-react';
import { 
  useCoupons, useCreateCoupon, useUpdateCoupon, useToggleCoupon, 
  useDeleteCoupon, useShareCoupon, useCouponRedemptions, Coupon 
} from '../../api/hooks/useCoupons';
import AdminTopBar from '../../components/layout/AdminTopBar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { PageTransition, AnimatedCard, AnimatedModal } from '../../components/ui/Animations';
import { formatINR } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function CouponsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [shareCouponModal, setShareCouponModal] = useState<Coupon | null>(null);
  const [redemptionsModalId, setRedemptionsModalId] = useState<number | null>(null);

  // Queries & Mutations
  const { data: couponsRes, isLoading } = useCoupons({ search, status: statusFilter });
  const createMut = useCreateCoupon();
  const updateMut = useUpdateCoupon();
  const toggleMut = useToggleCoupon();
  const deleteMut = useDeleteCoupon();
  const shareMut = useShareCoupon();
  const { data: redemptionsList, isLoading: loadingRedemptions } = useCouponRedemptions(redemptionsModalId || 0);

  // Form State
  const [formData, setFormData] = useState<Partial<Coupon>>({
    code: '',
    title: '',
    type: 'percentage',
    value: 10,
    max_discount: 200,
    min_order_amount: 499,
    per_customer_limit: 1,
    total_usage_limit: 100,
    first_time_only: false,
    is_active: true,
  });

  const couponsList: Coupon[] = couponsRes?.data || [];

  // Metrics
  const totalCoupons = couponsList.length;
  const activeCoupons = couponsList.filter(c => c.is_active).length;
  const totalRedemptions = couponsList.reduce((acc, c) => acc + (c.redemption_count || 0), 0);
  const totalSavings = couponsList.reduce((acc, c) => acc + Number(c.total_savings_granted || 0), 0);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Copied ${code} to clipboard`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      title: '',
      type: 'percentage',
      value: 10,
      max_discount: 200,
      min_order_amount: 499,
      per_customer_limit: 1,
      total_usage_limit: 100,
      first_time_only: false,
      is_active: true,
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (c: Coupon) => {
    setEditingCoupon(c);
    setFormData({
      code: c.code,
      title: c.title,
      type: c.type,
      value: c.value,
      max_discount: c.max_discount,
      min_order_amount: c.min_order_amount,
      per_customer_limit: c.per_customer_limit,
      total_usage_limit: c.total_usage_limit,
      first_time_only: Boolean(c.first_time_only),
      is_active: Boolean(c.is_active),
    });
    setIsFormOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.title || formData.value === undefined) {
      toast.error('Code, Title, and Discount value are required');
      return;
    }

    try {
      if (editingCoupon) {
        await updateMut.mutateAsync({ id: editingCoupon.id, data: formData });
        toast.success('Coupon updated successfully');
      } else {
        await createMut.mutateAsync(formData);
        toast.success('Coupon created successfully');
      }
      setIsFormOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save coupon');
    }
  };

  const handleToggle = async (c: Coupon) => {
    try {
      await toggleMut.mutateAsync(c.id);
      toast.success(`Coupon ${c.is_active ? 'disabled' : 'activated'}`);
    } catch (err: any) {
      toast.error('Failed to change status');
    }
  };

  const handleDelete = async (c: Coupon) => {
    if (!window.confirm(`Delete coupon "${c.code}"? This will not remove historical redemptions.`)) return;
    try {
      await deleteMut.mutateAsync(c.id);
      toast.success('Coupon removed');
    } catch (err: any) {
      toast.error('Failed to delete coupon');
    }
  };

  const handleBroadcastShare = async () => {
    if (!shareCouponModal) return;
    try {
      await shareMut.mutateAsync({
        coupon_id: shareCouponModal.id,
        send_to_all: true,
      });
      toast.success(`WhatsApp offer broadcast initiated for ${shareCouponModal.code}`);
      setShareCouponModal(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to broadcast coupon');
    }
  };

  return (
    <PageTransition className="space-y-5 max-w-[1400px] mx-auto pb-28">
      <AdminTopBar
        title="Coupons & Offers"
        subtitle="Create promo codes, manage usage limits, and share discounts via WhatsApp"
        category="Marketing & Billing"
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={15} />
            New Coupon
          </Button>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <AnimatedCard className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-100 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#D32F2F] flex items-center justify-center shrink-0">
              <Tag size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Coupons</p>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">{totalCoupons}</h3>
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-100 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Check size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Offers</p>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">{activeCoupons}</h3>
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-100 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Users size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Redemptions</p>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">{totalRedemptions}</h3>
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-100 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <DollarSign size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Savings Granted</p>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">{formatINR(totalSavings)}</h3>
            </div>
          </div>
        </AnimatedCard>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search coupon code or title..."
            className="w-full h-9 pl-9 pr-3 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-red-500/20 focus:border-[#D32F2F] transition-all"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 text-xs font-semibold border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
        >
          <option value="">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Disabled Only</option>
        </select>
      </div>

      {/* Coupons Table / List */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading coupons catalog...</div>
        ) : !couponsList.length ? (
          <div className="text-center py-16 px-4">
            <Tag size={36} className="mx-auto text-slate-300 mb-2.5" />
            <h4 className="text-sm font-bold text-slate-800">No coupons found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Create your first promotional discount coupon code to reward loyal customers or drive first-time bookings.
            </p>
            <Button size="sm" variant="primary" onClick={handleOpenCreate} className="mt-4">
              <Plus size={14} className="mr-1" /> Create First Coupon
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Title & Conditions</th>
                  <th className="py-3 px-4">Discount</th>
                  <th className="py-3 px-4">Usage & Savings</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {couponsList.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Code */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-red-50 text-[#D32F2F] border border-red-200 px-2.5 py-1 rounded-md">
                          {c.code}
                        </span>
                        <button
                          onClick={() => handleCopyCode(c.code)}
                          title="Copy Code"
                          className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                        >
                          {copiedCode === c.code ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        </button>
                      </div>
                      {Boolean(c.first_time_only) && (
                        <span className="inline-block mt-1 text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                          1st Visit Only
                        </span>
                      )}
                    </td>

                    {/* Title & Min Order */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-semibold text-slate-800 text-xs">{c.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Min. Order: {formatINR(c.min_order_amount)}
                        {c.max_discount ? ` • Max: ${formatINR(c.max_discount)}` : ''}
                      </p>
                    </td>

                    {/* Discount Value */}
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {c.type === 'percentage' ? (
                        <span className="inline-flex items-center gap-1 text-red-700">
                          <Percent size={12} /> {c.value}% OFF
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          Flat {formatINR(c.value)} OFF
                        </span>
                      )}
                    </td>

                    {/* Usage Stats */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => setRedemptionsModalId(c.id)}
                        className="text-left group hover:underline cursor-pointer"
                      >
                        <span className="font-semibold text-slate-800 text-xs group-hover:text-[#D32F2F]">
                          {c.redemption_count || 0}
                          {c.total_usage_limit ? ` / ${c.total_usage_limit}` : ''} used
                        </span>
                        <p className="text-[11px] text-emerald-600 font-medium">
                          Saved: {formatINR(c.total_savings_granted || 0)}
                        </p>
                      </button>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggle(c)}
                        className="flex items-center gap-1.5 cursor-pointer text-xs"
                      >
                        {c.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            Disabled
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setShareCouponModal(c)}
                          title="Share via WhatsApp"
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                        >
                          <Share2 size={13} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          title="Edit Coupon"
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          title="Delete Coupon"
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── CREATE / EDIT COUPON MODAL ───────────────────────── */}
      <AnimatedModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)}>
        <div className="p-5 max-w-lg w-full bg-white rounded-2xl">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Tag size={18} className="text-[#D32F2F]" />
              {editingCoupon ? 'Edit Coupon Offer' : 'Create New Coupon'}
            </h3>
            <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
          </div>

          <form onSubmit={handleSubmitForm} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Coupon Code *</label>
                <input
                  required
                  placeholder="e.g. MONSOON20"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 font-mono font-bold uppercase focus:ring-1 focus:ring-red-500/20 focus:border-[#D32F2F]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Discount Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'percentage' | 'fixed' })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 font-medium"
                >
                  <option value="percentage">Percentage (% OFF)</option>
                  <option value="fixed">Fixed Amount (₹ Flat)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Offer Title *</label>
              <input
                required
                placeholder="e.g. 15% Off Monsoon Detailing"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {formData.type === 'percentage' ? 'Percentage Value (%) *' : 'Flat Discount (₹) *'}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={formData.type === 'percentage' ? '100' : '50000'}
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Max Cap Discount (₹)</label>
                <input
                  type="number"
                  placeholder={formData.type === 'percentage' ? 'e.g. 500 (Optional)' : 'N/A for fixed'}
                  disabled={formData.type === 'fixed'}
                  value={formData.max_discount || ''}
                  onChange={(e) => setFormData({ ...formData, max_discount: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Min. Bill Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: parseFloat(e.target.value) || 0 })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Uses Per Customer</label>
                <input
                  type="number"
                  min="1"
                  value={formData.per_customer_limit}
                  onChange={(e) => setFormData({ ...formData, per_customer_limit: parseInt(e.target.value) || 1 })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Total System Limit</label>
                <input
                  type="number"
                  placeholder="Unlimited if blank"
                  value={formData.total_usage_limit || ''}
                  onChange={(e) => setFormData({ ...formData, total_usage_limit: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.first_time_only)}
                    onChange={(e) => setFormData({ ...formData, first_time_only: e.target.checked })}
                    className="rounded text-[#D32F2F] focus:ring-red-500"
                  />
                  <span>1st-Time Customer Only</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={createMut.isPending || updateMut.isPending}>
                {editingCoupon ? 'Save Changes' : 'Create Coupon'}
              </Button>
            </div>
          </form>
        </div>
      </AnimatedModal>

      {/* ─── WHATSAPP SHARE BROADCAST MODAL ───────────────────── */}
      <AnimatedModal isOpen={Boolean(shareCouponModal)} onClose={() => setShareCouponModal(null)}>
        <div className="p-5 max-w-md w-full bg-white rounded-2xl">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Share2 size={18} className="text-emerald-600" />
              Broadcast Offer via WhatsApp
            </h3>
            <button onClick={() => setShareCouponModal(null)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
          </div>

          <div className="space-y-3 text-xs text-slate-600">
            <p>
              Dispatch this coupon offer directly to customers on WhatsApp with personalized greeting and one-tap booking link.
            </p>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 font-mono text-[11px] space-y-1">
              <p className="font-bold text-slate-800">Preview Message:</p>
              <p className="text-slate-600">
                Special Offer from GK AutoHerb! Use code <strong className="text-emerald-700">*{shareCouponModal?.code}*</strong> to get {shareCouponModal?.type === 'percentage' ? `${shareCouponModal?.value}% OFF` : `Flat ₹${shareCouponModal?.value} OFF`} on your next detailing booking. Valid for a limited time!
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShareCouponModal(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleBroadcastShare}
                disabled={shareMut.isPending}
              >
                {shareMut.isPending ? 'Broadcasting...' : 'Broadcast to Customers'}
              </Button>
            </div>
          </div>
        </div>
      </AnimatedModal>

      {/* ─── REDEMPTIONS HISTORY MODAL ─────────────────────────── */}
      <AnimatedModal isOpen={Boolean(redemptionsModalId)} onClose={() => setRedemptionsModalId(null)}>
        <div className="p-5 max-w-lg w-full bg-white rounded-2xl">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users size={18} className="text-amber-600" />
              Coupon Redemptions History
            </h3>
            <button onClick={() => setRedemptionsModalId(null)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
          </div>

          {loadingRedemptions ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading redemptions...</div>
          ) : !redemptionsList?.length ? (
            <div className="p-8 text-center text-slate-400 text-xs">No customer redemptions recorded yet for this coupon.</div>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2 text-xs">
              {redemptionsList.map((r: any) => (
                <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{r.customer_name || 'Customer'}</p>
                    <p className="text-[11px] text-slate-400">{r.customer_mobile || 'Mobile N/A'} • {new Date(r.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                  <span className="font-bold text-emerald-600 text-xs">
                    -{formatINR(r.discount_amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </AnimatedModal>
    </PageTransition>
  );
}
