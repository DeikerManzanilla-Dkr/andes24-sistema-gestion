import { FC, useEffect, useState } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, Plus, Trash2, Loader2, FileText, User, DollarSign, Receipt } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useExchangeRates } from '../context/ExchangeRateContext';
import { useDebounce } from '../hooks/useDebounce';
import { generateInvoicePDF } from '../lib/pdfGenerator';

// ============================================
// ESQUEMA DE VALIDACIÓN ZOD
// ============================================
const invoiceItemSchema = z.object({
  description: z.string().min(1, 'La descripción es requerida'),
  quantity: z.number().min(1, 'La cantidad debe ser al menos 1'),
  unit_price: z.number().min(0, 'El precio debe ser positivo'),
});

const invoiceSchema = z.object({
  client_id: z.string().uuid('Cliente inválido'),
  items: z.array(invoiceItemSchema).min(1, 'Debe agregar al menos un servicio'),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

// ============================================
// INTERFACES
// ============================================
interface Client {
  id: string;
  name: string;
  document_id: string;
  phone: string;
  email: string | null;
  address: string | null;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export const CreateInvoice: FC = () => {
  const { session } = useAuth();
  const { rates } = useExchangeRates();
  const userId = session?.user?.id;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [generatedInvoice, setGeneratedInvoice] = useState<any>(null);

  // Estado para búsqueda de facturas emitidas
  const [showInvoiceHistory, setShowInvoiceHistory] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceHistory, setInvoiceHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Estado para búsqueda de cliente
  const [clientSearch, setClientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isSearchingClient, setIsSearchingClient] = useState(false);

  const debouncedSearch = useDebounce(clientSearch, 500);

  // ============================================
  // CONFIGURACIÓN DEL FORMULARIO
  // ============================================
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      client_id: '',
      items: [
        { description: '', quantity: 1, unit_price: 0 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // ============================================
  // WATCH PARA CÁLCULOS EN TIEMPO REAL
  // ============================================
  const items = useWatch({
    control,
    name: 'items',
  });

  const subtotalUsd = items?.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) || 0;
  const taxUsd = 0; // Sin IVA para servicios viales
  const totalUsd = subtotalUsd; // Total igual al subtotal

  // Tasa de cambio USD a BS (usar valor por defecto si no está disponible)
  const usdToBs = rates?.usd || 36.5;

  const calculations = {
    subtotal: subtotalUsd,
    tax: taxUsd,
    total: totalUsd,
    subtotalBs: subtotalUsd * usdToBs,
    taxBs: 0,
    totalBs: totalUsd * usdToBs,
    usdToBs,
  };

  // ============================================
  // BÚSQUEDA DE CLIENTE CON DEBOUNCE
  // ============================================
  useEffect(() => {
    const searchClients = async () => {
      if (debouncedSearch.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearchingClient(true);
      setError(null);

      try {
        const { data, error: searchError } = await supabase
          .from('clients')
          .select('id,name,document_id,phone,email,address')
          .or(`name.ilike.%${debouncedSearch}%,document_id.ilike.%${debouncedSearch}%`)
          .limit(10);

        if (searchError) {
          setError(searchError.message);
          setSearchResults([]);
          return;
        }

        setSearchResults((data as Client[]) || []);
      } catch (err) {
        setError('Error al buscar clientes');
        setSearchResults([]);
      } finally {
        setIsSearchingClient(false);
      }
    };

    void searchClients();
  }, [debouncedSearch]);

  // ============================================
  // SELECCIÓN DE CLIENTE
  // ============================================
  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setValue('client_id', client.id);
    setClientSearch('');
    setSearchResults([]);
  };

  // ============================================
  // AGREGAR NUEVO SERVICIO
  // ============================================
  const handleAddService = () => {
    append({ description: '', quantity: 1, unit_price: 0 });
  };

  // ============================================
  // ELIMINAR SERVICIO
  // ============================================
  const handleRemoveService = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  // ============================================
  // FUNCIÓN PARA BUSCAR FACTURAS EMITIDAS
  // ============================================
  const searchInvoices = async (query: string) => {
    if (!userId) return;
    
    setLoadingHistory(true);
    try {
      let queryBuilder = supabase
        .from('invoices')
        .select(`
          *,
          clients(name, document_id),
          invoice_items(description, quantity, unit_price, total_price)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (query) {
        queryBuilder = queryBuilder.or(`invoice_number.ilike.%${query}%,clients.name.ilike.%${query}%`);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;
      setInvoiceHistory(data || []);
    } catch (err) {
      console.error('Error buscando facturas:', err);
      setError('Error al buscar facturas');
    } finally {
      setLoadingHistory(false);
    }
  };

  // ============================================
  // FUNCIÓN PARA GENERAR PDF Y SUBIR AL BUCKET
  // ============================================
  const generarFacturaPDF = async (datos: any) => {
    try {
      // Generar PDF usando pdf-lib
      const pdfBytes = await generateInvoicePDF({
        invoice: datos.invoice,
        client: datos.client,
        items: datos.items,
        exchangeRate: calculations.usdToBs,
      });

      // Crear File para subir
      const file = new File([pdfBytes as any], `FACT-${datos.invoice.invoice_number}.pdf`, { type: 'application/pdf' });
      const filename = `FACT-${datos.invoice.invoice_number}.pdf`;
      const storagePath = `invoices/${datos.invoice.id}/${filename}`;

      // Subir al bucket de Supabase
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, { contentType: 'application/pdf', upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Obtener URL firmada para previsualización
      const { data: signed, error: signError } = await supabase.storage
        .from('documents')
        .createSignedUrl(storagePath, 60 * 15); // 15 minutos

      if (signError) {
        throw signError;
      }

      // Guardar en tabla documents
      const { error: docError } = await supabase.from('documents').insert({
        invoice_id: datos.invoice.id,
        kind: 'invoice',
        filename,
        storage_bucket: 'documents',
        storage_path: storagePath,
        mime_type: 'application/pdf',
        size_bytes: file.size,
      });

      if (docError) {
        console.warn('Error al guardar registro de documento:', docError);
        // No fallar si el registro falla, el PDF ya está subido
      }

      // Retornar URL para mostrar en modal
      return signed?.signedUrl || null;
    } catch (error) {
      console.error('Error generando PDF:', error);
      throw error;
    }
  };

  // ============================================
  // SUBMIT DEL FORMULARIO
  // ============================================
  const onSubmit = async (data: InvoiceFormData) => {
    // Validar usuario autenticado
    if (!userId) {
      setError('Usuario no autenticado. Por favor inicie sesión.');
      return;
    }

    // Validar cliente seleccionado
    if (!selectedClient || !selectedClient.id) {
      setError('Debe seleccionar un cliente válido antes de continuar.');
      return;
    }

    // Validar que haya items
    if (!data.items || data.items.length === 0) {
      setError('Debe agregar al menos un servicio a la factura.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Generar número de factura seguro (nunca nulo)
      const invoiceNumber = `INV-${Date.now().toString()}`;

      // 2. Insertar cabecera de factura con casteo explícito de tipos
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          client_id: selectedClient.id, // Extraído directamente del cliente seleccionado
          user_id: userId, // ID del usuario autenticado actual
          invoice_number: invoiceNumber, // String seguro, nunca nulo
          subtotal: Number(calculations.subtotal), // Casteo explícito a Number
          tax: Number(calculations.tax), // Casteo explícito a Number
          total_amount: Number(calculations.total), // Casteo explícito a Number
          status: 'PAID', // Status por defecto según esquema
        })
        .select()
        .single();

      if (invoiceError) {
        console.error('Error al insertar factura:', invoiceError);
        setError(`Error al crear factura: ${invoiceError.message}`);
        setIsSubmitting(false);
        return;
      }

      if (!invoiceData || !invoiceData.id) {
        setError('Error: No se pudo obtener el ID de la factura creada.');
        setIsSubmitting(false);
        return;
      }

      const invoiceId = invoiceData.id;

      // 3. Insertar items de factura con casteo explícito de tipos
      const itemsToInsert = data.items.map((item) => ({
        invoice_id: invoiceId, // FK a la factura recién creada
        description: String(item.description), // Asegurar string
        quantity: Number(item.quantity), // Casteo explícito a Number (integer en Postgres)
        unit_price: Number(item.unit_price), // Casteo explícito a Number (numeric en Postgres)
        total_price: Number(item.quantity * item.unit_price), // Casteo explícito a Number (numeric en Postgres)
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error al insertar items:', itemsError);
        setError(`Error al agregar servicios: ${itemsError.message}`);
        setIsSubmitting(false);
        return;
      }

      // 4. Generar PDF y obtener URL
      try {
        const pdfSignedUrl = await generarFacturaPDF({
          invoice: invoiceData,
          client: selectedClient,
          items: itemsToInsert,
        });

        if (pdfSignedUrl) {
          setPdfUrl(pdfSignedUrl);
          setGeneratedInvoice(invoiceData);
          setShowPdfModal(true);
        }
      } catch (pdfError) {
        console.error('Error al generar PDF:', pdfError);
        // No fallar el proceso si el PDF falla, pero avisar
        setError('Factura creada exitosamente, pero hubo un error al generar el PDF.');
      }

      // 5. Mostrar éxito y limpiar formulario
      setSuccess(true);
      reset();
      setSelectedClient(null);
      setClientSearch('');

      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error('Error inesperado al procesar factura:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al procesar la factura';
      setError(`Error: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // FORMATO DE MONEDA
  // ============================================
  const formatCurrency = (amount: number, currency: 'USD' | 'VES' = 'USD') => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatBs = (amount: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="container mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Crear Factura</h1>
          <p className="text-gray-600 dark:text-gray-400">Generar facturas digitales para clientes</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowInvoiceHistory(true);
            searchInvoices('');
          }}
          className="px-4 py-2 text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          <FileText size={18} />
          Ver Facturas Emitidas
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-lg p-4">
          <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/40 rounded-lg p-4">
          <p className="text-sm text-green-700 dark:text-green-200">
            ✓ Factura generada exitosamente
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ============================================
            COLUMNA PRINCIPAL - FORMULARIO
            ============================================ */}
        <div className="lg:col-span-2 space-y-6">
          {/* Buscador de Cliente */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User size={20} />
              Cliente
            </h2>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Buscar por nombre o cédula..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
              {isSearchingClient && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 animate-spin" size={20} />
              )}
            </div>

            {/* Resultados de búsqueda */}
            {searchResults.length > 0 && (
              <div className="mt-3 border border-gray-200 dark:border-gray-600 rounded-md max-h-48 overflow-y-auto">
                {searchResults.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleSelectClient(client)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0 transition-colors"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{client.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {client.document_id} • {client.phone}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Cliente seleccionado */}
            {selectedClient && (
              <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/40 rounded-md p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{selectedClient.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <div>C.I/RIF: {selectedClient.document_id}</div>
                      <div>Teléfono: {selectedClient.phone}</div>
                      {selectedClient.email && <div>Email: {selectedClient.email}</div>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient(null);
                      setValue('client_id', '');
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            )}

            {errors.client_id && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.client_id.message}</p>
            )}
          </div>

          {/* Lista de Servicios */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText size={20} />
              Servicios
            </h2>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-3 items-start">
                  {/* Descripción */}
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="Descripción"
                      {...register(`items.${index}.description` as const)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    {errors.items?.[index]?.description && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {errors.items[index]?.description?.message}
                      </p>
                    )}
                  </div>

                  {/* Cantidad */}
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Cant."
                      {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    {errors.items?.[index]?.quantity && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {errors.items[index]?.quantity?.message}
                      </p>
                    )}
                  </div>

                  {/* Precio Unitario */}
                  <div className="col-span-3">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Precio"
                      {...register(`items.${index}.unit_price` as const, { valueAsNumber: true })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    {errors.items?.[index]?.unit_price && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {errors.items[index]?.unit_price?.message}
                      </p>
                    )}
                  </div>

                  {/* Total del item */}
                  <div className="col-span-1 text-right">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(items[index]?.quantity * items[index]?.unit_price || 0)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatBs((items[index]?.quantity * items[index]?.unit_price || 0) * calculations.usdToBs)}
                    </div>
                  </div>

                  {/* Botón eliminar */}
                  <div className="col-span-1">
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveService(index)}
                        className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddService}
              className="mt-4 w-full px-4 py-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Agregar Servicio
            </button>

            {errors.items && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.items.message}</p>
            )}
          </div>
        </div>

        {/* ============================================
            COLUMNA LATERAL - RESUMEN Y ACCIÓN
            ============================================ */}
        <div className="lg:col-span-1 space-y-6">
          {/* Resumen de Factura */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Receipt size={20} />
              Resumen
            </h2>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <div className="text-right">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(calculations.subtotal)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatBs(calculations.subtotalBs)}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">Total</span>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(calculations.total)}
                    </div>
                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                      {formatBs(calculations.totalBs)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botón de Acción */}
          <button
            type="submit"
            disabled={!isValid || isSubmitting || !selectedClient}
            className="w-full px-6 py-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-lg font-medium"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                Procesando...
              </>
            ) : (
              <>
                <DollarSign size={24} />
                Emitir y Descargar Factura
              </>
            )}
          </button>

          {/* Información adicional */}
          <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              La factura se generará en formato PDF y se almacenará en el sistema.
            </p>
          </div>
        </div>
      </form>

      {/* Modal de Previsualización de PDF */}
      {showPdfModal && pdfUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Factura #{generatedInvoice?.invoice_number}
              </h3>
              <button
                onClick={() => setShowPdfModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <Trash2 size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <iframe
                src={pdfUrl}
                className="w-full h-full min-h-[500px] border-0"
                title="Vista previa de factura"
              />
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowPdfModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cerrar
              </button>
              <a
                href={pdfUrl}
                download={`FACT-${generatedInvoice?.invoice_number}.pdf`}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Receipt size={18} />
                Descargar PDF
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Historial de Facturas */}
      {showInvoiceHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Facturas Emitidas
              </h3>
              <button
                onClick={() => setShowInvoiceHistory(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <Trash2 size={20} />
              </button>
            </div>

            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por número de factura o cliente..."
                  value={invoiceSearch}
                  onChange={(e) => {
                    setInvoiceSearch(e.target.value);
                    searchInvoices(e.target.value);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-blue-600" size={32} />
                </div>
              ) : invoiceHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No se encontraron facturas
                </div>
              ) : (
                <div className="space-y-3">
                  {invoiceHistory.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              #{invoice.invoice_number}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              invoice.status === 'PAID' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            }`}>
                              {invoice.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Cliente: {invoice.clients?.name || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            C.I/RIF: {invoice.clients?.document_id || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {new Date(invoice.created_at).toLocaleDateString('es-VE')}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900 dark:text-white">
                            ${invoice.total_amount.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Bs. {(invoice.total_amount * (rates?.usd || 36.5)).toFixed(0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowInvoiceHistory(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
