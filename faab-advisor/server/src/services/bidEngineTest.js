#!/usr/bin/env node
/**
 * Bid Engine Tuning Test Harness
 *
 * Runs the engine against sample data and verifies 5 specific scenarios.
 * Usage: node bidEngineTest.js
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
  LEAGUE_PRESETS,
} = await import(sharedPath);

import {
  calculateFantasyPoints,
  calculateSGP,
  calculatePlayerValue,
  positionalScarcity,
  calculateBaseBid,
  detectOpponentNeeds,
  calculateCompetitivePressure,
  calculateMarketBid,
  budgetPacing,
  calculateAggressiveBid,
  calculateConfidence,
  generateReasoning,
  generateBidRecommendation,
  generateAllRecommendations,
  userTeamNeedsPosition,
} from './bidEngine.js';

// ── Utilities ──────────────────────────────────────────────────────────────

const DIVIDER = '═'.repeat(80);
const THIN = '─'.repeat(80);

function header(title) {
  console.log(`\n${DIVIDER}`);
  console.log(`  ${title}`);
  console.log(DIVIDER);
}

function subheader(title) {
  console.log(`\n${THIN}`);
  console.log(`  ${title}`);
  console.log(THIN);
}

function pass(msg) { console.log(`  ✅ PASS: ${msg}`); }
function fail(msg) { console.log(`  ❌ FAIL: ${msg}`); }
function info(msg) { console.log(`  ℹ️  ${msg}`); }
function warn(msg) { console.log(`  ⚠️  ${msg}`); }

let totalTests = 0;
let passedTests = 0;

function check(condition, passMsg, failMsg) {
  totalTests++;
  if (condition) {
    passedTests++;
    pass(passMsg);
  } else {
    fail(failMsg);
  }
  return condition;
}

// ── Sample Data Builders ─────────────────────────────────────────────────

function buildBaseballSPPlayer(name = 'Gavin Williams') {
  return {
    name,
    position: 'SP',
    realTeam: 'CLE',
    projectedStats: { W: 0, SV: 0, K: 85, ERA: 3.20, WHIP: 1.08 },
    gamesPlayed: 8,
    ownershipPct: 22,
    note: 'Returning from IL - two start week',
  };
}

function buildCloser(name = 'Yennier Cano') {
  return {
    name,
    position: 'RP',
    realTeam: 'BAL',
    projectedStats: { W: 0, SV: 18, K: 52, ERA: 2.40, WHIP: 0.95 },
    gamesPlayed: 35,
    ownershipPct: 15,
    note: 'Named closer after Fujinami DFA',
  };
}

function buildQB(name = 'Drake Maye') {
  return {
    name,
    position: 'QB',
    realTeam: 'NE',
    projectedStats: { passingYards: 225, passingTD: 1.2, interception: 0.8, rushingYards: 28, rushingTD: 0.3 },
    gamesPlayed: 5,
    ownershipPct: 28,
    note: 'Named starter. Rushing upside adds floor.',
  };
}

/**
 * Build a baseball free agent pool similar to the CSV data.
 */
