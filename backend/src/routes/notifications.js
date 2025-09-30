// src/routes/notifications.js
import express from 'express';
import { listNotifications, markRead } from '../controllers/notificationController.js';

const router = express.Router();

router.get('/', listNotifications);
router.post('/:notificationId/read', markRead);

export default router;
