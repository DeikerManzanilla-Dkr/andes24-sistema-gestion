import { supabase } from './supabaseClient';

interface RegisterSaleParams {
  client_id: string;
  vehicle_id: string;
  plan_id: string;
  total_amount: number;
  // Aceptamos lo que venga del formulario (Pago Móvil, Zelle, Efectivo, Crédito, etc.)
  paymentMethod: string;
  contract_data: {
    policy_number: string;
    start_date: string;
    end_date: string;
  };
}

/**
 * Registra una venta cuando se emite un RCV
 * Usa la función RPC create_rcv_sale para garantizar integridad atómica
 * Crea registros en: contracts, sales, sale_items, financial_transactions
 */
export async function registerSaleForRCV({
  client_id,
  vehicle_id,
  plan_id,
  total_amount,
  paymentMethod,
  contract_data
}: RegisterSaleParams) {
  try {
    console.log("🟢 Iniciando registerSaleForRCV");
    console.log("📋 Datos recibidos:", { client_id, vehicle_id, plan_id, total_amount, paymentMethod });

    // 1. NORMALIZACIÓN: Tu restricción CHECK de la tabla 'sales' solo acepta 'cash' o 'credit'.
    // Si es algo distinto a crédito, lo tratamos como 'cash' (ingreso inmediato).
    const esCredito = paymentMethod.toLowerCase().includes('credit') || paymentMethod.toLowerCase().includes('crédito');
    const dbPaymentMethod = esCredito ? 'credit' : 'cash';
    console.log("💳 Método de pago normalizado:", { original: paymentMethod, db: dbPaymentMethod });

    // 2. Usar la función RPC create_rcv_sale para inserción atómica
    console.log("📝 Llamando a función RPC create_rcv_sale...");
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_rcv_sale', {
      p_client_id: client_id,
      p_vehicle_id: vehicle_id,
      p_plan_id: plan_id,
      p_total_amount: total_amount,
      p_payment_method: dbPaymentMethod,
      p_contract_data: contract_data
    });

    if (rpcError) {
      console.error("🔴 Error en RPC create_rcv_sale:", rpcError);
      throw new Error(`[RPC create_rcv_sale]: ${rpcError.message}`);
    }

    console.log("✅ RPC ejecutada exitosamente:", rpcData);
    console.log("🎉 Flujo financiero completado exitosamente");
    return { success: true, saleId: rpcData?.sale_id, contractId: rpcData?.contract_id };

  } catch (error: any) {
    console.error("🔴 Error en el flujo contable de ServiAndes24:", error.message);
    console.error("🔴 Stack trace:", error.stack);
    throw error;
  }
}
