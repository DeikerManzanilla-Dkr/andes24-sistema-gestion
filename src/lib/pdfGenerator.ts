import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { PdfClientLegacy, PdfVehicleLegacy, PdfPlanLegacy, PdfContractLegacy } from '../types/database';

const QR_CODE_CACHE = new Map<string, Uint8Array>();



// --- TIPOS UNIFICADOS ---
export interface FullPdfData {
  contract: {
    policy_number: string;
    start_date: string;
    end_date: string;
    issue_time?: string;
    invoice_number?: string;
    qr_code_url?: string;
  };
  client: {
    name: string;
    document_id: string;
    phone: string;
    address?: string;
    email?: string;
    birth_date?: string;
  };
  vehicle: {
    plate: string;
    brand: string;
    model: string;
    year: string | number;
    puestos: string | number;
    tipo: string;
    clase: string;
    color: string;
    uso: string;
    serial_carroceria: string;
    serial_motor: string;
    peso: string;
  };
  coverages: Array<{ desc: string; montoUsd: string; montoBs: string }>;
  overlays?: Array<{ text: string; x: number; y: number; fontSize?: number }>;
}

export type PdfOverlayElement = {
  id: string;
  type: 'text';
  text: string;
  x: number;
  y: number;
  fontSize?: number;
};

interface TemplateField {
  key: string;
  label?: string;
  x: number;
  y: number;
  fontSize?: number;
  font?: 'regular' | 'bold';
  color?: { r: number; g: number; b: number };
  labelWidth?: number;
  valueOffset?: number;
  format?: (value: any) => string;
}

interface TemplateSection {
  name: string;
  position: { x: number; y: number };
  fields: TemplateField[];
}

interface TemplateConfig {
  name: string;
  version: string;
  pageSize: [number, number];
  grid?: {
    columns: number[];
    rowHeight: number;
    sectionSpacing: number;
    margins: { top: number; right: number; bottom: number; left: number };
  };
  globalOffset?: { x: number; y: number };
  showDebugGrid?: boolean;
  sections: TemplateSection[];
  qrCode: { x: number; y: number; size: number };
  carnet?: { x: number; y: number; width: number; height: number };
}

