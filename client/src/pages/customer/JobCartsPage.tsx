import { Link } from 'react-router-dom';
import { ClipboardList, Download, Calendar, Car, Share2, Radio } from 'lucide-react';
import { useJobCarts } from '../../api/hooks/useJobCarts';
import { useAuthStore } from '../../store/authStore';
import { formatINR, formatDate } from '../../utils/formatters';
import { AppPageHeader, EmptyBlock, Skeleton } from '../../components/customer/ui';

const STAGE_LABEL: Record<string, string> = {
  received: 'Vehicle received', inspection: 'Inspection', washing: 'Washing', detailing: 'Detailing',
  curing: 'Coating & curing', quality_check: 'Quality check', ready: 'Ready for pickup', delivered: 'Delivered',
};

export default function CustomerJobCartsPage() {
  const { data, isLoading } = useJobCarts({ page: 1, limit: 100 });
  const token = useAuthStore((s) => s.token);
  const carts: any[] = data?.data || [];

  const downloadInvoice = (cartId: number) => {
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    window.open(`${apiBase}/job-carts/${cartId}/invoice?token=${token}`, '_blank');
  };

  return (
    <div>
      <AppPageHeader title="Service history" subtitle="Job cards, live status & invoices" />
      <div className="mt-2 space-y-3">
        {isLoading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)
        ) : carts.length === 0 ? (
          <EmptyBlock icon={<ClipboardList size={24} />} title="No visits yet" text="Your job cards and invoices appear here after your first visit." />
        ) : (
          carts.map((cart) => {
            const live = cart.status === 'open' || cart.status === 'draft';
            return (
              <div key={cart.id} className="app-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display font-extrabold text-slate-900">{cart.brand} {cart.model}</p>
                    <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-3">
                      <span className="flex items-center gap-1"><Car size={12} /> {cart.registration_no}</span>
                      <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(cart.visit_date)}</span>
                      <span>Visit #{cart.visit_number}</span>
                    </p>
                  </div>
                  <span className="font-display font-extrabold text-slate-900 whitespace-nowrap">{formatINR(cart.total_amount)}</span>
                </div>

                {live ? (
                  <div className="mt-3 rounded-xl bg-red-50/70 px-3 py-2 flex items-center gap-2 text-[13px]">
                    <Radio size={15} className="text-[#D32F2F] animate-pulse" />
                    <span className="font-semibold text-slate-800">{STAGE_LABEL[cart.stage || 'received'] || 'In progress'}</span>
                  </div>
                ) : (
                  <p className="mt-3 text-xs font-semibold text-emerald-700">Completed{cart.invoice_number ? ` · Invoice ${cart.invoice_number}` : ''}</p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {cart.tracking_path && (
                    <Link to={cart.tracking_path} className="app-btn h-9 px-3 bg-slate-100 text-slate-800 text-[13px]">
                      {live ? 'Track live' : 'View timeline'}
                    </Link>
                  )}
                  {cart.status === 'complete' && (
                    <>
                      <button onClick={() => downloadInvoice(cart.id)} className="app-btn h-9 px-3 bg-[#111] text-white text-[13px]">
                        <Download size={14} /> Invoice
                      </button>
                      <button
                        onClick={() => {
                          const text = encodeURIComponent(`GK AutoHerb invoice for ${cart.registration_no} (${cart.brand} ${cart.model}): ${cart.invoice_number || cart.id} · ${formatINR(cart.total_amount)}`);
                          window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                        }}
                        className="app-btn h-9 px-3 bg-emerald-50 text-emerald-700 text-[13px]"
                      >
                        <Share2 size={14} /> Share
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
