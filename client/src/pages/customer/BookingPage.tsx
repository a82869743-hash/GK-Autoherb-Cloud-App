import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check, Calendar, Clock, Car, Sparkles, Loader2 } from 'lucide-react';
import { useSlots } from '../../api/hooks/useSlots';
import { useCreateBooking } from '../../api/hooks/useBookings';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useUIStore } from '../../store/uiStore';
import { formatTime } from '../../utils/formatters';
import { useBrands, useModels } from '../../api/hooks/useVehicles';
import api from '../../api/axiosInstance';

const STEPS = ['Service', 'Vehicle', 'Date', 'Time', 'Confirm'];

export default function BookingPage() {
  const toast = useUIStore((s) => s.toast);
  const [searchParams] = useSearchParams();
  const createMut = useCreateBooking();

  const [step, setStep] = useState(0);
  const [filter, setFilter] = useState('all');

  // Step 1: Service/Package
  const [services, setServices] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [activePackages, setActivePackages] = useState<any[]>([]);

  // Step 2: Vehicle
  const [userVehicles, setUserVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [manualEntry, setManualEntry] = useState(false);

  // Step 2: Vehicle
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [regNo, setRegNo] = useState('');

  // Step 3: Date
  const [selectedDate, setSelectedDate] = useState('');
  const [calMonth, setCalMonth] = useState(new Date());

  // Step 4: Time
  const { data: slotsData, isLoading: slotsLoading } = useSlots({ date: selectedDate || undefined });

  // Step 5: Confirm
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [bookingResult, setBookingResult] = useState<any>(null);

  // Autocomplete data
  const { data: brandsRes } = useBrands();
  const { data: modelsRes } = useModels(brand);

  // Load services, packages, vehicles
  useEffect(() => {
    (async () => {
      try {
        const [svcRes, pkgRes, myVehiclesRes, activePkgRes] = await Promise.all([
          api.get('/services').catch(() => ({ data: { data: [] } })),
          api.get('/packages').catch(() => ({ data: { data: [] } })),
          api.get('/vehicles/my-vehicles').catch(() => ({ data: { data: [] } })),
          api.get('/user-packages/active').catch(() => ({ data: { data: [] } })),
        ]);
        setServices(svcRes.data.data || []);
        setPackages(pkgRes.data.data || []);
        
        const fetchedVehicles = myVehiclesRes.data.data || [];
        setUserVehicles(fetchedVehicles);
        
        // Auto-select primary car (or only car) if available
        if (fetchedVehicles.length > 0) {
          const primary = fetchedVehicles.find((v: any) => v.is_primary) || fetchedVehicles[0];
          setSelectedVehicleId(primary.id);
          setBrand(primary.brand);
          setModel(primary.model);
          setRegNo(primary.registration_no || '');
        } else {
          setManualEntry(true);
        }

        // activePkgRes.data.data is a single object or null
        const actPkg = activePkgRes.data.data;
        setActivePackages(actPkg ? [actPkg] : []);
      } catch {} finally { setServicesLoading(false); }
    })();
  }, []);

  useEffect(() => {
    const sid = searchParams.get('service_id');
    const pid = searchParams.get('package_id');
    if (sid) setSelectedServices([parseInt(sid)]);
    if (pid) setSelectedPackage(parseInt(pid));
  }, [searchParams]);

  const canNext = useMemo(() => {
    switch (step) {
      case 0: return selectedServices.length > 0 || selectedPackage !== null;
      case 1: return brand.trim().length > 0 && model.trim().length > 0;
      case 2: return selectedDate.length > 0;
      case 3: return selectedSlot !== null;
      default: return true;
    }
  }, [step, selectedServices, selectedPackage, brand, model, selectedDate, selectedSlot]);

  const selectedServicesObjs = services.filter((s) => selectedServices.includes(s.id));
  const selectedPackageObj = activePackages.find((p) => p.package_id === selectedPackage) || packages.find((p) => p.id === selectedPackage);

  // ─── Calendar helpers ───────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const calDays = useMemo(() => {
    const y = calMonth.getFullYear();
    const m = calMonth.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(y, m, i));
    return days;
  }, [calMonth]);

  const handleBook = async () => {
    try {
      const res = await createMut.mutateAsync({
        slot_id: selectedSlot.id,
        service_ids: selectedServices.length > 0 ? selectedServices : undefined,
        package_id: selectedPackage || undefined,
        vehicle_id: selectedVehicleId || undefined,
        vehicle_brand: brand,
        vehicle_model: model,
        vehicle_reg_no: regNo || undefined,
        vehicle_category: filter !== 'all' ? filter : undefined,
      });
      setBookingResult(res);
    } catch (err: any) {
      console.error('BOOKING ERROR:', err);
      toast('error', err?.response?.data?.error || 'Booking failed');
    }
  };

  // ─── Success screen ─────────────────────
  if (bookingResult) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
          <Check size={36} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-extrabold text-[#1c1b1b] mb-2">Booking Requested!</h2>
        <p className="text-sm text-[#5f5e5e] mb-1">Your appointment request has been submitted for approval.</p>
        <p className="text-xs text-[#5f5e5e] mb-6">Reference: <span className="font-bold">#{bookingResult.data?.id}</span></p>
        <div className="bg-white rounded-lg p-6 shadow-sm max-w-sm w-full text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#5f5e5e]">Service(s)</span>
            <span className="font-bold text-right ml-4">
              {selectedServicesObjs.length > 0 ? selectedServicesObjs.map(s => s.name).join(', ') : (selectedPackageObj?.package_name || selectedPackageObj?.name)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#5f5e5e]">Date</span>
            <span className="font-bold">{new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#5f5e5e]">Time</span>
            <span className="font-bold">{formatTime(selectedSlot.start_time)} – {formatTime(selectedSlot.end_time)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#5f5e5e]">Vehicle</span>
            <span className="font-bold">{brand} {model}</span>
          </div>
        </div>
        <Button className="mt-6" onClick={() => window.location.reload()}>
          Book Another
        </Button>
      </div>
    );
  }

  return (
    <div className="pt-4 max-w-2xl mx-auto">
      {/* Progress Stepper */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-extrabold transition-colors ${
              i < step ? 'bg-[#D32F2F] text-white' : i === step ? 'bg-[#D32F2F] text-white ring-4 ring-red-100' : 'bg-[#f6f3f2] text-[#5f5e5e]'
            }`}>
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`hidden sm:block w-12 md:w-20 h-0.5 mx-1 ${i < step ? 'bg-[#D32F2F]' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      <h3 className="text-lg font-extrabold text-[#1c1b1b] uppercase tracking-wide mb-6">{STEPS[step]}</h3>

      {/* ═══ Step 0: Select Service ═══ */}
      {step === 0 && (
        <div>
          {/* Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            {['all', 'hatchback', 'medium_hatchback', 'sedan', 'premium_sedan', 'suv'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                  filter === f ? 'bg-[#1c1b1b] text-white' : 'bg-[#f6f3f2] text-[#5f5e5e] hover:bg-[#e5e2e1]'
                }`}
              >
                {f === 'all' ? 'All' : f === 'medium_hatchback' ? 'Med Hatch' : f === 'premium_sedan' ? 'Prem Sedan' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {servicesLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#D32F2F]" /></div>
          ) : (
            <div className="space-y-6">
              {services.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e] mb-3">Services</p>
                  <div className="grid gap-3">
                    {services.filter(s => s.is_active).map((svc) => {
                      const isSelected = selectedServices.includes(svc.id);
                      return (
                        <button
                          key={svc.id}
                          onClick={() => {
                            setSelectedServices(prev => prev.includes(svc.id) ? prev.filter(id => id !== svc.id) : [...prev, svc.id]);
                            setSelectedPackage(null);
                          }}
                          className={`text-left p-4 rounded-lg border-2 transition-all ${
                            isSelected ? 'border-[#D32F2F] bg-red-50/30' : 'border-gray-100 bg-white hover:border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-[#1c1b1b]">{svc.name}</p>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-[#D32F2F] border-[#D32F2F]' : 'border-gray-300'}`}>
                              {isSelected && <Check size={12} className="text-white" />}
                            </div>
                          </div>
                        {svc.description && <p className="text-xs text-[#5f5e5e] mt-1 line-clamp-2">{svc.description}</p>}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-[#5f5e5e]">
                          {filter === 'all' ? (
                            <>
                              <span>Hatch: ₹{svc.price_hatchback}</span>
                              <span>Med Hatch: ₹{svc.price_medium_hatchback}</span>
                              <span>Sedan: ₹{svc.price_sedan}</span>
                              <span>Prem Sedan: ₹{svc.price_premium_sedan}</span>
                              <span>SUV: ₹{svc.price_suv}</span>
                            </>
                          ) : (
                            <span className="font-bold text-[#D32F2F]">₹{svc[`price_${filter}`]}</span>
                          )}
                        </div>
                      </button>
                    )})}
                  </div>
                </div>
              )}

              {activePackages.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e] mb-3">Your Active Packages</p>
                  <div className="grid gap-3">
                    {activePackages.map((pkg) => (
                      <button
                        key={pkg.id}
                        onClick={() => { setSelectedPackage(pkg.package_id); setSelectedServices([]); }}
                        className={`text-left p-4 rounded-lg border-2 transition-all ${
                          selectedPackage === pkg.package_id ? 'border-[#D32F2F] bg-red-50/30' : 'border-gray-100 bg-white hover:border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles size={14} className="text-[#D32F2F]" />
                          <p className="font-bold text-[#1c1b1b]">{pkg.package_name}</p>
                          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded uppercase">Active</span>
                        </div>
                        <div className="flex flex-col gap-1 mt-2 text-xs text-[#5f5e5e]">
                          {pkg.usage && pkg.usage.map((u: any) => (
                            <span key={u.service_name}>{u.remaining} {u.service_name} left</span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {packages.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e] mb-3">Buy a Package</p>
                  <div className="grid gap-3">
                    {packages.filter(p => p.is_active || p.is_published).map((pkg) => (
                      <button
                        key={pkg.id}
                        onClick={() => { setSelectedPackage(pkg.id); setSelectedServices([]); }}
                        className={`text-left p-4 rounded-lg border-2 transition-all ${
                          selectedPackage === pkg.id ? 'border-[#D32F2F] bg-red-50/30' : 'border-gray-100 bg-white hover:border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles size={14} className="text-[#D32F2F]" />
                          <p className="font-bold text-[#1c1b1b]">{pkg.name}</p>
                        </div>
                        {pkg.description && <p className="text-xs text-[#5f5e5e] mt-1 line-clamp-2">{pkg.description}</p>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!services.length && !packages.length && (
                <p className="text-center py-8 text-[#5f5e5e]">No services available yet. Please check back later.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ Step 1: Vehicle Details ═══ */}
      {step === 1 && (
        <div className="bg-white rounded-lg p-6 shadow-sm space-y-4">
          {/* Vehicle dropdown — shown when user has saved vehicles */}
          {userVehicles.length > 0 && !manualEntry && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e] mb-2">Select Your Vehicle</p>
              <select
                value={selectedVehicleId || ''}
                onChange={(e) => {
                  const vid = parseInt(e.target.value);
                  const v = userVehicles.find((veh: any) => veh.id === vid);
                  if (v) {
                    setSelectedVehicleId(v.id);
                    setBrand(v.brand);
                    setModel(v.model);
                    setRegNo(v.registration_no || '');
                  }
                }}
                className="w-full px-4 py-3.5 bg-[#f6f3f2] border border-transparent rounded-lg text-[#1c1b1b] font-medium focus:ring-2 focus:ring-[#D32F2F]/20 focus:bg-white focus:border-[#D32F2F]/30 transition-all duration-200 appearance-none cursor-pointer"
              >
                {userVehicles.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    🚗 {v.brand} {v.model} {v.registration_no ? `(${v.registration_no})` : ''} {v.is_primary ? '★ Primary' : ''}
                  </option>
                ))}
              </select>

              {/* Link to switch to manual entry */}
              <button
                type="button"
                onClick={() => { setManualEntry(true); setSelectedVehicleId(null); setBrand(''); setModel(''); setRegNo(''); }}
                className="mt-3 text-xs font-bold text-[#D32F2F] hover:underline"
              >
                + Enter vehicle details manually
              </button>
            </div>
          )}

          {/* Manual entry — shown when no saved vehicles or user chose manual */}
          {(manualEntry || userVehicles.length === 0) && (
            <div className="space-y-4">
              {userVehicles.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setManualEntry(false);
                    const primary = userVehicles.find((v: any) => v.is_primary) || userVehicles[0];
                    setSelectedVehicleId(primary.id);
                    setBrand(primary.brand);
                    setModel(primary.model);
                    setRegNo(primary.registration_no || '');
                  }}
                  className="text-xs font-bold text-[#D32F2F] hover:underline mb-2"
                >
                  ← Back to saved vehicles
                </button>
              )}
              <Input label="Car Brand" placeholder="e.g. Hyundai" value={brand} onChange={(e) => setBrand(e.target.value)} listOptions={brandsRes?.data} />
              <Input label="Car Model" placeholder="e.g. Creta" value={model} onChange={(e) => setModel(e.target.value)} listOptions={modelsRes?.data} />
              <Input label="Registration No (Optional)" placeholder="e.g. GJ01AB1234" value={regNo} onChange={(e) => setRegNo(e.target.value.toUpperCase())} />
            </div>
          )}
        </div>
      )}

      {/* ═══ Step 2: Select Date ═══ */}
      {step === 2 && (
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1))} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft size={18} />
            </button>
            <span className="font-bold text-[#1c1b1b]">
              {calMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1))} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="text-center text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e] py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calDays.map((d, i) => {
              if (!d) return <div key={i} />;
              const dateStr = d.toISOString().split('T')[0];
              const isPast = d < today;
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === today.toISOString().split('T')[0];

              return (
                <button
                  key={i}
                  disabled={isPast}
                  onClick={() => { setSelectedDate(dateStr); setSelectedSlot(null); }}
                  className={`p-2 rounded-lg text-sm font-medium text-center transition-all ${
                    isPast ? 'text-gray-300 cursor-not-allowed' :
                    isSelected ? 'bg-[#D32F2F] text-white font-bold' :
                    isToday ? 'bg-red-50 text-[#D32F2F] font-bold' :
                    'hover:bg-[#f6f3f2] text-[#1c1b1b]'
                  }`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Step 3: Select Time Slot ═══ */}
      {step === 3 && (
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <p className="text-xs text-[#5f5e5e] mb-4">
            Available slots for <span className="font-bold text-[#1c1b1b]">{new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </p>

          {slotsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#D32F2F]" /></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(slotsData?.data || []).filter((s: any) => !s.is_blocked).map((slot: any) => {
                let isFull = slot.booked_count >= slot.max_capacity;
                const isSelected = selectedSlot?.id === slot.id;
                
                // Filter out past slots for today
                const isToday = selectedDate === today.toISOString().split('T')[0];
                if (isToday) {
                  const [hour, minute] = slot.start_time.split(':').map(Number);
                  const now = new Date();
                  if (hour < now.getHours() || (hour === now.getHours() && minute <= now.getMinutes())) {
                    isFull = true; // Mark as disabled
                  }
                }

                return (
                  <button
                    key={slot.id}
                    disabled={isFull}
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-3 rounded-lg text-center transition-all border-2 ${
                      isSelected ? 'bg-[#D32F2F] text-white border-[#D32F2F]' :
                      isFull ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed' :
                      'bg-white border-gray-100 hover:border-[#D32F2F] text-[#1c1b1b]'
                    }`}
                  >
                    <p className={`text-sm font-bold ${isSelected ? 'text-white' : ''}`}>
                      {formatTime(slot.start_time)}
                    </p>
                    <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-white/80' : 'text-[#5f5e5e]'}`}>
                      {isFull ? 'Fully Booked' : `${slot.max_capacity - slot.booked_count} spots left`}
                    </p>
                  </button>
                );
              })}
              {(slotsData?.data || []).filter((s: any) => !s.is_blocked).length === 0 && (
                <p className="col-span-full text-center py-8 text-[#5f5e5e]">No slots available on this date</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ Step 4: Confirm ═══ */}
      {step === 4 && (
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#5f5e5e] mb-4">Booking Summary</p>

          <div className="space-y-3 text-sm mb-6">
            <div className="flex items-center gap-3 py-2 border-b border-gray-50">
              <Sparkles size={16} className="text-[#D32F2F] shrink-0" />
              <span className="text-[#5f5e5e]">Service(s)</span>
              <span className="ml-auto font-bold text-[#1c1b1b] text-right ml-4">
                {selectedServicesObjs.length > 0 ? selectedServicesObjs.map(s => s.name).join(', ') : (selectedPackageObj?.package_name || selectedPackageObj?.name)}
              </span>
            </div>
            <div className="flex items-center gap-3 py-2 border-b border-gray-50">
              <Car size={16} className="text-[#D32F2F] shrink-0" />
              <span className="text-[#5f5e5e]">Vehicle</span>
              <span className="ml-auto font-bold text-[#1c1b1b]">{brand} {model} {regNo && `(${regNo})`}</span>
            </div>
            <div className="flex items-center gap-3 py-2 border-b border-gray-50">
              <Calendar size={16} className="text-[#D32F2F] shrink-0" />
              <span className="text-[#5f5e5e]">Date</span>
              <span className="ml-auto font-bold text-[#1c1b1b]">{new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </div>
            <div className="flex items-center gap-3 py-2">
              <Clock size={16} className="text-[#D32F2F] shrink-0" />
              <span className="text-[#5f5e5e]">Time</span>
              <span className="ml-auto font-bold text-[#1c1b1b]">{formatTime(selectedSlot?.start_time)} – {formatTime(selectedSlot?.end_time)}</span>
            </div>
          </div>

          <Button className="w-full" onClick={handleBook} loading={createMut.isPending}>
            Confirm Booking
          </Button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6 pb-8">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep(step - 1)} icon={<ChevronLeft size={14} />}>Back</Button>
        ) : <div />}
        {step < 4 && (
          <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
            Next <ChevronRight size={14} className="ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
