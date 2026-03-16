/**
 * FAAB Advisor — Bid Recommendation Engine
 *
 * Implements a 4-layer opponent-aware bid recommendation algorithm:
 *   Layer 1: Base Player Valuation (fantasy points + scarcity)
 *   Layer 2: Opponent-Aware Market Adjustment (competitive pressure)
 *   Layer 3: Budget Management & Season Pacing
 *   Layer 4: Confidence Scoring & Reasoning
 */

import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sharedPath = resolve(__dirname, '..', '..', '..', 'shared', 'index.js');
const {
  FOOTBALL_SCORING,
  FOOTBALL_STARTER_SLOTS,
  BASEBALL_SCORING,
  BASEBALL_MIN_REQUIRED,
  REPLACEMENT_THRESHOLD,
} = await import(sharedPath);

// ── Layer 1A: Fantasy Value Calculation ────────────────────────────────────

/**
 * Calculate fantasy points for a football player given projections and scoring settings.
 */
export function calculateFantasyPoints(projections, scoringSettings) {
  let points = 0;
  for (const [stat, value] of Object.entries(projections)) {
    if (scoringSettings[stat] !== undefined) {
      points += value * scoringSettings[stat];
    }
  }
  return points;
}

/**
 * Calculate Standings Gain Points (SGP) for a baseball player.
 * SGP denominators represent how much of a stat = ~1 standings point.
 * For inverse stats (ERA, WHIP), lower is better, so the denominator is negative.
 */
export function calculateSGP(projections, sgpDenominators) {
  let totalSGP = 0;
  for (const [cat, denominator] of Object.entries(sgpDenominators)) {
    const value = projections[cat];
    if (value === undefined || value === null) continue;

    if (denominator < 0) {
      // Inverse categories (ERA, WHIP): a LOWER projected value is BETTER.
      // We invert: use a "baseline bad value" minus player value, then divide by |denominator|.
      // E.g., if league avg ERA is ~4.00 and player projects 3.20, gain = (4.00 - 3.20) / 0.18 = 4.44 SGP
      const baseline = cat === 'ERA' ? 4.20 : cat === 'WHIP' ? 1.30 : 4.0;
      totalSGP += (baseline - value) / Math.abs(denominator);
    } else if (denominator > 0) {
      totalSGP += value / denominator;
    }
  }
  return totalSGP;
}

/**
 * Calculate a player's fantasy value given league context.
 * Returns a numeric value that can be compared across players.
 */
export function calculatePlayerValue(player, league) {
  const projections = player.projectedStats || {};
  const sport = league.sport;
  const scoringSettings = league.scoringSettings || {};

  if (sport === 'football') {
    const scoringKey = league.formatPreset?.includes('superflex')
      ? 'superflex_ppr_tep'
      : league.formatPreset?.includes('ppr') || league.formatPreset?.includes('standard_ppr')
        ? 'ppr'
        : league.formatPreset?.includes('guillotine')
          ? 'half_ppr'
          : 'ppr';

    const weights = FOOTBALL_SCORING[scoringKey] || scoringSettings;
    return calculateFantasyPoints(projections, weights);
  }

  if (sport === 'baseball') {
    // Use SGP for roto leagues
    const denominatorKey = league.numTeams >= 15
      ? 'sgpDenominators_15team'
      : 'sgpDenominators_12team';
    const scoring = BASEBALL_SCORING.roto_5x5_standard;
    const denominators = scoring[denominatorKey];
    return calculateSGP(projections, denominators);
  }

  return 0;
}

// ── Layer 1B: Positional Scarcity ──────────────────────────────────────────

/**
 * Measure how replaceable a position is in the free agent pool.
 * Returns { level, multiplier }.
 */
