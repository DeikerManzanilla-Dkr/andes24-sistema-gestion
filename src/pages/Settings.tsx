import { FC, useEffect, useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabaseClient';
import { useRealtimeSignals } from '../context/RealtimeProvider';
import { useExchangeRates } from '../context/ExchangeRateContext';

// ─── BCV Rate Banner ─────────────────────────────────────────────────────────
const BcvRateBanner: FC = () => {
  const { rates, isLoadingRates, ratesError, refreshRates } = useExchangeRates();

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600/10 to-emerald-600/10 border border-blue-200 dark:border-blue-800/50 mb-6">
      <span className="text-lg">🏦</span>
      <div className="flex-1 min-w-0">
        {isLoadingRates ? (
          <span className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
            Consultando tasa BCV...
          </span>
        ) : ratesError ? (
          <span className="text-sm text-red-500 dark:text-red-400">
            Error al obtener tasas BCV — {ratesError}
          </span>
        ) : rates ? (
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            <span className="text-blue-700 dark:text-blue-400 font-semibold">Tasa BCV hoy:</span>
            {'  '}$ 1 = <span className="font-bold">{rates.usd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</span>
            <span className="mx-2 text-gray-400">|</span>
            € 1 = <span className="font-bold">{rates.eur.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</span>
          </span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={refreshRates}
        title="Actualizar tasas"
        className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm"
      >
        ↺
      </button>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const Settings: FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { signals } = useRealtimeSignals();
  const { rates } = useExchangeRates();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [plans, setPlans] = useState<
    Array<{
      id: string;
      name: string;
      price_eur: number | null;
      price_usd: number | null;
      coverage_details: any;
      created_at: string;
    }>
  >([]);

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const selectedPlan = useMemo(() => {
    return plans.find((p) => p.id === selectedPlanId) ?? null;
  }, [plans, selectedPlanId]);

  const [name, setName] = useState('');
  const [priceUsd, setPriceUsd] = useState<string>('');
  const [priceEur, setPriceEur] = useState<string>('');
  const [coverageThings, setCoverageThings] = useState<string>('');
  const [coveragePersons, setCoveragePersons] = useState<string>('');

  // ── Auto-calculate USD from EUR using BCV rates ───────────────────────────
  useEffect(() => {
    if (!rates || !priceEur.trim()) {
      // Don't wipe USD if EUR is cleared, just skip auto-calc
      return;
    }
    const eurValue = parseFloat(priceEur);
    if (isNaN(eurValue) || eurValue <= 0) return;

    // EUR → USD using BCV rates: (EUR_rate / USD_rate)
    const usdValue = (rates.eur / rates.usd) * eurValue;
    setPriceUsd(usdValue.toFixed(2));
  }, [priceEur, rates]);

  // ── Auto-calculate EUR from USD using BCV rates ───────────────────────────
  useEffect(() => {
    if (!rates || !priceUsd.trim()) {
      // Don't wipe EUR if USD is cleared, just skip auto-calc
      return;
    }
    const usdValue = parseFloat(priceUsd);
    if (isNaN(usdValue) || usdValue <= 0) return;

    // USD → EUR using BCV rates: (USD_rate / EUR_rate)
    const eurValue = (rates.usd / rates.eur) * usdValue;
    setPriceEur(eurValue.toFixed(2));
  }, [priceUsd, rates]);

  // ── Equivalente en Bs (read-only display) ────────────────────────────────
  const equivalenteBs = useMemo(() => {
    if (!rates || !priceEur.trim()) return null;
    const eurValue = parseFloat(priceEur);
    if (isNaN(eurValue) || eurValue <= 0) return null;
    return (eurValue * rates.eur).toFixed(2);
  }, [priceEur, rates]);

  const loadPlans = async () => {
    setIsLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('plans')
      .select('id, name, price_eur, price_usd, coverage_details, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
      setPlans([]);
      setIsLoading(false);
      return;
    }

    setPlans(data ?? []);
    setIsLoading(false);
  };

  const resetForm = () => {
    setSelectedPlanId(null);
    setName('');
    setPriceUsd('');
    setPriceEur('');
    setCoverageThings('');
    setCoveragePersons('');
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    const p = plans.find((x) => x.id === planId);
    if (!p) return;

    setName(p.name ?? '');
    // Load stored values; the useEffect will auto-recalculate USD from EUR
    setPriceEur(String(p.price_eur ?? ''));
    setPriceUsd(String(p.price_usd ?? ''));
    setCoverageThings(String(p.coverage_details?.things ?? ''));
    setCoveragePersons(String(p.coverage_details?.persons ?? ''));
  };

  const handleUpsert = async () => {
    if (!name.trim()) return;
    setIsLoading(true);
    setError(null);

    const payload = {
      name: name.trim(),
      price_usd: priceUsd.trim() ? Number(priceUsd) : 0,
      price_eur: priceEur.trim() ? Number(priceEur) : 0,
      coverage_details: {
        things: coverageThings.trim() ? Number(coverageThings) : 0,
        persons: coveragePersons.trim() ? Number(coveragePersons) : 0,
      },
      updated_at: new Date().toISOString(),
    };

    const query = selectedPlanId
      ? supabase.from('plans').update(payload).eq('id', selectedPlanId)
      : supabase.from('plans').insert(payload);

    const { error } = await query;
    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    await loadPlans();
    resetForm();
    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!selectedPlanId) return;
    setIsLoading(true);
    setError(null);

    const { error } = await supabase.from('plans').delete().eq('id', selectedPlanId);
    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    await loadPlans();
    resetForm();
    setIsLoading(false);
  };

  useEffect(() => {
    void loadPlans();
  }, [signals.plans]);

  return (
    <div className="container mx-auto">
      <style>{`
        @media print {
          /* Hide unnecessary elements */
          .no-print {
            display: none !important;
          }
          /* Show only the price list table */
          .print-only {
            display: block !important;
          }
          /* Hide form inputs and buttons */
          input, button, .grid, .flex.gap-2 {
            display: none !important;
          }
          /* Show only the table */
          table {
            display: table !important;
          }
          /* Hide the BCV banner */
          .bg-gradient-to-r {
            display: none !important;
          }
          /* Hide dark mode toggle */
          .border-b:last-of-type {
            display: none !important;
          }
          /* Show the list section */
          .mt-6 {
            display: block !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
      <h1 className="text-2xl font-bold mb-6 dark:text-white no-print">Configuración</h1>

      {/* BCV Rate Banner */}
      <BcvRateBanner />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="max-w-xl">
          {/* Dark mode toggle */}
          <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Modo oscuro</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Cambia entre modo claro y oscuro</p>
            </div>
            <div className="relative inline-block w-12 align-middle select-none">
              <input
                type="checkbox"
                name="toggle"
                id="toggle"
                checked={isDarkMode}
                onChange={toggleTheme}
                className="sr-only"
              />
              <label
                htmlFor="toggle"
                className={`block overflow-hidden h-6 rounded-full cursor-pointer ${isDarkMode ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
              >
                <span
                  className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'
                    }`}
                />
              </label>
            </div>
          </div>

          {/* Plans section */}
          <div className="py-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Planes (RCV)</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Configura precios y coberturas para la emisión</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  🖨️ Imprimir
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  Nuevo
                </button>
              </div>
            </div>

            {error && <div className="mb-3 text-sm text-red-600 dark:text-red-400 no-print">{error}</div>}

            <div className="grid grid-cols-1 gap-3 no-print">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* EUR and USD (bidirectional calculation) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Costo EUR
                  </label>
                  <input
                    type="number"
                    value={priceEur}
                    onChange={(e) => setPriceEur(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Costo USD
                  </label>
                  <input
                    type="number"
                    value={priceUsd}
                    onChange={(e) => setPriceUsd(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Equivalente en Bs — read-only */}
              {equivalenteBs !== null && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
                  <span className="text-emerald-600 dark:text-emerald-400 text-sm">🇻🇪</span>
                  <span className="text-sm text-emerald-800 dark:text-emerald-300">
                    Equivalente en Bs hoy:{' '}
                    <strong>
                      {parseFloat(equivalenteBs).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                    </strong>
                  </span>
                </div>
              )}

              {/* Coverage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cobertura Cosas</label>
                  <input
                    type="number"
                    value={coverageThings}
                    onChange={(e) => setCoverageThings(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cobertura Personas</label>
                  <input
                    type="number"
                    value={coveragePersons}
                    onChange={(e) => setCoveragePersons(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => void handleUpsert()}
                  disabled={isLoading || !name.trim()}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {isLoading ? 'Guardando...' : selectedPlan ? 'Actualizar' : 'Crear'}
                </button>

                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={isLoading || !selectedPlanId}
                  className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60"
                >
                  Eliminar
                </button>
              </div>
            </div>

            {/* Plans table */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 no-print">Listado</h4>
              <h4 className="text-lg font-bold text-gray-900 mb-4 print-only hidden">Lista de Precios - Planes RCV</h4>
              {isLoading && plans.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
              ) : plans.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">No hay planes aún.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600 dark:text-gray-300">
                        <th className="py-2">Plan</th>
                        <th className="py-2">EUR</th>
                        <th className="py-2">USD</th>
                        <th className="py-2">Bs hoy</th>
                        <th className="py-2">Cosas</th>
                        <th className="py-2">Personas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {plans.map((p) => {
                        const bsValue = rates && p.price_eur
                          ? (p.price_eur * rates.eur).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : '—';
                        return (
                          <tr
                            key={p.id}
                            className={`text-gray-800 dark:text-gray-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 ${selectedPlanId === p.id ? 'bg-gray-50 dark:bg-gray-700/30' : ''
                              }`}
                            onClick={() => handleSelectPlan(p.id)}
                          >
                            <td className="py-2 pr-3 font-medium">{p.name}</td>
                            <td className="py-2 pr-3">€ {p.price_eur ?? 0}</td>
                            <td className="py-2 pr-3">$ {p.price_usd ?? 0}</td>
                            <td className="py-2 pr-3 text-emerald-600 dark:text-emerald-400 font-medium">{bsValue} Bs</td>
                            <td className="py-2 pr-3">{p.coverage_details?.things ?? 0}</td>
                            <td className="py-2">{p.coverage_details?.persons ?? 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};