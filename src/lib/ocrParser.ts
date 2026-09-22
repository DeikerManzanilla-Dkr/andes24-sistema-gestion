import { createWorker } from 'tesseract.js';

export interface OcrVehicleData {
  plate?: string;
  serialCarroceria?: string;
  year?: number;
  brand?: string;
  color?: string;
  tipoVehiculo?: string;
  uso?: string;
  model?: string;
  rawText: string;
}

const MARCAS_VENEZUELA = [
  'CHEVROLET', 'TOYOTA', 'FORD', 'FIAT', 'HYUNDAI', 'RENAULT', 'NISSAN',
  'MITSUBISHI', 'JEEP', 'CHERY', 'HONDA', 'DODGE', 'PEUGEOT', 'MAZDA',
  'VOLKSWAGEN', 'KIA', 'SUZUKI', 'EMPIRE', 'BERA', 'MD'
];

const COLORES_VENEZUELA = [
  'BLANCO', 'NEGRO', 'PLATA', 'GRIS', 'ROJO', 'AZUL', 'VERDE',
  'AMARILLO', 'BEIGE', 'MARRON', 'DORADO', 'VINOTINTO'
];

const TIPOS_USO_VENEZUELA = [
  'SEDAN', 'COUPE', 'SPORT WAGON', 'RUSTICO', 'PICK UP', 'CARGA',
  'MOTO', 'PANEL', 'MINIBUS', 'PARTICULAR', 'TRANSPORTE PUBLICO'
];

function cleanText(text: string): string {
  return text
    .toUpperCase()
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findPlate(text: string): string | undefined {
  const plateRegex = /\b([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2}|[A-Z]\d{2}[A-Z]{2}\d[A-Z])\b/g;
  const match = text.match(plateRegex);
  return match?.[0]?.match(/\b([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2}|[A-Z]\d{2}[A-Z]{2}\d[A-Z])\b/)?.[1];
}

function findVin(text: string): string | undefined {
  const vinRegex = /\b([A-HJ-NPR-Z0-9]{17})\b/g;
  const match = text.match(vinRegex);
  return match?.[0]?.match(/\b([A-HJ-NPR-Z0-9]{17})\b/)?.[1];
}

function findYear(text: string): number | undefined {
  const yearRegex = /\b(19[6-9]\d|20[0-2]\d)\b/g;
  const matches = text.matchAll(yearRegex);
  const currentYear = new Date().getFullYear();
  for (const match of matches) {
    const year = parseInt(match[1], 10);
    if (year >= 1960 && year <= currentYear) {
      return year;
    }
  }
  return undefined;
}

function findBestMatch(text: string, dictionary: string[]): string | undefined {
  const words = text.split(/\s+/);
  for (const word of words) {
    const cleanWord = word.replace(/[^A-Z]/g, '');
    if (cleanWord.length < 3) continue;
    for (const dictWord of dictionary) {
      if (dictWord.includes(cleanWord) || cleanWord.includes(dictWord)) {
        return dictWord;
      }
      const similarity = levenshteinDistance(cleanWord, dictWord);
      if (similarity <= Math.max(2, Math.floor(dictWord.length * 0.25))) {
        return dictWord;
      }
    }
  }
  return undefined;
}

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : i === 0 ? 0 : 0))
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

export async function scanVehicleDocument(file: File): Promise<OcrVehicleData> {
  const worker = await createWorker('spa', 1, {
    logger: (m) => console.debug('[OCR]', m),
  });

  try {
    const { data } = await worker.recognize(file);
    const rawText = data.text;
    const cleaned = cleanText(rawText);

    const plate = findPlate(cleaned);
    const serialCarroceria = findVin(cleaned);
    const year = findYear(cleaned);
    const brand = findBestMatch(cleaned, MARCAS_VENEZUELA);
    const color = findBestMatch(cleaned, COLORES_VENEZUELA);
    const tipoVehiculo = findBestMatch(cleaned, TIPOS_USO_VENEZUELA);
    const uso = findBestMatch(cleaned, TIPOS_USO_VENEZUELA);

    let model: string | undefined;
    if (brand) {
      const brandIndex = cleaned.indexOf(brand);
      if (brandIndex !== -1) {
        const afterBrand = cleaned.slice(brandIndex + brand.length).trim();
        const modelMatch = afterBrand.match(/^([A-Z0-9\-\s]{2,30})/);
        if (modelMatch) {
          model = modelMatch[1].trim().split(/\s+/)[0];
        }
      }
    }

    return {
      plate,
      serialCarroceria,
      year,
      brand,
      color,
      tipoVehiculo,
      uso,
      model,
      rawText: cleaned,
    };
  } finally {
    await worker.terminate();
  }
}

export function getHighlightedFields(data: OcrVehicleData): string[] {
  const fields: string[] = [];
  if (data.plate) fields.push('plate');
  if (data.serialCarroceria) fields.push('serialCarroceria');
  if (data.year) fields.push('year');
  if (data.brand) fields.push('brand');
  if (data.color) fields.push('color');
  if (data.tipoVehiculo) fields.push('tipoVehiculo');
  if (data.uso) fields.push('uso');
  if (data.model) fields.push('model');
  return fields;
}