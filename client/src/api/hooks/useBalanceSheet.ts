import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../axiosInstance';

export function useBalanceSheet(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['balance-sheet', params],
    queryFn: async () => {
      const { data } = await api.get('/balance-sheet', { params });
      return data.data;
    },
  });
}

export function useExpenses(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: async () => {
      const { data } = await api.get('/balance-sheet/expenses', { params });
      return data;
    },
  });
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const { data } = await api.get('/balance-sheet/expense-categories');
      return data.data;
    },
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/balance-sheet/expenses', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['balance-sheet'] });
    },
  });
}

export async function downloadBalanceSheet(params: { from?: string; to?: string; format: 'xlsx' | 'pdf' }) {
  const res = await api.get('/balance-sheet/export', {
    params,
    responseType: 'blob'
  });
  const blob = new Blob([res.data], {
    type: params.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BalanceSheet_${params.from || 'all'}_to_${params.to || 'all'}.${params.format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