function buildBaseballFAPool() {
  const players = [
    { name: 'Gavin Williams', position: 'SP', projectedStats: { W: 0, SV: 0, K: 85, ERA: 3.20, WHIP: 1.08 }, gamesPlayed: 8 },
    { name: 'Yennier Cano', position: 'RP', projectedStats: { W: 0, SV: 18, K: 52, ERA: 2.40, WHIP: 0.95 }, gamesPlayed: 35 },
    { name: 'Luis Matos', position: 'OF', projectedStats: { R: 28, HR: 8, RBI: 22, SB: 7, AVG: 0.275 }, gamesPlayed: 12 },
    { name: 'Joey Cantillo', position: 'SP', projectedStats: { W: 0, SV: 0, K: 42, ERA: 3.85, WHIP: 1.22 }, gamesPlayed: 4 },
    { name: 'Ceddanne Rafaela', position: 'SS/OF', projectedStats: { R: 25, HR: 6, RBI: 18, SB: 9, AVG: 0.258 }, gamesPlayed: 45 },
    { name: 'Hunter Brown', position: 'SP', projectedStats: { W: 0, SV: 0, K: 78, ERA: 3.65, WHIP: 1.18 }, gamesPlayed: 22 },
    { name: 'Spencer Arrighetti', position: 'SP', projectedStats: { W: 0, SV: 0, K: 72, ERA: 3.90, WHIP: 1.25 }, gamesPlayed: 18 },
    { name: 'Victor Robles', position: 'OF', projectedStats: { R: 18, HR: 3, RBI: 12, SB: 14, AVG: 0.262 }, gamesPlayed: 30 },
    { name: 'Parker Meadows', position: 'OF', projectedStats: { R: 22, HR: 7, RBI: 19, SB: 5, AVG: 0.255 }, gamesPlayed: 25 },
    { name: 'Hurston Waldrep', position: 'SP', projectedStats: { W: 0, SV: 0, K: 35, ERA: 4.10, WHIP: 1.30 }, gamesPlayed: 3 },
    { name: 'Austin Wells', position: 'C', projectedStats: { R: 20, HR: 9, RBI: 28, SB: 1, AVG: 0.248 }, gamesPlayed: 40 },
    { name: 'MJ Melendez', position: 'C', projectedStats: { R: 18, HR: 8, RBI: 24, SB: 2, AVG: 0.235 }, gamesPlayed: 38 },
  ];
  return players;
}

function buildFootballFAPool() {
  return [
    { name: 'Drake Maye', position: 'QB', projectedStats: { passingYards: 225, passingTD: 1.2, interception: 0.8, rushingYards: 28, rushingTD: 0.3 }, gamesPlayed: 5 },
    { name: 'Audric Estime', position: 'RB', projectedStats: { rushingYards: 62, rushingTD: 0.5, receptions: 1.5, receivingYards: 12, receivingTD: 0.1 }, gamesPlayed: 6 },
    { name: 'Tucker Kraft', position: 'TE', projectedStats: { receptions: 4.2, receivingYards: 48, receivingTD: 0.4 }, gamesPlayed: 8 },
    { name: 'Quentin Johnston', position: 'WR', projectedStats: { receptions: 3.5, receivingYards: 55, receivingTD: 0.3 }, gamesPlayed: 7 },
    { name: 'Jerome Ford', position: 'RB', projectedStats: { rushingYards: 45, rushingTD: 0.3, receptions: 3.0, receivingYards: 25, receivingTD: 0.2 }, gamesPlayed: 6 },
    { name: 'Dontayvion Wicks', position: 'WR', projectedStats: { receptions: 3.8, receivingYards: 50, receivingTD: 0.3 }, gamesPlayed: 6 },
  ];
}

/**
 * Build a baseball opponent with specific position needs.
 */
function buildBaseballOpponent(name, remainingFaab, roster) {
  return { teamName: name, remainingFaab, roster };
}

/**
 * Build a football opponent.
 */
function buildFootballOpponent(name, remainingFaab, roster) {
  return { teamName: name, remainingFaab, roster };
}

// ── Detailed Recommendation Printer ─────────────────────────────────────

