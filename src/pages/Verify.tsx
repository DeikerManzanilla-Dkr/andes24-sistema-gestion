import { FC, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export const Verify: FC = () => {
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const policyNumber = searchParams.get('policy');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<null | {
    policy_number: string;
    status: string;
    start_date: string;
    end_date: string;
    client: { name: string; document_id: string; phone: string; address: string | null };
    vehicle: { plate: string; brand: string | null; model: string | null; year: number | null };
  }>(null);

  useEffect(() => {
    const run = async () => {
      if (!policyNumber) return;
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('v_full_contract_details')
        .select(
          'policy_number,status,start_date,end_date,client_name,client_document_id,client_phone,client_address,vehicle_plate,vehicle_brand,vehicle_model,vehicle_year'
        )
        .eq('policy_number', policyNumber)
        .maybeSingle();

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      if (!data) {
        setError('Póliza no encontrada');
        setIsLoading(false);
        return;
      }

      setData({
        policy_number: data.policy_number,
        status: data.status,
        start_date: data.start_date,
        end_date: data.end_date,
        client: {
          name: data.client_name ?? '',
          document_id: data.client_document_id ?? '',
          phone: data.client_phone ?? '',
          address: data.client_address ?? null,
        },
        vehicle: {
          plate: data.vehicle_plate ?? '',
          brand: data.vehicle_brand ?? null,
          model: data.vehicle_model ?? null,
          year: data.vehicle_year ?? null,
        },
      });

      setIsLoading(false);
    };

    void run();
  }, [policyNumber]);

  const isExpired = (endDate: string): boolean => {
    return new Date(endDate) < new Date();
  };

  const getDisplayStatus = (status: string, endDate: string): string => {
    if (status === 'expired' || isExpired(endDate)) {
      return 'EXPIRED';
    }
    return status.toUpperCase();
  };

  const getStatusColor = (status: string, endDate: string): string => {
    if (status === 'expired' || isExpired(endDate)) {
      return 'bg-red-100 text-red-800';
    }
    if (status === 'active') {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-amber-100 text-amber-800';
  };

  return (
    <div className="container mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold mb-2 dark:text-white">Verificación de Póliza</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">Consulta pública por QR</p>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {!policyNumber ? (
          <p className="text-gray-600 dark:text-gray-400">Falta el parámetro <code>policy</code>.</p>
        ) : isLoading ? (
          <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
        ) : error ? (
          <p className="text-red-600 dark:text-red-400">{error}</p>
        ) : !data ? null : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Póliza</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{data.policy_number.replace('VIRT-', 'RCV-')}</div>
              </div>
              <div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(data.status, data.end_date)}`}
                >
                  {getDisplayStatus(data.status, data.end_date)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Titular</div>
                <div className="text-sm text-gray-700 dark:text-gray-300">{data.client.name}</div>
                <div className="text-sm text-gray-700 dark:text-gray-300">{data.client.document_id}</div>
                <div className="text-sm text-gray-700 dark:text-gray-300">{data.client.phone}</div>
                <div className="text-sm text-gray-700 dark:text-gray-300">{data.client.address ?? '-'}</div>
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Vehículo</div>
                <div className="text-sm text-gray-700 dark:text-gray-300">Placa: {data.vehicle.plate}</div>
                <div className="text-sm text-gray-700 dark:text-gray-300">{data.vehicle.brand ?? '-'} {data.vehicle.model ?? '-'}</div>
                <div className="text-sm text-gray-700 dark:text-gray-300">Año: {data.vehicle.year ?? '-'}</div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Vigencia</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">Inicio: {data.start_date}</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">Vence: {data.end_date}</div>
              {isExpired(data.end_date) && (
                <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
                  ⚠️ Esta póliza ha vencido
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
