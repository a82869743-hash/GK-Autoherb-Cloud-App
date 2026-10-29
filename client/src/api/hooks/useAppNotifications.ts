import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../axiosInstance';
import { useAuthStore } from '../../store/authStore';

export type AppNotification = { id: number; title: string; body: string; url: string | null; event: string | null; is_read: number; created_at: string };

export const useUnreadNotifications = () => {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['app-notifications', 'unread'],
    enabled: !!token,
    queryFn: async () => Number((await api.get('/app-notifications/unread-count')).data.unread) || 0,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
};

export const useAppNotifications = (enabled = true) =>
  useQuery({
    queryKey: ['app-notifications', 'list'],
    enabled,
    queryFn: async (): Promise<AppNotification[]> => (await api.get('/app-notifications', { params: { limit: 50 } })).data.data || [],
    refetchOnWindowFocus: true,
  });

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => api.post(`/app-notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['app-notifications'] }),
  });
};

export const useMarkAllNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => api.post('/app-notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['app-notifications'] }),
  });
};
