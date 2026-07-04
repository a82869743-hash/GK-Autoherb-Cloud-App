import { useQuery } from '@tanstack/react-query';
import api from '../axiosInstance';

interface ReportParams {
  from_date: string;
  to_date: string;
  format?: 'json' | 'xlsx' | 'pdf';
}

export function useSalesReport(params: ReportParams) {
  return useQuery({
    queryKey: ['report-sales', params],
    queryFn: () => api.get('/api/reports/sales', { params }).then(r => r.data),
    enabled: !!params.from_date && !!params.to_date,
  });
}

export function useInventoryReport() {
  return useQuery({
    queryKey: ['report-inventory'],
    queryFn: () => api.get('/api/reports/inventory').then(r => r.data),
  });
}

export function useJobCardReport(params: { from_date?: string; to_date?: string; status?: string; staff_id?: string }) {
  return useQuery({
    queryKey: ['report-jobcards', params],
    queryFn: () => api.get('/api/reports/job-cards', { params }).then(r => r.data),
    enabled: !!params.from_date && !!params.to_date,
  });
}

export function downloadReport(type: 'sales' | 'inventory' | 'job-cards', params: any, format: 'xlsx' | 'pdf') {
  return api.get(`/api/reports/${type}`, {
    params: { ...params, format },
    responseType: 'blob',
  }).then(res => {
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_report.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  });
}
