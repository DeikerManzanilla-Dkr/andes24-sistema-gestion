import { FC, useMemo } from 'react';

type Client = {
  name: string;
  document_id: string;
  phone: string;
  address: string | null;
  birth_date: string | null;
};

// 1. Agregamos clase, peso y puestos al tipo
type Vehicle = {
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  serial_motor: string | null;
  serial_carroceria: string | null;
  clase: string | null;
  peso: string | null;
  puestos: string | null;
};

type Contract = {
  policy_number: string;
  start_date: string;
  end_date: string;
  status: string;
  qr_code_url: string | null;
};

export const PolicyDocument: FC<{
  contract: Contract;
  client: Client;
  vehicle: Vehicle;
}> = ({ contract, client, vehicle }) => {
  const templateUrl = useMemo(() => {
    return new URL('../PLANTILLA/FORMATO PAPELERIA .pdf', import.meta.url).toString();
  }, []);

  const verifyUrl = contract.qr_code_url ?? `${window.location.origin}/verify?policy=${encodeURIComponent(contract.policy_number)}`;

  const qrImageUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(verifyUrl)}`;
  }, [verifyUrl]);

  return (
    <div className="policy-print-root bg-white text-black">
      <style>{`
        @page { size: letter; margin: 0; }
        .policy-print-root { margin: 0 auto; }
        .policy-sheet { position: relative; width: 216mm; height: 279mm; overflow: hidden; }
        .policy-bg { position: absolute; inset: 0; width: 216mm; height: 279mm; }
        .policy-bg iframe { width: 216mm; height: 279mm; border: 0; }
        .policy-layer { position: absolute; inset: 0; }
        .field { position: absolute; font-size: 10pt; line-height: 1.2; }
        .field.small { font-size: 9pt; }
        .field.bold { font-weight: 700; }
        .no-print { display: block; }
        .cutline { position: absolute; left: 0; right: 0; border-top: 1px dashed rgba(0,0,0,0.35); }

        @media print {
          .no-print { display: none !important; }
          .policy-print-root { margin: 0; }
        }
      `}</style>

      <div className="no-print" style={{ padding: '12px 0' }}>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{ padding: '8px 12px', borderRadius: 8, background: '#111827', color: 'white' }}
          >
            Imprimir
          </button>
        </div>
      </div>

      <div className="policy-sheet aspect-[8.5/11]">
        <div className="policy-bg">
          <iframe title="plantilla" src={templateUrl} />
        </div>

        <div className="policy-layer">
          {/* CONTRATO (parte superior) */}
          <div className="field bold" style={{ top: '18mm', left: '16mm' }}>N° DE CONTRATO: {contract.policy_number}</div>
          <div className="field" style={{ top: '24mm', left: '16mm' }}>INICIO: {contract.start_date}</div>
          <div className="field" style={{ top: '30mm', left: '16mm' }}>ESTE CONTRATO CADUCA EL: {contract.end_date}</div>

          {/* CLIENTE (evitar solapamiento: filas separadas) */}
          <div className="field" style={{ top: '44mm', left: '16mm', width: '160mm' }}>
            <span className="font-bold">NOMBRE:</span> {client.name}
          </div>
          <div className="field" style={{ top: '50mm', left: '16mm', width: '160mm' }}>
            <span className="font-bold">CÉDULA/RIF:</span> {client.document_id}
          </div>
          <div className="field" style={{ top: '56mm', left: '16mm', width: '160mm' }}>
            <span className="font-bold">TELÉFONO:</span> {client.phone}
          </div>
          <div className="field small" style={{ top: '62mm', left: '16mm', width: '160mm' }}>
            <span className="font-bold">DIRECCIÓN:</span> {client.address ?? '-'}
          </div>

          {/* VEHÍCULO (tabular denso) */}
          {/* Fila 1 */}
          <div className="field" style={{ top: '76mm', left: '16mm' }}>
            <span className="font-bold">MARCA:</span> {vehicle.brand ?? '-'}
          </div>
          <div className="field" style={{ top: '76mm', left: '78mm' }}>
            <span className="font-bold">MODELO:</span> {vehicle.model ?? '-'}
          </div>
          <div className="field" style={{ top: '76mm', left: '150mm' }}>
            <span className="font-bold">PLACA:</span> {vehicle.plate}
          </div>

          {/* Fila 2 - Se agrega Clase y Puestos alineados con Modelo y Placa */}
          <div className="field" style={{ top: '82mm', left: '16mm' }}>
            <span className="font-bold">AÑO:</span> {vehicle.year ?? '-'}
          </div>
          <div className="field" style={{ top: '82mm', left: '78mm' }}>
            <span className="font-bold">CLASE:</span> {vehicle.clase || '-'}
          </div>
          <div className="field" style={{ top: '82mm', left: '150mm' }}>
            <span className="font-bold">PUESTOS:</span> {vehicle.puestos || '-'}
          </div>

          {/* Fila 3 - Se agrega Peso alineado con Modelo */}
          <div className="field" style={{ top: '88mm', left: '16mm' }}>
            <span className="font-bold">S/MOTOR:</span> {vehicle.serial_motor ?? '-'}
          </div>
          <div className="field" style={{ top: '88mm', left: '78mm' }}>
            <span className="font-bold">PESO:</span> {vehicle.peso || '-'}
          </div>

          {/* Fila 4 */}
          <div className="field" style={{ top: '94mm', left: '16mm' }}>
            <span className="font-bold">S/CARR:</span> {vehicle.serial_carroceria ?? '-'}
          </div>

          <div className="field" style={{ top: '18mm', right: '12mm', width: '42mm', textAlign: 'center' }}>
            <img src={qrImageUrl} alt="QR" style={{ width: '40mm', height: '40mm', background: 'white' }} />
            <div className="small" style={{ fontSize: '7pt', marginTop: 4, wordBreak: 'break-all' }}>{verifyUrl}</div>
          </div>

          {/* Línea de corte para carnet (parte inferior) */}
          <div className="cutline" style={{ top: '165mm' }} />

          {/* CARNET (parte inferior - formato bolsillo) */}
          <div className="field bold" style={{ top: '172mm', left: '16mm' }}>CARNET RCV</div>
          <div className="field" style={{ top: '178mm', left: '16mm', width: '150mm' }}>
            <span className="font-bold">PÓLIZA:</span> {contract.policy_number}
          </div>
          <div className="field" style={{ top: '184mm', left: '16mm', width: '150mm' }}>
            <span className="font-bold">TITULAR:</span> {client.name}
          </div>
          <div className="field" style={{ top: '190mm', left: '16mm', width: '150mm' }}>
            <span className="font-bold">F. NAC:</span> {client.birth_date ?? '-'}
          </div>
          <div className="field" style={{ top: '196mm', left: '16mm', width: '150mm' }}>
            <span className="font-bold">PLACA:</span> {vehicle.plate}
          </div>
          <div className="field" style={{ top: '202mm', left: '16mm', width: '150mm' }}>
            <span className="font-bold">VIGENCIA:</span> {contract.start_date} - {contract.end_date}
          </div>

          <div className="field flex justify-center w-full" style={{ top: '176mm', right: '12mm', width: '22mm', textAlign: 'center' }}>
            <img src={qrImageUrl} alt="QR" style={{ width: '55px', height: '55px', background: 'white', margin: '0 auto' }} />
          </div>
        </div>
      </div>
    </div>
  );
};