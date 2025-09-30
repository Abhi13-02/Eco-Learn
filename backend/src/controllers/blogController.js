// src/controllers/blogController.js
import mongoose from 'mongoose';
import { connectDB } from '../lib/db.js';
import { BlogPost, BlogComment, BlogReaction } from '../models/blog.js';
import { User } from '../models/users.js';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const { Types } = mongoose;

const allowedAuthorRoles = new Set(['student', 'teacher', 'schoolAdmin', 'ngoAdmin']);

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const sanitizeAttachments = (attachments = []) => {
  if (!Array.isArray(attachments)) return [];
  const allowedKinds = new Set(['image', 'video', 'file', 'link']);

  return attachments
    .map((attachment) => {
      if (!attachment) return null;
      const rawKind = typeof attachment.kind === 'string' ? attachment.kind.toLowerCase() : 'file';
      const kind = allowedKinds.has(rawKind) ? rawKind : 'file';
      const url = normalizeString(attachment.url);
      if (!url) return null;
      const sanitized = { kind, url };
      if (attachment.name) sanitized.name = normalizeString(attachment.name);
      if (attachment.size && Number.isFinite(Number(attachment.size))) {
        sanitized.size = Number(attachment.size);
      }
      if (attachment.key) sanitized.key = normalizeString(attachment.key);
      if (attachment.meta && typeof attachment.meta === 'object') {
        sanitized.meta = attachment.meta;
      }
      return sanitized;
    })
    .filter(Boolean);
};

