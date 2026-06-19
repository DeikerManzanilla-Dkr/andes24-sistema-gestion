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
    try {
      // 1. Intentamos cerrar la sesión en el servidor de Supabase
      const { error } = await supabase.auth.signOut();

      // Si hay error (como el 403 session_not_found), lo registramos pero NO detenemos la ejecución
      if (error) {
        console.warn("Aviso de Supabase al cerrar sesión (ignorable):", error.message);
      }
    } catch (err) {
      console.error("Error inesperado ejecutando el logout:", err);
    } finally {
      // 2. LO MÁS IMPORTANTE: Forzamos la limpieza local pase lo que pase

      // Limpiamos los tokens cacheados por Supabase en el Local Storage
      for (const key in localStorage) {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key);
        }
      }

      // 3. Limpiamos el estado local
      setSession(null);

      // 4. Redirigimos al usuario a la pantalla de login de inmediato
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
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
