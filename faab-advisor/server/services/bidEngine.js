import { FOOTBALL_SCORING, BASEBALL_SCORING, FOOTBALL_STARTER_SLOTS, BASEBALL_ROSTER } from '../../shared/constants.js';

function getReplacementLevelValue(sport) {
    return sport === 'football' ? 8 : 1.5;
}

function getTopFreeAgentVAR(sport) {
    return sport === 'football' ? 20 : 8;
}

export function calculateFantasyPoints(projections, scoringSettings, sport) {
    if (!projections) return 0;
    let points = 0;

    if (sport === 'football') {
        if (projections["Pts/Wk"]) return projections["Pts/Wk"]; // Use precomputed if available

        for (const [stat, value] of Object.entries(projections)) {
            if (scoringSettings[stat] !== undefined) {
                points += value * scoringSettings[stat];
            }
        }
        return points;
    }

    if (sport === 'baseball') {
        // simplified SGP calculation for roto
        const denom = scoringSettings.sgpDenominators_12team || scoringSettings.sgpDenominators_15team || BASEBALL_SCORING.roto_5x5_standard.sgpDenominators_12team;
        let totalSGP = 0;
        for (const [cat, denominator] of Object.entries(denom)) {
            if (projections[cat] !== undefined) {
                totalSGP += projections[cat] / denominator;
            }
        }
        // If stats don't match exactly or we lack complete projections, return a base default
        return totalSGP > 0 ? totalSGP : 5;
    }
    return 0;
}

export function positionalScarcity(position, freeAgentPool, leagueSize) {
    const REPLACEMENT_THRESHOLD = 5;
    const viableAtPosition = freeAgentPool.filter(p =>
        p.position === position && p.value > REPLACEMENT_THRESHOLD
    ).length;

    const ratio = viableAtPosition / leagueSize;

    if (ratio < 0.3) return { level: "very high", multiplier: 1.40 };
    if (ratio < 0.6) return { level: "high", multiplier: 1.20 };
    if (ratio < 1.0) return { level: "medium", multiplier: 1.05 };
    return { level: "low", multiplier: 1.00 };
}

export function calculateBaseBid(playerValue, scarcityMultiplier, userTeam, league, currentWeek) {
    const sport = league.sport;
    const replacementValue = getReplacementLevelValue(sport);
    const var_ = Math.max(0, playerValue - replacementValue);

    const remainingWeeks = Math.max(1, league.total_weeks - currentWeek);
    const weeklyBudget = userTeam.remaining_faab / remainingWeeks;

    const topPlayerVAR = getTopFreeAgentVAR(sport);
    const valueRatio = Math.min(var_ / topPlayerVAR, 1.2);

    let rawBid = weeklyBudget * valueRatio * 0.5 * scarcityMultiplier;

    // Floor and ceiling
    const minBid = league.faab_min_bid;
    const maxBid = userTeam.remaining_faab * 0.5;

    return Math.max(minBid, Math.min(Math.round(rawBid), maxBid));
}

export function detectOpponentNeeds(opponent, position, sport, numTeams) {
    const roster = opponent.roster || [];

    if (sport === 'football') {
        const starterSlots = FOOTBALL_STARTER_SLOTS.standard;
        // Assume 1 if not explicitly in standard (like SUPERFLEX isn't position specific but affects QBs)
        let needed = starterSlots[position] || 1;
        if (position === 'QB' && starterSlots.SUPERFLEX) needed = 2; // Rough adjustment for superflex

        const rostered = roster.filter(p => p.position === position).length;

        if (rostered < needed) return 3;
        if (rostered === needed) return 1;
        return 0;
    }

    if (sport === 'baseball') {
        const rostered = roster.filter(p => p.position === position || (p.position && p.position.includes(position))).length;
        let minRequired = 1;
        if (position === 'OF') minRequired = 4;
        if (position === 'SP') minRequired = 6;
        if (position === 'RP') minRequired = 2;

        if (rostered < minRequired) return 3;
        if (rostered === minRequired) return 1;
        return 0;
    }
    return 0;
}

export function calculateCompetitivePressure(player, opponents, league) {
    let pressureScore = 0;
    let threatDetails = [];

    const totalBudget = league.faab_budget;

    for (const opponent of opponents) {
        const needLevel = detectOpponentNeeds(opponent, player.position, league.sport, league.num_teams);
        if (needLevel === 0) continue;

        const budgetThreat = opponent.remaining_faab / totalBudget;
        const urgencyWeight = needLevel / 3;

        const threatScore = budgetThreat * urgencyWeight;
        pressureScore += threatScore;

        if (needLevel >= 2) {
            threatDetails.push({
                team: opponent.team_name,
                faab: opponent.remaining_faab,
                needLevel,
                threatScore
            });
        }
    }

    return { pressureScore, threatDetails };
}

export function calculateMarketBid(baseBid, pressureScore, threatDetails, userTeam, league) {
    let adjustmentMultiplier = 1.0;

    if (pressureScore < 0.1) {
        adjustmentMultiplier = 0.9;
    } else if (pressureScore < 0.3) {
        adjustmentMultiplier = 1.0 + (pressureScore * 0.5);
    } else if (pressureScore < 0.6) {
        adjustmentMultiplier = 1.1 + (pressureScore * 0.4);
    } else {
        adjustmentMultiplier = 1.3 + (pressureScore * 0.3);
    }

    adjustmentMultiplier = Math.min(adjustmentMultiplier, 2.0);

    // Premium if a well-funded opponent is desperate
    const sortedThreats = [...threatDetails].sort((a, b) => b.faab - a.faab);
    const topThreat = sortedThreats[0];
    if (topThreat && topThreat.needLevel === 3 && topThreat.faab > userTeam.remaining_faab * 0.8) {
        adjustmentMultiplier *= 1.1;
    }

    const marketBid = Math.round(baseBid * adjustmentMultiplier);
    return Math.min(marketBid, userTeam.remaining_faab * 0.5);
}