function printDetailedRecommendation(rec, league, freeAgentPool) {
  console.log(`\n  Player: ${rec.playerName} (${rec.position}, ${rec.realTeam})`);
  console.log(`  ┌─── Base Bid Calculation ───────────────────────────────────┐`);

  // Recalculate intermediate values for display
  const playerValue = calculatePlayerValue(
    { projectedStats: rec.projectedStats, position: rec.position },
    league
  );
  const scarcity = positionalScarcity(rec.position, freeAgentPool, league.numTeams);

  const remainingFaab = league.remainingFaab || league.faabBudget;
  const remainingWeeks = Math.max(1, league.totalWeeks - (league.currentWeek || 1) + 1);
  const weeklyBudget = remainingFaab / remainingWeeks;

  console.log(`  │  Fantasy Value (${league.sport === 'baseball' ? 'SGP' : 'FP'}): ${playerValue.toFixed(2)}`);
  console.log(`  │  Scarcity: ${scarcity.level} (${scarcity.multiplier}x)`);
  console.log(`  │  Weekly Budget: $${weeklyBudget.toFixed(1)} ($${remainingFaab} / ${remainingWeeks} weeks)`);
  console.log(`  │  → Base Bid: $${rec.baseBid}`);
  console.log(`  └──────────────────────────────────────────────────────────────┘`);

  console.log(`  ┌─── Competitive Pressure ──────────────────────────────────┐`);
  if (rec.threatDetails.length === 0) {
    console.log(`  │  No significant threats detected`);
  } else {
    for (const t of rec.threatDetails) {
      const needLabel = t.needLevel === 3 ? 'DESPERATE' : t.needLevel === 2 ? 'Moderate' : 'Mild';
      console.log(`  │  ${t.team}: $${t.faab} FAAB, need=${needLabel} (${t.needLevel}), threat=${t.threatScore.toFixed(3)}`);
    }
  }

  // Recalculate pressure for display
  const pressureInfo = { pressureScore: 0 };
  if (rec.threatDetails.length > 0) {
    pressureInfo.pressureScore = rec.threatDetails.reduce((sum, t) => sum + t.threatScore, 0);
  }
  console.log(`  │  Total Pressure Score: ${pressureInfo.pressureScore.toFixed(3)}`);
  console.log(`  └──────────────────────────────────────────────────────────────┘`);

  console.log(`  ┌─── Market & Aggressive Bids ─────────────────────────────┐`);

  // Calculate market multiplier for display
  const ps = pressureInfo.pressureScore;
  let marketMult;
  if (ps < 0.1) marketMult = 0.9;
  else if (ps < 0.3) marketMult = 1.0 + (ps * 0.5);
  else if (ps < 0.6) marketMult = 1.1 + (ps * 0.4);
  else marketMult = Math.min(1.3 + (ps * 0.3), 2.0);

  const pacing = budgetPacing(league);

  console.log(`  │  Market Adjustment: ${marketMult.toFixed(3)}x → Market Bid: $${rec.marketBid}`);
  console.log(`  │  Pacing: ${pacing.status} (ratio=${pacing.paceRatio.toFixed(2)}, mod=${pacing.aggressivenessModifier})`);
  console.log(`  │  → Aggressive Bid: $${rec.aggressiveBid}`);
  console.log(`  └──────────────────────────────────────────────────────────────┘`);

  console.log(`  Confidence: ${rec.confidence} | Need Match: ${rec.needMatch} | Budget Impact: ${rec.budgetImpact}%`);
  console.log(`  Reasoning: ${rec.reasoning}`);
}

// ══════════════════════════════════════════════════════════════════════════
// ── BASELINE: Run engine against full sample data ──
// ══════════════════════════════════════════════════════════════════════════

header('BASELINE: 12-Team NFBC Online Championship (Baseball)');

const baseballFAPool = buildBaseballFAPool();

const league12 = {
  sport: 'baseball',
  numTeams: 12,
  faabBudget: 1000,
  faabMinBid: 1,
  totalWeeks: 27,
  currentWeek: 8,
  remainingFaab: 714,
  formatPreset: 'nfbc_online_championship',
};

const userTeamBaseball = {
  roster: [
    { position: 'DH/SP', name: 'Ohtani' },
    { position: 'SS', name: 'Betts' },
    { position: '1B', name: 'Freeman' },
    { position: 'SS', name: 'Turner' },
    { position: 'OF', name: 'Carroll' },
    { position: 'SS', name: 'Henderson' },
    { position: 'SS', name: 'Witt' },
    { position: 'SP', name: 'Strider' },
    { position: 'SP', name: 'Webb' },
    { position: 'SP', name: 'Wheeler' },
    { position: 'SP', name: 'Skubal' },
    { position: 'SP', name: 'Cease' },
    { position: 'C', name: 'Perez' },
    { position: '2B', name: 'Albies' },
    { position: '3B', name: 'Jung' },
    { position: 'OF', name: 'Tucker' },
    { position: '3B', name: 'Chisholm' },
    { position: '1B', name: 'Alonso' },
    { position: 'RP', name: 'Hader' },
    { position: 'RP', name: 'Helsley' },
  ],
};

