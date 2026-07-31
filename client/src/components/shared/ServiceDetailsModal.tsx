import React from 'react';
import { Sparkles, Clock, CheckCircle2, ListChecks, ShieldCheck, ArrowRight, ShoppingBag, Check } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useCartStore } from '../../store/useCartStore';
import { formatINR } from '../../utils/formatters';

interface ServiceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: any;
  isFirstWashEligible?: boolean;
}

export default function ServiceDetailsModal({ isOpen, onClose, service, isFirstWashEligible }: ServiceDetailsModalProps) {
  const { servicesCart, toggleServiceInCart } = useCartStore();

  if (!service) return null;

  const isInCart = servicesCart.some((item) => item.id === service.id);
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

  const features = parseJson(service.features_json);
  const whatsIncluded = parseJson(service.whats_included_json);
  const processSteps = parseJson(service.process_json);

  const priceSedan = parseFloat(service.price_sedan) || 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="lg">
      <div className="space-y-6">
        {/* Banner Header */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-gray-900 via-zinc-900 to-[#1c1b1b] p-6 text-white shadow-xl">
          {service.image_url && (
            <img
              src={service.image_url}
              alt={service.name}
              className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-overlay"
            />
          )}
          <div className="relative z-10 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="px-3 py-1 bg-[#D32F2F] text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-sm">
                {service.category_name || 'Studio Service'}
              </span>
              {service.duration_minutes && (
                <span className="flex items-center gap-1.5 text-xs text-gray-300 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 font-bold">
                  <Clock size={14} className="text-amber-400" />
                  ~{service.duration_minutes} Mins
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug text-white">
              {service.name}
            </h2>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="text-xl font-extrabold text-white">
                {priceSedan > 0 ? (
                  isFirstWashEligible && isWash ? (
                    <div className="flex items-center gap-2">
                      <span className="line-through text-gray-400 text-sm">₹{priceSedan}</span>
                      <span className="text-amber-400 font-black text-2xl">₹{Math.round(priceSedan * 0.50)}</span>
                      <span className="text-[10px] font-black bg-amber-400 text-gray-950 px-2 py-0.5 rounded-md">50% OFF WASH</span>
                    </div>
                  ) : (
                    <span>Starting from ₹{priceSedan} <span className="text-xs font-normal text-gray-400">(Sedan)</span></span>
                  )
                ) : (
                  <span className="text-amber-400 font-bold">Ask Studio</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* English Description */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-[#D32F2F]" /> Service Overview
          </h4>
          <p className="text-sm text-gray-700 leading-relaxed font-medium bg-gray-50 p-4 rounded-xl border border-gray-100">
            {service.description || 'Professional automotive detail and care engineered for maximum protection, clarity, and shine.'}
          </p>
        </div>

        {/* Key Features */}
        {features.length > 0 && (
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
              <Sparkles size={16} className="text-amber-500" /> Key Features & Highlights
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {features.map((feat: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/50 border border-amber-100/60 text-xs font-bold text-gray-800">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What's Included */}
        {whatsIncluded.length > 0 && (
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
              <ListChecks size={16} className="text-blue-500" /> What's Included
            </h4>
            <ul className="space-y-2 bg-blue-50/40 p-4 rounded-xl border border-blue-100/60">
              {whatsIncluded.map((inc: string, idx: number) => (
                <li key={idx} className="flex items-center gap-2 text-xs font-semibold text-gray-800">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  <span>{inc}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Process Steps */}
        {processSteps.length > 0 && (
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
              <ArrowRight size={16} className="text-purple-500" /> Process Steps
            </h4>
            <div className="space-y-2.5">
              {processSteps.map((step: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Segment Pricing Breakdown Table */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">
            Pricing Breakdown by Vehicle Segment
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
            {[
              { label: 'Hatchback', price: service.price_hatchback },
              { label: 'Med Hatch', price: service.price_medium_hatchback },
              { label: 'Sedan', price: service.price_sedan },
              { label: 'Prem Sedan', price: service.price_premium_sedan },
              { label: 'SUV', price: service.price_suv },
            ].map((seg, i) => {
              const val = parseFloat(seg.price) || 0;
              return (
                <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{seg.label}</p>
                  <p className="text-sm font-black text-gray-900 mt-1">
                    {val > 0 ? (
                      isFirstWashEligible && isWash ? (
                        <span className="text-[#D32F2F]">₹{Math.round(val * 0.50)}</span>
                      ) : (
                        `₹${val}`
                      )
                    ) : (
                      'Ask Studio'
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Action CTA */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
          >
            Close
          </button>

          <Button
            onClick={() => {
              toggleServiceInCart(service);
              onClose();
            }}
            className={isInCart ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-[#D32F2F] hover:bg-[#b52626] text-white'}
            icon={isInCart ? <Check size={16} /> : <ShoppingBag size={16} />}
          >
            {isInCart ? 'Added to Cart ✓' : 'Add to Services Cart'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
