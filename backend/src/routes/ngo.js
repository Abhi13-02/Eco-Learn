// src/routes/ngo.js
import express from 'express';
import {
  searchSchools,
  sendInvite,
  listCollaborations,
  acceptInvite,
  rejectInvite,
  studentNgoFeed,
} from '../controllers/ngoController.js';

const router = express.Router();

// NGO admin: search schools and see status
router.get('/schools', searchSchools);

// NGO admin: send collaboration invite
router.post('/invitations', sendInvite);

// NGO admin: list collaborations by status
router.get('/collaborations', listCollaborations);

// School admin: accept/reject an invite
router.post('/invitations/:collabId/accept', acceptInvite);
router.post('/invitations/:collabId/reject', rejectInvite);

// Student: feed of NGO posts for their school
router.get('/feed', studentNgoFeed);

export default router;
