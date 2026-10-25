import { useState } from 'react';
import { Tag, Check, X, Sparkles, ChevronRight } from 'lucide-react';
import { useValidateCoupon, useActiveOffers } from '../../api/hooks/useCoupons';
import { AnimatedModal } from '../ui/Animations';
import { formatINR } from '../../utils/formatters';
import toast from 'react-hot-toast';

interface CouponInputProps {
  orderAmount: number;
  serviceIds?: number[];
  packageIds?: number[];
  appliedCoupon: { coupon_id: number; code: string; discount_amount: number; title?: string } | null;
  onApply: (coupon: { coupon_id: number; code: string; discount_amount: number; title: string }) => void;
  onRemove: () => void;
  className?: string;
}

export default function CouponInput({
  orderAmount,
  serviceIds = [],
  packageIds = [],
  appliedCoupon,
  onApply,
  onRemove,
  className = '',
}: CouponInputProps) {
  const [couponCode, setCouponCode] = useState('');
  const [isOffersOpen, setIsOffersOpen] = useState(false);

  const validateMut = useValidateCoupon();
  const { data: activeOffers = [], isLoading: loadingOffers } = useActiveOffers();

  const handleApplyCode = async (codeToApply?: string) => {
    const code = (codeToApply || couponCode).trim().toUpperCase();
    if (!code) {
      toast.error('Please enter a coupon code');
      return;
    }

    try {
      const res = await validateMut.mutateAsync({
        code,
        order_amount: orderAmount,
        service_ids: serviceIds,
        package_ids: packageIds,
      });

      if (res && res.coupon_id) {
        onApply({
          coupon_id: res.coupon_id,
          code: res.code,
          discount_amount: res.discount_amount,
          title: res.title,
        });
        toast.success(`Coupon "${res.code}" applied! Saved ${formatINR(res.discount_amount)}`);
        setCouponCode('');
        setIsOffersOpen(false);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Invalid or inapplicable coupon');
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {appliedCoupon ? (
        // Applied State Banner
        <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
              <Check size={13} />
            </div>
            <div>
              <p className="font-bold flex items-center gap-1">
                <span>{appliedCoupon.code}</span>
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                  -{formatINR(appliedCoupon.discount_amount)}
                </span>
              </p>
              <p className="text-[10px] text-emerald-700 opacity-90 mt-0.5">
                {appliedCoupon.title || 'Promotional coupon discount applied'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 rounded-md text-emerald-700 hover:bg-emerald-100 transition-colors"
            title="Remove coupon"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        // Compact Input Form
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Tag size={13} className="text-[#D32F2F]" />
              <span>Have a coupon?</span>
            </span>
            <button
              type="button"
              onClick={() => setIsOffersOpen(true)}
              className="text-[#D32F2F] hover:underline font-semibold text-[11px] flex items-center gap-0.5"
            >
              <Sparkles size={11} />
              View Offers
            </button>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Enter promo code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                className="w-full h-8 sm:h-9 px-3 text-xs uppercase font-mono font-bold rounded-lg border border-slate-200 focus:border-[#D32F2F] focus:ring-1 focus:ring-red-500/20"
              />
            </div>
            <button
              type="button"
              onClick={() => handleApplyCode()}
              disabled={validateMut.isPending || !couponCode.trim()}
              className="h-8 sm:h-9 px-3.5 bg-slate-900 hover:bg-black disabled:bg-slate-200 text-white font-bold text-xs rounded-lg transition-all active:scale-95"
            >
              {validateMut.isPending ? '...' : 'Apply'}
            </button>
          </div>
        </div>
      )}

      {/* ─── AVAILABLE OFFERS MODAL ───────────────────────── */}
      <AnimatedModal isOpen={isOffersOpen} onClose={() => setIsOffersOpen(false)}>
        <div className="p-4 sm:p-5 max-w-sm w-full bg-white rounded-2xl">
          <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles size={15} className="text-amber-500" />
              Available Studio Offers
            </h4>
            <button onClick={() => setIsOffersOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
          </div>

          {loadingOffers ? (
            <div className="py-6 text-center text-slate-400 text-xs">Loading offers...</div>
          ) : !activeOffers.length ? (
            <div className="py-6 text-center text-slate-400 text-xs">No public offers active right now.</div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {activeOffers.map((offer: any) => (
                <div
                  key={offer.id}
                  className="p-3 rounded-xl border border-dashed border-red-200 bg-red-50/40 hover:bg-red-50 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-mono font-bold text-xs text-[#D32F2F] bg-white px-2 py-0.5 rounded border border-red-200">
                      {offer.code}
                    </span>
                    <p className="font-semibold text-slate-800 text-xs mt-1 truncate">{offer.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {offer.type === 'percentage'
                        ? `${offer.value}% OFF (up to ₹${offer.max_discount || 'Unlimited'})`
                        : `Flat ${formatINR(offer.value)} OFF`}
                      {offer.min_order_amount > 0 ? ` on orders > ${formatINR(offer.min_order_amount)}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyCode(offer.code)}
                    disabled={validateMut.isPending}
                    className="h-7 px-2.5 bg-[#D32F2F] hover:bg-[#b71c1c] text-white text-[11px] font-bold rounded-lg shrink-0 active:scale-95 transition-all"
                  >
                    Apply
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </AnimatedModal>
    </div>
  );
}
