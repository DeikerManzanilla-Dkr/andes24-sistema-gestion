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
    // Redirigir a login después de cerrar sesión
    window.location.href = '/login';
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) {
        setSession(null);
        setLoading(false);
        // Si hay error de sesión, redirigir a login
        window.location.href = '/login';
        return;
      }
      setSession(data.session);
      setLoading(false);
    };

    void init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setLoading(false);
      
      // Redirecciones automáticas según estado
      if (_event === 'SIGNED_IN' && nextSession) {
        // Si ya está en login, redirigir al dashboard
        if (window.location.pathname === '/login') {
          window.location.href = '/dashboard';
        }
      } else if (_event === 'SIGNED_OUT') {
        window.location.href = '/login';
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
