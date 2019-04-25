/**
 * @file
 *
 * Calculations of relic draw banner probabilities.
 *
 * See https://www.reddit.com/r/FFRecordKeeper/comments/83l3jd/analysis_of_fuitads_gacha_data/
 */

interface RelicDrawBannerChances {
  expectedValue: number;
  desiredChance: number;
}

/**
 * Analysis of probabilities, following proposal 5 on Reddit.
 *
 * @param drawCount              Number of items in this banner (usually 11)
 * @param rareChancePerRelic     Total chance of getting a 5* or 6* (e.g., 0.1404)
 * @param desiredChancePerRelic  Total chance of getting something desirable (e.g., 0.05)
 */
export function chanceOfDesiredDrawProp5(
  drawCount: number,
  rareChancePerRelic: number,
  desiredChancePerRelic: number,
): RelicDrawBannerChances {
  // If x is the percentage of getting a 5* or better
  // and y is the percentage of getting what you care about,
  // then an 11 draw has the following possible outcomes:
  // - x chance of getting rare plus 10 * x rares
  // - (1 - x) * x chance of getting rare plus 9 * x rares
  // - (1 - x) ^ 2 * x chance of getting rare + 8 * x rares
  // - etc.
  // - (1 - x) ^ 11 chance of getting nothing and re-rolling
  const n = drawCount;
  const x = rareChancePerRelic;
  const y = desiredChancePerRelic;

  let totalEv = 0;
  let totalDesiredChance = 0;
  for (let i = 0; i < n; i++) {
    // Chance of not getting a rare for the preceding i draws then getting a
    // rare on this draw.
    const chanceOfThisOutcome = (1 - x) ** i * x;

    // Expected value for this arrangement of not getting a rare for the
    // preceding i draws then getting a rare on this draw.
    const evForThisOutcome = y / x + y * (n - 1 - i);

    const undesiredChanceForThisOutcome = ((x - y) / x) * (1 - y) ** (n - 1 - i);

    totalEv += chanceOfThisOutcome * evForThisOutcome;
    totalDesiredChance += chanceOfThisOutcome * (1 - undesiredChanceForThisOutcome);
  }

  const chanceOfNone = (1 - x) ** n;
  const r = chanceOfNone;

  // Sum of an infinite geometric series is a / (1 - r).
  return {
    expectedValue: totalEv / (1 - r),
    desiredChance: totalDesiredChance / (1 - r),
  };
}

export function monteCarloProp5(
  drawCount: number,
  rareChance: number,
  desiredChance: number,
  iterations: number,
): RelicDrawBannerChances {
  let totalCount = 0;
  let atLeast1Count = 0;
  for (let i = 0; i < iterations; i++) {
    let thisRareCount = 0;
    let thisDesiredCount = 0;
    while (thisRareCount === 0) {
      for (let j = 0; j < drawCount; j++) {
        const result = Math.random();
        if (result < desiredChance) {
          thisDesiredCount++;
        }
        if (result < rareChance) {
          thisRareCount++;
        }
      }
    }
    totalCount += thisDesiredCount;
    atLeast1Count += thisDesiredCount > 0 ? 1 : 0;
  }
  return {
    expectedValue: totalCount / iterations,
    desiredChance: atLeast1Count / iterations,
  };
}