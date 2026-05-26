import { createContext, useContext, useEffect, useMemo, useRef, useState, type FC, type PropsWithChildren } from 'react';
import { supabase } from '../lib/supabaseClient';

export type RealtimeTables = 'clients' | 'vehicles' | 'contracts' | 'seguimientos' | 'plans' | 'documents' | 'document_overlays';

export type RealtimeSignals = Record<RealtimeTables, number>;

type RealtimeContextValue = {
  signals: RealtimeSignals;
  bumpAll: () => void;
};

const defaultSignals: RealtimeSignals = {
  clients: 0,
  vehicles: 0,
  contracts: 0,
  seguimientos: 0,
  plans: 0,
  documents: 0,
  document_overlays: 0,
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export const useRealtimeSignals = (): RealtimeContextValue => {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtimeSignals must be used within RealtimeProvider');
  return ctx;
};

export const RealtimeProvider: FC<PropsWithChildren> = ({ children }) => {
  const [signals, setSignals] = useState<RealtimeSignals>(defaultSignals);
  const mountedRef = useRef(true);

  const bumpAll = useMemo(() => {
    return () => {
      if (!mountedRef.current) return;
      setSignals((prev) => {
        const next: RealtimeSignals = { ...prev };
        (Object.keys(next) as RealtimeTables[]).forEach((k) => {
          next[k] = next[k] + 1;
        });
        return next;
      });
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-master')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => setSignals((p) => ({ ...p, clients: p.clients + 1 })))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => setSignals((p) => ({ ...p, vehicles: p.vehicles + 1 })))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, () => setSignals((p) => ({ ...p, contracts: p.contracts + 1 })))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seguimientos' }, () => setSignals((p) => ({ ...p, seguimientos: p.seguimientos + 1 })))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, () => setSignals((p) => ({ ...p, plans: p.plans + 1 })))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => setSignals((p) => ({ ...p, documents: p.documents + 1 })))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_overlays' }, () => setSignals((p) => ({ ...p, document_overlays: p.document_overlays + 1 })))
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const value = useMemo<RealtimeContextValue>(() => ({ signals, bumpAll }), [signals, bumpAll]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
};
