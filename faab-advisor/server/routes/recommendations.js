import express from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../src/db.js';

const router = express.Router();

router.post('/:id/result', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { won, winning_bid_amount } = req.body;

    const result = await prisma.bidResult.create({
        data: {
            recommendation_id: parseInt(id),
            won,
            winning_bid_amount: parseInt(winning_bid_amount)
        }
    });
    res.json(result);
}));

export default router;