export function positionalScarcity(position, freeAgentPool, leagueSize) {
  const normalizedPos = normalizePosition(position);
  const viableAtPosition = freeAgentPool.filter(p => {
    const pPos = normalizePosition(p.position);
    return pPos === normalizedPos && (p.playerValue || 0) > REPLACEMENT_THRESHOLD;
  }).length;

  const ratio = viableAtPosition / leagueSize;

  if (ratio < 0.3) return { level: 'very_high', multiplier: 1.40 };
  if (ratio < 0.6) return { level: 'high', multiplier: 1.20 };
  if (ratio < 1.0) return { level: 'medium', multiplier: 1.05 };
  return { level: 'low', multiplier: 1.00 };
}

// ── Layer 1C: Base Bid Calculation ─────────────────────────────────────────

/**
 * Get the replacement-level value (the best player that would go unclaimed).
 */
function getReplacementLevelValue(freeAgentPool) {
  if (!freeAgentPool || freeAgentPool.length === 0) return 0;
  const values = freeAgentPool
    .map(p => p.playerValue || 0)
    .sort((a, b) => b - a);
  // Replacement level = roughly the median free agent
  const idx = Math.floor(values.length * 0.6);
  return values[idx] || 0;
}

/**
 * Get the value of the top free agent this week.
 */
function getTopFreeAgentVAR(freeAgentPool, replacementValue) {
  if (!freeAgentPool || freeAgentPool.length === 0) return 1;
  const topValue = Math.max(...freeAgentPool.map(p => p.playerValue || 0));
  return Math.max(topValue - replacementValue, 1); // avoid division by zero
}

/**
 * Convert fantasy value to a FAAB dollar amount.
 */
export function calculateBaseBid(playerValue, scarcityMultiplier, league, freeAgentPool) {
  const replacementValue = getReplacementLevelValue(freeAgentPool);
  const var_ = Math.max(0, playerValue - replacementValue);

  const remainingFaab = league.remainingFaab || league.faabBudget;
  const remainingWeeks = Math.max(1, league.totalWeeks - (league.currentWeek || 1) + 1);
  const weeklyBudget = remainingFaab / remainingWeeks;

  const topPlayerVAR = getTopFreeAgentVAR(freeAgentPool, replacementValue);
  const valueRatio = Math.min(var_ / topPlayerVAR, 1.0); // cap at 1.0

  // Base bid = proportion of weekly budget, adjusted for scarcity
  // The top FA should command ~40-60% of weekly budget
  const rawBid = weeklyBudget * valueRatio * 0.5 * scarcityMultiplier;

  const minBid = league.faabMinBid || 0;
  const maxBid = remainingFaab * 0.5; // Never recommend > 50% of remaining

  return Math.max(minBid, Math.min(Math.round(rawBid), maxBid));
}

// ── Layer 2A: Opponent Need Detection ──────────────────────────────────────

/**
 * Normalize position strings for comparison.
 * Handles multi-position players like "DH/SP", "SS/OF".
 */
function normalizePosition(pos) {
  if (!pos) return '';
  // Return the primary position (first listed)
  return pos.split('/')[0].trim().toUpperCase();
}

function getPositionsFromString(pos) {
  if (!pos) return [];
  return pos.split('/').map(p => p.trim().toUpperCase());
}

/**
 * Detect how much an opponent needs a given position.
 * Returns urgency 0-3 (0 = no need, 3 = desperate).
 */