const baseballOpponents = [
  buildBaseballOpponent('Team Alvarez', 820, [
    { position: 'DH', name: 'Alvarez' }, { position: 'OF', name: 'Judge' },
    { position: '1B', name: 'Harper' }, { position: 'OF', name: 'Robert' },
    { position: 'SP', name: 'Fried' }, { position: 'SP', name: 'Valdez' },
    { position: 'C', name: 'Rutschman' }, { position: 'SS', name: 'Adames' },
    { position: 'SS', name: 'Bichette' }, { position: '1B', name: 'Diaz' },
  ]),
  buildBaseballOpponent('Team Soto', 550, [
    { position: 'OF', name: 'Soto' }, { position: '1B', name: 'Guerrero' },
    { position: '3B', name: 'Devers' }, { position: '2B', name: 'Semien' },
    { position: 'SP', name: 'Castillo' }, { position: 'SP', name: 'Cole' },
    { position: 'OF', name: 'Duran' }, { position: 'SS', name: 'Volpe' },
    { position: 'SS', name: 'Abrams' },
  ]),
  buildBaseballOpponent('Team Ohtani', 910, [
    { position: 'OF', name: 'Trout' }, { position: 'OF', name: 'Rodriguez' },
    { position: 'SS', name: 'Seager' }, { position: '1B', name: 'Olson' },
    { position: 'SP', name: 'Senga' }, { position: 'SP', name: 'McClanahan' },
    { position: 'SP', name: 'Glasnow' }, { position: '3B', name: 'Ramirez' },
    { position: 'C', name: 'Contreras' },
  ]),
  buildBaseballOpponent('Team Acuna', 340, [
    { position: 'OF', name: 'Acuna' }, { position: 'OF', name: 'Tatis' },
    { position: 'SS', name: 'De La Cruz' }, { position: 'OF', name: 'Chourio' },
    { position: 'SP', name: 'Skenes' }, { position: 'SP', name: 'Rodriguez' },
  ]),
];

// Pre-calculate player values for the FA pool
const faPoolWithValues12 = baseballFAPool.map(fa => ({
  ...fa,
  playerValue: calculatePlayerValue(fa, league12),
}));

info('Pre-calculated fantasy values (12-team SGP):');
for (const fa of faPoolWithValues12.sort((a, b) => b.playerValue - a.playerValue)) {
  console.log(`    ${fa.name.padEnd(22)} ${fa.position.padEnd(6)} SGP = ${fa.playerValue.toFixed(2)}`);
}

const recs12 = generateAllRecommendations(baseballFAPool, userTeamBaseball, baseballOpponents, league12);

subheader('Full Recommendations (12-team)');
for (const rec of recs12) {
  printDetailedRecommendation(rec, league12, faPoolWithValues12);
}

// ══════════════════════════════════════════════════════════════════════════
// ── SCENARIO 1: SP in 15-team vs 12-team ──
// ══════════════════════════════════════════════════════════════════════════

header('SCENARIO 1: SP Scarcity — 15-team (9 opponents need SP) vs 12-team (4 need SP)');

const sp = buildBaseballSPPlayer('Gavin Williams');

// 15-team league with MORE opponents needing SP
const league15 = {
  ...league12,
  numTeams: 15,
  formatPreset: 'nfbc_main_event',
};

// Build 14 opponents for 15-team league, 9 needing SP (only 2 SP each)
const opponents15_needSP = [];
for (let i = 0; i < 14; i++) {
  const needsSP = i < 9; // 9 opponents need SP
  const faab = 500 + Math.floor(Math.random() * 400);
  const roster = needsSP
    ? [{ position: 'SP', name: `SP${i}a` }, { position: 'SP', name: `SP${i}b` }]
    : [{ position: 'SP', name: `SP${i}a` }, { position: 'SP', name: `SP${i}b` }, { position: 'SP', name: `SP${i}c` }, { position: 'SP', name: `SP${i}d` }];
  opponents15_needSP.push(buildBaseballOpponent(`Team ${i+1}`, faab, roster));
}

// 12-team league with FEWER opponents needing SP
const opponents12_fewNeedSP = [];
for (let i = 0; i < 11; i++) {
  const needsSP = i < 4; // Only 4 need SP
  const faab = 500 + Math.floor(Math.random() * 400);
  const roster = needsSP
    ? [{ position: 'SP', name: `SP${i}a` }, { position: 'SP', name: `SP${i}b` }]
    : [{ position: 'SP', name: `SP${i}a` }, { position: 'SP', name: `SP${i}b` }, { position: 'SP', name: `SP${i}c` }, { position: 'SP', name: `SP${i}d` }];
  opponents12_fewNeedSP.push(buildBaseballOpponent(`Team ${i+1}`, faab, roster));
}

