// src/models/users.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

const { Schema, Types } = mongoose;

/** Generate a short human-friendly code (no O/0/I/1). */
export function generateCode(len = 6) {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(len);
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
}

/* ---------------- School ---------------- */
const SchoolSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    description: String,
    address: String,
    website: String,
    createdBy: { type: Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
SchoolSchema.index({ code: 1 }, { unique: true });

/** Auto-generate unique code if not provided */
SchoolSchema.pre('validate', async function autoCode(next) {
  if (this.code) return next();
  // attempt a few times to avoid rare collisions
  for (let i = 0; i < 5; i++) {
    const candidate = generateCode(6);
    const exists = await mongoose.models.School.findOne({ code: candidate }).lean();
    if (!exists) {
      this.code = candidate;
      return next();
    }
  }
  next(new Error('Failed to generate a unique school code. Try again.'));
});

/* ---------------- NGO ---------------- */
const NgoSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    description: String,
    address: String,
    website: String,
    createdBy: { type: Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
NgoSchema.index({ code: 1 }, { unique: true });

NgoSchema.pre('validate', async function autoCode(next) {
  if (this.code) return next();
  for (let i = 0; i < 5; i++) {
    const candidate = generateCode(6);
    const exists = await mongoose.models.Ngo.findOne({ code: candidate }).lean();
    if (!exists) {
      this.code = candidate;
      return next();
    }
  }
  next(new Error('Failed to generate a unique NGO code. Try again.'));
});

/* ---------------- User ----------------
   Roles & membership rules:
   - student/teacher/schoolAdmin → must have school
   - ngoAdmin → must have ngo
   - No email verification field (NextAuth can store emailVerified null)
*/
const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, unique: true, trim: true },
    image: { type: String }, // for Google provider avatars, optional
    // For Credentials provider. Null/undefined when using Google-only account
    passwordHash: { type: String },

    role: {
      type: String,
      enum: ['student', 'teacher', 'schoolAdmin', 'ngoAdmin'],
      required: true,
    },

    school: { type: Types.ObjectId, ref: 'School' },
    ngo: { type: Types.ObjectId, ref: 'Ngo' },

    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,

    // future-friendly fields
    student: { grade: { type: String, trim: true } },
    teacher: { bio: String },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });

/** Hashing helpers for Credentials logins */
UserSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 12);
};
UserSchema.methods.verifyPassword = function verifyPassword(plain) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plain, this.passwordHash);
};

/** Role ↔ org consistency */
UserSchema.pre('validate', function roleOrgConsistency(next) {
  const hasSchool = !!this.school;
  const hasNgo = !!this.ngo;

  if (hasSchool && hasNgo) {
    return next(new Error('User cannot belong to both School and NGO.'));
  }
  if (['student', 'teacher', 'schoolAdmin'].includes(this.role) && !hasSchool) {
    return next(new Error(`${this.role} must belong to a School.`));
  }
  if (this.role === 'ngoAdmin' && !hasNgo) {
    return next(new Error('ngoAdmin must belong to an NGO.'));
  }
  next();
});

/* ---------------- Export models (avoid OverwriteModelError) ---------------- */
export const School =
  mongoose.models.School || mongoose.model('School', SchoolSchema);

export const Ngo =
  mongoose.models.Ngo || mongoose.model('Ngo', NgoSchema);

export const User =
  mongoose.models.User || mongoose.model('User', UserSchema);
