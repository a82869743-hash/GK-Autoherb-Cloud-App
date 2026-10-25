/**
 * Hooks for the customer mobile app: profile, saved addresses, active vehicle,
 * booking cancel / reschedule, loyalty rewards & vouchers, warranties.
 */
import { useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../axiosInstance';
import { useGarageStore } from '../../store/garageStore';
import { segmentForVehicle, Segment } from '../../utils/pricing';

// ─── Profile ─────────────────────────────────────────────
export interface CustomerAddress {
  id: number;
  label: 'home' | 'work' | 'other';
  label_name?: string | null;
  house_no?: string | null;
  area?: string | null;
  address: string;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  receiver_name?: string | null;
  receiver_phone?: string | null;
  is_default: number;
}

export interface CustomerProfile {
  id: number;
  name: string;
  mobile: string;
  email?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  date_of_birth?: string | null;
  anniversary_date?: string | null;
  profile_photo_url?: string | null;
  opt_out_promotional?: number;
  whatsapp_opt_in?: number;
  referral_code?: string | null;
  addresses: CustomerAddress[];
  vehicle_count: number;
  profile_complete: boolean;
  missing_fields: string[];
}

export const useCustomerProfile = (enabled = true) =>
  useQuery<CustomerProfile>({
    queryKey: ['customer-profile'],
    queryFn: async () => (await api.get('/customer-profile')).data.data,
    enabled,
    staleTime: 30_000,
  });

export const useUpdateCustomerProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<CustomerProfile>) => (await api.put('/customer-profile', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer-profile'] }),
  });
};

export const useUploadProfilePhoto = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dataUrl: string) => (await api.post('/customer-profile/photo', { image: dataUrl })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer-profile'] }),
  });
};

export const useRemoveProfilePhoto = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.delete('/customer-profile/photo')).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer-profile'] }),
  });
};

export const useSaveAddress = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CustomerAddress> & { id?: number }) =>
      id ? (await api.put(`/customer-profile/addresses/${id}`, payload)).data : (await api.post('/customer-profile/addresses', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-profile'] });
      qc.invalidateQueries({ queryKey: ['customer-addresses'] });
    },
  });
};

export const useSetDefaultAddress = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.patch(`/customer-profile/addresses/${id}/default`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer-profile'] }),
  });
};

export const useDeleteAddress = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/customer-profile/addresses/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer-profile'] }),
  });
};

export const useMyWarranties = () =>
  useQuery({
    queryKey: ['my-warranties'],
    queryFn: async () => (await api.get('/customer-profile/warranties')).data.data as any[],
  });

/** Resize a picked image in the browser so uploads stay small (square-ish, max 512px). */
export function fileToResizedDataUrl(file: File, max = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported image'));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

// ─── Garage / active vehicle ─────────────────────────────
export interface GarageVehicle {
  id: number;
  brand: string;
  model: string;
  registration_no?: string | null;
  category?: string | null;
  is_primary?: number;
  car_year?: number | null;
}

export const useGarage = () =>
  useQuery<GarageVehicle[]>({
    // Nested under 'customer-vehicles' so every existing invalidation refreshes the header chip too
    queryKey: ['customer-vehicles', 'garage'],
    queryFn: async () => {
      const body = (await api.get('/vehicles/my-vehicles')).data;
      return Array.isArray(body?.data) ? body.data : [];
    },
  });

/** The vehicle chip in the header: chosen car, else primary, else first. */
export function useActiveVehicle() {
  const { data: vehicles = [], isLoading } = useGarage();
  const { activeVehicleId, setActiveVehicle } = useGarageStore();
  const active = useMemo(
    () => vehicles.find((v) => v.id === activeVehicleId) || vehicles.find((v) => v.is_primary) || vehicles[0] || null,
    [vehicles, activeVehicleId]
  );
  useEffect(() => {
    if (!isLoading && activeVehicleId && !vehicles.some((v) => v.id === activeVehicleId)) setActiveVehicle(null);
  }, [isLoading, vehicles, activeVehicleId, setActiveVehicle]);
  const segment: Segment = segmentForVehicle(active);
  return { vehicles, active, segment, setActiveVehicle, isLoading };
}

// ─── Booking cancel / reschedule ─────────────────────────
export const useCancelBookingWithReason = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) => (await api.patch(`/bookings/${id}/cancel`, { reason })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['customer-dashboard'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useRescheduleBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, slot_id }: { id: number; slot_id: number }) => (await api.patch(`/bookings/${id}/reschedule`, { slot_id })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['customer-dashboard'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['slots'] });
    },
  });
};

export const useConfirmAttendance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.patch(`/bookings/${id}/confirm-attendance`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
};

export const useDaySlots = (date?: string) =>
  useQuery({
    queryKey: ['slots', 'day', date],
    queryFn: async () => (await api.get('/slots', { params: { date } })).data.data as any[],
    enabled: !!date,
  });

// ─── Loyalty rewards ─────────────────────────────────────
export const useRewardsCatalog = () =>
  useQuery({
    queryKey: ['loyalty-rewards'],
    queryFn: async () => (await api.get('/loyalty/rewards')).data as { data: any[]; settings: any },
  });

export const useMyVouchers = () =>
  useQuery({
    queryKey: ['loyalty-vouchers'],
    queryFn: async () => (await api.get('/loyalty/mine/vouchers')).data.data as any[],
  });

export const useRedeemReward = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rewardId: number) => (await api.post(`/loyalty/rewards/${rewardId}/redeem`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loyalty'] });
      qc.invalidateQueries({ queryKey: ['loyalty-vouchers'] });
      qc.invalidateQueries({ queryKey: ['loyalty-history'] });
      qc.invalidateQueries({ queryKey: ['customer-dashboard'] });
    },
  });
};

// ─── Live job tracker ────────────────────────────────────
export const useJobStages = (jobId?: number) =>
  useQuery({
    queryKey: ['job-stages', jobId],
    queryFn: async () => (await api.get(`/job-carts/${jobId}/stages`)).data.data,
    enabled: !!jobId,
    refetchInterval: 30_000,
  });
