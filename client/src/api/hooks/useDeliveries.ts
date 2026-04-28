import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../axiosInstance';

export const useDeliveries = (params?: { status?: string }) =>
  useQuery({
    queryKey: ['deliveries', params],
    queryFn: async () => {
      const res = await api.get('/deliveries', { params });
      return res.data;
    },
  });

export const useDelivery = (id: number | undefined) =>
  useQuery({
    queryKey: ['delivery', id],
    queryFn: async () => {
      const res = await api.get(`/deliveries/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

export const useActiveDelivery = () =>
  useQuery({
    queryKey: ['delivery', 'active'],
    queryFn: async () => {
      const res = await api.get('/deliveries/active');
      return res.data.data;
    },
  });

export const useMyDelivery = () =>
  useQuery({
    queryKey: ['delivery', 'my'],
    queryFn: async () => {
      const res = await api.get('/deliveries/my');
      return res.data.data;
    },
  });

export const useStartDelivery = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { job_cart_id: number }) => {
      const res = await api.post('/deliveries', payload);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deliveries'] }),
  });
};

export const useCompleteDelivery = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await api.patch(`/deliveries/${id}/complete`);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deliveries'] }),
  });
};
