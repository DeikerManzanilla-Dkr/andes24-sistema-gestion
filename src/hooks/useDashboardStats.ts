import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRealtimeSignals } from '../context/RealtimeProvider';

export type DashboardStats = {
  totalClients: number;
  totalVehicles: number;
  activePolicies: number;
  renewalsPending30d: number;
};

type UseDashboardStatsResult = {
  stats: DashboardStats;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const defaultStats: DashboardStats = {
  totalClients: 0,
  totalVehicles: 0,
  activePolicies: 0,
  renewalsPending30d: 0,
};

export const useDashboardStats = (): UseDashboardStatsResult => {
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { signals } = useRealtimeSignals();

  const todayIso = useMemo(() => new Date().toISOString(), []);
  const in30DaysIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString();
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [clientsRes, vehiclesRes, activeContractsRes, renewalsRes] = await Promise.all([
      supabase.from('clients').select('*', { count: 'exact', head: true }),
      supabase.from('vehicles').select('*', { count: 'exact', head: true }),
      supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'active').gte('end_date', todayIso),
      supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('end_date', todayIso)
        .lte('end_date', in30DaysIso),
    ]);

    const firstError = clientsRes.error ?? vehiclesRes.error ?? activeContractsRes.error ?? renewalsRes.error;
    if (firstError) {
      setError(firstError.message);
      setStats(defaultStats);
      setLoading(false);
      return;
    }

    setStats({
      totalClients: clientsRes.count ?? 0,
      totalVehicles: vehiclesRes.count ?? 0,
      activePolicies: activeContractsRes.count ?? 0,
      renewalsPending30d: renewalsRes.count ?? 0,
    });

    setLoading(false);
  }, [in30DaysIso, todayIso]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refresh();
    }, 5 * 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh, signals.clients, signals.vehicles, signals.contracts]);

  return { stats, loading, error, refresh };
};
