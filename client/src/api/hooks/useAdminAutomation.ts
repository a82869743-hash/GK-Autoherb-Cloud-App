/** Admin hooks: WhatsApp inbox & bot, greetings module, loyalty rewards, job pipeline. */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../axiosInstance';

// ─── WhatsApp inbox / provider ───────────────────────────
export const useWhatsAppInbox = (params: { category?: string; status?: string; search?: string }) =>
  useQuery({
    queryKey: ['wa-inbox', params],
    queryFn: async () => (await api.get('/whatsapp/inbox', { params })).data as { data: any[]; counts: any[] },
    refetchInterval: 20_000,
  });

export const useUpdateInbox = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: number; status?: string; category?: string }) => (await api.patch(`/whatsapp/inbox/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wa-inbox'] }),
  });
};

export const useReplyInbox = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, message }: { id: number; message: string }) => (await api.post(`/whatsapp/inbox/${id}/reply`, { message })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wa-inbox'] }),
  });
};

export const useSimulateIncoming = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { phone: string; message: string }) => (await api.post('/whatsapp/simulate-incoming', body)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa-inbox'] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
};

export const useWhatsAppProviderStatus = () =>
  useQuery({
    queryKey: ['wa-provider'],
    queryFn: async () => (await api.get('/whatsapp/provider-status')).data.data,
  });

// ─── Greetings ───────────────────────────────────────────
export const useGreetingCampaigns = () =>
  useQuery({ queryKey: ['greeting-campaigns'], queryFn: async () => (await api.get('/greetings/campaigns')).data.data as any[] });

export const useSaveGreetingCampaign = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: any) =>
      id ? (await api.put(`/greetings/campaigns/${id}`, body)).data : (await api.post('/greetings/campaigns', body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['greeting-campaigns'] }),
  });
};

export const useDeleteGreetingCampaign = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/greetings/campaigns/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['greeting-campaigns'] }),
  });
};

export const useUpcomingOccasions = (days = 30) =>
  useQuery({
    queryKey: ['greetings-upcoming', days],
    queryFn: async () => (await api.get('/greetings/upcoming', { params: { days } })).data as { data: any[]; totals: any },
  });

export const useSendGreeting = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { customer_id: number; occasion: string; message?: string; campaign_id?: number }) => (await api.post('/greetings/send', body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['greetings-upcoming'] });
      qc.invalidateQueries({ queryKey: ['greeting-logs'] });
    },
  });
};

export const useGreetingLogs = () =>
  useQuery({ queryKey: ['greeting-logs'], queryFn: async () => (await api.get('/greetings/logs')).data.data as any[] });

// ─── Loyalty rewards (admin) ─────────────────────────────
export const useAdminRewards = () =>
  useQuery({ queryKey: ['loyalty-rewards', 'admin'], queryFn: async () => (await api.get('/loyalty/rewards')).data as { data: any[]; settings: any } });

export const useSaveReward = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: any) => (id ? (await api.put(`/loyalty/rewards/${id}`, body)).data : (await api.post('/loyalty/rewards', body)).data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loyalty-rewards'] }),
  });
};

export const useDeleteReward = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/loyalty/rewards/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loyalty-rewards'] }),
  });
};

export const useRedemptions = (status?: string) =>
  useQuery({
    queryKey: ['loyalty-redemptions', status],
    queryFn: async () => (await api.get('/loyalty/redemptions', { params: { status } })).data.data as any[],
  });

export const useUpdateRedemption = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => (await api.patch(`/loyalty/redemptions/${id}`, { status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loyalty-redemptions'] }),
  });
};

// ─── Job pipeline ────────────────────────────────────────
export const useStageDefinitions = () =>
  useQuery({ queryKey: ['job-stage-defs'], queryFn: async () => (await api.get('/job-carts/meta/stages')).data.data as any[], staleTime: Infinity });

export const useUpdateJobStage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage, note, notify }: { id: number; stage: string; note?: string; notify?: boolean }) =>
      (await api.patch(`/job-carts/${id}/stage`, { stage, note, notify })).data,
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['job-stages', v.id] });
      qc.invalidateQueries({ queryKey: ['job-carts'] });
    },
  });
};
