import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../axiosInstance';

export interface Coupon {
  id: number;
  code: string;
  title: string;
  type: 'percentage' | 'fixed';
  value: number;
  max_discount: number | null;
  min_order_amount: number;
  applicable_services?: string | number[] | null;
  applicable_packages?: string | number[] | null;
  valid_from?: string | null;
  valid_to?: string | null;
  total_usage_limit?: number | null;
  per_customer_limit: number;
  first_time_only: number | boolean;
  is_active: number | boolean;
  redemption_count?: number;
  total_savings_granted?: number;
  created_at: string;
}

export function useCoupons(params?: { search?: string; status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['coupons', params],
    queryFn: async () => {
      const res = await api.get('/coupons', { params });
      return res.data;
    },
  });
}

export function useActiveOffers() {
  return useQuery({
    queryKey: ['coupons', 'active'],
    queryFn: async () => {
      const res = await api.get('/coupons/active');
      return res.data?.data || [];
    },
  });
}

export function useValidateCoupon() {
  return useMutation({
    mutationFn: async (payload: {
      code: string;
      order_amount: number;
      service_ids?: number[];
      package_ids?: number[];
      customer_id?: number;
    }) => {
      const res = await api.post('/coupons/validate', payload);
      return res.data?.data;
    },
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Coupon>) => {
      const res = await api.post('/coupons', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Coupon> }) => {
      const res = await api.put(`/coupons/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });
}

export function useToggleCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await api.patch(`/coupons/${id}/toggle`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/coupons/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
  });
}

export function useCouponRedemptions(id: number) {
  return useQuery({
    queryKey: ['coupons', id, 'redemptions'],
    queryFn: async () => {
      const res = await api.get(`/coupons/${id}/redemptions`);
      return res.data?.data || [];
    },
    enabled: Boolean(id),
  });
}

export function useShareCoupon() {
  return useMutation({
    mutationFn: async (payload: { coupon_id: number; customer_ids?: number[]; send_to_all?: boolean }) => {
      const res = await api.post('/coupons/share', payload);
      return res.data;
    },
  });
}
