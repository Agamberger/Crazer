/**
 * Fonctions de formatage et parsing monétaire et temporel pour le module Finances.
 * Tous les montants internes sont représentés en centimes entiers (integer cents).
 */

/**
 * Formate un montant en centimes entiers vers une chaîne Euro formatée (ex: 1050 -> "10,50 €", -2550 -> "-25,50 €").
 *
 * @param cents - Montant en centimes entiers
 * @returns Chaîne formatée en euros avec virgule française et symbole €
 */
export function formatCentsToEuros(cents: number): string {
  if (typeof cents !== 'number' || isNaN(cents) || !isFinite(cents)) {
    return '0,00 €';
  }

  const isNegative = cents < 0;
  const absCents = Math.abs(Math.round(cents));
  const euros = Math.floor(absCents / 100);
  const remainingCents = absCents % 100;
  const formatted = `${euros},${remainingCents.toString().padStart(2, '0')} €`;

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Parse une saisie utilisateur (chaîne ou nombre en euros) vers un montant entier en centimes.
 * Protège contre la dérive de virgule flottante JavaScript (ex: 19.99 -> 1999 au lieu de 1998.9999).
 *
 * @param amount - Chaîne (ex: "10,50", " 19.99 € ") ou nombre (ex: 10.5)
 * @returns Montant entier en centimes (0 si entrée invalide ou vide)
 */
export function parseEurosToCents(amount: string | number | null | undefined): number {
  if (amount === null || amount === undefined) {
    return 0;
  }

  if (typeof amount === 'number') {
    if (isNaN(amount) || !isFinite(amount)) {
      return 0;
    }
    // Conversion en chaîne avec représentation décimale exacte
    return parseEurosToCents(amount.toString());
  }

  if (typeof amount !== 'string') {
    return 0;
  }

  // Nettoyage de la chaîne : retrait du symbole €, des espaces et standardisation de la virgule
  const cleaned = amount.replace(/€/g, '').replace(/\s+/g, '').replace(/,/g, '.').trim();
  if (!cleaned || cleaned === '-' || cleaned === '+' || cleaned === '.') {
    return 0;
  }

  // Validation du format numérique standard (+/- suivi de chiffres et optionnellement d'un point décimal)
  if (!/^[+-]?\d+(\.\d+)?$/.test(cleaned)) {
    return 0;
  }

  const isNegative = cleaned.startsWith('-');
  const unsigned = cleaned.replace(/^[+-]/, '');
  const [integerPartStr, fractionalPartStr = ''] = unsigned.split('.');

  const integerPart = parseInt(integerPartStr, 10);
  if (isNaN(integerPart)) {
    return 0;
  }

  let fractionalCents = 0;
  if (fractionalPartStr.length > 0) {
    if (fractionalPartStr.length === 1) {
      fractionalCents = parseInt(fractionalPartStr, 10) * 10;
    } else if (fractionalPartStr.length === 2) {
      fractionalCents = parseInt(fractionalPartStr, 10);
    } else {
      // Si plus de 2 décimales : arrondi propre du 3ème chiffre
      const firstTwo = fractionalPartStr.slice(0, 2);
      const thirdDigit = parseInt(fractionalPartStr[2], 10);
      fractionalCents = parseInt(firstTwo, 10) + (thirdDigit >= 5 ? 1 : 0);
    }
  }

  const totalCents = integerPart * 100 + fractionalCents;
  return isNegative ? -totalCents : totalCents;
}

/**
 * Formate une date ISO ou standard vers une représentation lisible en français.
 *
 * @param dateStr - Chaîne de date ISO ou compatible Date
 * @param options - Options de formatage Intl.DateTimeFormatOptions optionnelles
 * @returns Date formatée en français (ex: "17 août 2026")
 */
export function formatDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return '';
  const parsedDate = new Date(dateStr);
  if (isNaN(parsedDate.getTime())) {
    return dateStr;
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };

  return parsedDate.toLocaleDateString('fr-FR', options || defaultOptions);
}
