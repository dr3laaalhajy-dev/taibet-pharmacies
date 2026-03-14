/**
 * Global Dual-Currency Utility
 * The database ALWAYS stores prices in Old L.S (base currency).
 * 1 New L.S = 100 Old L.S
 */

export type CurrencyMode = 'old' | 'new';

/**
 * Format an amount stored in Old L.S for display.
 * @param amountInOldLS - The raw value from the database (in Old L.S)
 * @param currencyMode - 'new' divides by 100 and shows "ل.س جديدة", 'old' shows as-is
 * @param lang - 'ar' for Arabic labels, anything else for English
 */
export function formatCurrency(
  amountInOldLS: number | string,
  currencyMode: CurrencyMode = 'new',
  lang: string = 'ar'
): string {
  const raw = typeof amountInOldLS === 'string' ? parseFloat(amountInOldLS) : amountInOldLS;
  if (isNaN(raw)) return lang === 'ar' ? '0 ل.س' : '0 L.S';

  if (currencyMode === 'new') {
    const display = raw / 100;
    const symbol = lang === 'ar' ? 'ل.س جديدة' : 'NEW L.S';
    return `${display.toLocaleString()} ${symbol}`;
  } else {
    const symbol = lang === 'ar' ? 'ل.س' : 'L.S';
    return `${raw.toLocaleString()} ${symbol}`;
  }
}

/**
 * Get just the currency symbol (no amount).
 */
export function getCurrencySymbol(currencyMode: CurrencyMode, lang: string = 'ar'): string {
  if (currencyMode === 'new') return lang === 'ar' ? 'ل.س جديدة' : 'NEW L.S';
  return lang === 'ar' ? 'ل.س' : 'L.S';
}

/**
 * Convert a pharmacist's UI input into the Old L.S value to store in the DB.
 * If pharmacist priced in New L.S, multiply by 100.
 */
export function inputToOldLS(inputValue: number, priceMode: CurrencyMode): number {
  return priceMode === 'new' ? inputValue * 100 : inputValue;
}

/**
 * Convert an Old L.S amount to display value in the given currency mode.
 */
export function oldLSToDisplay(amountInOldLS: number, currencyMode: CurrencyMode): number {
  return currencyMode === 'new' ? amountInOldLS / 100 : amountInOldLS;
}