export function budgetPacing(userTeam, league, currentWeek) {
    const budgetPct = userTeam.remaining_faab / league.faab_budget;
    const remainingWeeks = Math.max(1, league.total_weeks - currentWeek);
    const seasonPct = remainingWeeks / league.total_weeks;

    const paceRatio = budgetPct / seasonPct;

    let status, aggressivenessModifier;

    if (paceRatio > 1.2) {
        status = "well_ahead";
        aggressivenessModifier = 1.15;
    } else if (paceRatio > 0.95) {
        status = "on_pace";
        aggressivenessModifier = 1.0;
    } else if (paceRatio > 0.7) {
        status = "slightly_behind";
        aggressivenessModifier = 0.85;
    } else {
        status = "conserve";
        aggressivenessModifier = 0.65;
    }

    return { status, paceRatio, aggressivenessModifier };
}

export function calculateAggressiveBid(marketBid, pacing, userTeam) {
    const aggressive = Math.round(marketBid * 1.35 * pacing.aggressivenessModifier);
    return Math.min(aggressive, userTeam.remaining_faab * 0.6);
}

export function calculateConfidence(player, scarcity, pressureScore, needMatch) {
    let score = 0;

    if (player.games_played > 30) score += 3;
    else if (player.games_played > 10) score += 2;
    else score += 1;

    if (scarcity.level === "very high") score += 3;
    else if (scarcity.level === "high") score += 2;
    else if (scarcity.level === "medium") score += 1;

    if (needMatch) score += 2;
    else score += 1;

    if (pressureScore > 0.3) score += 1;

    if (score >= 8) return "high";
    if (score >= 5) return "medium";
    return "low";
}

export function generateReasoning(player, scarcity, threatDetails, pacing, needMatch) {
    const parts = [];

    parts.push(`${player.name} (${player.position}, ${player.real_team}).`);

    if (scarcity.level === "very high") {
        parts.push(`${player.position} is extremely scarce in the free agent pool.`);
    } else if (scarcity.level === "high") {
        parts.push(`Limited ${player.position} options available.`);
    }

    if (threatDetails.length === 0) {
        parts.push("Low competition expected \u2014 no opponents have an acute need here.");
    } else if (threatDetails.length <= 2) {
        const names = threatDetails.map(t => `${t.team} ($${t.faab})`).join(" and ");
        parts.push(`Moderate competition: ${names} also likely targeting this position.`);
    } else {
        parts.push(`High competition: ${threatDetails.length} opponents need ${player.position}.`);
        const topThreat = threatDetails[0];
        parts.push(`Biggest threat: ${topThreat.team} with $${topThreat.faab} remaining.`);
    }

    if (needMatch) {
        parts.push("Fills a positional need on your roster.");
    }

    if (pacing.status === "conserve") {
        parts.push("\u26A0\uFE0F Your budget is running low \u2014 bid conservatively.");
    } else if (pacing.status === "well_ahead") {
        parts.push("You have budget to spare \u2014 can afford to be aggressive.");
    }

    return parts.join(" ");
}

export function generateBidRecommendation(player, userTeam, opponents, freeAgentPool, league, currentWeek = 8) {
    const scoringSettings = JSON.parse(league.scoring_settings || '{}') || {};
    let presetScoring = null;
    if (league.sport === 'football') {
        presetScoring = FOOTBALL_SCORING[scoringSettings.type] || FOOTBALL_SCORING.ppr;
    } else {
        presetScoring = BASEBALL_SCORING[scoringSettings.type] || BASEBALL_SCORING.roto_5x5_standard;
    }

    const projections = JSON.parse(player.projected_stats || '{}');
    const fantasyValue = calculateFantasyPoints(projections, presetScoring, league.sport);

    // Compute FA pool values for scarcity
    const faValues = freeAgentPool.map(fa => ({
        position: fa.player.position,
        value: calculateFantasyPoints(JSON.parse(fa.player.projected_stats || '{}'), presetScoring, league.sport)
    }));

    const scarcity = positionalScarcity(player.position, faValues, league.num_teams);
    const baseBid = calculateBaseBid(fantasyValue, scarcity.multiplier, userTeam, league, currentWeek);

    const { pressureScore, threatDetails } = calculateCompetitivePressure(player, opponents, league);
    const marketBid = calculateMarketBid(baseBid, pressureScore, threatDetails, userTeam, league);

    const pacing = budgetPacing(userTeam, league, currentWeek);
    const aggressiveBid = calculateAggressiveBid(marketBid, pacing, userTeam);

    const needMatch = detectOpponentNeeds(userTeam, player.position, league.sport, league.num_teams) >= 1;
    const confidence = calculateConfidence(player, scarcity, pressureScore, needMatch);

    const reasoning = generateReasoning(player, scarcity, threatDetails, pacing, needMatch);

    return {
        player: player.name,
        position: player.position,
        team: player.real_team,
        baseBid,
        marketBid,
        aggressiveBid,
        confidence,
        scarcity: scarcity.level,
        opponentsNeeding: threatDetails.length,
        budgetImpact: ((marketBid / userTeam.remaining_faab) * 100).toFixed(1),
        needMatch,
        reasoning,
        threatDetails,
        projections: projections,
        pacingStatus: pacing.status
    };
}