// Use fixed FAAB values so results are deterministic
for (let i = 0; i < opponents15_needSP.length; i++) {
  opponents15_needSP[i].remainingFaab = 700;
}
for (let i = 0; i < opponents12_fewNeedSP.length; i++) {
  opponents12_fewNeedSP[i].remainingFaab = 700;
}

const faPool15 = baseballFAPool.map(fa => ({
  ...fa,
  playerValue: calculatePlayerValue(fa, league15),
}));

const rec15 = generateBidRecommendation(sp, userTeamBaseball, opponents15_needSP, faPool15, league15);
const rec12 = generateBidRecommendation(sp, userTeamBaseball, opponents12_fewNeedSP, faPoolWithValues12, league12);

subheader('15-team, 9 opponents need SP');
printDetailedRecommendation(rec15, league15, faPool15);

subheader('12-team, 4 opponents need SP');
printDetailedRecommendation(rec12, league12, faPoolWithValues12);

console.log('\n  --- Comparison ---');
console.log(`  15-team market bid: $${rec15.marketBid} | 12-team market bid: $${rec12.marketBid}`);
console.log(`  Ratio: ${(rec15.marketBid / Math.max(rec12.marketBid, 1)).toFixed(2)}x`);

check(
  rec15.marketBid > rec12.marketBid * 1.3,
  `15-team SP market bid ($${rec15.marketBid}) is significantly higher than 12-team ($${rec12.marketBid})`,
  `15-team SP market bid ($${rec15.marketBid}) should be MUCH higher than 12-team ($${rec12.marketBid}). Ratio: ${(rec15.marketBid / Math.max(rec12.marketBid, 1)).toFixed(2)}x — needs at least 1.3x`
);

// ══════════════════════════════════════════════════════════════════════════
// ── SCENARIO 2: QB in Superflex vs 1-QB ──
// ══════════════════════════════════════════════════════════════════════════

header('SCENARIO 2: QB Scarcity — Superflex vs 1-QB League');

const qb = buildQB('Drake Maye');

const footballFAPool = buildFootballFAPool();

// Superflex league
const leagueSF = {
  sport: 'football',
  numTeams: 12,
  faabBudget: 100,
  faabMinBid: 0,
  totalWeeks: 17,
  currentWeek: 6,
  remainingFaab: 73,
  formatPreset: 'superflex_tep',
};

// 1-QB league
const league1QB = {
  ...leagueSF,
  formatPreset: 'standard_ppr',
};

const userTeamFootball = {
  roster: [
    { position: 'QB', name: 'Allen' },
    { position: 'RB', name: 'Barkley' },
    { position: 'RB', name: 'Hall' },
    { position: 'WR', name: 'Lamb' },
    { position: 'WR', name: 'St Brown' },
    { position: 'TE', name: 'Andrews' },
    { position: 'WR', name: 'Dell' },
    { position: 'WR', name: 'Waddle' },
    { position: 'RB', name: 'Moss' },
    { position: 'RB', name: 'Edwards' },
  ],
};

// Opponents with only 1 QB each (big need in superflex)
const footballOpponents = [
  buildFootballOpponent('GridIron Kings', 88, [
    { position: 'QB', name: 'Mahomes' }, { position: 'RB', name: 'Henry' },
    { position: 'WR', name: 'Chase' }, { position: 'TE', name: 'Kelce' },
    { position: 'WR', name: 'Metcalf' }, { position: 'RB', name: 'Mostert' },
  ]),
  buildFootballOpponent('Waiver Wizards', 95, [
    { position: 'QB', name: 'Jackson' }, { position: 'RB', name: 'Robinson' },
    { position: 'WR', name: 'Hill' }, { position: 'WR', name: 'Adams' },
    { position: 'TE', name: 'Kincaid' }, { position: 'RB', name: 'Chubb' },
  ]),
  buildFootballOpponent('TD Machines', 42, [
    { position: 'QB', name: 'Hurts' }, { position: 'RB', name: 'McCaffrey' },
    { position: 'WR', name: 'Jefferson' }, { position: 'TE', name: 'Kittle' },
    { position: 'WR', name: 'Samuel' }, { position: 'RB', name: 'Williams' },
  ]),
];

