import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { generatePolicyPDF, type PdfOverlayElement } from '../lib/pdfGenerator';
import type { ContractRow } from '../types/database';

export const Documents: FC = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const filterClientId = searchParams.get('clientId');
  const filterVehicleId = searchParams.get('vehicleId');
  const filterContractId = searchParams.get('contractId');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryText, setQueryText] = useState('');

  const openModal = async (contract: ContractRow) => {
    setIsModalOpen(true);
    setSelectedContract(contract);
    setSelectedDoc(documentsByContract[contract.id] ?? null);
    setPdfUrl(null);
    setOverlays([]);
    setError(null);

    const doc = documentsByContract[contract.id] ?? null;
    if (!doc) return;

    const { data: signed, error: signError } = await supabase.storage
      .from(doc.storage_bucket)
      .createSignedUrl(doc.storage_path, 60 * 15);

    if (signError) {
      setError(signError.message);
      return;
    }

    setPdfUrl(signed?.signedUrl ?? null);

    const { data: overlayData, error: overlayError } = await supabase
      .from('document_overlays')
      .select('id,contract_id,elements,updated_at,created_at')
      .eq('contract_id', contract.id)
      .maybeSingle();

    if (overlayError) {
      setError(overlayError.message);
      return;
    }

    setOverlays((overlayData as OverlayRow | null)?.elements ?? []);
  };

  const addTextOverlay = () => {
    const id = `t_${Math.random().toString(16).slice(2)}`;
    setOverlays((prev) => [
      ...prev,
      {
        id,
        type: 'text',
        text: 'Texto',
        x: 0.1,
        y: 0.1,
        fontSize: 12,
      },
    ]);
  };

  const saveOverlays = async () => {
    if (!selectedContract) return;
    setIsLoading(true);
    setError(null);

    const { error: upsertError } = await supabase.from('document_overlays').upsert(
      {
        contract_id: selectedContract.id,
        elements: overlays,
      },
      { onConflict: 'contract_id' }
    );

    if (upsertError) {
      setError(upsertError.message);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  };

  const regeneratePdfFromOverlays = async () => {
    if (!selectedContract) return;
    setIsLoading(true);
    setError(null);

    if (pdfAbortControllerRef.current) {
      pdfAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    pdfAbortControllerRef.current = abortController;

    try {
      const [{ data: clientData }, { data: vehicleData }, { data: planData }] = await Promise.all([
      supabase.from('clients').select('id,name,document_id,phone,address,email,birth_date,created_at,updated_at').eq('id', selectedContract.client_id).single(),
      supabase
        .from('vehicles')
        .select('id,plate,brand,model,year,serial_motor,serial_carroceria,created_at,updated_at')
        .eq('id', selectedContract.vehicle_id)
        .single(),
      selectedContract.plan_id ? supabase.from('plans').select('id,name,price_usd,price_eur,coverage_details,created_at,updated_at').eq('id', selectedContract.plan_id).single() : { data: null },
    ]);

    if (!clientData || !vehicleData) {
      setError('No se pudieron cargar los datos del cliente o vehículo');
      setIsLoading(false);
      return;
    }

    const pdfBytes = await generatePolicyPDF({
      contract: {
        id: selectedContract.id,
        policy_number: selectedContract.policy_number,
        start_date: selectedContract.start_date,
        end_date: selectedContract.end_date,
        status: selectedContract.status,
        qr_code_url: selectedContract.qr_code_url,
        client_id: selectedContract.client_id,
        vehicle_id: selectedContract.vehicle_id,
        plan_id: selectedContract.plan_id,
        issued_at: selectedContract.issued_at,
        updated_at: selectedContract.updated_at,
      },
      client: {
        id: clientData.id,
        name: clientData.name,
        document_id: clientData.document_id,
        phone: clientData.phone,
        address: clientData.address,
        email: clientData.email,
        birth_date: clientData.birth_date,
        created_at: clientData.created_at,
        updated_at: clientData.updated_at,
      },
      vehicle: {
        id: vehicleData.id,
        plate: vehicleData.plate,
        brand: vehicleData.brand,
        model: vehicleData.model,
        year: vehicleData.year,
        serial_motor: vehicleData.serial_motor,
        serial_carroceria: vehicleData.serial_carroceria,
        created_at: vehicleData.created_at,
        updated_at: vehicleData.updated_at,
      },
      plan: planData
        ? {
            id: planData.id,
            name: planData.name,
            price_usd: planData.price_usd,
            price_eur: planData.price_eur,
            coverage_details: planData.coverage_details,
            created_at: planData.created_at,
            updated_at: planData.updated_at,
          }
        : null,
      overlays,
      abortSignal: abortController.signal
    });

    if (abortController.signal.aborted) throw new Error('AbortError');

    const filename = `RCV-${selectedContract.policy_number.replace('VIRT-', '').replace('RCV-', '')}.pdf`;
    const storagePath = `contracts/${selectedContract.id}/${filename}`;
    const body = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, body, { contentType: 'application/pdf', upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setIsLoading(false);
      return;
    }

    const { data: existing, error: existingError } = await supabase
      .from('documents')
      .select('id')
      .eq('contract_id', selectedContract.id)
      .maybeSingle();

    if (existingError) {
      setError(existingError.message);
      setIsLoading(false);
      return;
    }

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          filename,
          storage_bucket: 'documents',
          storage_path: storagePath,
          mime_type: 'application/pdf',
          size_bytes: body.size,
        })
        .eq('id', existing.id);

      if (updateError) {
        setError(updateError.message);
        setIsLoading(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from('documents').insert({
        contract_id: selectedContract.id,
        kind: 'rcv',
        filename,
        storage_bucket: 'documents',
        storage_path: storagePath,
        mime_type: 'application/pdf',
        size_bytes: body.size,
      });

      if (insertError) {
        setError(insertError.message);
        setIsLoading(false);
        return;
      }
    }

    await load();

    const { data: signed, error: signError } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 60 * 15);

    if (signError) {
      setError(signError.message);
      setIsLoading(false);
      return;
    }

    setSelectedDoc((prev) =>
      prev
        ? {
            ...prev,
            filename,
            storage_bucket: 'documents',
            storage_path: storagePath,
            mime_type: 'application/pdf',
            size_bytes: body.size,
          }
        : null
    );
    if (pdfAbortControllerRef.current === abortController) {
      setPdfUrl(signed?.signedUrl ?? null);
      setIsLoading(false);
    }
   } catch (error: any) {
    if (error.message === 'AbortError') return;
    if (pdfAbortControllerRef.current === abortController) {
      setError(error.message || 'Error inesperado');
      setIsLoading(false);
    }
   }
  };

  type DocumentRow = {
    id: string;
    contract_id: string;
    kind: string;
    filename: string;
    storage_bucket: string;
    storage_path: string;
    mime_type: string;
    size_bytes: number | null;
    created_at: string;
  };

  type OverlayRow = {
    id: string;
    contract_id: string;
    elements: PdfOverlayElement[];
    updated_at: string;
    created_at: string;
  };

  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [documentsByContract, setDocumentsByContract] = useState<Record<string, DocumentRow | null>>({});

  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [totalCount, setTotalCount] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractRow | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRow | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [overlays, setOverlays] = useState<PdfOverlayElement[]>([]);

  const hasAutoOpenedRef = useRef(false);
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

  const dragRef = useRef<null | { id: string; dx: number; dy: number }>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);

    let baseQuery = supabase
      .from('v_full_contract_details')
      .select(
        'contract_id,policy_number,status,client_id,vehicle_id,plan_id,start_date,end_date,issued_at,qr_code_url,pdf_url,contract_created_at,contract_updated_at,client_name,client_document_id,vehicle_plate,document_id,document_kind,document_filename,document_storage_bucket,document_storage_path,document_mime_type,document_size_bytes,document_created_at',
        { count: 'exact' }
      )
      .order('issued_at', { ascending: false });

    if (filterClientId) baseQuery = baseQuery.eq('client_id', filterClientId);
    if (filterVehicleId) baseQuery = baseQuery.eq('vehicle_id', filterVehicleId);
    if (filterContractId) baseQuery = baseQuery.eq('contract_id', filterContractId);

    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data: contractData, error: contractError, count } = await baseQuery.range(from, to);

    if (contractError) {
      setError(contractError.message);
      setIsLoading(false);
      return;
    }

    const normalizedContracts: ContractRow[] = (contractData ?? []).map((c: any) => ({
      id: c.contract_id,
      policy_number: c.policy_number,
      status: c.status,
      client_id: c.client_id,
      vehicle_id: c.vehicle_id,
      plan_id: c.plan_id,
      start_date: c.start_date,
      end_date: c.end_date,
      issued_at: c.issued_at,
      qr_code_url: c.qr_code_url,
      pdf_url: c.pdf_url,
      pdf_snapshot: null,
      user_id: null,
      created_at: c.contract_created_at,
      updated_at: c.contract_updated_at,
      client: c.client_name || c.client_document_id ? { name: c.client_name ?? '', document_id: c.client_document_id ?? '' } : null,
      vehicle: c.vehicle_plate ? { plate: c.vehicle_plate } : null,
    }));

    const q = queryText.trim().toLowerCase();
    const filteredContracts = !q
      ? normalizedContracts
      : normalizedContracts.filter((c) => {
          const policy = (c.policy_number ?? '').replace('VIRT-', 'RCV-').toLowerCase();
          const plate = (c.vehicle?.plate ?? '').toLowerCase();
          const docId = (c.client?.document_id ?? '').toLowerCase();
          const name = (c.client?.name ?? '').toLowerCase();
          return policy.includes(q) || plate.includes(q) || docId.includes(q) || name.includes(q);
        });

    setContracts(filteredContracts);
    setTotalCount(count ?? 0);

    const map: Record<string, DocumentRow | null> = {};
    for (const c of contractData ?? []) {
      const id = (c as any).contract_id as string;
      if (!(c as any).document_id) {
        map[id] = null;
        continue;
      }
      map[id] = {
        id: (c as any).document_id,
        contract_id: id,
        kind: (c as any).document_kind,
        filename: (c as any).document_filename,
        storage_bucket: (c as any).document_storage_bucket,
        storage_path: (c as any).document_storage_path,
        mime_type: (c as any).document_mime_type,
        size_bytes: (c as any).document_size_bytes,
        created_at: (c as any).document_created_at,
      };
    }

    setDocumentsByContract(map);
    setIsLoading(false);
  };

  useEffect(() => {
    void load();
  }, [page, filterClientId, filterVehicleId, filterContractId]);

  useEffect(() => {
    if (hasAutoOpenedRef.current) return;
    if (!filterContractId) return;
    if (isLoading) return;

    const contract = contracts.find((c) => c.id === filterContractId) ?? null;
    if (!contract) return;

    if (documentsByContract[contract.id] === undefined) return;

    hasAutoOpenedRef.current = true;
    void openModal(contract);
  }, [contracts, documentsByContract, filterContractId, isLoading]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(0);
      void load();
    }, 200);
    return () => clearTimeout(t);
  }, [queryText]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const current = dragRef.current;
      if (!current) return;
      const el = document.getElementById(`overlay-${current.id}`);
      const container = document.getElementById('pdf-overlay-container');
      if (!el || !container) return;

      const rect = container.getBoundingClientRect();
      const xPx = e.clientX - rect.left - current.dx;
      const yPx = e.clientY - rect.top - current.dy;

      const nx = Math.max(0, Math.min(1, xPx / rect.width));
      const ny = Math.max(0, Math.min(1, yPx / rect.height));

      setOverlays((prev) => prev.map((o) => (o.id === current.id ? { ...o, x: nx, y: ny } : o)));
    };

    const onUp = () => {
      dragRef.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const hasFilters = useMemo(() => {
    return Boolean(filterClientId || filterVehicleId || filterContractId);
  }, [filterClientId, filterVehicleId, filterContractId]);

  const download = async (row: DocumentRow) => {
    setError(null);
    const { data, error } = await supabase.storage.from(row.storage_bucket).download(row.storage_path);
    if (error) {
      setError(error.message);
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(data);
    a.download = row.filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const remove = async (row: DocumentRow) => {
    setIsLoading(true);
    setError(null);

    const { error: storageError } = await supabase.storage.from(row.storage_bucket).remove([row.storage_path]);
    if (storageError) {
      setError(storageError.message);
      setIsLoading(false);
      return;
    }

    const { error: dbError } = await supabase.from('documents').delete().eq('id', row.id);
    if (dbError) {
      setError(dbError.message);
      setIsLoading(false);
      return;
    }

    await load();
    setIsLoading(false);
  };

  const generate = async (contract: ContractRow) => {
    setIsLoading(true);
    setError(null);

    if (pdfAbortControllerRef.current) {
      pdfAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    pdfAbortControllerRef.current = abortController;

    try {
      // Fetch related data for PDF generation
      const [{ data: clientData }, { data: vehicleData }, { data: planData }] = await Promise.all([
      supabase.from('clients').select('id,name,document_id,phone,birth_date').eq('id', contract.client_id).single(),
      supabase
        .from('vehicles')
        .select('id,plate,brand,model,year,serial_motor,serial_carroceria')
        .eq('id', contract.vehicle_id)
        .single(),
      contract.plan_id ? supabase.from('plans').select('id,name,price_usd,price_eur,coverage_details').eq('id', contract.plan_id).single() : { data: null },
    ]);

    if (!clientData || !vehicleData) {
      setError('No se pudieron cargar los datos del cliente o vehículo');
      setIsLoading(false);
      return;
    }

    const pdfBytes = await generatePolicyPDF({
      contract: {
        id: contract.id,
        policy_number: contract.policy_number,
        start_date: contract.start_date,
        end_date: contract.end_date,
        status: contract.status,
        qr_code_url: contract.qr_code_url,
        client_id: contract.client_id,
        vehicle_id: contract.vehicle_id,
        plan_id: contract.plan_id,
        created_at: contract.issued_at,
        updated_at: contract.issued_at,
      },
      client: {
        id: clientData.id,
        name: clientData.name,
        document_id: clientData.document_id,
        phone: clientData.phone,
        birth_date: clientData.birth_date,
        created_at: '',
        updated_at: '',
      },
      vehicle: {
        id: vehicleData.id,
        plate: vehicleData.plate,
        brand: vehicleData.brand,
        model: vehicleData.model,
        year: vehicleData.year,
        serial_motor: vehicleData.serial_motor,
        serial_carroceria: vehicleData.serial_carroceria,
        created_at: '',
        updated_at: '',
      },
      plan: planData ? {
        id: planData.id,
        name: planData.name,
        price_usd: planData.price_usd,
        price_eur: planData.price_eur,
        coverage_details: planData.coverage_details,
        created_at: '',
        updated_at: '',
      } : null,
      abortSignal: abortController.signal
    });

    if (abortController.signal.aborted) throw new Error('AbortError');

    const filename = `RCV-${contract.policy_number.replace('VIRT-', '').replace('RCV-', '')}.pdf`;
    const storagePath = `contracts/${contract.id}/${filename}`;
    const body = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, body, { contentType: 'application/pdf', upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setIsLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('documents').insert({
      contract_id: contract.id,
      kind: 'rcv',
      filename,
      storage_bucket: 'documents',
      storage_path: storagePath,
      mime_type: 'application/pdf',
      size_bytes: body.size,
    });

    if (insertError) {
      setError(insertError.message);
      setIsLoading(false);
      return;
    }

    await load();
    if (pdfAbortControllerRef.current === abortController) {
      setIsLoading(false);
    }
   } catch (error: any) {
     if (error.message === 'AbortError') return;
     if (pdfAbortControllerRef.current === abortController) {
       setError(error.message || 'Error inesperado');
       setIsLoading(false);
     }
   }
  };

  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Documentos</h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Búsqueda rápida</label>
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Placa, Cédula, Póliza o Nombre"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-end justify-end">
            <button
              type="button"
              onClick={() => void load()}
              className="px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            >
              Actualizar
            </button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : contracts.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">
            {hasFilters ? 'No se encontraron pólizas para los filtros actuales.' : 'Aún no hay pólizas emitidas.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2 pr-4">Póliza</th>
                  <th className="py-2 pr-4">Placa</th>
                  <th className="py-2 pr-4">Cédula</th>
                  <th className="py-2 pr-4">Asegurado</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2 pr-4">Archivo</th>
                  <th className="py-2 pr-4">Fecha</th>
                  <th className="py-2 pr-0">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => {
                  const doc = documentsByContract[c.id] ?? null;
                  const needsDoc = c.status === 'active' && !doc;

                  return (
                    <tr key={c.id} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="py-2 pr-4 text-gray-900 dark:text-white font-medium">{c.policy_number.replace('VIRT-', 'RCV-')}</td>
                      <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{c.vehicle?.plate ?? '-'}</td>
                      <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{c.client?.document_id ?? '-'}</td>
                      <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{c.client?.name ?? '-'}</td>
                      <td className="py-2 pr-4">
                        <div className="inline-flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          {needsDoc ? (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                              <AlertTriangle size={14} /> Pendiente
                            </span>
                          ) : (
                            <span>{c.status}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{doc?.filename ?? '-'}</td>
                      <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{new Date(c.issued_at).toLocaleString()}</td>
                      <td className="py-2 pr-0">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void openModal(c)}
                            className="px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
                          >
                            Ver documento
                          </button>

                          {!doc ? (
                            <button
                              type="button"
                              onClick={() => void generate(c)}
                              disabled={isLoading}
                              className="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-60"
                            >
                              Generar
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => void download(doc)}
                                className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                Descargar
                              </button>
                              <button
                                type="button"
                                onClick={() => void remove(doc)}
                                className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white"
                              >
                                Eliminar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mt-4 flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
              <div>
                Página {page + 1} de {Math.max(1, Math.ceil(totalCount / pageSize))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800 disabled:opacity-60 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * pageSize >= totalCount}
                  className="px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800 disabled:opacity-60 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setIsModalOpen(false);
              setSelectedContract(null);
              setSelectedDoc(null);
              setPdfUrl(null);
              setOverlays([]);
            }}
          />
          <div className="relative w-full max-w-5xl rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl">
            <div className="preview-layout flex flex-col h-[90vh] max-w-full bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
              <div className="contract-viewport flex-1 overflow-y-auto flex justify-center p-5 bg-[#525659]">
                <div
                  id="pdf-overlay-container"
                  className="contract-paper relative w-[210mm] min-h-[297mm] bg-white p-[10mm] shadow-[0_0_15px_rgba(0,0,0,0.3)] origin-top max-[900px]:zoom-[0.7]"
                >
                  {pdfUrl ? (
                    <iframe title="pdf" src={pdfUrl} className="absolute inset-0 w-full h-full border-0" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-600 dark:text-gray-300">
                      {selectedDoc ? 'Cargando PDF...' : 'Aún no hay PDF para este contrato. Presiona Generar PDF.'}
                    </div>
                  )}

                  {overlays.map((o) => (
                    <div
                      key={o.id}
                      id={`overlay-${o.id}`}
                      onMouseDown={(e) => {
                        const container = document.getElementById('pdf-overlay-container');
                        if (!container) return;
                        const rect = container.getBoundingClientRect();
                        const xPx = o.x * rect.width;
                        const yPx = o.y * rect.height;
                        dragRef.current = { id: o.id, dx: e.clientX - rect.left - xPx, dy: e.clientY - rect.top - yPx };
                      }}
                      className="absolute select-none cursor-move bg-white/80 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs text-gray-900 dark:text-gray-100"
                      style={{
                        left: `${o.x * 100}%`,
                        top: `${o.y * 100}%`,
                        transform: 'translate(-0%, -0%)',
                      }}
                    >
                      <input
                        value={o.text}
                        onChange={(e) => setOverlays((prev) => prev.map((p) => (p.id === o.id ? { ...p, text: e.target.value } : p)))}
                        className="bg-transparent outline-none w-40"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="action-bar h-[60px] bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end px-5 gap-2 z-10 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                <button
                  type="button"
                  onClick={addTextOverlay}
                  className="px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
                >
                  Agregar texto
                </button>
                <button
                  type="button"
                  onClick={() => void saveOverlays()}
                  className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => void regeneratePdfFromOverlays()}
                  className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Generar PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedContract(null);
                    setSelectedDoc(null);
                    setPdfUrl(null);
                    setOverlays([]);
                  }}
                  className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