// Configuración de coordenadas basada en la plantilla física
const ANDES24_TEMPLATE: TemplateConfig = {
  name: 'andes24-policy',
  version: '1.1',
  pageSize: [612, 792],

  grid: {
    columns: [45, 230, 450, 520],
    rowHeight: 25,
    sectionSpacing: 35,
    margins: { top: 40, right: 40, bottom: 40, left: 40 }
  },

  globalOffset: { x: 0, y: 0 },
  showDebugGrid: false,

  sections: [
    {
      name: 'header',
      position: { x: 0, y: 50 },
      fields: [
        {
          key: 'contract.policy_number',
          label: 'N° DE CONTRATO:',
          x: 400,
          y: 615,
          fontSize: 12,
          font: 'bold',
          labelWidth: 100,
          valueOffset: 115
        },
        {
          key: 'contract.start_date',
          label: 'INICIO:',
          x: 400,
          y: 600,
          fontSize: 9,
          font: 'bold',
          labelWidth: 45,
          valueOffset: 50
        },
        {
          key: 'contract.end_date',
          label: 'CADUCA EL:',
          x: 400,
          y: 585,
          fontSize: 9,
          font: 'bold',
          labelWidth: 160,
          valueOffset: 165
        },
      ]
    },
    {
      name: 'client',
      position: { x: 0, y: 0 },
      fields: [
        {
          key: 'client.name',
          label: 'NOMBRE:',
          x: 20,
          y: 610,
          fontSize: 9,
          font: 'regular',
          labelWidth: 60,
          valueOffset: 65
        },
        {
          key: 'client.document_id',
          label: 'CÉDULA/RIF:',
          x: 20,
          y: 595,
          fontSize: 9,
          font: 'regular',
          labelWidth: 80,
          valueOffset: 85
        },
        {
          key: 'client.address',
          label: 'DIRECCIÓN:',
          x: 20,
          y: 580,
          fontSize: 9,
          font: 'regular',
          labelWidth: 70,
          valueOffset: 75
        },
        {
          key: 'client.phone',
          label: 'TELÉFONO:',
          x: 20,
          y: 565,
          fontSize: 9,
          font: 'regular',
          labelWidth: 60,
          valueOffset: 65
        },
        {
          key: 'client.email',
          label: 'CORREO ELECTRÓNICO:',
          x: 20,
          y: 550,
          fontSize: 9,
          font: 'regular',
          labelWidth: 120,
          valueOffset: 125
        }
      ]
    },
    {
      name: 'vehicle',
      position: { x: 0, y: 0 },
      fields: [
        {
          key: 'vehicle.brand',
          label: 'MARCA:',
          x: 20,
          y: 505,
          fontSize: 9,
          font: 'regular',
          labelWidth: 50,
          valueOffset: 52
        },
        {
          key: 'vehicle.model',
          label: 'MODELO:',
          x: 205,
          y: 505,
          fontSize: 9,
          font: 'regular',
          labelWidth: 55,
          valueOffset: 57
        },
        {
          key: 'vehicle.plate',
          label: 'PLACA:',
          x: 425,
          y: 505,
          fontSize: 9,
          font: 'regular',
          labelWidth: 50,
          valueOffset: 52
        },
        {
          key: 'vehicle.year',
          label: 'AÑO:',
          x: 20,
          y: 490,
          fontSize: 9,
          font: 'regular',
          labelWidth: 35,
          valueOffset: 37
        },
        {
          key: 'vehicle.puestos',
          label: 'PUESTOS:',
          x: 205,
          y: 490,
          fontSize: 9,
          font: 'regular',
          labelWidth: 60,
          valueOffset: 62
        },
        {
          key: 'vehicle.tipo',
          label: 'TIPO:',
          x: 425,
          y: 490,
          fontSize: 9,
          font: 'regular',
          labelWidth: 40,
          valueOffset: 42
        },
        {
          key: 'vehicle.clase',
          label: 'CLASE:',
          x: 20,
          y: 475,
          fontSize: 9,
          font: 'regular',
          labelWidth: 45,
          valueOffset: 47
        },
        {
          key: 'vehicle.color',
          label: 'COLOR:',
          x: 205,
          y: 475,
          fontSize: 9,
          font: 'regular',
          labelWidth: 50,
          valueOffset: 52
        },
        {
          key: 'vehicle.uso',
          label: 'USO:',
          x: 425,
          y: 475,
          fontSize: 9,
          font: 'regular',
          labelWidth: 35,
          valueOffset: 37
        },
        {
          key: 'vehicle.serial_carroceria',
          label: 'S/CARR:',
          x: 20,
          y: 460,
          fontSize: 9,
          font: 'regular',
          labelWidth: 55,
          valueOffset: 57
        },
        {
          key: 'vehicle.peso',
          label: 'PESO:',
          x: 205,
          y: 460,
          fontSize: 9,
          font: 'regular',
          labelWidth: 45,
          valueOffset: 47
        },
        {
          key: 'vehicle.serial_motor',
          label: 'S/MOTOR:',
          x: 425,
          y: 460,
          fontSize: 9,
          font: 'regular',
          labelWidth: 65,
          valueOffset: 67
        }
      ]
    },
    {
      name: 'coverages',
      position: { x: 0, y: 0 },
      fields: []
    },
    {
      name: 'carnet_front',
      position: { x: 0, y: 0 },
      fields: [
        { key: 'client.name', label: 'CLIENTE:', x: 95, y: 125, fontSize: 7, font: 'bold', labelWidth: 50, valueOffset: 52 },
        { key: 'client.document_id', label: 'CÉDULA:', x: 95, y: 115, fontSize: 7, font: 'bold', labelWidth: 35, valueOffset: 37 },

        { key: 'vehicle.clase', label: 'CLASE:', x: 95, y: 107, fontSize: 7, font: 'bold', labelWidth: 30, valueOffset: 32 },
        { key: 'vehicle.brand', label: 'MARCA:', x: 95, y: 97, fontSize: 7, font: 'bold', labelWidth: 32, valueOffset: 34 },
        { key: 'vehicle.model', label: 'MODELO:', x: 95, y: 87, fontSize: 7, font: 'bold', labelWidth: 35, valueOffset: 37 },
        { key: 'vehicle.year', label: 'AÑO:', x: 95, y: 77, fontSize: 7, font: 'bold', labelWidth: 22, valueOffset: 24 },
        { key: 'vehicle.color', label: 'COLOR:', x: 95, y: 67, fontSize: 7, font: 'bold', labelWidth: 32, valueOffset: 34 },

        { key: 'vehicle.uso', label: 'USO:', x: 200, y: 107, fontSize: 7, font: 'bold', labelWidth: 22, valueOffset: 24 },
        { key: 'vehicle.plate', label: 'PLACA:', x: 200, y: 97, fontSize: 7, font: 'bold', labelWidth: 32, valueOffset: 34 },
        { key: 'vehicle.tipo', label: 'TIPO:', x: 200, y: 87, fontSize: 7, font: 'bold', labelWidth: 25, valueOffset: 27 },
        { key: 'vehicle.serial_motor', label: 'S/M:', x: 200, y: 77, fontSize: 7, font: 'bold', labelWidth: 20, valueOffset: 22 },
        { key: 'vehicle.serial_carroceria', label: 'S/C:', x: 200, y: 67, fontSize: 7, font: 'bold', labelWidth: 20, valueOffset: 22 },
      ]
    },
    {
      name: 'carnet_back',
      position: { x: 0, y: 0 },
      fields: [
        { key: 'static.header1', label: 'CERTIFICADO DE RCV', x: 320, y: 190, fontSize: 6, font: 'bold' },
        {
          key: 'contract.policy_number',
          label: 'Nº ',
          x: 430,
          y: 190,
          fontSize: 6,
          font: 'bold',
          labelWidth: 15,
          valueOffset: 15
        },
        // Texto legal: renderizado por renderLegalText() – no usar campo estático aquí
        { key: 'static.contact1', label: '0416-9227714', x: 350, y: 95, fontSize: 7, font: 'bold' },
        { key: 'static.contact2', label: '0271-2210661', x: 420, y: 95, fontSize: 7, font: 'bold' },
        { key: 'static.contact3', label: '0424-7708542', x: 350, y: 80, fontSize: 7, font: 'bold' },
        { key: 'static.contact4', label: '0412-7139532', x: 420, y: 80, fontSize: 7, font: 'bold' },

        { key: 'contract.start_date', label: 'EMISIÓN:', x: 320, y: 70, fontSize: 7, font: 'bold', labelWidth: 36, valueOffset: 38 },
        { key: 'static.vigencia', label: 'VIGENCIA: 1 AÑO', x: 400, y: 70, fontSize: 7, font: 'bold' },
        { key: 'contract.end_date', label: 'VENCE:', x: 470, y: 70, fontSize: 7, font: 'bold', labelWidth: 30, valueOffset: 32 },
      ]
    }
  ],
  qrCode: { x: 450, y: 650, size: 92 },
  carnet: { x: 40, y: 190, width: 515, height: 150 }
};