const faPoolFootball = footballFAPool.map(fa => ({
  ...fa,
  playerValue: calculatePlayerValue(fa, leagueSF),
}));

const faPoolFootball1QB = footballFAPool.map(fa => ({
  ...fa,
  playerValue: calculatePlayerValue(fa, league1QB),
}));

const recQBSF = generateBidRecommendation(qb, userTeamFootball, footballOpponents, faPoolFootball, leagueSF);
const recQB1QB = generateBidRecommendation(qb, userTeamFootball, footballOpponents, faPoolFootball1QB, league1QB);

subheader('Superflex League — QB');
printDetailedRecommendation(recQBSF, leagueSF, faPoolFootball);

subheader('1-QB League — QB');
printDetailedRecommendation(recQB1QB, league1QB, faPoolFootball1QB);

console.log('\n  --- Comparison ---');
console.log(`  Superflex QB market bid: $${recQBSF.marketBid} | 1-QB market bid: $${recQB1QB.marketBid}`);

// Check the scarcity and competitive pressure
const sfNeedCheck = detectOpponentNeeds(footballOpponents[0], 'QB', 'football', leagueSF);
const oneQBNeedCheck = detectOpponentNeeds(footballOpponents[0], 'QB', 'football', league1QB);
info(`Superflex opponent need for QB: ${sfNeedCheck} | 1-QB opponent need: ${oneQBNeedCheck}`);

check(
  recQBSF.marketBid > recQB1QB.marketBid * 1.5,
  `Superflex QB bid ($${recQBSF.marketBid}) is significantly higher than 1-QB ($${recQB1QB.marketBid})`,
  `Superflex QB bid ($${recQBSF.marketBid}) should be MUCH higher than 1-QB ($${recQB1QB.marketBid}). Ratio: ${(recQBSF.marketBid / Math.max(recQB1QB.marketBid, 1)).toFixed(2)}x — needs at least 1.5x`
);

// ══════════════════════════════════════════════════════════════════════════
// ── SCENARIO 3: Closer scarcity in 5x5 roto ──
// ══════════════════════════════════════════════════════════════════════════

header('SCENARIO 3: Closer (RP/SV) Scarcity in 5x5 Roto');

const closer = buildCloser('Yennier Cano');

// Build FA pool where RP is very scarce (only 1 RP = Cano)
const scarceFAPool = baseballFAPool.map(fa => ({
  ...fa,
  playerValue: calculatePlayerValue(fa, league12),
}));

const rpCount = scarceFAPool.filter(p => p.position === 'RP').length;
const spCount = scarceFAPool.filter(p => p.position === 'SP').length;
info(`Free agent pool: ${rpCount} RP (closers), ${spCount} SP, ${scarceFAPool.length} total`);

const closerScarcity = positionalScarcity('RP', scarceFAPool, league12.numTeams);
info(`RP scarcity: ${closerScarcity.level} (${closerScarcity.multiplier}x)`);

// Opponents that need closers (most teams need RP depth)
const closerOpponents = baseballOpponents.map(opp => ({
  ...opp,
  roster: opp.roster.filter(p => p.position !== 'RP'), // Remove RP from all opponents so they need closers
}));

const closerRec = generateBidRecommendation(closer, userTeamBaseball, closerOpponents, scarceFAPool, league12);

subheader('Closer Recommendation');
printDetailedRecommendation(closerRec, league12, scarceFAPool);

// Also compare closer vs a generic SP
const genericSP = { ...buildBaseballSPPlayer('Hunter Brown'), projectedStats: { W: 0, SV: 0, K: 78, ERA: 3.65, WHIP: 1.18 }, gamesPlayed: 22 };
const spRec = generateBidRecommendation(genericSP, userTeamBaseball, closerOpponents, scarceFAPool, league12);

