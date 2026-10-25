import { useState } from 'react';
import { Car, Plus, Star, Trash2, Pencil, CheckCircle2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import AddCarModal from '../../components/shared/AddCarModal';
import CarImage from '../../components/shared/CarImage';
import { useActiveVehicle } from '../../api/hooks/useCustomerApp';
import { SEGMENT_LABEL, segmentForVehicle } from '../../utils/pricing';
import { AppPageHeader, EmptyBlock, Skeleton } from '../../components/customer/ui';
import { useUIStore } from '../../store/uiStore';
import api from '../../api/axiosInstance';

export default function VehiclesPage() {
  const toast = useUIStore((s) => s.toast);
  const qc = useQueryClient();
  const { vehicles, active, setActiveVehicle, isLoading } = useActiveVehicle();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['customer-vehicles'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const setPrimary = async (id: number) => {
    try {
      await api.patch(`/vehicles/${id}/primary`);
      toast('success', 'Primary car updated');
      refresh();
    } catch (err: any) {
      toast('error', err.response?.data?.error || 'Failed to update');
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Remove this car from your garage?')) return;
    try {
      await api.delete(`/vehicles/${id}`);
      toast('success', 'Car removed');
      refresh();
    } catch (err: any) {
      toast('error', err.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div>
      <AppPageHeader
        title="My Garage"
        right={
          <button onClick={() => setAdding(true)} className="app-btn h-10 px-3.5 bg-[#111] text-white text-[13px]">
            <Plus size={16} /> Add car
          </button>
        }
      />

      <div className="mt-2 space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
          </>
        ) : vehicles.length === 0 ? (
          <EmptyBlock
            icon={<Car size={26} />}
            title="No cars yet"
            text="Add your car to see its exact prices and book faster."
            action={<button onClick={() => setAdding(true)} className="app-btn-primary px-6">Add your car</button>}
          />
        ) : (
          vehicles.map((v: any) => {
            const isActive = active?.id === v.id;
            return (
              <div key={v.id} className={`app-card overflow-hidden ${isActive ? 'ring-2 ring-[#D32F2F]' : ''}`}>
                <div className="relative bg-white">
                  <CarImage brand={v.brand} model={v.model} containerClassName="h-44 w-full" className="w-full h-full object-contain p-3" />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    {!!v.is_primary && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#111] text-white px-2.5 py-1 text-[11px] font-bold"><Star size={11} className="fill-white" /> Primary</span>
                    )}
                    <span className="rounded-full bg-slate-100 text-slate-700 px-2.5 py-1 text-[11px] font-bold">{SEGMENT_LABEL[segmentForVehicle(v)]}</span>
                  </div>
                </div>
                <div className="p-4 border-t border-slate-100">
                  <p className="font-display text-lg font-extrabold text-slate-900">{v.brand} {v.model}</p>
                  <p className="text-sm text-slate-500">{[v.registration_no, v.car_year].filter(Boolean).join(' · ') || 'Add registration number'}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setActiveVehicle(v.id); toast('success', `Showing prices for ${v.model}`); }}
                      disabled={isActive}
                      className={`app-btn h-10 ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-800'}`}
                    >
                      {isActive ? <><CheckCircle2 size={15} /> Selected</> : 'Use for booking'}
                    </button>
                    {!v.is_primary ? (
                      <button onClick={() => setPrimary(v.id)} className="app-btn h-10 bg-white border border-slate-200 text-slate-800"><Star size={15} /> Make primary</button>
                    ) : (
                      <button onClick={() => setEditing(v)} className="app-btn h-10 bg-white border border-slate-200 text-slate-800"><Pencil size={15} /> Edit</button>
                    )}
                  </div>
                  <div className="mt-2 flex justify-between">
                    {!v.is_primary && <button onClick={() => setEditing(v)} className="text-[13px] font-semibold text-slate-500 flex items-center gap-1"><Pencil size={13} /> Edit</button>}
                    <button onClick={() => remove(v.id)} className="ml-auto text-[13px] font-semibold text-red-500 flex items-center gap-1"><Trash2 size={13} /> Remove</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <AddCarModal
        isOpen={adding || !!editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
          refresh();
        }}
        editVehicle={editing}
      />
    </div>
  );
}
