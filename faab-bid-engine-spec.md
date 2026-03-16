# FAAB Advisor — Bid Engine Algorithm Specification

## Overview

This document contains the concrete math, formulas, and logic for the bid recommendation engine. The spec document describes WHAT the engine does conceptually. This document describes HOW — with implementable pseudocode and real numbers.

---

## Layer 1: Base Player Valuation

### Step 1A: Raw Fantasy Value

Calculate a player's projected fantasy points using the league's scoring settings.

```javascript
// Football example: Standard PPR scoring
function calculateFantasyPoints(projections, scoringSettings) {
  let points = 0;
  
  // Map each stat to its scoring weight
  // Example PPR weights:
  // { passingYards: 0.04, passingTD: 4, interception: -2, rushingYards: 0.1,
  //   rushingTD: 6, receptions: 1, receivingYards: 0.1, receivingTD: 6,
  //   fumblesLost: -2 }
  
  for (const [stat, value] of Object.entries(projections)) {
    if (scoringSettings[stat]) {
      points += value * scoringSettings[stat];
    }
  }
  return points;
}

// Baseball example: 5x5 Roto category contribution
// For roto, value = projected contribution to standings in each category
// Use Standings Gain Points (SGP) methodology:
function calculateSGP(projections, categoryDenominators) {
  // SGP denominators represent how much of a stat = 1 standings point
  // Example NFBC 15-team denominators: { HR: 12, RBI: 35, R: 32, SB: 8, AVG: 0.005 }
  let totalSGP = 0;
  for (const [cat, denominator] of Object.entries(categoryDenominators)) {
    totalSGP += projections[cat] / denominator;
  }
  return totalSGP;
}
```

### Step 1B: Positional Scarcity Multiplier

Measures how replaceable this player is at their position in the free agent pool.

```javascript
function positionalScarcity(position, freeAgentPool, leagueSize) {
  // Count viable options at this position in the FA pool
  const viableAtPosition = freeAgentPool.filter(p => 
    p.position === position && p.projectedValue > REPLACEMENT_THRESHOLD
  ).length;
  
  // Ratio: how many viable options per team that might need one
  const teamsInLeague = leagueSize;
  const ratio = viableAtPosition / teamsInLeague;
  
  // Scarcity multiplier
  if (ratio < 0.3) return { level: "very_high", multiplier: 1.40 };  // < 1 option per 3 teams
  if (ratio < 0.6) return { level: "high", multiplier: 1.20 };       // < 1 option per 2 teams
  if (ratio < 1.0) return { level: "medium", multiplier: 1.05 };     // < 1 option per team
  return { level: "low", multiplier: 1.00 };                          // plenty available
}
```

### Step 1C: Base Bid Calculation

Convert fantasy value into a FAAB dollar amount.

```javascript
function calculateBaseBid(playerValue, scarcityMultiplier, league) {
  // Get the "replacement level" value — the best freely available player
  // that nobody would bid real FAAB on
  const replacementValue = getReplacementLevelValue(league);
  
  // Value Above Replacement (VAR)
  const var_ = Math.max(0, playerValue - replacementValue);
  
  // Scale VAR to FAAB dollars
  // Use remaining budget proportioned across remaining weeks
  const weeklyBudget = league.remainingFAAB / league.remainingWeeks;
  
  // Top free agent of the week should command ~40-60% of weekly budget
  // Scale all others relative to the top available player
  const topPlayerVAR = getTopFreeAgentVAR(league);
  const valueRatio = var_ / topPlayerVAR;
  
  // Base bid = proportion of weekly budget, adjusted for scarcity
  const rawBid = weeklyBudget * valueRatio * 0.5 * scarcityMultiplier;
  
  // Floor and ceiling
  const minBid = league.minBid; // $0 or $1 depending on league
  const maxBid = league.remainingFAAB * 0.5; // Never recommend > 50% of remaining
  
  return Math.max(minBid, Math.min(Math.round(rawBid), maxBid));
}
```

