// src/routes/auth.js
import express from 'express';
import {
  createSchool,
  createNgo,
  joinSchool,
  joinSchoolSocial,
  joinNgoSocial,
  googleLogin,
  login,
  getSchoolDetails,
  getSchoolByAdminEmail,
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

/**
 * Social/onboarding variant for NGOs (e.g., Google sign-in) – no password required.
 * Call this right after Google returns, with the NGO name the user entered.
 */
router.post('/join-ngo-social', joinNgoSocial);

// Simple email/password login (usable by your own client or NextAuth Credentials authorize)
router.post('/login', login);

// Google OAuth login for existing users
router.post('/google-login', googleLogin);

// Fetch school metadata (code, name) by id
router.get('/school/:id', getSchoolDetails);

// Fetch school metadata (code, name) by admin email
router.get('/school', getSchoolByAdminEmail);

export default router;
