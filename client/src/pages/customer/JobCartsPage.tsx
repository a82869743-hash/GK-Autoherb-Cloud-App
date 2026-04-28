import { useState } from 'react';
import { ClipboardList, ChevronDown, ChevronUp, Download, Calendar, Car, Hash } from 'lucide-react';
import { useJobCarts } from '../../api/hooks/useJobCarts';
import StatusBadge from '../../components/shared/StatusBadge';
import EmptyState from '../../components/shared/EmptyState';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import { formatINR, formatDate } from '../../utils/formatters';
import type { JobPhoto } from '../../types';

export default function CustomerJobCartsPage() {
  const { data, isLoading } = useJobCarts({ page: 1, limit: 100 });
  const [expanded, setExpanded] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4 pt-4">
        <h2 className="text-2xl font-extrabold text-[#1c1b1b] tracking-tight">My Job Carts</h2>
        <div className="grid gap-4">{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>
      </div>
    );
  }

  const carts = data?.data || [];

  if (!carts.length) {
    return (
      <div className="pt-4">
        <h2 className="text-2xl font-extrabold text-[#1c1b1b] tracking-tight mb-6">My Job Carts</h2>
        <EmptyState
          icon={ClipboardList}
          title="No Job Carts Yet"
          description="Your service history will appear here after your first visit"
        />
      </div>
    );
  }

  const handleDownloadInvoice = (cartId: number) => {
    const token = localStorage.getItem('gk-auth-v1');
    const parsed = token ? JSON.parse(token) : null;
    const jwt = parsed?.state?.token;
    window.open(
      `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/job-carts/${cartId}/invoice?token=${jwt}`,
      '_blank'
    );
  };

  return (
    <div className="pt-4">
      <h2 className="text-2xl font-extrabold text-[#1c1b1b] tracking-tight mb-6">My Job Carts</h2>

      <div className="space-y-3">
        {carts.map((cart: any, idx: number) => {
          const isOpen = expanded === cart.id;
          return (
            <div
              key={cart.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden transition-all border border-gray-100 card-premium opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${idx * 0.04}s`, animationFillMode: 'forwards' }}
            >
              {/* Red accent side */}
              <div className="flex">
                <div className={`w-1 shrink-0 transition-colors duration-200 ${isOpen ? 'bg-gradient-to-b from-[#af101a] to-[#D32F2F]' : 'bg-transparent'}`} />
                <div className="flex-1">
                  {/* Card Header */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : cart.id)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[#faf7f5] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-extrabold text-[#1c1b1b] tracking-wide">{cart.registration_no}</span>
                        <StatusBadge status={cart.status} />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5f5e5e]">
                        <span className="flex items-center gap-1"><Car size={12} /> {cart.brand} {cart.model}</span>
                        <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(cart.visit_date)}</span>
                        <span className="flex items-center gap-1"><Hash size={12} /> Visit #{cart.visit_number}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <span className="text-lg font-black text-[#1c1b1b] tracking-tight">{formatINR(cart.total_amount)}</span>
                      <div className={`p-1 rounded-full transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                        <ChevronDown size={18} className="text-gray-500" />
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isOpen && (
                    <div className="px-5 pb-5 border-t border-gray-100 animate-fade-in">
                      <div className="py-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e] mb-2">Services</p>
                        <p className="text-sm text-[#5f5e5e]">{cart.services_count} service(s) · Total: {formatINR(cart.total_amount)}</p>
                      </div>

                      {cart.status === 'complete' && (
                        <div className="pt-3 border-t border-gray-100">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownloadInvoice(cart.id); }}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-[#af101a] to-[#D32F2F] text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:shadow-glow-red transition-all hover:-translate-y-0.5"
                          >
                            <Download size={14} /> Download Invoice
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
