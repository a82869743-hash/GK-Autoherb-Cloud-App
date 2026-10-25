import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** The car the customer is currently browsing / booking for (Hoora-style vehicle chip). */
interface GarageStore {
  activeVehicleId: number | null;
  setActiveVehicle: (id: number | null) => void;
}

export const useGarageStore = create<GarageStore>()(
  persist(
    (set) => ({
      activeVehicleId: null,
      setActiveVehicle: (id) => set({ activeVehicleId: id }),
    }),
    { name: 'gk-active-vehicle' }
  )
);
