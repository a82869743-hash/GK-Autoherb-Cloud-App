import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Clock, CheckCircle2, ListChecks, ShieldCheck, ArrowRight, X } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

interface ServiceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: any;
  isFirstWashEligible?: boolean;
  onSelect?: (service: any) => void;
}

export default function ServiceDetailsModal({ isOpen, onClose, service, onSelect }: ServiceDetailsModalProps) {
  const navigate = useNavigate();

  if (!service) return null;

  const isWash = service.name && service.name.toLowerCase().includes('wash');

  // Parse JSON helper
  const parseJson = (field: any) => {
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

  let features = parseJson(service.features_json);
  let whatsIncluded = parseJson(service.whats_included_json);
  let processSteps = parseJson(service.process_json);

  // Provide rich default English content if none saved by Admin yet
  if (features.length === 0) {
    features = isWash
      ? ['Deep snow foam hand wash', 'pH-neutral shampoo formula', 'Microfiber scratch-free dry', 'High gloss paint protection']
      : ['Aerospace grade protection', 'Multi-stage paint correction', 'High UV & swirl mark resistance', 'Artisan hand application'];
  }
  if (whatsIncluded.length === 0) {
    whatsIncluded = isWash
      ? ['Underbody pressure wash', 'Interior vacuuming & dashboard wipe', 'Tyre dressing & rim clean', 'Glass streak-free polish']
      : ['Surface clay bar decontamination', 'Paint defect & scratch removal', 'Full exterior sealant coating', 'Final studio QC inspection'];
  }
  if (processSteps.length === 0) {
    processSteps = isWash
      ? ['1. High pressure pre-rinse', '2. Snow foam soak & microfiber wash', '3. Underbody & wheel deep clean', '4. Blow dry & streak-free wipe']
      : ['1. Vehicle prep & surface decontamination', '2. Precision machine compounding & polishing', '3. Protective layer application', '4. Curing & final studio sign-off'];
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title=""
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
          >
            Close
          </button>

          <Button
            onClick={() => {
              onClose();
              if (onSelect) {
                onSelect(service);
              } else {
                navigate(`/customer/bookings/new?service_id=${service.id}`);
              }
            }}
            className="bg-[#D32F2F] hover:bg-[#b52626] text-white py-2 px-5 font-bold text-xs rounded-xl shadow-md"
            icon={<ArrowRight size={15} />}
          >
            {onSelect ? 'Select This Service' : 'Book This Service Now'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Banner Header */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-gray-900 via-zinc-900 to-[#1c1b1b] p-5 sm:p-6 text-white shadow-xl">
          {/* Top-right close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-sm"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          {service.image_url && (
            <img
              src={service.image_url}
              alt={service.name}
              className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
            />
          )}
          <div className="relative z-10 space-y-2 pr-8">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-red-600/90 text-white text-[10px] font-black uppercase tracking-wider rounded-md">
                {service.category_name || 'GK AutoHerb Service'}
              </span>
              {service.is_premium && (
                <span className="px-2.5 py-0.5 bg-amber-500/90 text-black text-[10px] font-black uppercase tracking-wider rounded-md flex items-center gap-1">
                  <Sparkles size={10} /> Premium
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">{service.name}</h2>
            <p className="text-xs text-gray-300 max-w-xl leading-relaxed">
              {service.description || 'Comprehensive professional car care service engineered for maximum protection and showroom finish.'}
            </p>

            <div className="flex items-center gap-4 pt-1.5 text-xs font-bold text-gray-300">
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-red-500" />
                <span>{service.duration_minutes || 60} Minutes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>Studio Certified</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Grid: Key Highlights & What's Included */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Key Highlights */}
          {features.length > 0 && (
            <div className="p-3.5 sm:p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-2">
                <Sparkles size={14} className="text-amber-500" />
                Key Highlights
              </h4>
              <ul className="space-y-1.5 text-xs font-medium text-gray-700">
                {features.map((item: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* What's Included */}
          {whatsIncluded.length > 0 && (
            <div className="p-3.5 sm:p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-2">
                <ListChecks size={14} className="text-blue-500" />
                What's Included
              </h4>
              <ul className="space-y-1.5 text-xs font-medium text-gray-700">
                {whatsIncluded.map((item: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 size={13} className="text-blue-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Process Steps */}
        {processSteps.length > 0 && (
          <div className="p-3.5 sm:p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-2">
              <ShieldCheck size={14} className="text-purple-500" />
              Service Process & Workflow
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium text-gray-700">
              {processSteps.map((step: string, idx: number) => (
                <div key={idx} className="p-2.5 bg-white rounded-xl border border-gray-200/60 shadow-2xs">
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Segment Pricing Table */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2">
            Pricing by Vehicle Segment
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
            {[
              { label: 'Hatchback', key: 'price_hatchback' },
              { label: 'Med Hatch', key: 'price_medium_hatchback' },
              { label: 'Sedan', key: 'price_sedan' },
              { label: 'Prem Sedan', key: 'price_premium_sedan' },
              { label: 'SUV', key: 'price_suv' },
            ].map((seg) => {
              const val = parseFloat(service[seg.key]) || 0;
              return (
                <div key={seg.key} className="p-2.5 sm:p-3 bg-gray-50 rounded-xl border border-gray-200/60">
                  <p className="text-[9px] font-bold text-gray-400 uppercase">{seg.label}</p>
                  <p className="text-xs sm:text-sm font-black text-gray-900 mt-0.5">
                    {val > 0 ? `₹${val}` : 'Ask Studio'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