---

## Layer 2: Opponent-Aware Market Adjustment

This is the core IP. We analyze WHO else is likely to bid and HOW MUCH they can afford.

### Step 2A: Opponent Need Detection

```javascript
function detectOpponentNeeds(opponent, position, sport) {
  const roster = opponent.roster;
  
  if (sport === "football") {
    // Football positional needs based on typical starter requirements
    const starterSlots = {
      QB: 1,  // 2 for superflex
      RB: 2,
      WR: 2,  // or 3 in 3WR leagues
      TE: 1,
      FLEX: 1, // RB/WR/TE eligible
      K: 1,
      DEF: 1
    };
    
    // Count starters at this position
    const rostered = roster.filter(p => p.position === position).length;
    const needed = starterSlots[position] || 1;
    
    // Account for bye weeks — does opponent have a starter on bye this week?
    const onBye = roster.filter(p => p.position === position && p.onBye).length;
    
    // Need score: 0 (no need) to 3 (desperate)
    if (rostered < needed) return 3;           // Can't fill starting lineup
    if (onBye > 0 && rostered <= needed) return 2;  // Bye week gap
    if (rostered === needed) return 1;         // No depth
    return 0;                                   // Well stocked
  }
  
  if (sport === "baseball") {
    // Baseball is more nuanced — check category needs
    // A team trailing in SB might need a speed OF
    // A team trailing in K might need a high-K SP
    
    const positionCount = roster.filter(p => 
      p.positions.includes(position)
    ).length;
    
    const minRequired = getMinRequired(position); // C:1, 1B:1, SS:1, SP:varies
    
    if (positionCount < minRequired) return 3;
    if (positionCount === minRequired) return 1;
    return 0;
  }
}
```

### Step 2B: Competitive Pressure Score

```javascript
function calculateCompetitivePressure(player, opponents, league) {
  let pressureScore = 0;
  let threatDetails = [];
  
  for (const opponent of opponents) {
    const needLevel = detectOpponentNeeds(opponent, player.position, league.sport);
    
    if (needLevel === 0) continue; // This opponent won't bid
    
    // Weight by their remaining FAAB (more budget = bigger threat)
    const budgetThreat = opponent.remainingFAAB / league.totalBudget;
    
    // Weight by need urgency
    const urgencyWeight = needLevel / 3; // Normalize to 0-1
    
    // Combined threat from this opponent
    const threatScore = budgetThreat * urgencyWeight;
    pressureScore += threatScore;
    
    if (needLevel >= 2) {
      threatDetails.push({
        team: opponent.name,
        faab: opponent.remainingFAAB,
        needLevel,
        threatScore
      });
    }
  }
  
  return { pressureScore, threatDetails };
}
```

### Step 2C: Market-Adjusted Bid

```javascript
function calculateMarketBid(baseBid, pressureScore, threatDetails, league) {
  // Pressure score ranges:
  // 0.0 - 0.2  → low competition, minimal adjustment
  // 0.2 - 0.5  → moderate competition
  // 0.5 - 1.0  → high competition
  // 1.0+       → bidding war likely
  
  let adjustmentMultiplier;
  
  if (pressureScore < 0.1) {
    adjustmentMultiplier = 0.9;  // Can actually bid LESS than base
  } else if (pressureScore < 0.3) {
    adjustmentMultiplier = 1.0 + (pressureScore * 0.5);  // +0 to +15%
  } else if (pressureScore < 0.6) {
    adjustmentMultiplier = 1.1 + (pressureScore * 0.4);  // +15 to +35%
  } else {
    adjustmentMultiplier = 1.3 + (pressureScore * 0.3);  // +30% and up, capped
  }
  
  // Cap the multiplier at 2.0x (never recommend more than double base)
  adjustmentMultiplier = Math.min(adjustmentMultiplier, 2.0);
  
  // If the highest-FAAB opponent has an acute need, add a premium
  const topThreat = threatDetails.sort((a, b) => b.faab - a.faab)[0];
  if (topThreat && topThreat.needLevel === 3 && topThreat.faab > league.remainingFAAB * 0.8) {
    adjustmentMultiplier *= 1.1; // Extra 10% when a well-funded opponent is desperate
  }
  
  const marketBid = Math.round(baseBid * adjustmentMultiplier);
  
  return Math.min(marketBid, league.remainingFAAB * 0.5); // Safety cap
}
```

