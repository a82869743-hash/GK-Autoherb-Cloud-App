import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeft, Search, Bike, ChevronRight, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { carBrands as fallbackCarBrands, getModelsForBrand, getCategoryForModel } from '../../utils/carData';
import { useBrands, useModels } from '../../api/hooks/useVehicles';
import api from '../../api/axiosInstance';
import { useQueryClient } from '@tanstack/react-query';
import CarImage from './CarImage';
import { brandLogo, POPULAR_BRANDS } from '../../utils/brandLogos';
import { SEGMENT_LABEL } from '../../utils/pricing';

const BIKE_BRANDS = ['Hero', 'Honda', 'Bajaj', 'TVS', 'Royal Enfield', 'Yamaha', 'Suzuki', 'KTM', 'Kawasaki', 'Ola Electric', 'Ather', 'Jawa'];

interface AddCarModalProps {
  isOpen: boolean;
  onClose: () => void;
  editVehicle?: any;
}

type Step = 'type' | 'brand' | 'model' | 'details';

/** Hoora-style "add vehicle" flow: type → brand logo grid → model → number plate. */
export default function AddCarModal({ isOpen, onClose, editVehicle }: AddCarModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('type');
  const [kind, setKind] = useState<'car' | 'bike'>('car');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [regNo, setRegNo] = useState('');
  const [year, setYear] = useState('');
  const [query, setQuery] = useState('');
  const [customBrandMode, setCustomBrandMode] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const { data: brandsRes } = useBrands();
  const { data: modelsRes } = useModels(kind === 'car' && !customBrandMode ? brand : '');

  const liveBrands: string[] = brandsRes?.data || [];
  const carBrands = liveBrands.length > 0 ? liveBrands : fallbackCarBrands.filter((b: string) => b !== 'Others');
  const liveModels: string[] = modelsRes?.data || [];
  const models = kind === 'car' && brand && !customBrandMode ? (liveModels.length > 0 ? liveModels : getModelsForBrand(brand).filter((m: string) => m !== 'Other')) : [];

  useEffect(() => {
    if (!isOpen) return;
    if (editVehicle) {
      setKind(editVehicle.category === 'bike' ? 'bike' : 'car');
      setBrand(editVehicle.brand || '');
      setModel(editVehicle.model || '');
      setRegNo(editVehicle.registration_no || '');
      setYear(editVehicle.car_year ? String(editVehicle.car_year) : '');
      setCustomBrandMode(false);
      setStep('details');
    } else {
      setKind('car');
      setBrand('');
      setModel('');
      setRegNo('');
      setYear('');
      setCustomBrandMode(false);
      setStep('type');
    }
    setQuery('');
  }, [editVehicle, isOpen]);

  const brandList = kind === 'car' ? carBrands : BIKE_BRANDS;
  const popular = kind === 'car' ? POPULAR_BRANDS.filter((b) => brandList.includes(b)) : BIKE_BRANDS.slice(0, 6);
  const q = query.trim().toLowerCase();
  const filteredBrands = useMemo(() => brandList.filter((b) => !q || b.toLowerCase().includes(q)), [brandList, q]);
  const filteredModels = useMemo(() => models.filter((m: string) => !q || m.toLowerCase().includes(q)), [models, q]);

  const category = kind === 'bike' ? 'bike' : brand && model ? getCategoryForModel(brand, model) : 'sedan';
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1989 }, (_, i) => currentYear - i);

  const go = (s: Step) => {
    setQuery('');
    setStep(s);
  };

  const back = () => {
    if (step === 'details') return go(kind === 'car' && !customBrandMode ? 'model' : 'brand');
    if (step === 'model') return go('brand');
    if (step === 'brand' && !editVehicle) return go('type');
    onClose();
  };

  const save = async () => {
    if (!brand.trim() || !model.trim()) {
      toast.error('Please choose the brand and model');
      return;
    }
    const payload = {
      brand: brand.trim(),
      model: model.trim(),
      registration_no: regNo || undefined,
      car_year: year ? parseInt(year) : undefined,
      category,
    };
    try {
      setIsPending(true);
      if (editVehicle) {
        await api.patch(`/vehicles/${editVehicle.id}`, payload);
        toast.success(kind === 'bike' ? 'Bike updated' : 'Car updated');
      } else {
        await api.post('/vehicles/add', payload);
        toast.success(kind === 'bike' ? 'Bike added' : 'Car added');
      }
      queryClient.invalidateQueries({ queryKey: ['customer-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save vehicle');
    } finally {
      setIsPending(false);
    }
  };

  if (!isOpen) return null;

  const BrandTile = ({ name }: { name: string }) => {
    const logo = brandLogo(name);
    return (
      <button
        type="button"
        onClick={() => {
          setBrand(name);
          setModel('');
          setCustomBrandMode(false);
          go(kind === 'car' ? 'model' : 'details');
        }}
        className="flex flex-col items-center gap-2 py-3 active:scale-95 transition-transform"
      >
        <span className="h-16 w-full flex items-center justify-center">
          {logo ? (
            <img src={logo} alt={name} className="max-h-16 max-w-[84px] object-contain" loading="lazy" />
          ) : (
            <span className="h-14 w-14 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-display text-[20px] font-extrabold">{name.charAt(0)}</span>
          )}
        </span>
        <span className="text-[12.5px] font-semibold text-slate-600 text-center leading-tight">{name}</span>
      </button>
    );
  };

  const title =
    step === 'type' ? 'Choose your vehicle type' : step === 'brand' ? 'Select brand' : step === 'model' ? `${brand} models` : editVehicle ? 'Edit vehicle' : 'Vehicle details';

  // Rendered on <body>: the car chip lives in headers that use backdrop-blur, which would trap a
  // fixed overlay inside the header and let the bottom tab bar cover the "Add car" button.
  return createPortal(
    <div className="fixed inset-0 z-[120] bg-[#f8f9fb] flex flex-col animate-fade-in" role="dialog" aria-modal="true">
      {/* Header */}
      <div className="pt-safe bg-white border-b border-slate-100">
        <div className="mx-auto max-w-md px-3 h-14 flex items-center gap-1">
          <button onClick={back} className="h-10 w-10 rounded-full flex items-center justify-center text-slate-900 active:bg-slate-100" aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <h2 className="flex-1 font-display text-[18px] font-extrabold text-slate-900 truncate">{title}</h2>
          {step === 'brand' ? (
            <button
              onClick={() => {
                setCustomBrandMode(true);
                setBrand('');
                setModel('');
                go('details');
              }}
              className="h-9 px-3 rounded-full bg-amber-300 text-[12px] font-bold text-slate-900"
            >
              Can't find it?
            </button>
          ) : (
            <button onClick={onClose} className="h-10 w-10 rounded-full flex items-center justify-center text-slate-500 active:bg-slate-100" aria-label="Close">
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-md px-4 py-5">
          {/* ─── Step: type ─── */}
          {step === 'type' && (
            <>
              <p className="text-[14px] text-slate-500 mb-5">You can add more vehicles later from the home screen.</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setKind('car');
                    go('brand');
                  }}
                  className="relative h-44 overflow-hidden rounded-2xl border border-slate-300 bg-white text-left active:scale-[0.98] transition-transform"
                >
                  <span className="absolute left-3 top-3 z-10">
                    <span className="block text-[12px] font-semibold text-amber-500">I have a</span>
                    <span className="block font-display text-[16px] font-extrabold text-slate-900">4 WHEELER</span>
                  </span>
                  <img src="/cars/white/black_suv.jpg" alt="" className="absolute -right-6 bottom-0 h-28 w-auto object-contain" />
                </button>
                <button
                  onClick={() => {
                    setKind('bike');
                    go('brand');
                  }}
                  className="relative h-44 overflow-hidden rounded-2xl border border-slate-300 bg-white text-left active:scale-[0.98] transition-transform"
                >
                  <span className="absolute left-3 top-3 z-10">
                    <span className="block text-[12px] font-semibold text-amber-500">I have a</span>
                    <span className="block font-display text-[16px] font-extrabold text-slate-900">2 WHEELER</span>
                  </span>
                  <Bike size={92} strokeWidth={1.4} className="absolute right-2 bottom-3 text-slate-800" />
                </button>
              </div>
            </>
          )}

          {/* ─── Step: brand ─── */}
          {step === 'brand' && (
            <>
              <div className="relative mb-4">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search brand" className="app-input pl-10" />
              </div>
              {!q && popular.length > 0 && (
                <>
                  <h3 className="font-display text-[16px] font-extrabold text-slate-900">Popular</h3>
                  <div className="grid grid-cols-3 border-b border-slate-200 mb-4">
                    {popular.map((b) => <BrandTile key={b} name={b} />)}
                  </div>
                  <h3 className="font-display text-[16px] font-extrabold text-slate-900">All brands</h3>
                </>
              )}
              <div className="grid grid-cols-3">
                {filteredBrands.map((b) => <BrandTile key={b} name={b} />)}
              </div>
              {!filteredBrands.length && <p className="py-8 text-center text-[14px] text-slate-500">No brand found — tap "Can't find it?" to type it.</p>}
            </>
          )}

          {/* ─── Step: model ─── */}
          {step === 'model' && (
            <>
              <div className="flex items-center gap-3 mb-4">
                {brandLogo(brand) && <img src={brandLogo(brand)!} alt="" className="h-10 w-14 object-contain" />}
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search model" className="app-input pl-10" autoFocus />
                </div>
              </div>
              <div className="app-card divide-y divide-slate-100">
                {filteredModels.map((m: string) => (
                  <button
                    key={m}
                    onClick={() => {
                      setModel(m);
                      go('details');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50"
                  >
                    <span className="flex-1 font-display text-[15px] font-bold text-slate-900">{m}</span>
                    <span className="text-[11.5px] font-semibold text-slate-400">{SEGMENT_LABEL[getCategoryForModel(brand, m)] || ''}</span>
                    <ChevronRight size={18} className="text-slate-300" />
                  </button>
                ))}
                <button
                  onClick={() => {
                    setModel('');
                    setCustomBrandMode(false);
                    go('details');
                  }}
                  className="w-full px-4 py-3.5 text-left text-[14px] font-bold text-[#D32F2F]"
                >
                  My model isn't listed — type it
                </button>
              </div>
            </>
          )}

          {/* ─── Step: details ─── */}
          {step === 'details' && (
            <div className="space-y-4">
              <div className="app-card overflow-hidden">
                {kind === 'car' && brand && model ? (
                  <CarImage brand={brand} model={model} containerClassName="h-40 w-full bg-white" className="w-full h-full object-contain p-3" />
                ) : (
                  <div className="h-28 flex items-center justify-center bg-white">
                    {brandLogo(brand) ? <img src={brandLogo(brand)!} alt="" className="h-16 object-contain" /> : <Bike size={56} strokeWidth={1.4} className="text-slate-300" />}
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-display text-[16px] font-extrabold text-slate-900 truncate">{[brand, model].filter(Boolean).join(' ') || (kind === 'bike' ? 'Your bike' : 'Your car')}</p>
                    <p className="text-[12px] font-semibold text-slate-500">{SEGMENT_LABEL[category] || category}</p>
                  </div>
                  {!customBrandMode && brand && (
                    <button onClick={() => go('brand')} className="text-[13px] font-bold text-[#D32F2F] shrink-0">Change</button>
                  )}
                </div>
              </div>

              {(customBrandMode || !brand) && (
                <div>
                  <label className="app-label">Brand</label>
                  <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder={kind === 'bike' ? 'Royal Enfield' : 'Porsche'} className="app-input" />
                </div>
              )}
              {(customBrandMode || kind === 'bike' || !models.includes(model)) && (
                <div>
                  <label className="app-label">Model</label>
                  <input value={model} onChange={(e) => setModel(e.target.value)} placeholder={kind === 'bike' ? 'Classic 350' : 'Cayenne'} className="app-input" autoFocus={!!brand} />
                </div>
              )}
              <div>
                <label className="app-label">Number plate (optional)</label>
                <input value={regNo} onChange={(e) => setRegNo(e.target.value.toUpperCase())} placeholder="GJ06AB1234" className="app-input font-display font-bold tracking-wider uppercase" />
              </div>
              <div>
                <label className="app-label">Year (optional)</label>
                <select value={year} onChange={(e) => setYear(e.target.value)} className="app-input">
                  <option value="">Select year</option>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <p className="text-[12px] text-slate-500 flex items-start gap-1.5">
                <Check size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                Prices in the app are shown for your vehicle's type, worked out from the brand and model.
              </p>
            </div>
          )}
        </div>
      </div>

      {step === 'details' && (
        <div className="border-t border-slate-200 bg-white pb-safe">
          <div className="mx-auto max-w-md px-4 py-3">
            <button onClick={save} disabled={isPending || !brand.trim() || !model.trim()} className="app-btn-primary w-full">
              {isPending ? <Loader2 size={18} className="animate-spin" /> : null}
              {editVehicle ? 'Save changes' : kind === 'bike' ? 'Add bike' : 'Add car'}
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
