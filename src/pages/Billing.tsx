import { addYears, format } from 'date-fns';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { generatePolicyPDF } from '../lib/pdfGenerator';
import { useRealtimeSignals } from '../context/RealtimeProvider';
import { useExchangeRates } from '../context/ExchangeRateContext';
import { SaleSuccessOverlay } from '../components/SaleSuccessOverlay';

export const Billing: FC = () => {
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const clientId = searchParams.get('clientId');
  const vehicleId = searchParams.get('vehicleId');
  const renewingContractId = searchParams.get('renewingContractId');
  const { signals } = useRealtimeSignals();
  const { rates, isLoadingRates } = useExchangeRates();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [client, setClient] = useState<null | {
    id: string;
    name: string;
    document_id: string;
    phone: string;
    address: string | null;
    email: string | null;
    birth_date: string | null;
  }>(null);

  const [vehicle, setVehicle] = useState<null | {
    id: string;
    plate: string;
    serial_motor: string | null;
    serial_carroceria: string | null;
    brand: string | null;
    model: string | null;
    year: number | null;
    tipo_vehiculo: string | null;
    color: string | null;
    uso: string | null;
  }>(null);

  const [plans, setPlans] = useState<
    Array<{
      id: string;
      name: string;
      price_eur: number | null;
      price_usd: number | null;
      coverage_details: any;
    }>
  >([]);
  const [planId, setPlanId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'pago_movil' | 'transferencia' | 'credit'>('cash');
  const [referenceNumber, setReferenceNumber] = useState<string>('');

  const [startDate, setStartDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(addYears(new Date(), 1), 'yyyy-MM-dd'));

  // Update end date when start date changes (1 year later)
  const handleStartDateChange = (newStartDate: string) => {
    setStartDate(newStartDate);
    const newEndDate = format(addYears(new Date(newStartDate), 1), 'yyyy-MM-dd');
    setEndDate(newEndDate);
  };

  const selectedPlan = useMemo(() => plans.find((p) => p.id === planId) ?? null, [plans, planId]);

  const [createdPolicyNumber, setCreatedPolicyNumber] = useState<string | null>(null);
  const [createdQrUrl, setCreatedQrUrl] = useState<string | null>(null);
  const [createdContractId, setCreatedContractId] = useState<string | null>(null);

  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [mostrarAprobado, setMostrarAprobado] = useState(false);
  const hasOpenedPrintRef = useRef(false);
  const pdfAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      if (pdfAbortControllerRef.current) {
        pdfAbortControllerRef.current.abort();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (pdfAbortControllerRef.current) {
        pdfAbortControllerRef.current.abort();
      }
    };
  }, []);

  const qrImageUrl = useMemo(() => {
    if (!createdContractId && !createdPolicyNumber) return null;
    // Use dynamic URL pointing to verification page with contract ID
    const url = createdContractId 
      ? `${window.location.origin}/verificar/${createdContractId}`
      : `${window.location.origin}/verify?policy=${encodeURIComponent(createdPolicyNumber ?? '')}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  }, [createdContractId, createdPolicyNumber]);

  const loadPlans = async () => {
    const { data, error } = await supabase
      .from('plans')
      .select('id,name,price_eur,price_usd,coverage_details')
      .order('name', { ascending: true });

    if (error) {
      setError(error.message);
      return;
    }

    setPlans(data ?? []);
    setPlanId((prev) => {
      if (prev && (data ?? []).some((p) => p.id === prev)) return prev;
      return (data?.[0]?.id as string | undefined) ?? '';
    });
  };

  useEffect(() => {
    const run = async () => {
      if (!clientId || !vehicleId) return;

      setIsLoading(true);
      setError(null);

      const [{ data: clientData, error: clientError }, { data: vehicleData, error: vehicleError }] = await Promise.all([
        supabase.from('clients').select('id,name,document_id,phone,address,email,birth_date').eq('id', clientId).maybeSingle(),
        supabase
          .from('vehicles')
          .select('id,plate,serial_motor,serial_carroceria,brand,model,year,tipo_vehiculo,color,uso,clase,peso,puestos')
          .eq('id', vehicleId)
          .maybeSingle(),
      ]);

      if (clientError) {
        setError(clientError.message);
        setIsLoading(false);
        return;
      }
      if (vehicleError) {
        setError(vehicleError.message);
        setIsLoading(false);
        return;
      }
      if (!clientData) {
        setError('Cliente no encontrado');
        setIsLoading(false);
        return;
      }
      if (!vehicleData) {
        setError('Vehículo no encontrado');
        setIsLoading(false);
        return;
      }

      setClient(clientData);
      setVehicle(vehicleData);
      await loadPlans();

      // If this is a renewal, load the previous contract's plan
      if (renewingContractId) {
        const { data: contractData, error: contractError } = await supabase
          .from('contracts')
          .select('plan_id')
          .eq('id', renewingContractId)
          .maybeSingle();

        if (!contractError && contractData && contractData.plan_id) {
          setPlanId(contractData.plan_id);
        }
      }

      setIsLoading(false);
    };

    void run();
  }, [clientId, vehicleId, renewingContractId]);

  useEffect(() => {
    void loadPlans();
  }, [signals.plans]);

  const generatePolicyNumber = () => {
    const n = Math.floor(100000 + Math.random() * 900000);
    return `RCV-${n}`;
  };

  const handleGenerateContract = async () => {
    if (!clientId || !vehicleId) return;
    if (!planId) return;
    if (!client || !selectedPlan) return;

    // Validar referencia para métodos virtuales
    if ((paymentMethod === 'pago_movil' || paymentMethod === 'transferencia') && !referenceNumber.trim()) {
      setError('El número de referencia es obligatorio para pagos virtuales');
      return;
    }

    setIsLoading(true);
    setError(null);
    setMostrarAprobado(false);

    try {
      // 1) Generar número de póliza
      const policyNumber = generatePolicyNumber();

      // 2) NORMALIZACIÓN: Tu restricción CHECK de la tabla 'sales' solo acepta 'cash' o 'credit'.
      const esCredito = paymentMethod === 'credit';
      const dbPaymentMethod = esCredito ? 'credit' : 'cash';

      // 3) Construir nota según método de pago
      let note = '';
      switch (paymentMethod) {
        case 'cash':
          note = 'Pago en Efectivo';
          break;
        case 'pago_movil':
          note = `Pago Móvil - Ref: ${referenceNumber}`;
          break;
        case 'transferencia':
          note = `Transf. Bancaria - Ref: ${referenceNumber}`;
          break;
        case 'credit':
          note = 'Pago a Crédito';
          break;
      }

      // 3) Calcular monto total del plan
      const montoTotal = (selectedPlan.price_eur && selectedPlan.price_eur > 0)
        ? selectedPlan.price_eur
        : selectedPlan.price_usd;

      if (!montoTotal || montoTotal <= 0) {
        throw new Error(`Monto inválido: ${montoTotal}. No se puede registrar una venta con monto cero o negativo.`);
      }

      console.log("💰 Monto total del plan:", montoTotal);

      // 4) Usar la función RPC create_rcv_sale para inserción atómica
      // Esto crea: contracts, sales, sale_items, financial_transactions en un solo bloque
      console.log("📝 Llamando a función RPC create_rcv_sale...");
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_rcv_sale', {
        p_client_id: clientId,
        p_vehicle_id: vehicleId,
        p_plan_id: planId,
        p_total_amount: montoTotal,
        p_payment_method: dbPaymentMethod,
        p_contract_data: {
          policy_number: policyNumber,
          start_date: startDate,
          end_date: endDate
        },
        p_old_contract_id: renewingContractId || null,
        p_note: note
      });

      if (rpcError) {
        throw new Error(`Error en RPC create_rcv_sale: ${rpcError.message}`);
      }

      console.log("✅ RPC ejecutada exitosamente:", rpcData);
      const contractId = rpcData?.contract_id;
      const saleId = rpcData?.sale_id;

      if (!contractId || !saleId) {
        throw new Error('No se recibieron los IDs generados por la RPC');
      }

      // 4.1) Actualizar la transacción financiera para incluir el método de pago en la descripción
      const { error: updateTransactionError } = await supabase
        .from('financial_transactions')
        .update({
          note: `Ingreso por póliza ${policyNumber} - Método de pago: ${paymentMethod}`
        })
        .eq('contract_id', contractId);

      if (updateTransactionError) {
        console.warn('⚠️ No se pudo actualizar la descripción de la transacción:', updateTransactionError.message);
      }

      // 4) Recuperar el contrato completo con sus relaciones
      console.log("🔍 Recuperando datos completos del contrato...");
      const { data: contractData, error: fetchError } = await supabase
        .from('contracts')
        .select(`
          *,
          client:clients(*),
          vehicle:vehicles(*),
          plan:plans(*)
        `)
        .eq('id', contractId)
        .single();

      if (fetchError) {
        throw new Error(`Error al recuperar datos del contrato: ${fetchError.message}`);
      }

      if (!contractData) {
        throw new Error('No se encontraron datos del contrato');
      }

      console.log("✅ Datos del contrato recuperados:", contractData);

      // 5) Generar PDF localmente con los datos completos de la base de datos
      const pdfBytes = await generatePolicyPDF({
        contract: {
          id: contractData.id,
          policy_number: contractData.policy_number,
          start_date: contractData.start_date,
          end_date: contractData.end_date,
          status: contractData.status,
          qr_code_url: contractData.qr_code_url,
          client_id: contractData.client_id,
          vehicle_id: contractData.vehicle_id,
          plan_id: contractData.plan_id,
          created_at: contractData.created_at,
          updated_at: contractData.updated_at,
        },
        client: {
          id: contractData.client.id,
          name: contractData.client.name,
          document_id: contractData.client.document_id,
          phone: contractData.client.phone,
          address: contractData.client.address,
          email: contractData.client.email,
          birth_date: contractData.client.birth_date,
        },
        vehicle: {
          id: contractData.vehicle.id,
          plate: contractData.vehicle.plate || '',
          brand: contractData.vehicle.brand || '',
          model: contractData.vehicle.model || '',
          year: contractData.vehicle.year || null,
          tipo_vehiculo: contractData.vehicle.tipo_vehiculo || '',
          color: contractData.vehicle.color || '',
          uso: contractData.vehicle.uso || '',
          serial_carroceria: contractData.vehicle.serial_carroceria || '',
          serial_motor: contractData.vehicle.serial_motor || '',
          puestos: contractData.vehicle.puestos || '',
          clase: contractData.vehicle.clase || '',
          peso: contractData.vehicle.peso || '',
        },
        plan: {
          id: contractData.plan.id,
          name: contractData.plan.name,
          price_usd: contractData.plan.price_usd,
          price_eur: contractData.plan.price_eur,
          coverage_details: contractData.plan.coverage_details,
          created_at: contractData.plan.created_at,
          updated_at: contractData.plan.updated_at,
        },
        abortSignal: new AbortController().signal
      });

      // 6) Validar que el PDF no esté vacío
      if (!pdfBytes || pdfBytes.length === 0) {
        throw new Error("El generador de PDF devolvió un archivo vacío.");
      }

      console.log("✅ PDF generado exitosamente, tamaño:", pdfBytes.length, "bytes");

      // 7) Convertir Uint8Array a Blob para subir a Supabase Storage
      const pdfArrayBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
      const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });

      // 8) Validar que sea un Blob real
      if (!(pdfBlob instanceof Blob)) {
        throw new Error("El archivo generado no es un Blob válido.");
      }

      console.log("✅ Blob creado exitosamente, tamaño:", pdfBlob.size, "bytes");

      // 9) Subir PDF a storage
      const storagePath = `policies/${policyNumber}/${policyNumber}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Error al subir PDF: ${uploadError.message}`);
      }

      // 10) Insertar en documents
      const { error: docError } = await supabase.from('documents').insert([{
        contract_id: contractId,
        kind: 'rcv',
        filename: `${policyNumber}.pdf`,
        storage_bucket: 'documents',
        storage_path: storagePath,
        mime_type: 'application/pdf',
        size_bytes: pdfBlob.size,
      }]);

      if (docError) {
        throw new Error(`Error al crear documento: ${docError.message}`);
      }

      // 7) Actualizar contrato con URLs
      const pdfUrl = `${supabase.storage.from('documents').getPublicUrl(storagePath)}`;
      const { error: updateError } = await supabase
        .from('contracts')
        .update({
          pdf_url: pdfUrl,
          qr_code_url: pdfUrl,
          issued_at: new Date().toISOString(),
          price_eur: selectedPlan.price_eur || 0,
          price_usd: selectedPlan.price_usd || 0,
          exchange_rate_eur_bs: rates?.eur || 0,
        })
        .eq('id', contractId);

      if (updateError) {
        throw new Error(`Error al actualizar contrato: ${updateError.message}`);
      }

      console.log("✅ Contrato actualizado con URLs");

      // 12) Actualizar estado UI
      setCreatedPolicyNumber(policyNumber);
      setCreatedContractId(contractId);
      setCreatedQrUrl(pdfUrl);

      // 9) Mostrar estado de Aprobado
      setMostrarAprobado(true);
      setIsLoading(false);

      // 14) Pausa visual de 3 segundos antes de mostrar el overlay
      setTimeout(() => {
        setMostrarAprobado(false);
        setShowSuccessOverlay(true);
        // 15) Ocultar el overlay automáticamente después de 1.5 segundos
        setTimeout(() => {
          setShowSuccessOverlay(false);
        }, 1500);
      }, 3000);

    } catch (error: any) {
      console.error("🔴 Error en el flujo de emisión:", error.message);
      setError(error.message || 'Error inesperado');
      setIsLoading(false);
      setMostrarAprobado(false);
    }
  };

  const downloadSavedSnapshot = async () => {
    if (!createdPolicyNumber || !createdQrUrl) return;
    setError(null);

    const res = await fetch(createdQrUrl);
    if (!res.ok) {
      setError('No se pudo descargar el PDF');
      return;
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${createdPolicyNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handlePrintNow = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!createdContractId) return;
    if (hasOpenedPrintRef.current) return;
    hasOpenedPrintRef.current = true;

    window.open(`/documents?contractId=${encodeURIComponent(createdContractId)}`, '_blank', 'noopener,noreferrer');

    setTimeout(() => {
      hasOpenedPrintRef.current = false;
    }, 1000);
  };

  const buildSnapshotContent = () => {
    if (!createdPolicyNumber || !createdQrUrl) return null;
    return {
      policy_number: createdPolicyNumber,
      verify_url: createdQrUrl,
      client_id: clientId,
      vehicle_id: vehicleId,
      plan_id: planId,
      start_date: startDate,
      end_date: endDate,
      issued_at: new Date().toISOString(),
    };
  };

  const handleDownloadSnapshot = () => {
    const snapshot = buildSnapshotContent();
    if (!snapshot || !createdPolicyNumber) return;
    const content = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${createdPolicyNumber}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleSaveSnapshotToSupabase = async () => {
    const snapshot = buildSnapshotContent();
    if (!snapshot || !createdPolicyNumber || !createdContractId) return;

    setIsLoading(true);
    setError(null);

    const filename = `${createdPolicyNumber}.json`;
    const storagePath = `contracts/${createdContractId}/${filename}`;
    const body = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, body, { contentType: 'application/json', upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setIsLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('documents').insert({
      contract_id: createdContractId,
      kind: 'rcv',
      filename,
      storage_bucket: 'documents',
      storage_path: storagePath,
      mime_type: 'application/json',
      size_bytes: body.size,
    });

    if (insertError) {
      setError(insertError.message);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  };

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Facturación</h1>
        {renewingContractId && (
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            <RefreshCw size={14} className="mr-1" />
            Renovando contrato existente
          </div>
        )}
      </div>

      {!clientId || !vehicleId ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-600 dark:text-gray-400">
            Faltan parámetros. Abre esta pantalla desde <b>Clientes</b> usando <b>Emitir RCV</b>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Resumen</h2>

              {isLoading && !client ? (
                <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
              ) : error ? (
                <p className="text-red-600 dark:text-red-400">{error}</p>
              ) : !client || !vehicle ? (
                <p className="text-gray-600 dark:text-gray-400">No se pudo cargar la información.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Cliente</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">{client.name}</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">{client.document_id}</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">{client.phone}</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">{client.address ?? '-'}</div>
                  </div>

                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Vehículo</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">Placa: {vehicle.plate}</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">{vehicle.brand ?? '-'} {vehicle.model ?? '-'}</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">Año: {vehicle.year ?? '-'}</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">S/Motor: {vehicle.serial_motor ?? '-'}</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">S/Carrocería: {vehicle.serial_carroceria ?? '-'}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Emisión</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan</label>
                  <select
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Método de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'pago_movil' | 'transferencia' | 'credit')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="cash">Efectivo</option>
                    <option value="pago_movil">Pago Móvil</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="credit">Crédito</option>
                  </select>
                </div>

                {(paymentMethod === 'pago_movil' || paymentMethod === 'transferencia') && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Número de Referencia <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="Ingrese el número de referencia"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vigencia</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Inicio</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Fin</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {selectedPlan && (
                <div className="mt-4 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <div className="font-medium text-gray-900 dark:text-white">Detalle del plan</div>
                  <div>Precio EUR: <span className="font-semibold">€ {selectedPlan.price_eur ?? 0}</span></div>
                  <div>Precio USD: <span className="font-semibold">$ {selectedPlan.price_usd ?? 0}</span></div>
                  {rates && selectedPlan.price_eur ? (
                    <div className="flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
                      <span className="text-emerald-600 dark:text-emerald-400">🇻🇪</span>
                      <span className="text-emerald-800 dark:text-emerald-300">
                        Monto a cobrar hoy:{' '}
                        <strong>
                          {(selectedPlan.price_eur * rates.eur).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                        </strong>
                        {' '}(tasa BCV: {rates.eur.toFixed(2)} Bs/€)
                      </span>
                    </div>
                  ) : isLoadingRates ? (
                    <div className="text-xs text-gray-400 animate-pulse">Cargando tasa BCV...</div>
                  ) : null}
                  <div>Cobertura (Cosas): {selectedPlan.coverage_details?.things ?? 0}</div>
                  <div>Cobertura (Personas): {selectedPlan.coverage_details?.persons ?? 0}</div>
                </div>
              )}

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => void handleGenerateContract()}
                  disabled={isLoading || !planId || mostrarAprobado}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {isLoading ? 'Generando...' : mostrarAprobado ? 'Procesando...' : 'Generar Contrato'}
                </button>
              </div>

              {mostrarAprobado && (
                <div className="mt-4 flex items-center justify-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
                  <div className="text-emerald-600 dark:text-emerald-400 text-3xl">✓</div>
                  <div className="text-emerald-800 dark:text-emerald-300 font-medium">Póliza aprobada y registrada en informe financiero</div>
                </div>
              )}

              {error && <div className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</div>}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Vista previa</h2>

              {!createdPolicyNumber ? (
                <p className="text-gray-600 dark:text-gray-400">Selecciona un plan y genera el contrato para ver el QR.</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Póliza</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">{createdPolicyNumber}</div>
                  </div>

                  {qrImageUrl && (
                    <div className="flex justify-center">
                      <img src={qrImageUrl} alt="QR" className="h-44 w-44 bg-white rounded" />
                    </div>
                  )}

                  {createdQrUrl && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 break-all">
                      {createdQrUrl}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!createdContractId) return;
                        const url = `/documents?contractId=${encodeURIComponent(createdContractId)}`;
                        window.history.pushState({}, '', url);
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }}
                      className="px-4 py-2 text-gray-800 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      Imprimir
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveSnapshotToSupabase()}
                      disabled={isLoading || !createdContractId}
                      className="px-4 py-2 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-60"
                    >
                      Guardar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadSnapshot}
                      className="px-4 py-2 text-gray-800 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      Descargar JSON
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <SaleSuccessOverlay isOpen={showSuccessOverlay} message="¡Póliza emitida con éxito!" />
    </div>
  );
};
