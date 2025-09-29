// src/routes/auth.js
import express from 'express';
import {
  createSchool,
  createNgo,
  joinSchool,
  joinSchoolSocial,
  login,
} from '../controllers/authController.js';

const router = express.Router();

// Health
router.get('/ping', (_req, res) => res.json({ pong: true }));

// Create a School and its admin
router.post('/school', createSchool);

// Create an NGO and its admin
router.post('/ngo', createNgo);

// Teacher or Student joins a School using a code (Credentials flow)
router.post('/join-school', joinSchool);

/**
 * Social/onboarding variant (e.g., Google sign-in) – no password required.
 * Call this right after Google returns, with the school code the user entered.
 */
router.post('/join-school-social', joinSchoolSocial);

// Simple email/password login (usable by your own client or NextAuth Credentials authorize)
router.post('/login', login);

export default router;
