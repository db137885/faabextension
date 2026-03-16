import express from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../src/db.js';
import { generateBidRecommendation } from '../services/bidEngine.js';

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
    // Demo mock: we get all leagues from the DB 
    const leagues = await prisma.league.findMany({
        include: {
            teams: true,
            recommendations: true
        }
    });
    res.json(leagues);
}));

router.post('/', asyncHandler(async (req, res) => {
    const league = await prisma.league.create({
        data: {
            ...req.body,
            user_id: req.userId
        }
    });
    res.json(league);
}));

router.get('/:id', asyncHandler(async (req, res) => {
    const league = await prisma.league.findUnique({
        where: { id: parseInt(req.params.id) },
        include: {
            teams: { include: { rosters: { include: { player: true } } } },
            free_agents: { include: { player: true } }
        }
    });
    if (!league) return res.status(404).send('Not found');

    const recommendations = await prisma.bidRecommendation.findMany({
        where: { league_id: league.id },
        include: { player: true }
    });
    res.json({ league, recommendations });
}));

router.post('/:id/recommendations', asyncHandler(async (req, res) => {
    const leagueId = parseInt(req.params.id);
    const league = await prisma.league.findUnique({
        where: { id: leagueId },
        include: {
            teams: { include: { rosters: { include: { player: true } } } },
            free_agents: { include: { player: true } }
        }
    });

    if (!league) return res.status(404).send('Not found');

    const userTeam = league.teams.find(t => t.is_user_team);
    const opponents = league.teams.filter(t => !t.is_user_team).map(t => ({
        ...t, roster: t.rosters.map(r => r.player)
    }));
    const freeAgentPool = league.free_agents;

    const currentWeek = 8;
    await prisma.bidRecommendation.deleteMany({
        where: { league_id: leagueId, week_number: currentWeek }
    });

    const results = [];
    for (const fa of freeAgentPool) {
        const rec = generateBidRecommendation(
            fa.player, userTeam, opponents, freeAgentPool, league, currentWeek
        );

        if (rec.baseBid > 0) {
            const created = await prisma.bidRecommendation.create({
                data: {
                    league_id: league.id,
                    player_id: fa.player_id,
                    base_bid: rec.baseBid,
                    market_bid: rec.marketBid,
                    aggressive_bid: rec.aggressiveBid,
                    confidence: rec.confidence,
                    opponents_needing: rec.opponentsNeeding,
                    scarcity_level: rec.scarcity,
                    reasoning: rec.reasoning,
                    week_number: currentWeek
                }
            });
            results.push({ ...created, transientDetails: rec });
        }
    }

    res.json({ message: `Generated ${results.length} recommendations`, results });
}));

export default router;
