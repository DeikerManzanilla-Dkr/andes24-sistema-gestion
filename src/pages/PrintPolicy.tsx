import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PolicyDocument } from '../components/PolicyDocument';

export const PrintPolicy: FC = () => {
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const contractId = searchParams.get('contractId');
  const autoPrint = searchParams.get('autoprint') === '1' || searchParams.get('autoprint') === 'true';

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasPrintedRef = useRef(false);

  const [payload, setPayload] = useState<null | {
    contract: {
      policy_number: string;
      start_date: string;
      end_date: string;
      status: string;
      qr_code_url: string | null;
    };
    client: {
      name: string;
      document_id: string;
      phone: string;
      address: string | null;
      birth_date: string | null;
    };
    vehicle: {
      plate: string;
      serial_motor: string | null;
      serial_carroceria: string | null;
      brand: string | null;
      model: string | null;
      year: number | null;
    };
    plan: {
      name: string;
      price_usd: number | null;
      price_eur: number | null;
      coverage_details: any;
    } | null;
  }>(null);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      setError(null);
      hasPrintedRef.current = false;

      if (!contractId) {
        if (isMounted) setIsLoading(false);
        return;
      }

      if (isMounted) setIsLoading(true);

      const { data, error } = await supabase
        .from('contracts')
        .select(
          `
            policy_number,
            start_date,
            end_date,
            status,
            qr_code_url,
            client:clients!contracts_client_id_fkey ( name, document_id, phone, address, birth_date ),
            vehicle:vehicles!contracts_vehicle_id_fkey ( plate, serial_motor, serial_carroceria, brand, model, year ),
            plan:plans!contracts_plan_id_fkey ( name, price_usd, price_eur, coverage_details )
          `
        )
        .eq('id', contractId)
        .maybeSingle();

      if (error) {
        if (isMounted) {
          setError(error.message);
          setIsLoading(false);
        }
        return;
      }

      if (!data) {
        if (isMounted) setIsLoading(false);
        window.location.assign('/');
        return;
      }

      const contract = {
        policy_number: data.policy_number,
        start_date: data.start_date,
        end_date: data.end_date,
        status: data.status,
        qr_code_url: data.qr_code_url,
      };

      // Supabase types can return array depending on relationship detection; normalize.
      const firstOrSelf = <T,>(value: T | T[] | null | undefined): T | null => {
        if (!value) return null;
        if (Array.isArray(value)) return value[0] ?? null;
        return value;
      };

      const client = firstOrSelf(data.client) as any;
      const vehicle = firstOrSelf(data.vehicle) as any;
      const plan = firstOrSelf(data.plan) as any;

      if (!client || !vehicle) {
        if (isMounted) {
          setError('Datos incompletos para imprimir');
          setIsLoading(false);
        }
        return;
      }

      if (!contract.policy_number || !contract.start_date || !contract.end_date || !client.name || !vehicle.plate) {
        if (isMounted) {
          setError('Datos incompletos para imprimir');
          setIsLoading(false);
        }
        return;
      }

      if (isMounted) {
        setPayload({
          contract,
          client,
          vehicle,
          plan: plan ?? null,
        });

        setIsLoading(false);
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [contractId, autoPrint]);

  useEffect(() => {
    if (hasPrintedRef.current) return;
    if (isLoading) return;
    if (!payload) return;
    if (!autoPrint) return;

    hasPrintedRef.current = true;
    setTimeout(() => {
      window.print();
    }, 250);
  }, [autoPrint, isLoading, payload]);

  return (
    <div className="bg-white">
      {!contractId ? (
        <div className="p-6 text-sm text-gray-700">Falta el parámetro <code>contractId</code>.</div>
      ) : isLoading ? (
        <div className="p-6 text-sm text-gray-700">Cargando vista previa...</div>
      ) : error ? (
        <div className="p-6 text-sm text-red-600">{error}</div>
      ) : !payload ? null : (
        <PolicyDocument contract={payload.contract} client={payload.client} vehicle={payload.vehicle} />
      )}
    </div>
  );
};
