import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ContractRow {
  id: string;
  policy_number: string;
  client_id: string;
  vehicle_id: string;
  plan_id: string | null;
  start_date: string;
  end_date: string;
  status: string;
  user_id: string;
}

interface SeguimientoRow {
  cliente_id: string;
  tipo: string;
  descripcion: string | null;
  proxima_accion_date: string;
  realizado: boolean;
  contract_id: string | null;
  user_id: string;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { daysAhead = [7, 15], dryRun = false } = await req.json() as {
      daysAhead?: number[];
      dryRun?: boolean;
    };

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    let totalInserted = 0;
    let totalSkipped = 0;
    const errors: string[] = [];
    const details: Array<{
      contractId: string;
      policyNumber: string;
      clientId: string;
      tipo: string;
      proximaAccionDate: string;
    }> = [];

    for (const days of daysAhead) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + days);
      const targetDateIso = targetDate.toISOString();

      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select('id,policy_number,client_id,vehicle_id,plan_id,start_date,end_date,status,user_id')
        .eq('status', 'active')
        .lt('end_date', targetDateIso.split('T')[0])
        .gte('end_date', todayIso.split('T')[0]);

      if (contractsError) {
        errors.push(`Error fetching contracts for ${days} days: ${contractsError.message}`);
        continue;
      }

      if (!contracts || contracts.length === 0) {
        continue;
      }

      for (const contract of contracts) {
        const tipo = days === 7 ? 'renewal_7d' : 'renewal_15d';
        const descripcion = `Recordatorio de renovación: póliza ${contract.policy_number} vence en ${days} días`;

        const seguimiento: SeguimientoRow = {
          cliente_id: contract.client_id,
          tipo,
          descripcion,
          proxima_accion_date: todayIso,
          realizado: false,
          contract_id: contract.id,
          user_id: contract.user_id,
        };

        if (dryRun) {
          totalInserted += 1;
          details.push({
            contractId: contract.id,
            policyNumber: contract.policy_number,
            clientId: contract.client_id,
            tipo,
            proximaAccionDate: todayIso,
          });
          continue;
        }

        const { error: insertError } = await supabase
          .from('seguimientos')
          .insert(seguimiento)
          .select('id')
          .maybeSingle();

        if (insertError) {
          // Si es duplicado (unique constraint), lo contamos como skipped
          if (insertError.message?.includes('duplicate key') || insertError.message?.includes('unique')) {
            totalSkipped += 1;
          } else {
            errors.push(`Error inserting followup for ${contract.policy_number}: ${insertError.message}`);
          }
        } else {
          totalInserted += 1;
          details.push({
            contractId: contract.id,
            policyNumber: contract.policy_number,
            clientId: contract.client_id,
            tipo,
            proximaAccionDate: todayIso,
          });
        }
      }
    }

    const result = {
      inserted: totalInserted,
      skipped: totalSkipped,
      errors: errors.length > 0 ? errors : undefined,
      details: details.length > 0 ? details : undefined,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
