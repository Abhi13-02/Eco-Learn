// src/routes/tasks.js
import express from 'express';
import { createTask, createTaskSubmission, getAssignedTasks, updateTaskSubmission, deleteSubmissionAttachment, reviewSubmission } from '../controllers/taskController.js';

const router = express.Router();

// Future middleware: authentication/authorization goes here
router.post('/', createTask);
router.get('/assigned', getAssignedTasks);
router.post('/:taskId/submissions', createTaskSubmission);
router.patch('/:taskId/submissions', updateTaskSubmission);
router.delete('/:taskId/submissions/attachment', deleteSubmissionAttachment);
router.patch('/submissions/:submissionId/review', reviewSubmission);

export default router;