export function detectOpponentNeeds(opponent, position, sport, league) {
  const roster = opponent.roster || [];
  const normalizedPos = normalizePosition(position);

  if (sport === 'football') {
    const rosterKey = league?.formatPreset?.includes('superflex') ? 'superflex' : 'standard';
    const starterSlots = FOOTBALL_STARTER_SLOTS[rosterKey] || FOOTBALL_STARTER_SLOTS.standard;

    const rostered = roster.filter(p => {
      const pPos = normalizePosition(p.position);
      return pPos === normalizedPos;
    }).length;

    const needed = starterSlots[normalizedPos] || 0;

    // Superflex special: if opponent doesn't have 2 QBs, treat SUPERFLEX as QB need
    if (rosterKey === 'superflex' && normalizedPos === 'QB') {
      const qbCount = roster.filter(p => normalizePosition(p.position) === 'QB').length;
      if (qbCount < 2) return 3; // Desperate — can't fill SUPERFLEX with a QB
    }

    if (rostered < needed) return 3;    // Can't fill starting lineup
    if (rostered === needed) return 1;  // No depth
    return 0;                            // Well stocked
  }

  if (sport === 'baseball') {
    const positionCount = roster.filter(p => {
      const positions = getPositionsFromString(p.position);
      return positions.includes(normalizedPos);
    }).length;

    const minRequired = BASEBALL_MIN_REQUIRED[normalizedPos] || 1;

    if (positionCount < minRequired) return 3;
    if (positionCount === minRequired) return 1;
    return 0;
  }

  return 0;
}

// ── Layer 2B: Competitive Pressure Score ───────────────────────────────────

/**
 * Aggregate opponent threat scores for a given player.
 */
export function calculateCompetitivePressure(player, opponents, league) {
  let pressureScore = 0;
  const threatDetails = [];

  for (const opponent of opponents) {
    const needLevel = detectOpponentNeeds(opponent, player.position, league.sport, league);

    if (needLevel === 0) continue;

    // Weight by their remaining FAAB (more budget = bigger threat)
    const budgetThreat = (opponent.remainingFaab || 0) / league.faabBudget;

    // Weight by need urgency
    const urgencyWeight = needLevel / 3;

    const threatScore = budgetThreat * urgencyWeight;
    pressureScore += threatScore;

    if (needLevel >= 2) {
      threatDetails.push({
        team: opponent.teamName,
        faab: opponent.remainingFaab,
        needLevel,
        threatScore,
      });
    }
  }

  // Sort by biggest threat first
  threatDetails.sort((a, b) => b.faab - a.faab);

  return { pressureScore, threatDetails };
}

// ── Layer 2C: Market-Adjusted Bid ──────────────────────────────────────────

/**
 * Apply opponent-aware adjustment to the base bid.
 */
export function calculateMarketBid(baseBid, pressureScore, threatDetails, league) {
  let adjustmentMultiplier;

  if (pressureScore < 0.1) {
    adjustmentMultiplier = 0.9; // Can actually bid LESS than base
  } else if (pressureScore < 0.3) {
    adjustmentMultiplier = 1.0 + (pressureScore * 0.5);
  } else if (pressureScore < 0.6) {
    adjustmentMultiplier = 1.1 + (pressureScore * 0.4);
  } else {
    adjustmentMultiplier = 1.3 + (pressureScore * 0.3);
  }

  // Cap at 2.0x
  adjustmentMultiplier = Math.min(adjustmentMultiplier, 2.0);

  // If the highest-FAAB opponent has an acute need, add a premium
  const remainingFaab = league.remainingFaab || league.faabBudget;
  const topThreat = threatDetails[0];
  if (topThreat && topThreat.needLevel === 3 && topThreat.faab > remainingFaab * 0.8) {
    adjustmentMultiplier *= 1.1;
  }

  const marketBid = Math.round(baseBid * adjustmentMultiplier);
  const minBid = league.faabMinBid || 0;

  return Math.max(minBid, Math.min(marketBid, remainingFaab * 0.5));
}

// ── Layer 3: Budget Management & Season Pacing ─────────────────────────────

/**
 * Calculate budget pacing status.
 */
