import express from 'express';
import cors from 'cors';
import leaguesRouter from '../routes/leagues.js';
import recommendationsRouter from '../routes/recommendations.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  req.userId = 1;
  next();
});

app.use('/api/leagues', leaguesRouter);
app.use('/api/recommendations', recommendationsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
