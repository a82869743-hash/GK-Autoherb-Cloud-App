import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../axiosInstance';

export type MediaRole = 'gallery' | 'before' | 'after' | 'process';

export interface ServiceMedia {
  id: number;
  service_id: number;
  media_type: 'image' | 'video';
  media_role: MediaRole;
  url: string;
  thumbnail_url?: string | null;
  external_url?: string | null;
}

export interface ProductBrand {
  id: number;
  name: string;
  tagline?: string | null;
  logo_url?: string | null;
  applies_to: 'ppf' | 'ceramic' | 'both';
  warranty_note?: string | null;
  sort_order: number;
  is_active: number;
}

/** Before / after photos and process video of one service. */
export const useServiceMedia = (serviceId?: number | null) =>
  useQuery({
    queryKey: ['service-media', serviceId],
    enabled: !!serviceId,
    queryFn: async (): Promise<ServiceMedia[]> => (await api.get(`/services/${serviceId}/media`)).data.data || [],
    staleTime: 5 * 60_000,
  });

export const useUploadServiceMedia = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ serviceId, file, role, url }: { serviceId: number; file?: File; role: MediaRole; url?: string }) => {
      const fd = new FormData();
      if (file) fd.append('file', file);
      if (url) fd.append('external_url', url);
      fd.append('media_role', role);
      if (!file && url && /\.(mp4|webm|mov)(\?|$)|youtu/i.test(url)) fd.append('media_type', 'video');
      return (await api.post(`/services/${serviceId}/media`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['service-media', v.serviceId] }),
  });
};

export const useDeleteServiceMedia = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ serviceId, mediaId }: { serviceId: number; mediaId: number }) => (await api.delete(`/services/${serviceId}/media/${mediaId}`)).data,
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['service-media', v.serviceId] }),
  });
};

/** PPF / ceramic brands the studio uses. */
export const useProductBrands = (kind?: 'ppf' | 'ceramic', includeInactive = false) =>
  useQuery({
    queryKey: ['product-brands', kind || 'all', includeInactive],
    queryFn: async (): Promise<ProductBrand[]> =>
      (await api.get('/product-brands', { params: { kind, all: includeInactive ? 1 : undefined } })).data.data || [],
    staleTime: 10 * 60_000,
  });

export const useSaveProductBrand = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file, ...fields }: Partial<ProductBrand> & { file?: File }) => {
      const fd = new FormData();
      Object.entries(fields).forEach(([k, v]) => v !== undefined && v !== null && fd.append(k, String(v)));
      if (file) fd.append('file', file);
      const cfg = { headers: { 'Content-Type': 'multipart/form-data' } };
      return id ? (await api.put(`/product-brands/${id}`, fd, cfg)).data : (await api.post('/product-brands', fd, cfg)).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-brands'] }),
  });
};

export const useDeleteProductBrand = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/product-brands/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-brands'] }),
  });
};

/** Which coating family a service belongs to (for showing the right brands). */
export function coatingKind(service: any): 'ppf' | 'ceramic' | null {
  const t = `${service?.name || ''} ${service?.category_name || ''}`.toLowerCase();
  if (/\bwash\b/.test(t)) return null; // e.g. "Ceramic Wash" is a wash, not a coating
  if (/\bppf\b|paint protection|protection film/.test(t)) return 'ppf';
  if (/ceramic|graphene|coating|9h/.test(t)) return 'ceramic';
  return null;
}