const slugify = (input) =>
  normalizeString(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

const ensureAuthor = async ({ user, fallbackUserId }) => {
  const candidateId = user?.id || user?._id || fallbackUserId;
  if (!candidateId) {
    throw Object.assign(new Error('Author context missing'), { statusCode: 400 });
  }

  let author;
  try {
    author = await User.findById(candidateId).lean();
  } catch (err) {
    throw Object.assign(new Error('Invalid author id'), { statusCode: 400 });
  }

  if (!author) {
    throw Object.assign(new Error('Author not found'), { statusCode: 404 });
  }
  if (!allowedAuthorRoles.has(author.role)) {
    throw Object.assign(new Error('Role not allowed to publish blog posts'), { statusCode: 403 });
  }

  return {
    authorId: author._id,
    authorRole: author.role,
    authorName: author.name,
    schoolId: author.school || null,
  };
};

export const createBlogPost = async (req, res) => {
  try {
    await connectDB();

    const {
      title,
      content,
      coverAttachment,
      attachments,
      youtubeUrl,
      tags,
      slug,
      authorId,
      status = 'published',
    } = req.body || {};

    const normalizedTitle = normalizeString(title);
    if (!normalizedTitle) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const normalizedContent = normalizeString(content);
    if (!normalizedContent) {
      return res.status(400).json({ error: 'Content is required' });
    }

    let authorContext;
    try {
      authorContext = await ensureAuthor({ user: req.user, fallbackUserId: authorId });
    } catch (err) {
      const statusCode = err.statusCode || 400;
      return res.status(statusCode).json({ error: err.message });
    }

    const allowedStatuses = new Set(['draft', 'published', 'archived']);
    const normalizedStatus = allowedStatuses.has(status) ? status : 'draft';

    let finalSlug = normalizeString(slug) || slugify(normalizedTitle);
    if (finalSlug) {
      const baseSlug = finalSlug;
      let attempt = 1;
      while (await BlogPost.exists({ slug: finalSlug })) {
        finalSlug = `${baseSlug}-${attempt}`;
        attempt += 1;
        if (attempt > 100) {
          finalSlug = `${baseSlug}-${Date.now()}`;
          break;
        }
      }
    } else {
      finalSlug = undefined;
    }

    const sanitizedAttachments = sanitizeAttachments(attachments);
    const sanitizedCover = coverAttachment ? sanitizeAttachments([coverAttachment])[0] : undefined;
    const tagList = Array.isArray(tags)
      ? tags
          .map((tag) => normalizeString(tag))
          .filter(Boolean)
          .slice(0, 12)
      : [];

    const post = await BlogPost.create({
      title: normalizedTitle,
      slug: finalSlug,
      content: normalizedContent,
      coverAttachment: sanitizedCover,
      attachments: sanitizedAttachments,
      youtubeUrl: normalizeString(youtubeUrl),
      author: authorContext.authorId,
      authorRole: authorContext.authorRole,
      school: authorContext.schoolId,
      tags: tagList,
      status: normalizedStatus,
      publishedAt: normalizedStatus === 'published' ? new Date() : null,
    });

    return res.status(201).json({
      post: {
        id: String(post._id),
        title: post.title,
        slug: post.slug,
        content: post.content,
        coverAttachment: post.coverAttachment,
        attachments: post.attachments,
        youtubeUrl: post.youtubeUrl,
        authorRole: post.authorRole,
        tags: post.tags,
        likesCount: post.likesCount,
        dislikesCount: post.dislikesCount,
        commentCount: post.commentCount,
        status: post.status,
        publishedAt: post.publishedAt,
        createdAt: post.createdAt,
      },
    });
  } catch (error) {
    console.error('Failed to create blog post:', error);
    return res.status(500).json({ error: error.message || 'Failed to create blog post' });
  }
};

export const listBlogPosts = async (req, res) => {
  try {
    await connectDB();

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const requestedStatus = normalizeString(req.query.status) || 'published';
    const allowedStatuses = new Set(['draft', 'published', 'archived']);
    const status = allowedStatuses.has(requestedStatus) ? requestedStatus : 'published';
    const schoolId = req.query.schoolId && Types.ObjectId.isValid(req.query.schoolId)
      ? new Types.ObjectId(req.query.schoolId)
      : null;

    const filter = {};
    if (status) filter.status = status;
    if (schoolId) filter.school = schoolId;

    const [posts, total] = await Promise.all([
      BlogPost.find(filter)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('author', 'name image')
        .lean(),
      BlogPost.countDocuments(filter),
    ]);

    return res.json({
      posts: posts.map((post) => ({
        id: String(post._id),
        title: post.title,
        slug: post.slug,
        excerpt: post.content.slice(0, 280),
        coverAttachment: post.coverAttachment || null,
        youtubeUrl: post.youtubeUrl || null,
        authorRole: post.authorRole,
        authorName: (post.author && post.author.name) || null,
        authorImage: (post.author && post.author.image) || null,
        likesCount: post.likesCount,
        dislikesCount: post.dislikesCount,
        commentCount: post.commentCount,
        tags: post.tags || [],
        publishedAt: post.publishedAt,
        createdAt: post.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Failed to list blog posts:', error);
    return res.status(500).json({ error: error.message || 'Failed to list blog posts' });
  }
};

// internal R2 client helper
let _r2Client;
const getR2 = () => {
  if (_r2Client) return _r2Client;
  const { CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY } = process.env;
  if (!CLOUDFLARE_R2_ACCOUNT_ID || !CLOUDFLARE_R2_ACCESS_KEY_ID || !CLOUDFLARE_R2_SECRET_ACCESS_KEY) {
    return null; // allow running without deletion if not configured
  }
  _r2Client = new S3Client({
    region: 'auto',
    endpoint: 'https://' + CLOUDFLARE_R2_ACCOUNT_ID + '.r2.cloudflarestorage.com',
    credentials: {
      accessKeyId: CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    },
  });
  return _r2Client;
};

export const deleteBlogPost = async (req, res) => {
  try {
    await connectDB();
    const { postId } = req.params || {};
    const { userId } = req.body || {};

    if (!postId || !Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: 'Invalid post id' });
    }

    const post = await BlogPost.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    // authorization: author or admin (basic: same user or schoolAdmin/ngoAdmin)
    const actorId = req.user?.id || req.user?._id || userId;
    if (!actorId) return res.status(403).json({ error: 'Not allowed' });

    if (String(post.author) !== String(actorId)) {
      const actor = await User.findById(actorId).lean();
      if (!actor || !['schoolAdmin', 'ngoAdmin'].includes(actor.role)) {
        return res.status(403).json({ error: 'Not allowed' });
      }
    }

    // delete reactions and comments
    await Promise.all([
      BlogReaction.deleteMany({ post: post._id }),
      BlogComment.deleteMany({ post: post._id }),
    ]);

    // delete R2 assets (cover & attachments) if keys present
    const keys = [];
    if (post.coverAttachment?.key) keys.push(post.coverAttachment.key);
    for (const a of post.attachments || []) if (a?.key) keys.push(a.key);
    const client = getR2();
    if (client && keys.length) {
      for (const k of keys) {
        try {
          await client.send(new DeleteObjectCommand({ Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME, Key: k }));
        } catch {}
      }
    }

    await BlogPost.deleteOne({ _id: post._id });
    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete blog post:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete blog post' });
  }
};

export const getBlogPost = async (req, res) => {
  try {
    await connectDB();

    const { postIdOrSlug } = req.params;
    if (!postIdOrSlug) {
      return res.status(400).json({ error: 'Missing post identifier' });
    }

    let filter;
    if (Types.ObjectId.isValid(postIdOrSlug)) {
      filter = { _id: postIdOrSlug };
    } else {
      filter = { slug: postIdOrSlug };
    }

    const post = await BlogPost.findOne(filter).lean();
    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    return res.json({
      post: {
        id: String(post._id),
        title: post.title,
        slug: post.slug,
        content: post.content,
        coverAttachment: post.coverAttachment || null,
        attachments: post.attachments || [],
        youtubeUrl: post.youtubeUrl || null,
        author: String(post.author),
        authorRole: post.authorRole,
        tags: post.tags || [],
        likesCount: post.likesCount,
        dislikesCount: post.dislikesCount,
        commentCount: post.commentCount,
        status: post.status,
        publishedAt: post.publishedAt,
        createdAt: post.createdAt,
      },
    });
  } catch (error) {
    console.error('Failed to fetch blog post:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch blog post' });
  }
};

export const upsertReaction = async (req, res) => {
  try {
    await connectDB();

    const { postId } = req.params || {};
    const { value, userId } = req.body || {};

    if (!postId || !Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: 'Invalid post id' });
    }
    if (!['like', 'dislike'].includes(value)) {
      return res.status(400).json({ error: 'Reaction must be like or dislike' });
    }

    const userContext = req.user?.id || req.user?._id || userId;
    if (!userContext) {
      return res.status(400).json({ error: 'Missing user context for reaction' });
    }

    const userObjectId = new Types.ObjectId(userContext);
    const postObjectId = new Types.ObjectId(postId);

    const [post, existingReaction] = await Promise.all([
      BlogPost.findById(postObjectId),
      BlogReaction.findOne({ post: postObjectId, user: userObjectId }),
    ]);

    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    if (existingReaction && existingReaction.value === value) {
      return res.json({ success: true, likesCount: post.likesCount, dislikesCount: post.dislikesCount });
    }

    const inc = { likesCount: 0, dislikesCount: 0 };
    if (value === 'like') inc.likesCount += 1;
    if (value === 'dislike') inc.dislikesCount += 1;

    if (existingReaction) {
      if (existingReaction.value === 'like') inc.likesCount -= 1;
      if (existingReaction.value === 'dislike') inc.dislikesCount -= 1;
    }

    await Promise.all([
      BlogReaction.updateOne(
        { post: postObjectId, user: userObjectId },
        { post: postObjectId, user: userObjectId, value },
        { upsert: true }
      ),
      BlogPost.updateOne(
        { _id: postObjectId },
        {
          $inc: {
            likesCount: inc.likesCount,
            dislikesCount: inc.dislikesCount,
          },
        }
      ),
    ]);

    const updatedPost = await BlogPost.findById(postObjectId, 'likesCount dislikesCount').lean();
    return res.json({
      success: true,
      likesCount: updatedPost?.likesCount || 0,
      dislikesCount: updatedPost?.dislikesCount || 0,
    });
  } catch (error) {
    console.error('Failed to update reaction:', error);
    return res.status(500).json({ error: error.message || 'Failed to update reaction' });
  }
};

export const removeReaction = async (req, res) => {
  try {
    await connectDB();

    const { postId } = req.params || {};
    const { userId } = req.body || {};

    if (!postId || !Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: 'Invalid post id' });
    }

    const userContext = req.user?.id || req.user?._id || userId;
    if (!userContext) {
      return res.status(400).json({ error: 'Missing user context for reaction removal' });
    }

    const userObjectId = new Types.ObjectId(userContext);
    const postObjectId = new Types.ObjectId(postId);

    const existingReaction = await BlogReaction.findOne({ post: postObjectId, user: userObjectId }).lean();
    if (!existingReaction) {
      return res.json({ success: true });
    }

    const inc = { likesCount: 0, dislikesCount: 0 };
    if (existingReaction.value === 'like') inc.likesCount -= 1;
    if (existingReaction.value === 'dislike') inc.dislikesCount -= 1;

    await Promise.all([
      BlogReaction.deleteOne({ post: postObjectId, user: userObjectId }),
      BlogPost.updateOne(
        { _id: postObjectId },
        {
          $inc: {
            likesCount: inc.likesCount,
            dislikesCount: inc.dislikesCount,
          },
        }
      ),
    ]);

    const updatedPost = await BlogPost.findById(postObjectId, 'likesCount dislikesCount').lean();

    return res.json({
      success: true,
      likesCount: updatedPost?.likesCount || 0,
      dislikesCount: updatedPost?.dislikesCount || 0,
    });
  } catch (error) {
    console.error('Failed to remove reaction:', error);
    return res.status(500).json({ error: error.message || 'Failed to remove reaction' });
  }
};

