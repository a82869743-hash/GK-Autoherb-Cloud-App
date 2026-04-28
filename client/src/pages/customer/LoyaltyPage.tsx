import { useNavigate } from 'react-router-dom';
import { CreditCard, Droplets, Sparkles, Gift, TrendingUp } from 'lucide-react';
import { useLoyalty, useLoyaltyHistory } from '../../api/hooks/useLoyalty';
import Button from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import { formatINR, formatDate } from '../../utils/formatters';

export default function LoyaltyPage() {
  const navigate = useNavigate();
  const { data: loyalty, isLoading } = useLoyalty('mine');
  const { data: history } = useLoyaltyHistory('mine');

  if (isLoading) {
    return (
      <div className="pt-4 space-y-4">
        <h2 className="text-2xl font-extrabold text-[#1c1b1b] tracking-tight">Loyalty & Rewards</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
      </div>
    );
  }

  return (
    <div className="pt-4">
      {/* ── Hero Stats Section ───────────────────────────── */}
      <div className="relative hero-bg rounded-2xl overflow-hidden mb-8 pattern-overlay">
        <div className="relative z-10 px-6 sm:px-10 py-8 sm:py-10">
          <div className="flex items-center gap-2 mb-4">
            <Gift size={16} className="text-[#D32F2F]" />
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Loyalty & Rewards</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Credits</p>
              <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">{formatINR(loyalty?.credits || 0)}</p>
              <div className="w-12 h-1 bg-[#D32F2F] rounded-full mt-2" />
            </div>
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Free Washes</p>
              <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">{loyalty?.free_washes || 0}</p>
              <div className="w-12 h-1 bg-blue-500 rounded-full mt-2" />
            </div>
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Wax Treatments</p>
              <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">{loyalty?.wax_count || 0}</p>
              <div className="w-12 h-1 bg-purple-500 rounded-full mt-2" />
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#D32F2F] via-[#D32F2F]/40 to-transparent" />
      </div>

      {/* Actions */}
      {(loyalty?.free_washes > 0) && (
        <div className="mb-8">
          <Button onClick={() => navigate('/customer/bookings/new?free_wash=true')} icon={<Gift size={14} />}>
            Use a Free Wash
          </Button>
        </div>
      )}

      {/* ── History ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <TrendingUp size={16} className="text-[#D32F2F]" />
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#5f5e5e]">Reward History</h3>
        </div>
        {history?.length ? (
          <div className="divide-y divide-gray-50">
            {history.map((item: any, idx: number) => (
              <div
                key={item.id}
                className="px-6 py-3.5 flex items-center justify-between hover:bg-[#faf7f5] transition-colors opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${idx * 0.04}s`, animationFillMode: 'forwards' }}
              >
                <div>
                  <p className="text-sm font-bold text-[#1c1b1b]">{item.description}</p>
                  <p className="text-xs text-[#5f5e5e] mt-0.5">{formatDate(item.created_at)}</p>
                </div>
                {item.amount > 0 && (
                  <span className="text-sm font-extrabold text-green-600 bg-green-50 px-2.5 py-1 rounded-lg">+{formatINR(item.amount)}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-sm text-[#5f5e5e]">No reward history yet. Earn rewards by visiting us!</div>
        )}
      </div>
    </div>
  );
}
