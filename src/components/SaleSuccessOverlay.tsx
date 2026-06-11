import { CheckCircle2 } from "lucide-react";

interface SaleSuccessOverlayProps {
  isOpen: boolean;
  message?: string;
}

export const SaleSuccessOverlay = ({ isOpen, message = "¡Documento aprobado!" }: SaleSuccessOverlayProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex flex-col items-center justify-center space-y-6 animate-in zoom-in-95 duration-300">
        <div className="w-32 h-32 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.4)] animate-in scale-in duration-300">
          <CheckCircle2 className="w-20 h-20 text-white" strokeWidth={2.5} />
        </div>
        <h2 className="text-4xl font-bold text-white drop-shadow-md tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          {message}
        </h2>
      </div>
    </div>
  );
};
