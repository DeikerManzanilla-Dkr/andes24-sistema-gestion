import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type PropsWithChildren,
} from 'react';
import { fetchExchangeRates, type ExchangeRates } from '../lib/exchangeRates';

interface ExchangeRateState {
  /** BCV rates: usd = Bs per 1 USD, eur = Bs per 1 EUR. Null while loading. */
  rates: { usd: number; eur: number } | null;
  isLoadingRates: boolean;
  ratesError: string | null;
  /** Manually trigger a refresh (bypasses cache). */
  refreshRates: () => void;
}

const ExchangeRateContext = createContext<ExchangeRateState | null>(null);

export const useExchangeRates = (): ExchangeRateState => {
  const ctx = useContext(ExchangeRateContext);
  if (!ctx) throw new Error('useExchangeRates must be used within ExchangeRateProvider');
  return ctx;
};

const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 horas — BCV publica una vez al día

export const ExchangeRateProvider: FC<PropsWithChildren> = ({ children }) => {
  const [rates, setRates] = useState<{ usd: number; eur: number } | null>(null);
  const [isLoadingRates, setIsLoadingRates] = useState(true);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const refreshTokenRef = useRef(0);

  const load = async (token: number) => {
    setIsLoadingRates(true);
    setRatesError(null);
    try {
      const result: ExchangeRates = await fetchExchangeRates();
      if (!mountedRef.current || refreshTokenRef.current !== token) return;
      setRates({ usd: result.usd, eur: result.eur });
    } catch (err: unknown) {
      if (!mountedRef.current || refreshTokenRef.current !== token) return;
      setRatesError(err instanceof Error ? err.message : 'Error al obtener tasas BCV');
    } finally {
      if (mountedRef.current && refreshTokenRef.current === token) {
        setIsLoadingRates(false);
      }
    }
  };

  const refreshRates = () => {
    const token = ++refreshTokenRef.current;
    void load(token);
  };

  useEffect(() => {
    mountedRef.current = true;
    const token = ++refreshTokenRef.current;
    void load(token);

    const interval = setInterval(() => {
      const t = ++refreshTokenRef.current;
      void load(t);
    }, REFRESH_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<ExchangeRateState>(
    () => ({ rates, isLoadingRates, ratesError, refreshRates }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rates, isLoadingRates, ratesError]
  );

  return (
    <ExchangeRateContext.Provider value={value}>
      {children}
    </ExchangeRateContext.Provider>
  );
};
