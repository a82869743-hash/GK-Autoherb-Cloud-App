/**
 * ─── USER PACKAGES HOOKS ────────────────────────────────────
 * React Query hooks for customer package subscriptions.
 * Updated to match production schema (no is_active, no total_count in DB).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../axiosInstance';

/** Fetch the customer's active package (with usage data) */
export const useActivePackage = (userId?: number) =>
  useQuery({
    queryKey: ['user-packages', 'active', userId],
    queryFn: async () => {
      const params = userId ? { user_id: userId } : {};
      const res = await api.get('/user-packages/active', { params });
      return res.data.data;
    },
  });

/** Fetch full package subscription history */
export const usePackageHistory = (userId?: number) =>
  useQuery({
    queryKey: ['user-packages', 'history', userId],
    queryFn: async () => {
      const params = userId ? { user_id: userId } : {};
      const res = await api.get('/user-packages/history', { params });
      return res.data.data;
    },
  });

/** Admin: assign a package to a customer (POST /packages/assign) */
export const useAssignPackage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { user_id: number; package_id: number }) => {
      const res = await api.post('/packages/assign', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-packages'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