export const createComment = async (req, res) => {
  try {
    await connectDB();

    const { postId } = req.params || {};
    const { userId, content, parentCommentId, attachments } = req.body || {};

    if (!postId || !Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: 'Invalid post id' });
    }

    const normalizedContent = normalizeString(content);
    if (!normalizedContent) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    let authorContext;
    try {
      authorContext = await ensureAuthor({ user: req.user, fallbackUserId: userId });
    } catch (err) {
      const statusCode = err.statusCode || 400;
      return res.status(statusCode).json({ error: err.message });
    }

    const post = await BlogPost.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    let parentComment = null;
    if (parentCommentId) {
      if (!Types.ObjectId.isValid(parentCommentId)) {
        return res.status(400).json({ error: 'Invalid parent comment id' });
      }
      parentComment = await BlogComment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
    }

    const sanitizedAttachments = sanitizeAttachments(attachments);

    const comment = await BlogComment.create({
      post: post._id,
      author: authorContext.authorId,
      authorName: authorContext.authorName,
      authorRole: authorContext.authorRole,
      content: normalizedContent,
      attachments: sanitizedAttachments,
      parentComment: parentComment ? parentComment._id : undefined,
    });

    await BlogPost.updateOne({ _id: post._id }, { $inc: { commentCount: 1 } });

    return res.status(201).json({
      comment: {
        id: String(comment._id),
        postId: String(comment.post),
        content: comment.content,
        attachments: comment.attachments || [],
        authorRole: comment.authorRole,
        createdAt: comment.createdAt,
        parentCommentId: comment.parentComment ? String(comment.parentComment) : null,
      },
    });
  } catch (error) {
    console.error('Failed to create comment:', error);
    return res.status(500).json({ error: error.message || 'Failed to create comment' });
  }
};

export const listComments = async (req, res) => {
  try {
    await connectDB();

    const { postId } = req.params || {};
    if (!postId || !Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: 'Invalid post id' });
    }

    const comments = await BlogComment.find({ post: postId, isDeleted: false })
      .sort({ createdAt: 1 })
      .lean();

    return res.json({
      comments: comments.map((comment) => ({
        id: String(comment._id),
        postId: String(comment.post),
        content: comment.content,
        attachments: comment.attachments || [],
        authorRole: comment.authorRole,
        authorName: comment.authorName || null,
        parentCommentId: comment.parentComment ? String(comment.parentComment) : null,
        createdAt: comment.createdAt,
      })),
    });
  } catch (error) {
    console.error('Failed to list comments:', error);
    return res.status(500).json({ error: error.message || 'Failed to list comments' });
  }
};

export default {
  createBlogPost,
  listBlogPosts,
  getBlogPost,
  upsertReaction,
  removeReaction,
  createComment,
  listComments,
  deleteBlogPost,
};
