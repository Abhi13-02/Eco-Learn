// src/routes/blogs.js
import express from 'express';
import {
  createBlogPost,
  listBlogPosts,
  getBlogPost,
  upsertReaction,
  removeReaction,
  createComment,
  listComments,
} from '../controllers/blogController.js';

const router = express.Router();

router.get('/', listBlogPosts);
router.post('/', createBlogPost);
router.get('/:postIdOrSlug', getBlogPost);
router.post('/:postId/reactions', upsertReaction);
router.delete('/:postId/reactions', removeReaction);
router.post('/:postId/comments', createComment);
router.get('/:postId/comments', listComments);

export default router;
