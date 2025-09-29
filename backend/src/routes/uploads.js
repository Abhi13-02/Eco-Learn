// src/routes/uploads.js
import express from 'express';
import { createPresignedUpload, deleteStoredObject } from '../controllers/uploadController.js';

const router = express.Router();

router.post('/presign', createPresignedUpload);
router.delete('/', deleteStoredObject);

export default router;
