import { useState } from 'react';
import { Plus, CheckCircle2, Trash2, ChevronDown } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { BottomSheet } from './ui';
import CarImage from '../shared/CarImage';
import AddCarModal from '../shared/AddCarModal';
import { useActiveVehicle } from '../../api/hooks/useCustomerApp';
import { SEGMENT_LABEL, segmentForVehicle } from '../../utils/pricing';
import api from '../../api/axiosInstance';
import { useUIStore } from '../../store/uiStore';

/** Hoora-style "Select Vehicle" bottom sheet. */
export function VehicleSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useUIStore((s) => s.toast);
  const qc = useQueryClient();
  const { vehicles, active, setActiveVehicle } = useActiveVehicle();
  const [adding, setAdding] = useState(false);

  const remove = async (id: number) => {
    if (!confirm('Remove this vehicle from your garage?')) return;
    try {
      await api.delete(`/vehicles/${id}`);
      qc.invalidateQueries({ queryKey: ['customer-vehicles'] });
      toast('success', 'Vehicle removed');
    } catch (err: any) {
      toast('error', err?.response?.data?.error || 'Could not remove vehicle');
    }
  };

  return (
    <>
      <BottomSheet
        open={open && !adding}
        onClose={onClose}
        title={
          <span className="flex items-center justify-between gap-3 w-full">
            Select Vehicle
          </span>
        }
      >
        <button onClick={() => setAdding(true)} className="app-btn-outline w-full mb-4">
          <Plus size={18} /> Add New Vehicle
        </button>
        {vehicles.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No vehicles yet — add your car to see prices for it.</p>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Saved vehicles</p>
            <div className="divide-y divide-slate-100">
              {vehicles.map((v) => {
                const selected = active?.id === v.id;
                return (
                  <div key={v.id} className="flex items-center gap-3 py-3">
                    <button
                      className="flex-1 flex items-center gap-3 text-left"
                      onClick={() => {
                        setActiveVehicle(v.id);
                        onClose();
                      }}
                    >
                      <CarImage brand={v.brand} model={v.model} containerClassName="h-12 w-20 shrink-0 rounded-lg bg-white" className="w-full h-full object-contain" />
                      <span className="min-w-0">
                        <span className={`block font-display font-bold truncate ${selected ? 'text-[#C62828]' : 'text-slate-900'}`}>
                          {v.model}, <span className="font-semibold">{v.brand}</span>
                        </span>
                        <span className="block text-xs text-slate-500">
                          {SEGMENT_LABEL[segmentForVehicle(v)]}{v.registration_no ? ` · ${v.registration_no}` : ''}
                        </span>
                      </span>
                    </button>
                    {selected && <CheckCircle2 size={22} className="text-[#D32F2F] shrink-0" />}
                    <button onClick={() => remove(v.id)} className="h-9 w-9 rounded-lg text-red-500 hover:bg-red-50 flex items-center justify-center" aria-label="Remove vehicle">
                      <Trash2 size={17} />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </BottomSheet>
      <AddCarModal
        isOpen={adding}
        onClose={() => {
          setAdding(false);
          qc.invalidateQueries({ queryKey: ['customer-vehicles'] });
        }}
      />
    </>
  );
}

/** Top-right chip showing the active car (tap to switch). */
export function VehicleChip({ dark = false }: { dark?: boolean }) {
  const { active } = useActiveVehicle();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-2 rounded-xl pl-2.5 pr-2 py-1.5 max-w-[170px] ${dark ? 'bg-white/95 shadow-app' : 'bg-white shadow-app'}`}
      >
        <span className="min-w-0 text-right">
          <span className="block font-display text-[13px] font-bold text-slate-900 truncate leading-tight">{active ? active.model : 'Add vehicle'}</span>
          <span className="block text-[11px] text-slate-500 truncate leading-tight">{active ? active.brand : 'for exact prices'}</span>
        </span>
        {active ? (
          <CarImage brand={active.brand} model={active.model} containerClassName="h-8 w-12 shrink-0" className="w-full h-full object-contain" />
        ) : (
          <ChevronDown size={16} className="text-slate-500" />
        )}
      </button>
      <VehicleSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