subheader('Comparable SP for reference');
printDetailedRecommendation(spRec, league12, scarceFAPool);

console.log('\n  --- Comparison ---');
console.log(`  Closer market bid: $${closerRec.marketBid} | SP market bid: $${spRec.marketBid}`);
console.log(`  Closer scarcity: ${closerRec.scarcityLevel} | SP scarcity: ${spRec.scarcityLevel}`);

check(
  closerRec.scarcityLevel === 'very_high' || closerRec.scarcityLevel === 'high',
  `Closer scarcity is ${closerRec.scarcityLevel} — saves are scarce`,
  `Closer scarcity is ${closerRec.scarcityLevel} — should be 'very_high' or 'high' given only ${rpCount} RP in pool`
);

// ══════════════════════════════════════════════════════════════════════════
// ── SCENARIO 4: Budget pacing "behind" → conservative bids ──
// ══════════════════════════════════════════════════════════════════════════

header('SCENARIO 4: Budget Pacing — Behind vs On-Pace vs Ahead');

// Behind pace: spent too much early (e.g., $400 remaining at week 8 of 27 with $1000 budget)
const leagueBehind = { ...league12, remainingFaab: 400 };
const leagueOnPace = { ...league12, remainingFaab: 714 };
const leagueAhead = { ...league12, remainingFaab: 900 };

const pacingBehind = budgetPacing(leagueBehind);
const pacingOnPace = budgetPacing(leagueOnPace);
const pacingAhead = budgetPacing(leagueAhead);

info(`Behind:  remaining=$400, paceRatio=${pacingBehind.paceRatio.toFixed(2)}, status=${pacingBehind.status}, mod=${pacingBehind.aggressivenessModifier}`);
info(`On-pace: remaining=$714, paceRatio=${pacingOnPace.paceRatio.toFixed(2)}, status=${pacingOnPace.status}, mod=${pacingOnPace.aggressivenessModifier}`);
info(`Ahead:   remaining=$900, paceRatio=${pacingAhead.paceRatio.toFixed(2)}, status=${pacingAhead.status}, mod=${pacingAhead.aggressivenessModifier}`);

// Run same SP through all 3 pacing scenarios
const recBehind = generateBidRecommendation(sp, userTeamBaseball, baseballOpponents, faPoolWithValues12, leagueBehind);
const recOnPace = generateBidRecommendation(sp, userTeamBaseball, baseballOpponents, faPoolWithValues12, leagueOnPace);
const recAhead = generateBidRecommendation(sp, userTeamBaseball, baseballOpponents, faPoolWithValues12, leagueAhead);

subheader('Behind Pace ($400 remaining, week 8/27)');
printDetailedRecommendation(recBehind, leagueBehind, faPoolWithValues12);

subheader('On Pace ($714 remaining, week 8/27)');
printDetailedRecommendation(recOnPace, leagueOnPace, faPoolWithValues12);

subheader('Ahead of Pace ($900 remaining, week 8/27)');
printDetailedRecommendation(recAhead, leagueAhead, faPoolWithValues12);

console.log('\n  --- Comparison ---');
console.log(`  Behind: base=$${recBehind.baseBid}, market=$${recBehind.marketBid}, aggressive=$${recBehind.aggressiveBid} (${recBehind.pacingStatus})`);
console.log(`  OnPace: base=$${recOnPace.baseBid}, market=$${recOnPace.marketBid}, aggressive=$${recOnPace.aggressiveBid} (${recOnPace.pacingStatus})`);
console.log(`  Ahead:  base=$${recAhead.baseBid}, market=$${recAhead.marketBid}, aggressive=$${recAhead.aggressiveBid} (${recAhead.pacingStatus})`);

check(
  recBehind.aggressiveBid < recOnPace.aggressiveBid,
  `Behind-pace aggressive ($${recBehind.aggressiveBid}) < on-pace aggressive ($${recOnPace.aggressiveBid})`,
  `Behind-pace aggressive ($${recBehind.aggressiveBid}) should be < on-pace ($${recOnPace.aggressiveBid})`
);

