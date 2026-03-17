import { Router } from 'express';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../index.js';
import { parse } from 'csv-parse/sync';
import { generateAllRecommendations, calculatePlayerValue } from '../services/bidEngine.js';
import { detectPastedDataType, parsePastedRosterData, parsePastedFreeAgentData } from '../services/pasteParser.js';

const __dirnameLoc = dirname(fileURLToPath(import.meta.url));
const sharedPath = resolve(__dirnameLoc, '..', '..', '..', 'shared', 'index.js');
const { LEAGUE_PRESETS } = await import(sharedPath);

const router = Router();

// POST /api/leagues — create a league (with optional preset)
router.post('/', async (req, res) => {
  try {
    const { preset, name, sport, platform, format, numTeams, faabBudget, faabMinBid, totalWeeks, currentWeek, waiverDay, special } = req.body;

    let leagueData;
    if (preset && LEAGUE_PRESETS[preset]) {
      const p = LEAGUE_PRESETS[preset];
      leagueData = {
        name: name || p.name,
        sport: p.sport,
        platform: platform || p.platform || '',
        format: format || p.format || '',
        formatPreset: preset,
        scoringSettings: JSON.stringify(p.scoring),
        rosterSettings: JSON.stringify(p.roster),
        numTeams: p.numTeams,
        faabBudget: p.faabBudget,
        faabMinBid: p.faabMinBid,
        totalWeeks: p.totalWeeks,
        currentWeek: currentWeek || 1,
        waiverDay: p.waiverDay,
        special: p.special || null,
      };
    } else {
      leagueData = {
        name: name || 'My League',
        sport: sport || 'football',
        platform: platform || '',
        format: format || '',
        formatPreset: null,
        scoringSettings: JSON.stringify(req.body.scoringSettings || {}),
        rosterSettings: JSON.stringify(req.body.rosterSettings || {}),
        numTeams: numTeams || 12,
        faabBudget: faabBudget || 100,
        faabMinBid: faabMinBid || 0,
        totalWeeks: totalWeeks || 17,
        currentWeek: currentWeek || 1,
        waiverDay: waiverDay || 'Wednesday',
        special: special || null,
      };
    }

    // Use the demo user for now
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: { email: 'demo@faabadvisor.com', passwordHash: 'demo' },
      });
    }

    const league = await prisma.league.create({
      data: { ...leagueData, userId: user.id },
    });

    res.status(201).json(league);
  } catch (err) {
    console.error('Error creating league:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leagues — list all leagues
router.get('/', async (_req, res) => {
  try {
    const leagues = await prisma.league.findMany({
      include: {
        teams: {
          include: { roster: { include: { player: true } } },
        },
        recommendations: {
          orderBy: { marketBid: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich each league with computed fields
    const enriched = leagues.map(league => {
      const userTeam = league.teams.find(t => t.isUserTeam);
      return {
        ...league,
        remainingFaab: userTeam?.remainingFaab ?? league.faabBudget,
        userTeamName: userTeam?.teamName || 'My Team',
        standing: userTeam?.standing || null,
        teamCount: league.teams.length,
        recommendationCount: league.recommendations.length,
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error('Error listing leagues:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: {
        teams: {
          include: { roster: { include: { player: true } } },
        },
        freeAgents: {
          include: { player: true },
        },
        recommendations: {
          include: { result: true },
          orderBy: { marketBid: 'desc' },
        },
      },
    });

    if (!league) return res.status(404).json({ error: 'League not found' });

    const userTeam = league.teams.find(t => t.isUserTeam);
    const opponents = league.teams.filter(t => !t.isUserTeam);

    res.json({
      ...league,
      remainingFaab: userTeam?.remainingFaab ?? league.faabBudget,
      userTeam,
      opponents: opponents.map(opp => ({
        ...opp,
        needs: detectTeamNeeds(opp, league),
      })),
    });
  } catch (err) {
    console.error('Error getting league:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leagues/:id/paste — smart paste parser endpoint
router.post('/:id/paste', async (req, res) => {
  try {
    const league = await prisma.league.findUnique({ where: { id: req.params.id } });
    if (!league) return res.status(404).json({ error: 'League not found' });

    const { pastedText } = req.body;
    if (!pastedText) return res.status(400).json({ error: 'No pasted text provided' });

    const dataType = detectPastedDataType(pastedText);

    if (dataType === 'roster') {
      const teams = parsePastedRosterData(pastedText);
      for (const t of teams) {
        let team = await prisma.team.findFirst({ where: { leagueId: league.id, teamName: t.team_name }});
        if (!team) {
           team = await prisma.team.create({ data: { leagueId: league.id, teamName: t.team_name, isUserTeam: t.is_user_team, remainingFaab: t.remaining_faab }});
        } else if (t.remaining_faab !== null) {
           await prisma.team.update({ where: { id: team.id }, data: { remainingFaab: t.remaining_faab }});
        }
        for (const pName of t.players) {
           let player = await prisma.player.findFirst({ where: { name: pName }});
           if (!player) {
             player = await prisma.player.create({ data: { name: pName, position: 'UNK', realTeam: 'UNK' }});
           }
           let existingRoster = await prisma.roster.findFirst({ where: { teamId: team.id, playerId: player.id } });
           if (!existingRoster) {
             await prisma.roster.create({ data: { teamId: team.id, playerId: player.id }});
           }
        }
      }
      res.json({ success: true, detectedType: 'roster', message: `Parsed ${teams.length} teams` });
    } else {
      const freeAgents = parsePastedFreeAgentData(pastedText);
      for (const fa of freeAgents) {
         let player = await prisma.player.findFirst({ where: { name: fa.name }});
         if (!player) {
            player = await prisma.player.create({ data: { name: fa.name, position: fa.position, realTeam: fa.real_team }});
         }
         let existingFA = await prisma.freeAgent.findFirst({ where: { leagueId: league.id, playerId: player.id }});
         if (!existingFA) {
            await prisma.freeAgent.create({ data: { leagueId: league.id, playerId: player.id }});
         }
      }
      res.json({ success: true, detectedType: 'freeAgents', message: `Parsed ${freeAgents.length} free agents` });
    }
  } catch (err) {
    console.error('Error in paste parser:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leagues/:id/import — import roster/FA data from CSV
router.post('/:id/import', async (req, res) => {
  try {
    const league = await prisma.league.findUnique({ where: { id: req.params.id } });
    if (!league) return res.status(404).json({ error: 'League not found' });

    const { rosterCsv, freeAgentCsv } = req.body;

    if (rosterCsv) {
      await importRosterCsv(rosterCsv, league.id);
    }
    if (freeAgentCsv) {
      await importFreeAgentCsv(freeAgentCsv, league.id);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error importing:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leagues/:id/recommendations — run bid engine
router.post('/:id/recommendations', async (req, res) => {
  try {
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      include: {
        teams: {
          include: { roster: { include: { player: true } } },
        },
        freeAgents: {
          include: { player: true },
        },
      },
    });

    if (!league) return res.status(404).json({ error: 'League not found' });

    const userTeam = league.teams.find(t => t.isUserTeam);
    const opponents = league.teams.filter(t => !t.isUserTeam);

    if (!userTeam) return res.status(400).json({ error: 'No user team found. Import roster data first.' });
    if (league.freeAgents.length === 0) return res.status(400).json({ error: 'No free agents found. Import free agent data first.' });

    // Build data structures for the bid engine
    const freeAgents = league.freeAgents.map(fa => ({
      name: fa.player.name,
      position: fa.player.position,
      realTeam: fa.player.realTeam,
      projectedStats: JSON.parse(fa.player.projectedStats || '{}'),
      gamesPlayed: fa.player.gamesPlayed || 0,
      ownershipPct: fa.player.ownershipPct || 0,
      note: fa.player.note || '',
    }));

    const userTeamData = {
      roster: userTeam.roster.map(r => ({
        position: r.player.position,
        name: r.player.name,
      })),
    };

    const opponentData = opponents.map(opp => ({
      teamName: opp.teamName,
      remainingFaab: opp.remainingFaab,
      roster: opp.roster.map(r => ({
        position: r.player.position,
        name: r.player.name,
      })),
    }));

    const leagueConfig = {
      sport: league.sport,
      numTeams: league.numTeams,
      faabBudget: league.faabBudget,
      faabMinBid: league.faabMinBid,
      totalWeeks: league.totalWeeks,
      currentWeek: league.currentWeek,
      remainingFaab: userTeam.remainingFaab,
      formatPreset: league.formatPreset,
      scoringSettings: JSON.parse(league.scoringSettings || '{}'),
      special: league.special,
    };

    const recommendations = generateAllRecommendations(freeAgents, userTeamData, opponentData, leagueConfig);

    // Delete old recommendations for this league
    await prisma.bidRecommendation.deleteMany({ where: { leagueId: league.id } });

    // Store new recommendations
    for (const rec of recommendations) {
      // Find or create the player record
      let player = await prisma.player.findFirst({
        where: { name: rec.playerName, position: rec.position },
      });

      if (!player) {
        player = await prisma.player.create({
          data: {
            name: rec.playerName,
            position: rec.position,
            realTeam: rec.realTeam,
            projectedStats: JSON.stringify(rec.projectedStats),
          },
        });
      }

      await prisma.bidRecommendation.create({
        data: {
          leagueId: league.id,
          playerName: rec.playerName,
          position: rec.position,
          realTeam: rec.realTeam,
          baseBid: rec.baseBid,
          marketBid: rec.marketBid,
          aggressiveBid: rec.aggressiveBid,
          confidence: rec.confidence,
          opponentsNeeding: rec.opponentsNeeding,
          scarcityLevel: rec.scarcityLevel,
          reasoning: rec.reasoning,
          threatDetails: JSON.stringify(rec.threatDetails),
          projectedStats: JSON.stringify(rec.projectedStats),
          needMatch: rec.needMatch,
          budgetImpact: rec.budgetImpact,
          weekNumber: league.currentWeek,
        },
      });
    }

    // Fetch and return the stored recommendations
    const stored = await prisma.bidRecommendation.findMany({
      where: { leagueId: league.id },
      orderBy: { marketBid: 'desc' },
    });

    res.json(stored);
  } catch (err) {
    console.error('Error generating recommendations:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leagues/:id/recommendations — get current recommendations
router.get('/:id/recommendations', async (req, res) => {
  try {
    const recommendations = await prisma.bidRecommendation.findMany({
      where: { leagueId: req.params.id },
      include: { result: true },
      orderBy: { marketBid: 'desc' },
    });
    res.json(recommendations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────

function detectTeamNeeds(team, league) {
  const sport = league.sport;
  const roster = team.roster || [];
  const needs = [];

  if (sport === 'football') {
    const rosterKey = league.formatPreset?.includes('superflex') ? 'superflex' : 'standard';
    const slots = { QB: 1, RB: 2, WR: 2, TE: 1 };
    if (rosterKey === 'superflex') slots.QB = 2; // SUPERFLEX means they want 2 QBs

    for (const [pos, needed] of Object.entries(slots)) {
      const count = roster.filter(r => r.player.position.toUpperCase().includes(pos)).length;
      if (count < needed) needs.push(pos);
      else if (count === needed) needs.push(pos); // no depth
    }
  } else if (sport === 'baseball') {
    const required = { C: 1, SP: 3, RP: 1, SS: 1, OF: 3, '1B': 1, '2B': 1, '3B': 1 };
    for (const [pos, needed] of Object.entries(required)) {
      const count = roster.filter(r =>
        r.player.position.toUpperCase().split('/').some(p => p.trim() === pos)
      ).length;
      if (count <= needed) needs.push(pos);
    }
  }

  return needs;
}

export async function importRosterCsv(csvContent, leagueId) {
  const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });

  for (const row of records) {
    const teamName = row.team_name;
    const isUserTeam = row.is_user_team === 'true';
    const remainingFaab = parseInt(row.remaining_faab) || 0;

    // Find or create team
    let team = await prisma.team.findFirst({
      where: { leagueId, teamName },
    });

    if (!team) {
      team = await prisma.team.create({
        data: { leagueId, teamName, isUserTeam, remainingFaab },
      });
    }

    // Find or create player
    let player = await prisma.player.findFirst({
      where: { name: row.player_name, position: row.position },
    });

    if (!player) {
      player = await prisma.player.create({
        data: {
          name: row.player_name,
          position: row.position,
          realTeam: row.real_team || '',
        },
      });
    }

    // Add to roster if not already there
    const existing = await prisma.roster.findFirst({
      where: { teamId: team.id, playerId: player.id },
    });
    if (!existing) {
      await prisma.roster.create({
        data: { teamId: team.id, playerId: player.id },
      });
    }
  }
}

export async function importFreeAgentCsv(csvContent, leagueId) {
  const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });

  for (const row of records) {
    // Build projected stats from the CSV columns
    const projectedStats = {};
    const statFields = ['proj_R', 'proj_HR', 'proj_RBI', 'proj_SB', 'proj_AVG',
                        'proj_W', 'proj_SV', 'proj_K', 'proj_ERA', 'proj_WHIP'];
    const statKeys = ['R', 'HR', 'RBI', 'SB', 'AVG', 'W', 'SV', 'K', 'ERA', 'WHIP'];

    statFields.forEach((field, i) => {
      if (row[field] && row[field] !== '') {
        projectedStats[statKeys[i]] = parseFloat(row[field]);
      }
    });

    // Find or create player
    let player = await prisma.player.findFirst({
      where: { name: row.player_name, position: row.position },
    });

    if (!player) {
      player = await prisma.player.create({
        data: {
          name: row.player_name,
          position: row.position,
          realTeam: row.real_team || '',
          projectedStats: JSON.stringify(projectedStats),
          ownershipPct: parseFloat(row.ownership_pct) || 0,
          gamesPlayed: parseInt(row.games_played) || 0,
          note: row.note || '',
        },
      });
    } else {
      // Update projection data
      await prisma.player.update({
        where: { id: player.id },
        data: {
          projectedStats: JSON.stringify(projectedStats),
          ownershipPct: parseFloat(row.ownership_pct) || 0,
          gamesPlayed: parseInt(row.games_played) || 0,
          note: row.note || '',
        },
      });
    }

    // Add to free agent pool
    const existing = await prisma.freeAgent.findFirst({
      where: { leagueId, playerId: player.id },
    });
    if (!existing) {
      await prisma.freeAgent.create({
        data: { leagueId, playerId: player.id },
      });
    }
  }
}

export default router;
