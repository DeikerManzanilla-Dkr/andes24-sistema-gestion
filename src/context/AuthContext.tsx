import { createContext, useContext, useEffect, useMemo, useState, type FC, type PropsWithChildren } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: FC<PropsWithChildren> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = async () => {
    await supabase.auth.signOut();
    // Redirigir a login después de cerrar sesión usando SPA
    if (window.location.pathname !== '/login') {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) {
        console.error('Error getting session:', error);
        setSession(null);
        setLoading(false);
        // NO redirigir automáticamente en caso de error - dejar que App.tsx maneje la redirección
        return;
      }
      setSession(data.session);
      setLoading(false);
    };

    void init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      console.log('Auth state change:', _event, nextSession ? 'session exists' : 'no session');
      setSession(nextSession);
      setLoading(false);

      // Solo redirigir en casos claros usando SPA para evitar loops
      if (_event === 'SIGNED_OUT') {
        if (window.location.pathname !== '/login') {
          window.history.pushState({}, '', '/login');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      } else if (_event === 'SIGNED_IN' || _event === 'INITIAL_SESSION') {
        if (nextSession && window.location.pathname === '/login') {
          window.history.pushState({}, '', '/dashboard');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ session, loading, signOut }), [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
