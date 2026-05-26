import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRealtimeSignals } from '../context/RealtimeProvider';
import type { ReminderRow, ReminderItem } from '../types/database';

type UseRemindersResult = {
  reminders: ReminderItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markDone: (id: string) => Promise<void>;
};

export const useReminders = (limit = 10): UseRemindersResult => {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { signals } = useRealtimeSignals();

  const nowIso = useMemo(() => new Date().toISOString(), []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: selectError } = await supabase
      .from('seguimientos')
      .select('id,cliente_id,tipo,descripcion,proxima_accion_date,realizado,created_at,clients(name)')
      .eq('realizado', false)
      .lte('proxima_accion_date', nowIso)
      .order('proxima_accion_date', { ascending: true })
      .limit(limit);

    if (selectError) {
      setError(selectError.message);
      setReminders([]);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as unknown as ReminderRow[];

    const mapped: ReminderItem[] = rows.map((r) => {
      const client = Array.isArray(r.clients) ? r.clients[0] : r.clients;
      const clientName = client?.name ?? 'Cliente';
      const description = r.descripcion ?? '';

      return {
        id: r.id,
        clientName,
        type: r.tipo,
        description,
        dueAt: r.proxima_accion_date,
      };
    });

    setReminders(mapped);
    setLoading(false);
  }, [limit, nowIso]);

  const markDone = useCallback(
    async (id: string) => {
      const { error: updateError } = await supabase.from('seguimientos').update({ realizado: true }).eq('id', id);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      await refresh();
    },
    [refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh, signals.seguimientos]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refresh();
    }, 5 * 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  return { reminders, loading, error, refresh, markDone };
};
