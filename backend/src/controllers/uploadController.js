// src/controllers/uploadController.js
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const REQUIRED_ENV_VARS = [
  'CLOUDFLARE_R2_ACCOUNT_ID',
  'CLOUDFLARE_R2_ACCESS_KEY_ID',
  'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
  'CLOUDFLARE_R2_BUCKET_NAME',
];

let cachedClient;

const ensureEnv = () => {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error('Missing Cloudflare R2 env vars: ' + missing.join(', '));
  }
};

const getClient = () => {
  if (!cachedClient) {
    ensureEnv();
    cachedClient = new S3Client({
      region: 'auto',
      endpoint: 'https://' + process.env.CLOUDFLARE_R2_ACCOUNT_ID + '.r2.cloudflarestorage.com',
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return cachedClient;
};

const sanitizeFilename = (input) => {
  const fallback = 'file';
  if (!input || typeof input !== 'string') return fallback;
  const base = input.split('/').pop().split('\\').pop() || fallback;
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  return safe.length > 180 ? safe.slice(0, 180) : safe;
};

const buildStorageKey = ({ filename, prefix }) => {
  const safeName = sanitizeFilename(filename);
  // Flatten any provided prefix into a dash-joined slug so no folders are created in R2
  const segments = typeof prefix === 'string'
    ? prefix
        .split(/[\\/]+/) // split on slashes or backslashes
        .map((seg) => seg.replace(/[^a-zA-Z0-9_-]/g, '').trim())
        .filter(Boolean)
    : [];
  const timestamp = Date.now();
  const tokens = ['uploads', ...segments, `${timestamp}-${safeName}`];
  // No slashes in the key → R2 will not show it inside folders
  return tokens.join('_');
};

export const createPresignedUpload = async (req, res) => {
  try {
    const { filename, contentType, prefix } = req.body || {};

    if (!filename || !contentType) {
      return res.status(400).json({ error: 'filename and contentType are required' });
    }

    const client = getClient();
    const key = buildStorageKey({ filename, prefix });

    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const expiresIn = 600;
    const uploadUrl = await getSignedUrl(client, command, { expiresIn });

    const publicBase = process.env.CLOUDFLARE_R2_PUBLIC_BASE;
    const sanitizedBase = publicBase ? publicBase.replace(/\/$/, '') : null;
    const publicUrl = sanitizedBase ? sanitizedBase + '/' + encodeURIComponent(key) : null;

    return res.json({
      uploadUrl,
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      key,
      publicUrl,
      expiresIn,
    });
  } catch (error) {
    console.error('Failed to generate R2 upload URL:', error);
    return res.status(500).json({ error: error.message || 'Failed to create presigned upload' });
  }
};

export const deleteStoredObject = async (req, res) => {
  try {
    const { key } = req.query || {};
    if (!key) {
      return res.status(400).json({ error: 'key query parameter is required' });
    }

    const normalizedKey = String(key).replace(/^\/+/, '');
    const client = getClient();

    await client.send(
      new DeleteObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: normalizedKey,
      })
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete R2 object:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete object' });
  }
};

export default {
  createPresignedUpload,
  deleteStoredObject,
};
