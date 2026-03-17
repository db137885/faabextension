import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

import leaguesRouter from './routes/leagues.js';
import recommendationsRouter from './routes/recommendations.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Stub auth: fetch the seeded demo user
app.use(async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst();
    if (user) {
      req.userId = user.id;
    }
    next();
  } catch (err) {
    next(err);
  }
});

app.use('/api/leagues', leaguesRouter);
app.use('/api/recommendations', recommendationsRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
