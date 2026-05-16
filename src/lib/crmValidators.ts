// Italian fiscal/business validators
export function isValidPEC(value: string): boolean {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function isValidSDI(value: string): boolean {
  if (!value) return true;
  const v = value.trim().toUpperCase();
  // SDI: 6 chars (Pubblica Amministrazione) or 7 chars (privati), alfanumerico
  return /^[A-Z0-9]{6,7}$/.test(v);
}

export function isValidPartitaIVA(value: string): boolean {
  if (!value) return true;
  const v = value.trim().replace(/\s+/g, '');
  if (!/^\d{11}$/.test(v)) return false;
  // Luhn-like checksum (algoritmo P.IVA italiana)
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    let n = parseInt(v[i], 10);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

export function isValidCodiceFiscale(value: string): boolean {
  if (!value) return true;
  const v = value.trim().toUpperCase();
  // Persona fisica 16 alfanumerico oppure persona giuridica 11 cifre
  return /^[A-Z0-9]{16}$/.test(v) || /^\d{11}$/.test(v);
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validateContactFields(data: {
  pec?: string;
  sdi_code?: string;
  vat_number?: string;
  fiscal_code?: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];
  if (data.pec && !isValidPEC(data.pec))
    errors.push({ field: 'PEC', message: 'PEC non valida (formato email richiesto)' });
  if (data.sdi_code && !isValidSDI(data.sdi_code))
    errors.push({ field: 'SDI', message: 'Codice SDI non valido (6-7 caratteri alfanumerici)' });
  if (data.vat_number && !isValidPartitaIVA(data.vat_number))
    errors.push({ field: 'P.IVA', message: 'Partita IVA non valida (11 cifre con checksum)' });
  if (data.fiscal_code && !isValidCodiceFiscale(data.fiscal_code))
    errors.push({ field: 'Codice Fiscale', message: 'Codice Fiscale non valido (16 caratteri o 11 cifre)' });
  return errors;
}