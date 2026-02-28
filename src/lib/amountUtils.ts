/**
 * Amount Normalization Utility
 * 
 * GoBiz API can return amounts in various formats:
 * - 1000      (plain number)
 * - "1.000"   (thousand separator with dot)
 * - "1.000.00" (thousand separator + decimal)
 * - "1000.00" (decimal only)
 * - "15800"   (plain string number)
 * 
 * This utility normalizes all formats to a clean numeric value.
 */

/**
 * Normalize an amount value from various string/number formats to a clean number.
 * 
 * Strategy:
 * 1. If already a clean number, return as-is
 * 2. If string has multiple dots → all dots except the last are thousand separators
 * 3. If string has single dot:
 *    - If exactly 3 digits after dot → it's a thousand separator (e.g., "1.000")
 *      UNLESS there are no more digits, which is ambiguous, but we treat 3-digit 
 *      after single dot as thousand separator per Indonesian format convention
 *    - Otherwise → it's a decimal point (e.g., "1000.50")
 * 4. Remove thousand separators, parse as float, return rounded integer
 */
export function normalizeAmount(value: string | number | null | undefined): number {
    if (value === null || value === undefined) {
        return 0;
    }

    // If it's already a number, return it directly
    if (typeof value === 'number') {
        return Math.round(value);
    }

    // Convert to string and trim
    let str = String(value).trim();

    // Remove currency symbols and whitespace
    str = str.replace(/[^\d.,\-]/g, '');

    if (str === '') {
        return 0;
    }

    // Count dots and commas
    const dotCount = (str.match(/\./g) || []).length;
    const commaCount = (str.match(/,/g) || []).length;

    // Handle comma as decimal separator (European/Indonesian format like "1.000,00")
    if (commaCount > 0 && dotCount > 0) {
        // Dots are thousand separators, comma is decimal separator
        str = str.replace(/\./g, '');  // Remove thousand separator dots
        str = str.replace(',', '.');    // Convert comma decimal to dot decimal
    } else if (commaCount === 1) {
        // Single comma — check if it's a decimal separator
        const afterComma = str.split(',')[1];
        if (afterComma.length <= 2) {
            // Decimal separator (e.g., "1000,50")
            str = str.replace(',', '.');
        } else {
            // Thousand separator (e.g., "1,000")
            str = str.replace(',', '');
        }
    } else if (commaCount > 1) {
        // Multiple commas → all are thousand separators
        str = str.replace(/,/g, '');
    }

    // Now handle dots
    const remainingDots = (str.match(/\./g) || []).length;

    if (remainingDots > 1) {
        // Multiple dots → all except the last are thousand separators
        // e.g., "1.000.00" → remove first dot(s), keep last as decimal
        const lastDotIndex = str.lastIndexOf('.');
        const beforeLastDot = str.substring(0, lastDotIndex).replace(/\./g, '');
        const afterLastDot = str.substring(lastDotIndex + 1);

        // Check: if after the last dot there are exactly 3 digits,
        // AND before we had dots too, then ALL dots are thousand separators
        // e.g., "1.000.000" → 1000000
        if (afterLastDot.length === 3) {
            str = beforeLastDot + afterLastDot;
        } else {
            // Last dot is decimal, others are thousand separators
            // e.g., "1.000.50" → 1000.50
            str = beforeLastDot + '.' + afterLastDot;
        }
    } else if (remainingDots === 1) {
        // Single dot — determine if thousand separator or decimal
        const afterDot = str.split('.')[1];
        if (afterDot.length === 3) {
            // Indonesian thousand separator format: "1.000", "15.800"
            str = str.replace('.', '');
        }
        // Otherwise it's a decimal point, keep as-is (e.g., "1000.50")
    }

    const result = parseFloat(str);

    if (isNaN(result)) {
        return 0;
    }

    // Round to avoid floating point issues
    return Math.round(result);
}

/**
 * Compare two amounts for equality after normalization.
 * Useful for matching GoBiz transaction amounts with local records.
 */
export function amountsMatch(
    gobizAmount: string | number | null | undefined,
    localAmount: number
): boolean {
    return normalizeAmount(gobizAmount) === normalizeAmount(localAmount);
}
