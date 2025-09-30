// src/routes/students.js
import express from 'express';
import { getStudentOverview, listStudentSubmissions } from '../controllers/studentController.js';

const router = express.Router();

router.get('/:studentId/overview', getStudentOverview);
router.get('/:studentId/submissions', listStudentSubmissions);

export default router;
