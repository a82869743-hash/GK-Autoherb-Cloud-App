import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, ShieldCheck, ListChecks, Sparkles } from 'lucide-react';
import { BottomSheet } from '../customer/ui';
import ServiceImage from '../customer/ServiceImage';
import { useActiveVehicle } from '../../api/hooks/useCustomerApp';
import { ServiceMediaShowcase, ServiceBrands } from '../customer/ServiceMediaShowcase';
import { SEGMENT_LABEL, priceForSegment, formatPrice } from '../../utils/pricing';

interface ServiceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: any;
  isFirstWashEligible?: boolean;
  onSelect?: (service: any) => void;
  /** Override the segment (e.g. the booking page's chosen vehicle). */
  segment?: string;
}

const parseList = (field: any): string[] => {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed : [field];
    } catch {
      return field.split('\n').filter(Boolean);
    }
  }
  return [];
};

export function warrantyLabel(months?: number) {
  if (!months) return null;
  if (months % 12 === 0) return `${months / 12} year${months > 12 ? 's' : ''} warranty`;
  return `${months} month${months > 1 ? 's' : ''} warranty`;
}

export function durationLabel(mins?: number) {
  const m = Number(mins) || 60;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} hr ${r} min` : `${h} hour${h > 1 ? 's' : ''}`;
}

export default function ServiceDetailsModal({ isOpen, onClose, service, onSelect, isFirstWashEligible, segment: segmentOverride }: ServiceDetailsModalProps) {
  const navigate = useNavigate();
  const { active, segment: activeSegment } = useActiveVehicle();
  if (!service) return null;

  const segment = segmentOverride || activeSegment;
  const isWash = (service.name || '').toLowerCase().includes('wash');
  const isBike = service.vehicle_type === 'bike';
  const price = priceForSegment(service, segment);

  let features = parseList(service.features_json);
  let included = parseList(service.whats_included_json);
  let steps = parseList(service.process_json);
  if (!features.length) {
    features = isWash
      ? ['pH-neutral shampoo, safe on coatings', 'Scratch-free two-bucket hand wash', 'Microfiber blow-and-wipe dry']
      : ['Professional-grade products', 'Trained, certified detailers', 'Final quality inspection'];
  }
  if (!included.length) {
    included = isWash
      ? ['Exterior foam wash', 'Tyre & rim clean', 'Glass cleaning', 'Interior quick vacuum']
      : ['Surface preparation', 'Main treatment', 'Finishing & inspection'];
  }

  return (
    <BottomSheet
      open={isOpen}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[11px] text-slate-500">{isBike ? 'Bike price' : active ? `Price for your ${SEGMENT_LABEL[segment]}` : 'Starting price'}</p>
            <p className="font-display text-xl font-extrabold text-slate-900">{formatPrice(price)}</p>
          </div>
          <button
            onClick={() => {
              onClose();
              if (onSelect) onSelect(service);
              else navigate(`/customer/bookings/new?service_id=${service.id}`);
            }}
            className="app-btn-primary px-6"
          >
            {onSelect ? 'Select' : 'Book now'}
          </button>
        </div>
      }
    >
      <div className="-mx-5 -mt-1">
        <div className="relative h-52">
          <ServiceImage service={{ ...service, name: '' }} className="h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <div className="absolute bottom-3 left-5 right-5 text-white">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#ff8a80]">{service.category_name || 'GK AutoHerb'}</span>
            <h2 className="font-display text-2xl font-extrabold leading-tight">{service.name}</h2>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-4">
        {service.description && <p className="text-sm text-slate-600 leading-relaxed">{service.description}</p>}

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
            <Clock size={14} /> {durationLabel(service.duration_minutes)}
          </span>
          {warrantyLabel(service.warranty_months) && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <ShieldCheck size={14} /> {warrantyLabel(service.warranty_months)}
            </span>
          )}
          {isWash && isFirstWashEligible && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-[#C62828]">
              <Sparkles size={14} /> 50% off your first wash
            </span>
          )}
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <h4 className="font-display text-sm font-extrabold text-slate-900 mb-2 flex items-center gap-2"><ListChecks size={16} className="text-[#D32F2F]" /> What's included</h4>
          <ul className="space-y-1.5">
            {included.map((x, i) => (
              <li key={i} className="flex gap-2 text-[13px] text-slate-700"><CheckCircle2 size={15} className="text-emerald-500 mt-0.5 shrink-0" />{x}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <h4 className="font-display text-sm font-extrabold text-slate-900 mb-2 flex items-center gap-2"><Sparkles size={16} className="text-[#D32F2F]" /> Why customers pick it</h4>
          <ul className="space-y-1.5">
            {features.map((x, i) => (
              <li key={i} className="flex gap-2 text-[13px] text-slate-700"><CheckCircle2 size={15} className="text-[#D32F2F] mt-0.5 shrink-0" />{x}</li>
            ))}
          </ul>
        </div>

        <ServiceBrands service={service} />

        {service.id && <ServiceMediaShowcase serviceId={service.id} />}

        {steps.length > 0 && (
          <div>
            <h4 className="font-display text-sm font-extrabold text-slate-900 mb-2">How we do it</h4>
            <ol className="space-y-2">
              {steps.map((x, i) => (
                <li key={i} className="flex gap-3 text-[13px] text-slate-700">
                  <span className="h-6 w-6 shrink-0 rounded-full bg-[#111] text-white text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="pt-0.5">{String(x).replace(/^\d+\.\s*/, '')}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
