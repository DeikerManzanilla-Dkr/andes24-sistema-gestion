import { useMemo } from 'react';

export type PolicyStatus = 'active' | 'expired' | 'cancelled' | 'expiring-soon';

export const usePolicyStatus = (endDate: string, currentStatus: string) => {
  return useMemo(() => {
    const today = new Date();
    const end = new Date(endDate);
    const daysUntilExpiry = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (currentStatus === 'cancelled') return 'cancelled';
    if (end < today) return 'expired';
    if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) return 'expiring-soon';
    return 'active';
  }, [endDate, currentStatus]);
};

export const getPolicyStatusInfo = (status: PolicyStatus) => {
  switch (status) {
    case 'active':
      return { label: 'ACTIVA', color: 'bg-green-100 text-green-800' };
    case 'expired':
      return { label: 'VENCIDA', color: 'bg-red-100 text-red-800' };
    case 'cancelled':
      return { label: 'CANCELADA', color: 'bg-gray-100 text-gray-800' };
    case 'expiring-soon':
      return { label: 'POR VENCER', color: 'bg-amber-100 text-amber-800' };
  }
};