---

## Layer 3: Budget Management & Season Pacing

```javascript
function budgetPacing(league) {
  const budgetPct = league.remainingFAAB / league.totalBudget;
  const seasonPct = league.remainingWeeks / league.totalWeeks;
  
  // Pace ratio: >1 means ahead (have more budget than expected), <1 means behind
  const paceRatio = budgetPct / seasonPct;
  
  let status, aggressivenessModifier;
  
  if (paceRatio > 1.2) {
    status = "well_ahead";
    aggressivenessModifier = 1.15;  // Can afford to be more aggressive
  } else if (paceRatio > 0.95) {
    status = "on_pace";
    aggressivenessModifier = 1.0;
  } else if (paceRatio > 0.7) {
    status = "slightly_behind";
    aggressivenessModifier = 0.85;  // Pull back a bit
  } else {
    status = "conserve";
    aggressivenessModifier = 0.65;  // Significant pullback
  }
  
  return { status, paceRatio, aggressivenessModifier };
}

function calculateAggressiveBid(marketBid, pacing, league) {
  // Aggressive bid = market bid * 1.3-1.5, modified by pacing
  const aggressive = Math.round(marketBid * 1.35 * pacing.aggressivenessModifier);
  return Math.min(aggressive, league.remainingFAAB * 0.6); // Higher cap for aggressive
}
```

---

## Layer 4: Confidence Scoring

```javascript
function calculateConfidence(player, scarcity, pressureScore, needMatch) {
  let score = 0;
  
  // Factor 1: Projection reliability (is this a known quantity or a speculative add?)
  if (player.gamesPlayed > 30) score += 3;       // Established track record
  else if (player.gamesPlayed > 10) score += 2;  // Some data
  else score += 1;                                 // Speculative
  
  // Factor 2: Scarcity (high scarcity = more confident the bid matters)
  if (scarcity.level === "very_high") score += 3;
  else if (scarcity.level === "high") score += 2;
  else if (scarcity.level === "medium") score += 1;
  
  // Factor 3: Does this fill a clear need on the user's team?
  if (needMatch) score += 2;
  else score += 1;
  
  // Factor 4: Are we confident in the opponent analysis?
  if (pressureScore > 0.3) score += 1; // Clear competitive dynamics
  
  // Map to confidence level
  if (score >= 8) return "high";
  if (score >= 5) return "medium";
  return "low";
}
```

---

## Putting It All Together

```javascript
function generateBidRecommendation(player, userTeam, opponents, freeAgentPool, league) {
  // Layer 1: Base value
  const fantasyValue = calculateFantasyPoints(player.projections, league.scoringSettings);
  const scarcity = positionalScarcity(player.position, freeAgentPool, league.numTeams);
  const baseBid = calculateBaseBid(fantasyValue, scarcity.multiplier, league);
  
  // Layer 2: Opponent-aware adjustment
  const { pressureScore, threatDetails } = calculateCompetitivePressure(player, opponents, league);
  const marketBid = calculateMarketBid(baseBid, pressureScore, threatDetails, league);
  
  // Layer 3: Budget pacing
  const pacing = budgetPacing(league);
  const aggressiveBid = calculateAggressiveBid(marketBid, pacing, league);
  
  // Layer 4: Confidence
  const needMatch = userTeamNeedsPosition(userTeam, player.position, league);
  const confidence = calculateConfidence(player, scarcity, pressureScore, needMatch);
  
  // Generate human-readable reasoning
  const reasoning = generateReasoning(player, scarcity, threatDetails, pacing, needMatch);
  
  return {
    player: player.name,
    position: player.position,
    team: player.realTeam,
    baseBid,
    marketBid,
    aggressiveBid,
    confidence,
    scarcity: scarcity.level,
    opponentsNeeding: threatDetails.length,
    budgetImpact: ((marketBid / league.remainingFAAB) * 100).toFixed(1),
    needMatch,
    reasoning,
    threatDetails,
    projections: player.projections,
    pacingStatus: pacing.status
  };
}
```

