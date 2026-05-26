import { supabase } from '../lib/supabaseClient';

interface CreateRCVSaleParams {
  client_id: string;
  vehicle_id: string;
  plan_id: string;
  total_amount: number;
  payment_method: 'cash' | 'credit';
  contract_data: {
    policy_number: string;
    start_date: string;
    end_date: string;
  };
}

interface CreateRCVSaleResponse {
  contract_id: string;
  sale_id: string;
}

/**
 * Crea una venta RCV completa con contrato, venta, items y transacción financiera
 * en un bloque atómico usando la función RPC create_rcv_sale.
 *
 * @param params - Parámetros para crear la venta RCV
 * @returns Objeto con contract_id y sale_id generados
 * @throws Error si la operación falla
 */
export async function createRCVSale(
  params: CreateRCVSaleParams
): Promise<CreateRCVSaleResponse> {
  const { data, error } = await supabase.rpc('create_rcv_sale', {
    p_client_id: params.client_id,
    p_vehicle_id: params.vehicle_id,
    p_plan_id: params.plan_id,
    p_total_amount: params.total_amount,
    p_payment_method: params.payment_method,
    p_contract_data: params.contract_data,
  });

  if (error) {
    console.error('Error al crear venta RCV:', error);
    throw new Error(`Error al crear venta RCV: ${error.message}`);
  }

  if (!data) {
    throw new Error('No se recibieron datos de la función RPC');
  }

  return data as CreateRCVSaleResponse;
}

/**
 * Ejemplo de uso en un componente Next.js:
 *
 * ```tsx
 * import { createRCVSale } from '@/services/createRCVSale';
 *
 * async function handleCreateContract() {
 *   try {
 *     const result = await createRCVSale({
 *       client_id: 'uuid-del-cliente',
 *       vehicle_id: 'uuid-del-vehiculo',
 *       plan_id: 'uuid-del-plan',
 *       total_amount: 50.00,
 *       payment_method: 'cash',
 *       contract_data: {
 *         policy_number: 'RCV-2026-001',
 *         start_date: '2026-05-24',
 *         end_date: '2027-05-24'
 *       }
 *     });
 *
 *     // Redirigir al PDF del contrato
 *     router.push(`/contracts/${result.contract_id}/pdf`);
 *   } catch (error) {
 *     console.error('Error:', error);
 *     // Mostrar error al usuario
 *   }
 * }
 * ```
 */
