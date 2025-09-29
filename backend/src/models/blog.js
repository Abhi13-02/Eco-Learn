// src/models/blog.js
import mongoose from 'mongoose';

const { Schema, Types } = mongoose;

const AttachmentSchema = new Schema(
  {
    kind: {
      type: String,
      enum: ['image', 'video', 'file', 'link'],
      default: 'file',
      lowercase: true,
    },
    url: { type: String, required: true, trim: true },
    name: { type: String, trim: true },
    size: { type: Number },
    key: { type: String, trim: true },
    meta: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const BlogPostSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, lowercase: true },
    content: { type: String, required: true },

    coverAttachment: AttachmentSchema,
    attachments: [AttachmentSchema],
    youtubeUrl: { type: String, trim: true },

    author: { type: Types.ObjectId, ref: 'User', required: true },
    authorRole: {
      type: String,
      enum: ['student', 'teacher', 'schoolAdmin', 'ngoAdmin'],
      required: true,
    },
    school: { type: Types.ObjectId, ref: 'School' },

    tags: [{ type: String, trim: true }],

    likesCount: { type: Number, default: 0 },
    dislikesCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published',
    },
    publishedAt: { type: Date },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

BlogPostSchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: { slug: { $type: 'string', $ne: '' } },
  }
);
BlogPostSchema.index({ author: 1, createdAt: -1 });
BlogPostSchema.index({ status: 1, publishedAt: -1 });
BlogPostSchema.index({ school: 1, createdAt: -1 });

const BlogCommentSchema = new Schema(
  {
    post: { type: Types.ObjectId, ref: 'BlogPost', required: true },
    author: { type: Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, trim: true },
    authorRole: {
      type: String,
      enum: ['student', 'teacher', 'schoolAdmin', 'ngoAdmin'],
      required: true,
    },
    content: { type: String, required: true, trim: true },
    attachments: [AttachmentSchema],
    parentComment: { type: Types.ObjectId, ref: 'BlogComment' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

BlogCommentSchema.index({ post: 1, createdAt: 1 });
BlogCommentSchema.index({ parentComment: 1, createdAt: 1 });

const BlogReactionSchema = new Schema(
  {
    post: { type: Types.ObjectId, ref: 'BlogPost', required: true },
    user: { type: Types.ObjectId, ref: 'User', required: true },
    value: {
      type: String,
      enum: ['like', 'dislike'],
      required: true,
    },
  },
  { timestamps: true }
);

BlogReactionSchema.index({ post: 1, user: 1 }, { unique: true });
BlogReactionSchema.index({ post: 1, value: 1 });

export const BlogPost =
  mongoose.models.BlogPost || mongoose.model('BlogPost', BlogPostSchema);

export const BlogComment =
  mongoose.models.BlogComment || mongoose.model('BlogComment', BlogCommentSchema);

export const BlogReaction =
  mongoose.models.BlogReaction || mongoose.model('BlogReaction', BlogReactionSchema);