---

## Reasoning Generator

Produces the human-readable explanation shown on each bid card.

```javascript
function generateReasoning(player, scarcity, threatDetails, pacing, needMatch) {
  const parts = [];
  
  // Player context
  parts.push(`${player.name} (${player.position}, ${player.realTeam})`);
  
  // Scarcity
  if (scarcity.level === "very_high") {
    parts.push(`${player.position} is extremely scarce in the free agent pool.`);
  } else if (scarcity.level === "high") {
    parts.push(`Limited ${player.position} options available.`);
  }
  
  // Opponent pressure
  if (threatDetails.length === 0) {
    parts.push("Low competition expected — no opponents have an acute need here.");
  } else if (threatDetails.length <= 2) {
    const names = threatDetails.map(t => `${t.team} ($${t.faab})`).join(" and ");
    parts.push(`Moderate competition: ${names} also likely targeting this position.`);
  } else {
    parts.push(`High competition: ${threatDetails.length} opponents need ${player.position}.`);
    const topThreat = threatDetails[0];
    parts.push(`Biggest threat: ${topThreat.team} with $${topThreat.faab} remaining.`);
  }
  
  // Need match
  if (needMatch) {
    parts.push("Fills a positional need on your roster.");
  }
  
  // Pacing
  if (pacing.status === "conserve") {
    parts.push("⚠️ Your budget is running low — bid conservatively.");
  } else if (pacing.status === "well_ahead") {
    parts.push("You have budget to spare — can afford to be aggressive.");
  }
  
  return parts.join(" ");
}
```

---

## Scoring Presets (Concrete Values)

### Football Scoring Presets

```javascript
const FOOTBALL_SCORING = {
  standard: {
    passingYards: 0.04, passingTD: 4, interception: -2,
    rushingYards: 0.1, rushingTD: 6,
    receivingYards: 0.1, receivingTD: 6,
    receptions: 0, fumblesLost: -2
  },
  ppr: {
    passingYards: 0.04, passingTD: 4, interception: -2,
    rushingYards: 0.1, rushingTD: 6,
    receivingYards: 0.1, receivingTD: 6,
    receptions: 1, fumblesLost: -2
  },
  half_ppr: {
    passingYards: 0.04, passingTD: 4, interception: -2,
    rushingYards: 0.1, rushingTD: 6,
    receivingYards: 0.1, receivingTD: 6,
    receptions: 0.5, fumblesLost: -2
  },
  superflex_ppr_tep: {
    passingYards: 0.04, passingTD: 4, interception: -2,
    rushingYards: 0.1, rushingTD: 6,
    receivingYards: 0.1, receivingTD: 6,
    receptions: 1, fumblesLost: -2,
    te_reception_bonus: 0.5  // TE Premium: TEs get 1.5 per reception
    // Superflex affects ROSTER SLOTS not scoring — handled in need detection
  }
};

const FOOTBALL_STARTER_SLOTS = {
  standard: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DEF: 1 },
  superflex: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SUPERFLEX: 1, K: 1, DEF: 1 },
  // SUPERFLEX slot: QB/RB/WR/TE eligible — makes QBs much more valuable
};
```

### Baseball Scoring Presets

