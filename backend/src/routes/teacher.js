// src/routes/teacher.js
import express from 'express';
import {
  getTeacherSubmissions,
  getTeacherTaskSummary,
  listTeacherStudents,
} from '../controllers/teacherController.js';

const router = express.Router();

router.get('/submissions', getTeacherSubmissions);
router.get('/tasks/summary', getTeacherTaskSummary);
router.get('/students', listTeacherStudents);

export default router;
