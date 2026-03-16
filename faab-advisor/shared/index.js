// ── Football Scoring Presets ─────────────────────────────────────────────────

export const FOOTBALL_SCORING = {
  standard: {
    passingYards: 0.04, passingTD: 4, interception: -2,
    rushingYards: 0.1, rushingTD: 6,
    receivingYards: 0.1, receivingTD: 6,
    receptions: 0, fumblesLost: -2,
  },
  ppr: {
    passingYards: 0.04, passingTD: 4, interception: -2,
    rushingYards: 0.1, rushingTD: 6,
    receivingYards: 0.1, receivingTD: 6,
    receptions: 1, fumblesLost: -2,
  },
  half_ppr: {
    passingYards: 0.04, passingTD: 4, interception: -2,
    rushingYards: 0.1, rushingTD: 6,
    receivingYards: 0.1, receivingTD: 6,
    receptions: 0.5, fumblesLost: -2,
  },
  superflex_ppr_tep: {
    passingYards: 0.04, passingTD: 4, interception: -2,
    rushingYards: 0.1, rushingTD: 6,
    receivingYards: 0.1, receivingTD: 6,
    receptions: 1, fumblesLost: -2,
    te_reception_bonus: 0.5, // TE Premium: TEs get 1.5 per reception
  },
};

export const FOOTBALL_STARTER_SLOTS = {
  standard: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DEF: 1 },
  superflex: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SUPERFLEX: 1, K: 1, DEF: 1 },
};

// ── Baseball Scoring Presets ────────────────────────────────────────────────

export const BASEBALL_SCORING = {
  roto_5x5_standard: {
    type: 'roto',
    hitting: ['R', 'HR', 'RBI', 'SB', 'AVG'],
    pitching: ['W', 'SV', 'K', 'ERA', 'WHIP'],
    sgpDenominators_12team: {
      R: 28, HR: 10, RBI: 30, SB: 7, AVG: 0.004,
      W: 3, SV: 6, K: 30, ERA: -0.18, WHIP: -0.015,
    },
    sgpDenominators_15team: {
      R: 25, HR: 9, RBI: 27, SB: 6, AVG: 0.003,
      W: 2.5, SV: 5, K: 25, ERA: -0.15, WHIP: -0.012,
    },
  },
};

export const BASEBALL_ROSTER = {
  nfbc_12team: {
    starters: { C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 5, UTIL: 1, SP: 9, RP: 0 },
    totalRoster: 30,
    reserve: 7,
  },
  nfbc_15team: {
    starters: { C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 5, UTIL: 1, SP: 9, RP: 0 },
    totalRoster: 30,
    reserve: 7,
  },
};

// ── League Presets ──────────────────────────────────────────────────────────

export const LEAGUE_PRESETS = {
  nfbc_main_event: {
    name: 'NFBC Main Event',
    sport: 'baseball',
    platform: 'NFBC',
    format: '15-team 5x5 Roto',
    numTeams: 15,
    scoring: 'roto_5x5_standard',
    roster: 'nfbc_15team',
    faabBudget: 1000,
    faabMinBid: 1,
    totalWeeks: 27,
    waiverDay: 'Sunday',
  },
  nfbc_online_championship: {
    name: 'NFBC Online Championship',
    sport: 'baseball',
    platform: 'NFBC',
    format: '12-team 5x5 Roto',
    numTeams: 12,
    scoring: 'roto_5x5_standard',
    roster: 'nfbc_12team',
    faabBudget: 1000,
    faabMinBid: 1,
    totalWeeks: 27,
    waiverDay: 'Sunday',
  },
  standard_ppr: {
    name: 'Standard PPR',
    sport: 'football',
    platform: 'Sleeper',
    format: '12-team PPR',
    numTeams: 12,
    scoring: 'ppr',
    roster: 'standard',
    faabBudget: 100,
    faabMinBid: 0,
    totalWeeks: 17,
    waiverDay: 'Wednesday',
  },
  superflex_tep: {
    name: 'Superflex + TE Premium',
    sport: 'football',
    platform: 'Sleeper',
    format: '12-team SF PPR + TEP',
    numTeams: 12,
    scoring: 'superflex_ppr_tep',
    roster: 'superflex',
    faabBudget: 100,
    faabMinBid: 0,
    totalWeeks: 17,
    waiverDay: 'Wednesday',
  },
  guillotine: {
    name: 'Guillotine League',
    sport: 'football',
    platform: 'Sleeper',
    format: '17-team Half PPR Guillotine',
    numTeams: 17,
    scoring: 'half_ppr',
    roster: 'standard',
    faabBudget: 1000,
    faabMinBid: 0,
    totalWeeks: 16,
    waiverDay: 'Wednesday',
    special: 'guillotine',
  },
};

// ── Position helpers ────────────────────────────────────────────────────────

export const BASEBALL_MIN_REQUIRED = {
  C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 3, SP: 3, RP: 1, DH: 0, UTIL: 0,
};

export const REPLACEMENT_THRESHOLD = 0.5; // minimum projected value to count as "viable"