check(
  recAhead.aggressiveBid >= recOnPace.aggressiveBid,
  `Ahead-pace aggressive ($${recAhead.aggressiveBid}) >= on-pace aggressive ($${recOnPace.aggressiveBid})`,
  `Ahead-pace aggressive ($${recAhead.aggressiveBid}) should be >= on-pace ($${recOnPace.aggressiveBid})`
);

check(
  recBehind.pacingStatus === 'slightly_behind' || recBehind.pacingStatus === 'conserve',
  `Behind pacing status is "${recBehind.pacingStatus}"`,
  `Behind pacing status should be "slightly_behind" or "conserve", got "${recBehind.pacingStatus}"`
);

// ══════════════════════════════════════════════════════════════════════════
// ── SCENARIO 5: Low-FAAB opponent barely factors in pressure ──
// ══════════════════════════════════════════════════════════════════════════

header('SCENARIO 5: Low-FAAB Opponent ($15 remaining) Competitive Pressure');

// One opponent with $15 remaining, others with $700+
const lowFaabOpponent = buildBaseballOpponent('Broke Team', 15, [
  { position: 'SP', name: 'OnlySP' },
]); // Needs SP desperately but has no money

const richOpponent = buildBaseballOpponent('Rich Team', 800, [
  { position: 'SP', name: 'OnlySP' },
]); // Needs SP desperately AND has money

// Test pressure from low-FAAB opponent
const lowPressure = calculateCompetitivePressure(sp, [lowFaabOpponent], league12);
const richPressure = calculateCompetitivePressure(sp, [richOpponent], league12);

subheader('Individual Opponent Pressure Analysis');
info(`Low-FAAB opponent ($15): pressure=${lowPressure.pressureScore.toFixed(4)}, threats=${lowPressure.threatDetails.length}`);
info(`Rich opponent ($800):    pressure=${richPressure.pressureScore.toFixed(4)}, threats=${richPressure.threatDetails.length}`);

if (lowPressure.threatDetails.length > 0) {
  info(`Low-FAAB threat score: ${lowPressure.threatDetails[0].threatScore.toFixed(4)}`);
}
if (richPressure.threatDetails.length > 0) {
  info(`Rich threat score: ${richPressure.threatDetails[0].threatScore.toFixed(4)}`);
}

// Compare bids
const recLowFaab = generateBidRecommendation(sp, userTeamBaseball, [lowFaabOpponent], faPoolWithValues12, league12);
const recRichFaab = generateBidRecommendation(sp, userTeamBaseball, [richOpponent], faPoolWithValues12, league12);

subheader('Bid with only low-FAAB opponent ($15)');
printDetailedRecommendation(recLowFaab, league12, faPoolWithValues12);

subheader('Bid with rich opponent ($800)');
printDetailedRecommendation(recRichFaab, league12, faPoolWithValues12);

console.log('\n  --- Comparison ---');
console.log(`  Low-FAAB opponent: market=$${recLowFaab.marketBid} | Rich opponent: market=$${recRichFaab.marketBid}`);
console.log(`  Pressure ratio: ${(richPressure.pressureScore / Math.max(lowPressure.pressureScore, 0.001)).toFixed(1)}x`);

check(
  richPressure.pressureScore > lowPressure.pressureScore * 10,
  `Rich opponent pressure (${richPressure.pressureScore.toFixed(4)}) is >10x the low-FAAB pressure (${lowPressure.pressureScore.toFixed(4)})`,
  `Rich opponent pressure (${richPressure.pressureScore.toFixed(4)}) should be >10x low-FAAB (${lowPressure.pressureScore.toFixed(4)})`
);

check(
  recRichFaab.marketBid > recLowFaab.marketBid,
  `Rich opponent drives higher market bid ($${recRichFaab.marketBid} > $${recLowFaab.marketBid})`,
  `Rich opponent market bid ($${recRichFaab.marketBid}) should be > low-FAAB ($${recLowFaab.marketBid})`
);

// ══════════════════════════════════════════════════════════════════════════
// ── FINAL SUMMARY ──
// ══════════════════════════════════════════════════════════════════════════

header(`TEST SUMMARY: ${passedTests}/${totalTests} passed`);

if (passedTests < totalTests) {
  console.log('\n  Issues found that may need multiplier/threshold tuning.\n');
} else {
  console.log('\n  All scenarios produce sensible results!\n');
}
