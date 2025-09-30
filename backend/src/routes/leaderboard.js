// src/routes/leaderboard.js
import { Router } from 'express';
import leaderboardController from '../controllers/leaderboardController.js';

const router = Router();

router.get('/', leaderboardController.getLeaderboard);
router.get('/badges', leaderboardController.getBadges);

export default router;
