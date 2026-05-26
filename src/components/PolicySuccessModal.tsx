import { FC } from 'react';
import { CheckCircle2, Download, FileText, X } from 'lucide-react';

interface PolicySuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  policyNumber: string;
  qrUrl?: string | null;
  onViewDocument?: () => void;
  onDownload?: () => void;
  onGoToDocuments?: () => void;
}

export const PolicySuccessModal: FC<PolicySuccessModalProps> = ({
  isOpen,
  onClose,
  policyNumber,
  qrUrl,
  onViewDocument,
  onDownload,
  onGoToDocuments,
}) => {
  if (!isOpen) return null;

  const displayPolicyNumber = policyNumber.replace('VIRT-', 'RCV-');
  const qrImageUrl = qrUrl
    ? qrUrl
    : `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(displayPolicyNumber)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            ¡Póliza Emitida!
          </h2>
          <p className="text-emerald-100 text-sm">
            La póliza ha sido generada exitosamente
          </p>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {/* Número de póliza */}
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Número de Póliza</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {displayPolicyNumber}
            </div>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-40 h-40 bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-lg">
                <img
                  src={qrImageUrl}
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
                    Error al cargar QR
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Información adicional */}
          <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4">
            <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
              Escanea el código QR para verificar la autenticidad de la póliza
            </div>
          </div>

          {/* Botones de acción */}
          <div className="space-y-3">
            {onViewDocument && (
              <button
                type="button"
                onClick={onViewDocument}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors font-medium"
              >
                <FileText className="w-5 h-5" />
                Ver Documento
              </button>
            )}

            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors font-medium"
              >
                <Download className="w-5 h-5" />
                Descargar PDF
              </button>
            )}

            {onGoToDocuments && (
              <button
                type="button"
                onClick={onGoToDocuments}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Ir a Documentos
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors font-medium"
            >
              <X className="w-5 h-5" />
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
