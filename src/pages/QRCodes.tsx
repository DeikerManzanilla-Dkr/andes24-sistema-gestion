import { FC, useMemo, useState } from 'react';
import { Download, ExternalLink, QrCode, Search } from 'lucide-react';
import { useFullContracts } from '../hooks/useFullContracts';

export const QRCodes: FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const { contracts, loading: isLoading, error } = useFullContracts();

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return contracts;
    return contracts.filter((c) => {
      const plate = c.vehicle_plate?.toLowerCase() ?? '';
      const policy = c.policy_number?.replace('VIRT-', 'RCV-').toLowerCase() ?? '';
      const client = c.client_name?.toLowerCase() ?? '';
      const documentId = c.client_document_id?.toLowerCase() ?? '';
      return plate.includes(q) || policy.includes(q) || client.includes(q) || documentId.includes(q);
    });
  }, [contracts, searchTerm]);

  const handleDownloadPdf = async (pdfUrl: string, filename: string) => {
    try {
      const res = await fetch(pdfUrl);
      if (!res.ok) {
        setDownloadError('No se pudo descargar el PDF');
        return;
      }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      setDownloadError('No se pudo descargar el PDF');
    }
  };

  return (
    <div className="container mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
            <QrCode className="w-6 h-6 text-blue-600" />
            Códigos QR
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Galería de accesos rápidos a pólizas emitidas
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por placa, cédula, póliza o nombre..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:outline-none dark:text-white"
          />
        </div>
      </div>

      {(error || downloadError) && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-lg p-3">
          <p className="text-sm text-red-700 dark:text-red-200">{error ?? downloadError}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {isLoading ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">Cargando códigos...</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {searchTerm ? 'No se encontraron resultados para tu búsqueda.' : 'No se encontraron pólizas registradas.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => {
              const pdfUrl = c.pdf_url ?? '';
              const plate = c.vehicle_plate ?? 'Sin placa';
              const clientName = c.client_name ?? '—';
              const documentId = c.client_document_id ?? '—';
              const displayPolicyNumber = (c.policy_number ?? '').replace('VIRT-', 'RCV-');
              const qrData = pdfUrl || displayPolicyNumber;
              const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
              const hasPdf = !!pdfUrl;
              const isActive = c.status === 'active';

              return (
                <div
                  key={c.contract_id}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden hover:shadow-lg transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-700"
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {displayPolicyNumber}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Placa: {plate}
                        </div>
                      </div>
                      <div className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                      }`}>
                        {isActive ? 'Activa' : 'Inactiva'}
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4">
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {clientName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Cédula: {documentId}
                        </div>
                      </div>

                      {/* QR Code */}
                      <div className="flex justify-center py-2">
                        <div className="relative">
                          <div className="w-32 h-32 bg-white rounded-lg border-2 border-gray-200 overflow-hidden shadow-sm">
                            <img 
                              src={qrSrc} 
                              alt="QR Código" 
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                            <div className="hidden w-full h-full flex items-center justify-center bg-gray-50">
                              <div className="text-xs text-gray-500 text-center px-2">
                                {hasPdf ? 'Error QR' : 'Pendiente'}
                              </div>
                            </div>
                          </div>
                          {!hasPdf && (
                            <div className="absolute -top-2 -right-2 bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded-full dark:bg-yellow-900/30 dark:text-yellow-300">
                              Pendiente
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="bg-gray-50 dark:bg-gray-900/20 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-2">
                      {hasPdf ? (
                        <>
                          <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Ver PDF
                          </a>
                          <button
                            type="button"
                            onClick={() => void handleDownloadPdf(pdfUrl, `${displayPolicyNumber}.pdf`)}
                            className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                            title="Descargar PDF"
                          >
                            <Download className="w-4 h-4" />
                            Descargar
                          </button>
                        </>
                      ) : (
                        <div className="col-span-2 text-center">
                          <div className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                            <QrCode className="w-4 h-4" />
                            PDF no disponible
                          </div>
                        </div>
                      )}
                    </div>
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
