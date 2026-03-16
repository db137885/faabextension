import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { LEAGUE_PRESETS } from '../../shared/constants.js';

const prisma = new PrismaClient();

async function loadCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return parse(content, { columns: true, skip_empty_lines: true });
}

async function main() {
  console.log('Clearing database...');
  await prisma.bidResult.deleteMany();
  await prisma.bidRecommendation.deleteMany();
  await prisma.freeAgent.deleteMany();
  await prisma.roster.deleteMany();
  await prisma.team.deleteMany();
  await prisma.league.deleteMany();
  await prisma.player.deleteMany();
  await prisma.user.deleteMany();

  console.log('Creating demo user...');
  const user = await prisma.user.create({
    data: {
      email: 'demo@faabadvisor.com',
      password_hash: 'hashedpassword' // simple stub
    }
  });

  console.log('Loading CSVs...');
  const bbRoster = await loadCsv('/Users/dbmacbookair/Desktop/Projects/FAAB/roster_template_baseball.csv');
  const fbRoster = await loadCsv('/Users/dbmacbookair/Desktop/Projects/FAAB/roster_template_football.csv');
  const bbFA = await loadCsv('/Users/dbmacbookair/Desktop/Projects/FAAB/free_agents_baseball.csv');

  // Player cache (name -> id)
  const players = new Map();

  // Create or retrieve players
  const ensurePlayer = async (row, sport, isFA = false) => {
    // For simplicity, just use name as unique key for MVP
    if (players.has(row.player_name)) return players.get(row.player_name);

    let projections = {};
    if (isFA && sport === 'baseball') {
      projections = {
        R: parseFloat(row.proj_R || 0),
        HR: parseFloat(row.proj_HR || 0),
        RBI: parseFloat(row.proj_RBI || 0),
        SB: parseFloat(row.proj_SB || 0),
        AVG: parseFloat(row.proj_AVG || 0),
        W: parseFloat(row.proj_W || 0),
        SV: parseFloat(row.proj_SV || 0),
        K: parseFloat(row.proj_K || 0),
        ERA: parseFloat(row.proj_ERA || 0),
        WHIP: parseFloat(row.proj_WHIP || 0)
      };
    } else {
      projections = { "Pts/Wk": 10 }; // stub
    }

    let p = await prisma.player.create({
      data: {
        name: row.player_name,
        position: row.position,
        real_team: row.real_team || 'FA',
        projected_stats: JSON.stringify(projections),
        ownership_pct: row.ownership_pct ? parseFloat(row.ownership_pct) : 0,
        games_played: row.games_played ? parseInt(row.games_played) : 10
      }
    });
    players.set(p.name, p.id);
    return p.id;
  };

  for (const row of bbRoster) await ensurePlayer(row, 'baseball');
  for (const row of fbRoster) await ensurePlayer(row, 'football');
  for (const row of bbFA) await ensurePlayer(row, 'baseball', true);

  const createLeagueAndTeams = async (name, presetKey, rosterCsv) => {
    const preset = LEAGUE_PRESETS[presetKey];
    const league = await prisma.league.create({
      data: {
        user_id: user.id,
        name: name,
        sport: preset.sport,
        platform: 'NFBC/Sleeper',
        format_preset: preset.name,
        scoring_settings: JSON.stringify({ type: preset.scoring }),
        num_teams: preset.numTeams,
        faab_budget: preset.faabBudget,
        faab_min_bid: preset.faabMinBid,
        total_weeks: preset.totalWeeks,
        waiver_day: preset.waiverDay
      }
    });

    const teamsByFormat = {};
    for (const row of rosterCsv) {
      if (!teamsByFormat[row.team_name]) {
        teamsByFormat[row.team_name] = {
          is_user: row.is_user_team === 'true',
          faab: parseInt(row.remaining_faab || preset.faabBudget),
          players: []
        };
      }
      teamsByFormat[row.team_name].players.push(row.player_name);
    }

    for (const [tName, data] of Object.entries(teamsByFormat)) {
      const team = await prisma.team.create({
        data: {
          league_id: league.id,
          team_name: tName,
          is_user_team: data.is_user,
          remaining_faab: data.faab,
        }
      });
      for (const pName of data.players) {
        await prisma.roster.create({
          data: { team_id: team.id, player_id: players.get(pName) }
        });
      }
    }
    return league;
  };

  console.log('Creating demo leagues and teams...');
  const l1 = await createLeagueAndTeams('NFBC Online Championship #4', 'nfbc_online_championship', bbRoster);
  const l2 = await createLeagueAndTeams('High Stakes Superflex PPR', 'superflex_tep', fbRoster);
  const l3 = await createLeagueAndTeams('NFBC Main Event Team 2', 'nfbc_main_event', bbRoster);

  console.log('Adding free agents...');
  for (const row of bbFA) {
    const pid = players.get(row.player_name);
    await prisma.freeAgent.create({ data: { league_id: l1.id, player_id: pid } });
    await prisma.freeAgent.create({ data: { league_id: l3.id, player_id: pid } });
  }

  console.log('Seeding complete.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
