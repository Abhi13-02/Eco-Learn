// src/routes/tasks.js
import express from 'express';
import { createTask, getAssignedTasks } from '../controllers/taskController.js';

const router = express.Router();

// Future middleware: authentication/authorization goes here
router.post('/', createTask);
router.get('/assigned', getAssignedTasks);

export default router;
