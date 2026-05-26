import { supabase } from './supabaseClient';

export interface ExchangeRates {
  usd: number;   // Bs por 1 USD  (tasa BCV)
  eur: number;   // Bs por 1 EUR  (tasa BCV)
  fetchedAt: number; // timestamp ms
}

// ── Cache de 24 horas (una consulta al día, igual que el BCV) ────────────────
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
let _cache: ExchangeRates | null = null;

/**
 * Obtiene las tasas BCV (USD y EUR en Bolívares) a través de la
 * Edge Function `get-bcv-rates` que hace el fetch a ve.dolarapi.com.
 *
 * Usa caché en memoria de 24 h para no redundar llamadas.
 * El front-end nunca toca ve.dolarapi.com directamente (sin CORS).
 */
export async function fetchExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now();

  if (_cache && now - _cache.fetchedAt < CACHE_TTL_MS) {
    return _cache;
  }

  const { data, error } = await supabase.functions.invoke<{
    usd: number;
    eur: number;
    fetchedAt: string;
    error?: string;
  }>('get-bcv-rates');

  if (error) {
    throw new Error(`Error al consultar tasas BCV: ${error.message}`);
  }

  if (!data || typeof data.usd !== 'number' || typeof data.eur !== 'number') {
    throw new Error('Respuesta inesperada de get-bcv-rates.');
  }

  _cache = { usd: data.usd, eur: data.eur, fetchedAt: now };
  return _cache;
}

/** Fuerza un refresh limpiando el caché en memoria. */
export function clearExchangeRateCache(): void {
  _cache = null;
}
