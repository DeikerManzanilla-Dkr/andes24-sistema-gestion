import { FC, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { MessageCircle, AlertTriangle, Clock } from 'lucide-react';

interface ContractData {
  id: string;
  policy_number: string;
  end_date: string;
  status: string;
  client: {
    name: string;
    phone: string;
  } | null;
  vehicle: {
    brand: string | null;
    model: string | null;
    plate: string | null;
  } | null;
}

export const CRM: FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contracts, setContracts] = useState<ContractData[]>([]);

  useEffect(() => {
    const fetchExpiringContracts = async () => {
      setIsLoading(true);
      setError(null);

      const fifteenDaysFromNow = new Date();
      fifteenDaysFromNow.setDate(fifteenDaysFromNow.getDate() + 15);
      const fifteenDaysFromNowStr = fifteenDaysFromNow.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          policy_number,
          end_date,
          status,
          client:clients(name, phone),
          vehicle:vehicles(brand, model, plate)
        `)
        .lte('end_date', fifteenDaysFromNowStr)
        .order('end_date', { ascending: true });

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      // Transform the data to handle Supabase's array response for relations
      const transformedData = (data || []).map((contract: any) => ({
        id: contract.id,
        policy_number: contract.policy_number,
        end_date: contract.end_date,
        status: contract.status,
        client: Array.isArray(contract.client) ? contract.client[0] : contract.client,
        vehicle: Array.isArray(contract.vehicle) ? contract.vehicle[0] : contract.vehicle,
      }));

      setContracts(transformedData);
      setIsLoading(false);
    };

    void fetchExpiringContracts();
  }, []);

  const isExpired = (endDate: string): boolean => {
    return new Date(endDate) < new Date();
  };

  const getDaysUntilExpiry = (endDate: string): number => {
    const today = new Date();
    const expiry = new Date(endDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusBadge = (endDate: string) => {
    if (isExpired(endDate)) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <AlertTriangle size={12} className="mr-1" />
          Vencida
        </span>
      );
    }
    const days = getDaysUntilExpiry(endDate);
    if (days <= 7) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          <Clock size={12} className="mr-1" />
          {days} días
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        <Clock size={12} className="mr-1" />
        {days} días
      </span>
    );
  };

  const getRowStyle = (endDate: string) => {
    if (isExpired(endDate)) {
      return 'bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500';
    }
    const days = getDaysUntilExpiry(endDate);
    if (days <= 7) {
      return 'bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-500';
    }
    return 'bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-500';
  };

  const handleWhatsAppClick = (client: { name: string; phone: string }, vehicle: { brand: string | null; model: string | null; plate: string | null }, endDate: string) => {
    // Clean phone number: remove spaces, dashes, and '+'
    let cleanPhone = client.phone.replace(/[\s\-\+]/g, '');
    
    // If starts with '0', replace with '58' (Venezuela code)
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '58' + cleanPhone.substring(1);
    }

    // Format message
    const message = `Hola ${client.name}, te saludamos de Andes 24. Queremos recordarte que la póliza RCV de tu vehículo ${vehicle.brand} ${vehicle.model} (Placa: ${vehicle.plate}) vence el ${endDate}. ¿Deseas que te ayudemos con la renovación para mantenerte protegido?`;

    // Encode message
    const encodedMessage = encodeURIComponent(message);

    // Open WhatsApp in new tab
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
  };

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Renovaciones</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Pólizas vencidas o por vencer en los próximos 15 días</p>
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      ) : error ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      ) : contracts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">No hay pólizas por vencer en los próximos 15 días.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Póliza
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Vehículo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Vencimiento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {contracts.map((contract) => (
                  <tr key={contract.id} className={getRowStyle(contract.end_date)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {contract.policy_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white font-medium">
                        {contract.client?.name || '-'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {contract.client?.phone || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {contract.vehicle?.brand} {contract.vehicle?.model}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {contract.vehicle?.plate || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white font-medium">
                        {contract.end_date}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(contract.end_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => contract.client && contract.vehicle && handleWhatsAppClick(contract.client, contract.vehicle, contract.end_date)}
                        disabled={!contract.client || !contract.vehicle}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <MessageCircle size={14} className="mr-1" />
                        Recordatorio
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
