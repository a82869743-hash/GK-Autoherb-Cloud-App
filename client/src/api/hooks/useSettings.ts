import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../axiosInstance';

export const useSettings = () =>
  useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data;
    },
  });

export const usePublicSettings = () =>
  useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => {
      const res = await api.get('/settings/public');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

export const useUpdateSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      const res = await api.patch('/settings', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ['public-settings'] });
    },
  });
};
