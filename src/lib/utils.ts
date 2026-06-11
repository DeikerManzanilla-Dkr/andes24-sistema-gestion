/**
 * Normaliza una cédula o RIF extrayendo únicamente los caracteres numéricos.
 * Ej. "V- 31.239.605" -> "31239605"
 * Ej. "E-84.455" -> "84455"
 */
export function normalizeCedula(input: string): string {
  return input.replace(/\D/g, '');
}
