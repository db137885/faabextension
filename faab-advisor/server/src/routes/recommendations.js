import { Router } from 'express';
import { prisma } from '../index.js';

const router = Router();

// POST /api/recommendations/:id/result — record bid outcome
router.post('/:id/result', async (req, res) => {
  try {
    const { won, winningBidAmount } = req.body;

    const recommendation = await prisma.bidRecommendation.findUnique({
      where: { id: req.params.id },
    });

    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    const result = await prisma.bidResult.create({
      data: {
        recommendationId: req.params.id,
        won: won === true,
        winningBidAmount: parseInt(winningBidAmount) || 0,
      },
    });

    res.status(201).json(result);
  } catch (err) {
    console.error('Error recording result:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
