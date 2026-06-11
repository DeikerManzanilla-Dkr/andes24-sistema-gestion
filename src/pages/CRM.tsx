import { FC, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { MessageCircle, AlertTriangle, Clock, RefreshCw, Phone } from 'lucide-react';

interface ContractData {
  id: string;
  policy_number: string;
  end_date: string;
  status: string;
  client_id: string;
  vehicle_id: string;
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

interface FleetClientData {
  client_id: string;
  client_name: string;
  client_phone: string;
  client_document_id: string;
  vehicle_count: number;
  vehicles: Array<{
    id: string;
    brand: string | null;
    model: string | null;
    plate: string | null;
    tipo_vehiculo: string | null;
    clase: string | null;
    contract_status: string | null;
    contract_end_date: string | null;
  }>;
  active_policies: number;
  expired_policies: number;
  score: number;
}

export const CRM: FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [fleetClients, setFleetClients] = useState<FleetClientData[]>([]);
  const [isLoadingFleet, setIsLoadingFleet] = useState(false);

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
          client_id,
          vehicle_id,
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
        client_id: contract.client_id,
        vehicle_id: contract.vehicle_id,
        client: Array.isArray(contract.client) ? contract.client[0] : contract.client,
        vehicle: Array.isArray(contract.vehicle) ? contract.vehicle[0] : contract.vehicle,
      }));

      setContracts(transformedData);
      setIsLoading(false);
    };

    void fetchExpiringContracts();
  }, []);

  useEffect(() => {
    const fetchFleetClients = async () => {
      setIsLoadingFleet(true);

      // Obtener clientes con múltiples vehículos
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select(`
          id,
          brand,
          model,
          plate,
          tipo_vehiculo,
          clase,
          client_id,
          client:clients(id, name, phone, document_id)
        `);

      if (vehiclesError) {
        console.error('Error fetching fleet vehicles:', vehiclesError);
        setIsLoadingFleet(false);
        return;
      }

      // Agrupar vehículos por cliente
      const clientVehiclesMap = new Map<string, any>();

      (vehiclesData || []).forEach((item: any) => {
        const client = Array.isArray(item.client) ? item.client[0] : item.client;
        if (!client) return;

        if (!clientVehiclesMap.has(client.id)) {
          clientVehiclesMap.set(client.id, {
            client_id: client.id,
            client_name: client.name,
            client_phone: client.phone,
            client_document_id: client.document_id,
            vehicles: [],
          });
        }

        clientVehiclesMap.get(client.id).vehicles.push({
          id: item.id,
          brand: item.brand,
          model: item.model,
          plate: item.plate,
          tipo_vehiculo: item.tipo_vehiculo,
          clase: item.clase,
        });
      });

      // Incluir TODOS los clientes con vehículos (incluso los que tienen solo 1)
      const fleetClientsArray = Array.from(clientVehiclesMap.values());

      // Para cada cliente, obtener sus contratos y calcular activos/vencidos
      const fleetClientsWithPolicies = await Promise.all(
        fleetClientsArray.map(async (client: any) => {
          const { data: contractsData } = await supabase
            .from('contracts')
            .select('id, end_date, status, vehicle_id')
            .eq('client_id', client.client_id);

          const today = new Date();
          let activePolicies = 0;
          let expiredPolicies = 0;

          // Crear mapa de vehicle_id -> contrato
          const vehicleContractMap = new Map<string, { status: string; end_date: string }>();

          (contractsData || []).forEach((contract: any) => {
            if (contract.status === 'cancelled') return;

            const endDate = new Date(contract.end_date);
            if (endDate >= today) {
              activePolicies++;
            } else {
              expiredPolicies++;
            }

            // Guardar contrato por vehicle_id
            if (contract.vehicle_id) {
              vehicleContractMap.set(contract.vehicle_id, {
                status: contract.status,
                end_date: contract.end_date,
              });
            }
          });

          // Agregar información del contrato a cada vehículo
          const vehiclesWithContractStatus = client.vehicles.map((vehicle: any) => {
            const contract = vehicleContractMap.get(vehicle.id);
            return {
              ...vehicle,
              contract_status: contract?.status || null,
              contract_end_date: contract?.end_date || null,
            };
          });

          // Calcular puntaje total del cliente
          const totalScore = vehiclesWithContractStatus.reduce((sum: number, vehicle: any) => {
            return sum + getVehiclePoints(vehicle.clase);
          }, 0);

          return {
            ...client,
            vehicles: vehiclesWithContractStatus,
            vehicle_count: client.vehicles.length,
            active_policies: activePolicies,
            expired_policies: expiredPolicies,
            score: totalScore,
          };
        })
      );

      // Ordenar por puntaje descendente (mayor valor primero)
      fleetClientsWithPolicies.sort((a: any, b: any) => b.score - a.score);

      setFleetClients(fleetClientsWithPolicies);
      setIsLoadingFleet(false);
    };

    void fetchFleetClients();
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

  const handleRenewClick = (contractId: string, clientId: string, vehicleId: string) => {
    // Navigate to billing with renewal parameters
    const params = new URLSearchParams({
      clientId,
      vehicleId,
      renewingContractId: contractId,
    });
    window.location.href = `/billing?${params.toString()}`;
  };

  const handleFleetCall = (phone: string, clientName: string) => {
    // Clean phone number
    let cleanPhone = phone.replace(/[\s\-\+]/g, '');

    // If starts with '0', replace with '58' (Venezuela code)
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '58' + cleanPhone.substring(1);
    }

    // Open WhatsApp
    const message = `Hola ${clientName}, te saludamos de Andes 24. Queremos coordinar la renovación de tu flota de vehículos. ¿Podemos agendar una reunión para revisar tus pólizas?`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
  };


  const isVehicleActive = (vehicle: any) => {
    if (!vehicle.contract_status || vehicle.contract_status !== 'active') return false;
    if (!vehicle.contract_end_date) return false;
    return new Date(vehicle.contract_end_date) >= new Date();
  };

  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Eliminar acentos
  };

  const getVehiclePoints = (clase: string | null): number => {
    if (!clase) return 1;

    const normalized = normalizeText(clase);

    // 1 Punto (Motos y Ciclomotores)
    if (normalized.includes('moto') ||
        normalized.includes('motocicleta') ||
        normalized.includes('scooter') ||
        normalized.includes('mototaxi') ||
        normalized.includes('cuatrimoto') ||
        normalized.includes('ciclomotor')) {
      return 1;
    }

    // 2 Puntos (Automóviles / Turismos)
    if (normalized.includes('automovil') ||
        normalized.includes('turismo') ||
        normalized.includes('sedan') ||
        normalized.includes('hatchback') ||
        normalized.includes('coupe') ||
        normalized.includes('carro')) {
      return 2;
    }

    // 3 Puntos (Camionetas y Rústicos)
    if (normalized.includes('camioneta') ||
        normalized.includes('rustico') ||
        normalized.includes('suv') ||
        normalized.includes('pickup') ||
        normalized.includes('4x4')) {
      return 3;
    }

    // 4 Puntos (Camiones y Carga Pesada)
    if (normalized.includes('camion') ||
        normalized.includes('carga') ||
        normalized.includes('gandola') ||
        normalized.includes('volteo') ||
        normalized.includes('cisterna') ||
        normalized.includes('plataforma') ||
        normalized.includes('tractocamion')) {
      return 4;
    }

    // Por defecto: 1 punto
    return 1;
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
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => contract.client && contract.vehicle && handleWhatsAppClick(contract.client, contract.vehicle, contract.end_date)}
                          disabled={!contract.client || !contract.vehicle}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <MessageCircle size={14} className="mr-1" />
                          Recordatorio
                        </button>
                        <button
                          onClick={() => handleRenewClick(contract.id, contract.client_id, contract.vehicle_id)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                          <RefreshCw size={14} className="mr-1" />
                          Renovar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Seguimiento de Flotas y Grandes Clientes */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Seguimiento de Flotas y Grandes Clientes</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Clientes con múltiples vehículos y estado de sus pólizas</p>

        {isLoadingFleet ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">Cargando flotas...</p>
          </div>
        ) : fleetClients.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">No hay clientes con flotas de vehículos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fleetClients.map((client) => {
              return (
                <div key={client.client_id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-6">
                    {/* Encabezado */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{client.client_name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{client.client_phone}</p>
                      </div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        🚚 {client.vehicle_count} Vehículo{client.vehicle_count > 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Checklist de Vehículos */}
                    <div className="mb-4 space-y-1">
                      {client.vehicles.map((vehicle) => {
                        const isActive = isVehicleActive(vehicle);
                        const vehicleLabel = vehicle.clase ? vehicle.clase.toUpperCase() : 'VEHÍCULO';
                        return (
                          <div key={vehicle.id} className="flex justify-between items-center py-1 border-b border-slate-800/40 last:border-0">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {vehicle.plate} - {vehicleLabel}
                            </span>
                            <span className={`text-sm font-bold ${isActive ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isActive ? '✔' : '❌'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Estado de la Flota */}
                    <div className="flex gap-2 mb-4">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">
                        🟢 {client.active_policies} Activ{client.active_policies === 1 ? 'o' : 'os'}
                      </span>
                      {client.expired_policies > 0 && (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400">
                          🔴 {client.expired_policies} Vencido{client.expired_policies === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>

                    {/* Acción Rápida */}
                    <button
                      onClick={() => handleFleetCall(client.client_phone, client.client_name)}
                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Phone size={16} className="mr-2" />
                      Gestionar Flota
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
