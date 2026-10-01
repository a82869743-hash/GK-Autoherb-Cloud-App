import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../axiosInstance';

export interface ChatMessage {
  id?: number;
  sender: 'user' | 'bot' | 'admin';
  message: string;
  metadata?: {
    intent?: string;
    actionUrl?: string;
    actionLabel?: string;
    chips?: string[];
    sent_by_admin?: string;
  };
  created_at?: string;
}

export interface ChatConversation {
  id: number;
  session_id: string;
  user_id?: number;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  lead_status: 'active' | 'lead_captured' | 'inquiry_created' | 'closed';
  inquiry_id?: number;
  summary?: string;
  auth_user_name?: string;
  auth_user_mobile?: string;
  message_count?: number;
  last_message?: string;
  last_message_time?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatbotKnowledgeItem {
  id?: number;
  category: string;
  keywords: string;
  question: string;
  answer: string;
  action_url?: string;
  action_label?: string;
  is_active: number | boolean;
  sort_order?: number;
  created_at?: string;
}

export interface ChatbotStats {
  total_conversations: number;
  total_messages: number;
  leads_captured: number;
  active_knowledge_items: number;
}

// ─── Customer Hooks ──────────────────────────────────────────
export function useChatbotSession(sessionId: string | null) {
  return useQuery({
    queryKey: ['chatbot-session', sessionId],
    queryFn: async () => {
      const res = await api.post('/chatbot/session', { session_id: sessionId });
      return res.data?.data;
    },
    staleTime: Infinity,
    enabled: true,
  });
}

export function useSendChatMessage() {
  return useMutation({
    mutationFn: async (payload: { session_id: string; message: string; customer_name?: string; customer_phone?: string }) => {
      const res = await api.post('/chatbot/message', payload);
      return res.data?.data;
    },
  });
}

export function useCaptureChatLead() {
  return useMutation({
    mutationFn: async (payload: {
      session_id: string;
      name?: string;
      mobile: string;
      email?: string;
      vehicle_brand?: string;
      vehicle_model?: string;
      inquiry_notes?: string;
    }) => {
      const res = await api.post('/chatbot/lead', payload);
      return res.data;
    },
  });
}

// ─── Admin Hooks ─────────────────────────────────────────────
export function useAdminChatbotStats() {
  return useQuery<ChatbotStats>({
    queryKey: ['admin-chatbot-stats'],
    queryFn: async () => {
      const res = await api.get('/chatbot/admin/stats');
      return res.data?.data;
    },
    refetchInterval: 10000,
  });
}

export function useAdminChatbotConversations(params?: { status?: string; search?: string; limit?: number; offset?: number }) {
  return useQuery<{ conversations: ChatConversation[]; total: number }>({
    queryKey: ['admin-chatbot-conversations', params],
    queryFn: async () => {
      const res = await api.get('/chatbot/admin/conversations', { params });
      return {
        conversations: res.data?.data || [],
        total: res.data?.pagination?.total || 0,
      };
    },
    refetchInterval: 8000,
  });
}

export function useAdminChatbotMessages(conversationId: number | null) {
  return useQuery<{ conversation: ChatConversation; messages: ChatMessage[] }>({
    queryKey: ['admin-chatbot-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) throw new Error('No conversation selected');
      const res = await api.get(`/chatbot/admin/conversations/${conversationId}`);
      return res.data?.data;
    },
    enabled: !!conversationId,
    refetchInterval: 5000,
  });
}

export function useAdminChatbotReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, message }: { conversationId: number; message: string }) => {
      const res = await api.post(`/chatbot/admin/conversations/${conversationId}/reply`, { message });
      return res.data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['admin-chatbot-messages', variables.conversationId] });
      qc.invalidateQueries({ queryKey: ['admin-chatbot-conversations'] });
    },
  });
}

export function useAdminChatbotKnowledge() {
  return useQuery<ChatbotKnowledgeItem[]>({
    queryKey: ['admin-chatbot-knowledge'],
    queryFn: async () => {
      const res = await api.get('/chatbot/admin/knowledge');
      return res.data?.data || [];
    },
  });
}

export function useAdminSaveKnowledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ChatbotKnowledgeItem>) => {
      const res = await api.post('/chatbot/admin/knowledge', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-chatbot-knowledge'] });
      qc.invalidateQueries({ queryKey: ['admin-chatbot-stats'] });
    },
  });
}

export function useAdminDeleteKnowledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/chatbot/admin/knowledge/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-chatbot-knowledge'] });
      qc.invalidateQueries({ queryKey: ['admin-chatbot-stats'] });
    },
  });
}