export function budgetPacing(league) {
  const remainingFaab = league.remainingFaab || league.faabBudget;
  const budgetPct = remainingFaab / league.faabBudget;
  const remainingWeeks = Math.max(1, league.totalWeeks - (league.currentWeek || 1) + 1);
  const seasonPct = remainingWeeks / league.totalWeeks;

  const paceRatio = seasonPct > 0 ? budgetPct / seasonPct : 1;

  let status, aggressivenessModifier;

  if (paceRatio > 1.2) {
    status = 'well_ahead';
    aggressivenessModifier = 1.15;
  } else if (paceRatio > 0.95) {
    status = 'on_pace';
    aggressivenessModifier = 1.0;
  } else if (paceRatio > 0.7) {
    status = 'slightly_behind';
    aggressivenessModifier = 0.85;
  } else {
    status = 'conserve';
    aggressivenessModifier = 0.65;
  }

  return { status, paceRatio, aggressivenessModifier };
}

/**
 * Calculate aggressive bid tier.
 */
export function calculateAggressiveBid(marketBid, pacing, league) {
  const remainingFaab = league.remainingFaab || league.faabBudget;
  const aggressive = Math.round(marketBid * 1.35 * pacing.aggressivenessModifier);
  const minBid = league.faabMinBid || 0;
  return Math.max(minBid, Math.min(aggressive, remainingFaab * 0.6));
}

// ── Layer 4: Confidence Scoring ────────────────────────────────────────────

/**
 * Determine if the user's team needs the given position.
 */
export function userTeamNeedsPosition(userTeam, position, league) {
  if (!userTeam || !userTeam.roster) return false;
  const normalizedPos = normalizePosition(position);
  const sport = league.sport;

  if (sport === 'football') {
    const rosterKey = league?.formatPreset?.includes('superflex') ? 'superflex' : 'standard';
    const starterSlots = FOOTBALL_STARTER_SLOTS[rosterKey] || FOOTBALL_STARTER_SLOTS.standard;
    const rostered = userTeam.roster.filter(p => normalizePosition(p.position) === normalizedPos).length;
    const needed = starterSlots[normalizedPos] || 0;
    return rostered <= needed; // Need if at or below starter count (no depth)
  }

  if (sport === 'baseball') {
    const positionCount = userTeam.roster.filter(p => {
      const positions = getPositionsFromString(p.position);
      return positions.includes(normalizedPos);
    }).length;
    const minRequired = BASEBALL_MIN_REQUIRED[normalizedPos] || 1;
    return positionCount <= minRequired;
  }

  return false;
}

/**
 * Calculate confidence level.
 */
export function calculateConfidence(player, scarcity, pressureScore, needMatch) {
  let score = 0;

  // Factor 1: Projection reliability
  const gamesPlayed = player.gamesPlayed || 0;
  if (gamesPlayed > 30) score += 3;
  else if (gamesPlayed > 10) score += 2;
  else score += 1;

  // Factor 2: Scarcity
  if (scarcity.level === 'very_high') score += 3;
  else if (scarcity.level === 'high') score += 2;
  else if (scarcity.level === 'medium') score += 1;

  // Factor 3: User team need
  if (needMatch) score += 2;
  else score += 1;

  // Factor 4: Opponent analysis clarity
  if (pressureScore > 0.3) score += 1;

  if (score >= 8) return 'high';
  if (score >= 5) return 'medium';
  return 'low';
}

// ── Reasoning Generator ────────────────────────────────────────────────────

/**
 * Generate human-readable explanation for the bid recommendation.
 */
export function generateReasoning(player, scarcity, threatDetails, pacing, needMatch) {
  const parts = [];

  parts.push(`${player.name} (${player.position}, ${player.realTeam}).`);

  // Scarcity
  if (scarcity.level === 'very_high') {
    parts.push(`${normalizePosition(player.position)} is extremely scarce in the free agent pool.`);
  } else if (scarcity.level === 'high') {
    parts.push(`Limited ${normalizePosition(player.position)} options available.`);
  }

  // Player note
  if (player.note) {
    parts.push(player.note + '.');
  }

  // Opponent pressure
  if (threatDetails.length === 0) {
    parts.push('Low competition expected — no opponents have an acute need here.');
  } else if (threatDetails.length <= 2) {
    const names = threatDetails.map(t => `${t.team} ($${t.faab})`).join(' and ');
    parts.push(`Moderate competition: ${names} also likely targeting this position.`);
  } else {
    parts.push(`High competition: ${threatDetails.length} opponents need ${normalizePosition(player.position)}.`);
    const topThreat = threatDetails[0];
    parts.push(`Biggest threat: ${topThreat.team} with $${topThreat.faab} remaining.`);
  }

  // Need match
  if (needMatch) {
    parts.push('Fills a positional need on your roster.');
  }

  // Pacing
  if (pacing.status === 'conserve') {
    parts.push('Your budget is running low — bid conservatively.');
  } else if (pacing.status === 'well_ahead') {
    parts.push('You have budget to spare — can afford to be aggressive.');
  }

  return parts.join(' ');
}

