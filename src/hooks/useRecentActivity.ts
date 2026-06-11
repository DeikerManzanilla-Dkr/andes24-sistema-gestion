import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRealtimeSignals } from '../context/RealtimeProvider';
import { useAuth } from '../context/AuthContext';

export type RecentActivityItem = {
  id: string;
  title: string;
  description: string;
  created_at: string;
  kind: 'contract';
};

type UseRecentActivityResult = {
  activities: RecentActivityItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export const useRecentActivity = (limit = 5): UseRecentActivityResult => {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  const [activities, setActivities] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { signals } = useRealtimeSignals();

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const isGlobalUser = userEmail === 'proven@gmail.com';

    let query = supabase
      .from('contracts')
      .select('id,policy_number,status,issued_at,created_at,clients(name),vehicles(plate,brand,model,year)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!isGlobalUser) {
      query = query.eq('user_id', userId);
    }

    const { data, error: selectError } = await query;

    if (selectError) {
      setError(selectError.message);
      setActivities([]);
      setLoading(false);
      return;
    }

    const mapped: RecentActivityItem[] = (data ?? []).map((row: any) => {
      const clientName = row?.clients?.name ?? 'Cliente';
      const plate = row?.vehicles?.plate ?? '';
      const brand = row?.vehicles?.brand ?? '';
      const model = row?.vehicles?.model ?? '';
      const year = row?.vehicles?.year ? String(row.vehicles.year) : '';

      const vehicleLabel = [brand, model, year].filter(Boolean).join(' ');
      const vehiclePart = [plate, vehicleLabel].filter(Boolean).join(' - ');

      const title = row?.status === 'cancelled' ? 'Póliza cancelada' : 'Nueva póliza creada';
      const description = [clientName, vehiclePart].filter(Boolean).join(' - ');

      return {
        id: row.id,
        title,
        description,
        created_at: row.created_at,
        kind: 'contract',
      };
    });

    setActivities(mapped);
    setLoading(false);
  }, [limit, userId, userEmail]);

  useEffect(() => {
    void refresh();
  }, [refresh, signals.contracts]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refresh();
    }, 5 * 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  return { activities, loading, error, refresh };
};
