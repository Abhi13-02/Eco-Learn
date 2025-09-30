// src/models/gamification.js
import mongoose from 'mongoose';

const { Schema, Types } = mongoose;

/* ---------------- Point Transactions (ledger) ---------------- */
const PointTransactionSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true },
    school: { type: Types.ObjectId, ref: 'School' }, // students belong to a school
    amount: { type: Number, required: true }, // positive for credit, negative for debit
    reason: {
      type: String,
      enum: ['TASK_ACCEPTED', 'ADJUSTMENT', 'REVOKE'],
      required: true,
    },
    task: { type: Types.ObjectId, ref: 'Task' },
    submission: { type: Types.ObjectId, ref: 'TaskSubmission' },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

PointTransactionSchema.index({ user: 1, createdAt: -1 });
PointTransactionSchema.index({ school: 1, createdAt: -1 });

/* ---------------- UserScore (precomputed total for leaderboards) ---------------- */
const UserScoreSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true, unique: true },
    school: { type: Types.ObjectId, ref: 'School' },
    grade: { type: String, trim: true }, // snapshot of current grade for filtering
    totalPoints: { type: Number, default: 0 },
    lastUpdatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

UserScoreSchema.index({ school: 1, totalPoints: -1 });
UserScoreSchema.index({ grade: 1, totalPoints: -1 });

/* ---------------- Badges ---------------- */
// Definitions for badges (optional collection to allow customization)
const BadgeSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: { type: String, required: true },
    description: { type: String },
    threshold: { type: Number, required: true }, // points required
    icon: { type: String }, // optional icon URL or name
    theme: { type: String, default: 'emerald' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const BadgeAwardSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true },
    badge: { type: Types.ObjectId, ref: 'Badge', required: true },
    pointsAtAward: { type: Number, default: 0 },
    awardedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

BadgeAwardSchema.index({ user: 1, badge: 1 }, { unique: true });

/* ---------------- Export models ---------------- */
export const PointTransaction =
  mongoose.models.PointTransaction || mongoose.model('PointTransaction', PointTransactionSchema);

export const UserScore =
  mongoose.models.UserScore || mongoose.model('UserScore', UserScoreSchema);

export const Badge = mongoose.models.Badge || mongoose.model('Badge', BadgeSchema);

export const BadgeAward =
  mongoose.models.BadgeAward || mongoose.model('BadgeAward', BadgeAwardSchema);