// ── Orchestrator ───────────────────────────────────────────────────────────

/**
 * Generate a complete bid recommendation for a single player.
 *
 * @param {Object} player - { name, position, realTeam, projectedStats, gamesPlayed, ownershipPct, note, playerValue? }
 * @param {Object} userTeam - { roster: [{ position }] }
 * @param {Array} opponents - [{ teamName, remainingFaab, roster: [{ position }] }]
 * @param {Array} freeAgentPool - [{ position, playerValue }]
 * @param {Object} league - league config object
 */
export function generateBidRecommendation(player, userTeam, opponents, freeAgentPool, league) {
  // Layer 1: Base value
  const playerValue = player.playerValue ?? calculatePlayerValue(player, league);
  const scarcity = positionalScarcity(player.position, freeAgentPool, league.numTeams);
  const baseBid = calculateBaseBid(playerValue, scarcity.multiplier, league, freeAgentPool);

  // Layer 2: Opponent-aware adjustment
  const { pressureScore, threatDetails } = calculateCompetitivePressure(player, opponents, league);
  const marketBid = calculateMarketBid(baseBid, pressureScore, threatDetails, league);

  // Layer 3: Budget pacing
  const pacing = budgetPacing(league);
  const aggressiveBid = calculateAggressiveBid(marketBid, pacing, league);

  // Layer 4: Confidence
  const needMatch = userTeamNeedsPosition(userTeam, player.position, league);
  const confidence = calculateConfidence(player, scarcity, pressureScore, needMatch);

  // Reasoning
  const reasoning = generateReasoning(player, scarcity, threatDetails, pacing, needMatch);

  const remainingFaab = league.remainingFaab || league.faabBudget;

  return {
    playerName: player.name,
    position: player.position,
    realTeam: player.realTeam,
    baseBid,
    marketBid,
    aggressiveBid,
    confidence,
    scarcityLevel: scarcity.level,
    opponentsNeeding: threatDetails.length,
    budgetImpact: parseFloat(((marketBid / remainingFaab) * 100).toFixed(1)),
    needMatch,
    reasoning,
    threatDetails,
    projectedStats: player.projectedStats || {},
    pacingStatus: pacing.status,
  };
}

/**
 * Generate recommendations for all free agents in a league.
 */
export function generateAllRecommendations(freeAgents, userTeam, opponents, league) {
  // Pre-calculate player values for the entire FA pool
  const freeAgentPool = freeAgents.map(fa => ({
    ...fa,
    playerValue: calculatePlayerValue(fa, league),
  }));

  // Sort by value, recommend only the top players worth bidding on
  const sortedFAs = [...freeAgentPool].sort((a, b) => (b.playerValue || 0) - (a.playerValue || 0));

  // Only recommend players above replacement level
  const replacementValue = getReplacementLevelValue(freeAgentPool);
  const worthyFAs = sortedFAs.filter(fa => (fa.playerValue || 0) > replacementValue);

  const recommendations = worthyFAs.map(player =>
    generateBidRecommendation(player, userTeam, opponents, freeAgentPool, league)
  );

  // Sort by market bid descending
  recommendations.sort((a, b) => b.marketBid - a.marketBid);

  return recommendations;
}
