import { FC, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export const Verification: FC = () => {
  // Extract contractId from URL path
  const pathParts = window.location.pathname.split('/');
  const contractId = pathParts[pathParts.length - 1];

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<null | {
    id: string;
    policy_number: string;
    status: string;
    start_date: string;
    end_date: string;
    client: { name: string; document_id: string; phone: string; address: string | null };
    vehicle: { plate: string; brand: string | null; model: string | null; year: number | null };
    plan: { name: string };
  }>(null);

  useEffect(() => {
    const run = async () => {
      if (!contractId) return;
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          client:clients(name, document_id, phone, address),
          vehicle:vehicles(plate, brand, model, year),
          plan:plans(name)
        `)
        .eq('id', contractId)
        .maybeSingle();

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      if (!data) {
        setError('Contrato no encontrado');
        setIsLoading(false);
        return;
      }

      setData({
        id: data.id,
        policy_number: data.policy_number,
        status: data.status,
        start_date: data.start_date,
        end_date: data.end_date,
        client: {
          name: data.client?.name ?? '',
          document_id: data.client?.document_id ?? '',
          phone: data.client?.phone ?? '',
          address: data.client?.address ?? null,
        },
        vehicle: {
          plate: data.vehicle?.plate ?? '',
          brand: data.vehicle?.brand ?? null,
          model: data.vehicle?.model ?? null,
          year: data.vehicle?.year ?? null,
        },
        plan: {
          name: data.plan?.name ?? '',
        },
      });

      setIsLoading(false);
    };

    void run();
  }, [contractId]);

  const isExpired = (endDate: string): boolean => {
    return new Date(endDate) < new Date();
  };

  const getDisplayStatus = (status: string, endDate: string): string => {
    if (status === 'expired' || isExpired(endDate)) {
      return 'PÓLIZA VENCIDA';
    }
    return 'PÓLIZA ACTIVA';
  };

  const getStatusColor = (status: string, endDate: string): string => {
    if (status === 'expired' || isExpired(endDate)) {
      return 'bg-red-500 text-white';
    }
    if (status === 'active') {
      return 'bg-green-600 text-white';
    }
    return 'bg-amber-500 text-white';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-md mx-auto">
        {!contractId ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">Falta el ID del contrato en la URL.</p>
          </div>
        ) : isLoading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">Cargando verificación...</p>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : !data ? null : (
          <div className="space-y-6">
            {/* Status Banner */}
            <div className={`p-4 rounded-lg text-center ${getStatusColor(data.status, data.end_date)}`}>
              <h1 className="text-2xl font-bold">
                {getDisplayStatus(data.status, data.end_date)}
              </h1>
            </div>
            
            {/* Details Card */}
            <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              <h2 className="text-gray-500 dark:text-gray-400 text-sm uppercase mb-4 font-medium">Detalles del Seguro</h2>
              
              <div className="space-y-3 text-left">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs uppercase">Titular</p>
                  <p className="text-gray-900 dark:text-white font-semibold">{data.client.name}</p>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">{data.client.document_id}</p>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">{data.client.phone}</p>
                </div>

                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs uppercase">Vehículo</p>
                  <p className="text-gray-900 dark:text-white font-semibold">
                    {data.vehicle.brand} {data.vehicle.model}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">Placa: {data.vehicle.plate}</p>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">Año: {data.vehicle.year}</p>
                </div>

                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs uppercase">Plan</p>
                  <p className="text-gray-900 dark:text-white font-semibold">{data.plan.name}</p>
                </div>

                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs uppercase">Vigencia</p>
                  <p className="text-gray-900 dark:text-white font-semibold">
                    {data.start_date} al {data.end_date}
                  </p>
                  {isExpired(data.end_date) && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1 font-medium">
                      ⚠️ Esta póliza ha vencido
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs uppercase">Póliza</p>
                  <p className="text-gray-900 dark:text-white font-semibold">{data.policy_number}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