```javascript
const BASEBALL_SCORING = {
  roto_5x5_standard: {
    type: "roto",
    hitting: ["R", "HR", "RBI", "SB", "AVG"],
    pitching: ["W", "SV", "K", "ERA", "WHIP"],
    // SGP denominators (how much of a stat = ~1 standings point, 12-team)
    sgpDenominators_12team: {
      R: 28, HR: 10, RBI: 30, SB: 7, AVG: 0.004,
      W: 3, SV: 6, K: 30, ERA: -0.18, WHIP: -0.015
    },
    sgpDenominators_15team: {
      R: 25, HR: 9, RBI: 27, SB: 6, AVG: 0.003,
      W: 2.5, SV: 5, K: 25, ERA: -0.15, WHIP: -0.012
    }
  },
  roto_5x5_obp: {
    type: "roto",
    hitting: ["R", "HR", "RBI", "SB", "OBP"],  // OBP replaces AVG
    pitching: ["W", "SV", "K", "ERA", "WHIP"]
  },
  points: {
    type: "points",
    // Direct point values
    hitting: {
      single: 1, double: 2, triple: 3, HR: 4, RBI: 1, R: 1, SB: 2, CS: -1, BB: 1, K: -0.5
    },
    pitching: {
      IP: 3, K: 1, W: 5, L: -3, SV: 5, ER: -2, BB: -1, QS: 3
    }
  }
};

const BASEBALL_ROSTER = {
  nfbc_12team: {
    starters: { C: 1, "1B": 1, "2B": 1, "3B": 1, SS: 1, OF: 5, UTIL: 1, SP: 9, RP: 0 },
    // NFBC uses 9 pitcher slots total (any mix of SP/RP), 14 hitter slots
    totalRoster: 30, reserve: 7
  },
  nfbc_15team: {
    starters: { C: 1, "1B": 1, "2B": 1, "3B": 1, SS: 1, OF: 5, UTIL: 1, SP: 9, RP: 0 },
    totalRoster: 30, reserve: 7
  }
};
```

### League Presets (Complete Configurations)

```javascript
const LEAGUE_PRESETS = {
  nfbc_main_event: {
    name: "NFBC Main Event",
    sport: "baseball",
    numTeams: 15,
    scoring: "roto_5x5_standard",
    roster: "nfbc_15team",
    faabBudget: 1000,
    faabMinBid: 1,      // NFBC does NOT allow $0 bids
    totalWeeks: 27,
    waiverDay: "Sunday",
    waiverFrequency: "weekly"
  },
  nfbc_online_championship: {
    name: "NFBC Online Championship",
    sport: "baseball",
    numTeams: 12,
    scoring: "roto_5x5_standard",
    roster: "nfbc_12team",
    faabBudget: 1000,
    faabMinBid: 1,
    totalWeeks: 27,
    waiverDay: "Sunday",
    waiverFrequency: "weekly"
  },
  standard_ppr: {
    name: "Standard PPR",
    sport: "football",
    numTeams: 12,
    scoring: "ppr",
    roster: "standard",
    faabBudget: 100,
    faabMinBid: 0,
    totalWeeks: 17,
    waiverDay: "Wednesday",
    waiverFrequency: "weekly"
  },
  superflex_tep: {
    name: "Superflex + TE Premium",
    sport: "football",
    numTeams: 12,
    scoring: "superflex_ppr_tep",
    roster: "superflex",
    faabBudget: 100,
    faabMinBid: 0,
    totalWeeks: 17,
    waiverDay: "Wednesday",
    waiverFrequency: "weekly"
  },
  guillotine: {
    name: "Guillotine League",
    sport: "football",
    numTeams: 17,  // Starts at 17, loses 1 per week
    scoring: "half_ppr",
    roster: "standard",
    faabBudget: 1000,
    faabMinBid: 0,
    totalWeeks: 16,
    waiverDay: "Wednesday",
    waiverFrequency: "weekly",
    special: "guillotine" // Lowest scorer eliminated each week, their players go to FA pool
  }
};
```
