import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../axiosInstance';
import { toast } from 'react-hot-toast';

export const useWhatsAppMessages = (params?: { customer_id?: string; status?: string; message_type?: string; page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['whatsapp-messages', params],
    queryFn: async () => {
      const { data } = await api.get('/whatsapp', { params });
      return data;
    },
  });
};

export const useWhatsAppStats = () => {
  return useQuery({
    queryKey: ['whatsapp-stats'],
    queryFn: async () => {
      const { data } = await api.get('/whatsapp/stats');
      return data;
    },
  });
};

export const useSendWhatsApp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { phone: string; message: string; customer_id?: string }) => {
      const { data } = await api.post('/whatsapp/send-manual', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('WhatsApp message sent successfully');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-stats'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to send WhatsApp message');
    },
  });
};

export const useWhatsAppTemplates = () => {
  return useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: async () => {
      const { data } = await api.get('/whatsapp/templates');
      return data.data || [];
    },
  });
};

export const useUpdateWhatsAppTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body, ...rest }: { id: number; body?: string; is_active?: boolean; provider_template_name?: string; send_sms?: boolean }) => {
      // The API field is message_body (sending "body" silently saved nothing)
      const { data } = await api.put(`/whatsapp/templates/${id}`, { ...rest, ...(body !== undefined ? { message_body: body } : {}) });
      return data;
    },
    onSuccess: () => {
      toast.success('Template updated successfully');
      qc.invalidateQueries({ queryKey: ['whatsapp-templates'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update template');
    },
  });
};

export const useTestWhatsAppTemplate = () => {
  return useMutation({
    mutationFn: async ({ id, recipient_number, variables }: { id: number; recipient_number: string; variables?: Record<string, string> }) => {
      const { data } = await api.post('/whatsapp/templates/test-send', { phone: recipient_number, template_id: id, variables });
      return data;
    },
    onSuccess: () => {
      toast.success('Test message dispatched successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to send test message');
    },
  });
};

export const useRetryWhatsAppNotification = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post(`/whatsapp/notifications/${id}/retry`);
      return data;
    },
    onSuccess: () => {
      toast.success('Notification retry queued');
      qc.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      qc.invalidateQueries({ queryKey: ['whatsapp-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to retry notification');
    },
  });
};
