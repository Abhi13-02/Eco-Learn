// src/lib/badges.js
import mongoose from 'mongoose';
import { Badge, BadgeAward } from '../models/gamification.js';

/**
 * Default badge presets. Inspired by LeetCode titles but with an eco twist.
 * The order defines the progression ladder.
 */
export const BADGE_PRESETS = [
  {
    code: 'SEEDLING_SCOUT',
    name: 'Seedling Scout',
    description: 'Start your eco journey and earn your first points.',
    threshold: 0,
    icon: '🌱',
    theme: 'emerald',
  },
  {
    code: 'SPROUT_BRONZE',
    name: 'Bronze Sprout',
    description: 'Reach 100 points and show steady growth.',
    threshold: 100,
    icon: '🥉',
    theme: 'amber',
  },
  {
    code: 'CANOPY_SILVER',
    name: 'Silver Canopy',
    description: 'Earn 300 points to build a thriving canopy.',
    threshold: 300,
    icon: '🥈',
    theme: 'slate',
  },
  {
    code: 'ECO_GOLD',
    name: 'Gold Guardian',
    description: 'Collect 600 points and guard the planet.',
    threshold: 600,
    icon: '🥇',
    theme: 'yellow',
  },
  {
    code: 'PLANET_PLATINUM',
    name: 'Platinum Planet Protector',
    description: 'Score 1000 points to lead planetary change.',
    threshold: 1000,
    icon: '🌍',
    theme: 'sky',
  },
  {
    code: 'COSMIC_CHAMPION',
    name: 'Cosmic Champion',
    description: 'Achieve 1500 points to join the cosmic league.',
    threshold: 1500,
    icon: '🌌',
    theme: 'violet',
  },
];

let ensurePromise = null;

/**
 * Ensure default badges exist (idempotent).
 */
export async function ensureDefaultBadges() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const operations = BADGE_PRESETS.map((preset) =>
        Badge.findOneAndUpdate(
          { code: preset.code },
          {
            $set: {
              name: preset.name,
              description: preset.description,
              threshold: preset.threshold,
              icon: preset.icon,
              theme: preset.theme,
              isActive: true,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
      );
      await Promise.all(operations);
      return true;
    })().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  return ensurePromise;
}

/**
 * Fetch active badge definitions sorted by threshold.
 */
export async function getBadgeDefinitions() {
  await ensureDefaultBadges();
  const badges = await Badge.find({ isActive: true }).sort({ threshold: 1 }).lean();
  return badges.map((badge, idx) => ({
    id: String(badge._id),
    code: badge.code,
    name: badge.name,
    description: badge.description || '',
    threshold: badge.threshold,
    icon: badge.icon || '',
    theme: badge.theme || 'emerald',
    order: idx + 1,
  }));
}

/**
 * Award badges for the provided total points. Returns the list of badges granted in this call.
 */
export async function awardBadgesForScore(userId, totalPoints) {
  if (!mongoose.Types.ObjectId.isValid(String(userId))) {
    return [];
  }
  await ensureDefaultBadges();

  const eligibleCodes = BADGE_PRESETS.filter((badge) => totalPoints >= badge.threshold).map((badge) => badge.code);
  if (!eligibleCodes.length) {
    return [];
  }

  const badges = await Badge.find({ code: { $in: eligibleCodes }, isActive: true }).lean();
  if (!badges.length) {
    return [];
  }

  const badgeIds = badges.map((badge) => badge._id);
  const existingAwards = await BadgeAward.find({ user: userId, badge: { $in: badgeIds } }, { badge: 1 }).lean();
  const alreadyAwarded = new Set(existingAwards.map((award) => String(award.badge)));

  const toInsert = badges
    .filter((badge) => !alreadyAwarded.has(String(badge._id)))
    .map((badge) => ({
      user: userId,
      badge: badge._id,
      pointsAtAward: totalPoints,
      awardedAt: new Date(),
    }));

  if (!toInsert.length) {
    return [];
  }

  await BadgeAward.insertMany(toInsert, { ordered: false });
  return toInsert.map((entry) => String(entry.badge));
}
