/**
 * Get the applicable rate for a given km position relative to year-to-date usage.
 * If ytdKmBefore >= threshold, all km are at tier2. Otherwise tier1.
 */
export function getRateForKm(
  ytdKmBefore: number,
  tier1Rate: number,
  tier2Rate: number,
  tier1Threshold: number
): number {
  if (ytdKmBefore >= tier1Threshold) {
    return tier2Rate;
  }
  return tier1Rate;
}

/**
 * Calculate the deductible amount for a trip, splitting across tiers if necessary.
 *
 * Logic:
 * - If ytdKmBefore >= threshold, the entire trip uses tier2Rate.
 * - If ytdKmBefore + km <= threshold, the entire trip uses tier1Rate.
 * - Otherwise, split: the portion within threshold uses tier1Rate,
 *   the remainder uses tier2Rate.
 */
export function calculateDeductible(
  km: number,
  ytdKmBefore: number,
  tier1Rate: number,
  tier2Rate: number,
  tier1Threshold: number
): number {
  if (km <= 0) return 0;

  if (ytdKmBefore >= tier1Threshold) {
    // All km are in tier 2
    return km * tier2Rate;
  }

  const remainingTier1 = tier1Threshold - ytdKmBefore;

  if (km <= remainingTier1) {
    // All km fit within tier 1
    return km * tier1Rate;
  }

  // Split across tiers
  const tier1Km = remainingTier1;
  const tier2Km = km - remainingTier1;
  return tier1Km * tier1Rate + tier2Km * tier2Rate;
}