class TemplateEngine {
  private template: TemplateConfig;

  constructor(template: TemplateConfig) {
    this.template = template;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private formatValue(key: string, value: any, data: FullPdfData): string {
    if (!value) return '';

    switch (key) {
      case 'contract.policy_number':
        return String(value).toUpperCase();
      case 'contract.dates_range':
        return `${data.contract.start_date} al ${data.contract.end_date}`;
      default:
        return String(value);
    }
  }

  private async renderText(page: any, field: TemplateField, data: FullPdfData, pdfDoc: PDFDocument): Promise<void> {
    const value = this.getNestedValue(data, field.key);
    const formattedValue = field.format ? field.format(value) : this.formatValue(field.key, value, data);

    if (!formattedValue && !field.label) return;

    const offsetX = this.template.globalOffset?.x || 0;
    const offsetY = this.template.globalOffset?.y || 0;

    const labelFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const valueFont = field.font === 'bold'
      ? await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      : await pdfDoc.embedFont(StandardFonts.Helvetica);

    const color = field.color ? rgb(field.color.r, field.color.g, field.color.b) : rgb(0, 0, 0);
    const fontSize = field.fontSize || 9;

    if (field.label) {
      page.drawText(field.label, {
        x: field.x + offsetX,
        y: field.y + offsetY,
        size: fontSize,
        font: labelFont,
        color: color
      });

      if (formattedValue) {
        const valueX = field.x + (field.valueOffset || field.labelWidth || 0);
        page.drawText(formattedValue, {
          x: valueX + offsetX,
          y: field.y + offsetY,
          size: fontSize,
          font: valueFont,
          color: color
        });
      }
    } else {
      page.drawText(formattedValue, {
        x: field.x + offsetX,
        y: field.y + offsetY,
        size: fontSize,
        font: valueFont,
        color: color
      });
    }
  }

  private async renderSection(page: any, section: TemplateSection, data: FullPdfData, pdfDoc: PDFDocument): Promise<void> {
    for (const field of section.fields) {
      await this.renderText(page, field, data, pdfDoc);
    }
  }

  private async renderCoverages(page: any, data: FullPdfData, pdfDoc: PDFDocument): Promise<void> {
    const offsetX = this.template.globalOffset?.x || 0;
    const offsetY = this.template.globalOffset?.y || 0;

    let y = 390;

    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    page.drawText('COBERTURAS', { x: 235 + offsetX, y: y + offsetY, size: 10, font: boldFont });
    page.drawText('Monto $', { x: 495 + offsetX, y: y + offsetY, size: 9, font: boldFont });
    y -= 20;

    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const lookup = new Map(data.coverages.map((c) => [String(c.desc || '').toUpperCase(), c] as const));
    const rows = ['DAÑOS A COSAS', 'DAÑOS A PERSONAS'];

    for (const desc of rows) {
      const hit = lookup.get(desc) ?? null;
      const montoUsd = hit?.montoUsd ?? '';
      page.drawText(desc, { x: 20 + offsetX, y: y + offsetY, size: 8.5, font: regularFont });
      page.drawText(String(montoUsd), { x: 495 + offsetX, y: y + offsetY, size: 8.5, font: regularFont });
      y -= 13;
    }
  }

  private async renderLegalText(page: any, pdfDoc: PDFDocument): Promise<void> {
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const lines = [
      'Tu futuro, hoy más seguro.',
      'Esta credencial certifica que la persona',
      'y el vehículo indicados poseen un contrato',
      'de garantías administradas que cubre',
      'responsabilidad civil y daños a terceros.',
      'Agradecemos a las autoridades su',
      'colaboración.',
    ];
    const startX = 325;
    let y = 178;
    const lineHeight = 7;
    for (const line of lines) {
      page.drawText(line, { x: startX, y, size: 7, font });
      y -= lineHeight;
    }
  }

  private async renderSeparatorLines(page: any): Promise<void> {
    const offsetX = this.template.globalOffset?.x || 0;
    const offsetY = this.template.globalOffset?.y || 0;
    const lineColor = rgb(0.82, 0.84, 0.86); // #d1d5db

    // Línea 1: Entre Cliente y Vehículo (y=535)
    page.drawLine({
      start: { x: 20 + offsetX, y: 535 + offsetY },
      end: { x: 580 + offsetX, y: 535 + offsetY },
      thickness: 5,
      color: lineColor,
    });

    // Línea 2: Entre Vehículo y Coberturas (y=445)
    page.drawLine({
      start: { x: 20 + offsetX, y: 445 + offsetY },
      end: { x: 580 + offsetX, y: 445 + offsetY },
      thickness: 5,
      color: lineColor,
    });

    // Línea 3: Entre Coberturas y Pie de página (y=215 - más arriba de avenida josé luis faure)
    page.drawLine({
      start: { x: 20 + offsetX, y: 215 + offsetY },
      end: { x: 580 + offsetX, y: 215 + offsetY },
      thickness: 5,
      color: lineColor,
    });
  }

  private async renderQRCode(page: any, data: FullPdfData, pdfDoc: PDFDocument): Promise<void> {
    const verifyUrl = data.contract.qr_code_url ||
      (typeof window !== 'undefined'
        ? `${window.location.origin}/verify?policy=${encodeURIComponent(data.contract.policy_number)}`
        : `https://andes24.com/verify?policy=${encodeURIComponent(data.contract.policy_number)}`);

    const qrBytes = await this.generateQRCode(verifyUrl);
    if (qrBytes) {
      const qrImage = await pdfDoc.embedPng(qrBytes);

      // QR Pequeño del Carnet (Abajo a la derecha, 55x55)
      page.drawImage(qrImage, {
        x: 480,
        y: 80,
        width: 55,
        height: 55,
      });
    }
  }

  private async generateQRCode(text: string): Promise<Uint8Array | null> {
    const cached = QR_CODE_CACHE.get(text);
    if (cached) return cached;
    try {
      const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(text)}`);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        QR_CODE_CACHE.set(text, bytes);
        return bytes;
      }
    } catch (error) {
      console.warn('Error generating QR code:', error);
    }
    return null;
  }

  async renderTemplate(data: FullPdfData, abortSignal?: AbortSignal): Promise<Uint8Array> {
    if (abortSignal?.aborted) throw new Error('AbortError');

    let pdfDoc: PDFDocument;
    try {
      const templatePath = new URL('../PLANTILLA/PLANTILLA PAPELERIA.pdf', import.meta.url).toString();
      const templateResponse = await fetch(templatePath, { signal: abortSignal });
      if (!templateResponse.ok) throw new Error('Failed to fetch template');
      const templateBytes = await templateResponse.arrayBuffer();
      pdfDoc = await PDFDocument.load(templateBytes);
    } catch (error) {
      console.warn('No se pudo cargar la plantilla base PDF. Creando archivo en blanco.', error);
      pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([612, 792]);
    }

    const page = pdfDoc.getPages()[0];

    // Renderizar secciones
    for (const section of this.template.sections) {
      await this.renderSection(page, section, data, pdfDoc);
    }

    // Renderizar líneas separadoras
    await this.renderSeparatorLines(page);

    // Renderizar elementos especiales
    await this.renderQRCode(page, data, pdfDoc);
    await this.renderCoverages(page, data, pdfDoc);
    await this.renderLegalText(page, pdfDoc);

    if (abortSignal?.aborted) throw new Error('AbortError');
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  }
}

// Función principal de generación
export async function generateAndes24Policy(data: FullPdfData, abortSignal?: AbortSignal): Promise<Uint8Array> {
  const engine = new TemplateEngine(ANDES24_TEMPLATE);
  return await engine.renderTemplate(data, abortSignal);
}

export async function generatePolicyPDF({
  contract,
  client,
  vehicle,
  plan,
  overlays,
  abortSignal,
}: {
  contract: PdfContractLegacy;
  client: PdfClientLegacy;
  vehicle: PdfVehicleLegacy;
  plan: PdfPlanLegacy | null;
  overlays?: PdfOverlayElement[];
  abortSignal?: AbortSignal;
}): Promise<Uint8Array> {
  if (abortSignal?.aborted) throw new Error('AbortError');
  const normalizeMoney = (value: unknown): string => {
    if (value == null) return '';
    if (typeof value === 'number') return value.toFixed(2);
    const n = Number(value);
    if (Number.isFinite(n)) return n.toFixed(2);
    return String(value);
  };

  const getCoverageFromDetails = (details: any, keys: string[]): string => {
    if (!details || typeof details !== 'object') return '';
    for (const k of keys) {
      const v = details?.[k];
      if (v != null && v !== '') return normalizeMoney(v);
    }
    return '';
  };

  const coverageDetails = plan?.coverage_details ?? null;
  const coveragesFixed: FullPdfData['coverages'] = [
    {
      desc: 'DAÑOS A COSAS',
      montoUsd: getCoverageFromDetails(coverageDetails, ['danos_cosas', 'daños_a_cosas', 'danos_a_cosas', 'things', 'property']),
      montoBs: '',
    },
    {
      desc: 'DAÑOS A PERSONAS',
      montoUsd: getCoverageFromDetails(coverageDetails, ['danos_personas', 'daños_a_personas', 'danos_a_personas', 'people', 'persons']),
      montoBs: '',
    },
    {
      desc: 'COBERTURA DE EXCESO',
      montoUsd: getCoverageFromDetails(coverageDetails, ['exceso', 'excess', 'excedente']),
      montoBs: '',
    },
  ];

  const data: FullPdfData = {
    contract: {
      policy_number: contract.policy_number,
      start_date: contract.start_date,
      end_date: contract.end_date,
      invoice_number: contract.invoice_number ?? undefined,
      issue_time: contract.issue_time ?? undefined,
      qr_code_url: (contract as any).qr_code_url ?? undefined,
    },
    client: {
      name: client.name,
      document_id: client.document_id,
      phone: client.phone,
      address: (client.address ?? undefined) || undefined,
      email: (client.email ?? undefined) || undefined,
      birth_date: (client.birth_date ?? undefined) || undefined,
    },
    vehicle: {
      plate: vehicle.plate,
      brand: vehicle.brand ?? '',
      model: vehicle.model ?? '',
      year: vehicle.year ?? '',
      puestos: (vehicle.puestos ?? '') as string | number,
      tipo: (vehicle.tipo_vehiculo ?? '') || '',
      clase: String(vehicle.clase ?? ''),
      color: (vehicle.color ?? '') || '',
      uso: (vehicle.uso ?? '') || '',
      serial_carroceria: (vehicle.serial_carroceria ?? '') || '',
      serial_motor: (vehicle.serial_motor ?? '') || '',
      peso: String(vehicle.peso ?? ''),
    },
    coverages: coveragesFixed,
    overlays: overlays?.map((o) => ({
      text: o.text,
      x: o.x,
      y: o.y,
      fontSize: o.fontSize,
    })),
  };

  return await generateAndes24Policy(data, abortSignal);
}

// Exportar para uso en otros componentes
export { TemplateEngine, ANDES24_TEMPLATE };
export type { TemplateConfig, TemplateField, TemplateSection };
