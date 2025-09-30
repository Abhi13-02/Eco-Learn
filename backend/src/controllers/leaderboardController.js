// src/controllers/leaderboardController.js
import mongoose from 'mongoose';
import { connectDB } from '../lib/db.js';
import { User } from '../models/users.js';
import { UserScore, BadgeAward } from '../models/gamification.js';
import { ensureDefaultBadges, getBadgeDefinitions } from '../lib/badges.js';

const { Types } = mongoose;

const GRADE_PATTERN = /^(?:[1-9]|1[0-2])$/;

const parseGrade = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw || raw.toLowerCase() === 'all') {
    return null;
  }
  return GRADE_PATTERN.test(raw) ? String(Number(raw)) : null;
};

const parseLimit = (value) => {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 20;
  }
  return Math.min(Math.max(numeric, 5), 100);
};

const parseObjectId = (value) => {
  if (!value) return null;
  try {
    return new Types.ObjectId(String(value));
  } catch (error) {
    return null;
  }
};

const toIsoString = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const collectGradeOptions = async (schoolId) => {
  const filter = schoolId ? { school: schoolId } : {};
  const grades = await UserScore.distinct('grade', filter);
  return grades
    .filter((grade) => typeof grade === 'string' && grade.trim())
    .map((grade) => grade.trim())
    .filter((grade, idx, arr) => GRADE_PATTERN.test(grade) && arr.indexOf(grade) === idx)
    .sort((a, b) => Number(a) - Number(b));
};

const buildAwardsMap = (awards, badgeById) => {
  const map = new Map();
  for (const award of awards) {
    const userId = String(award.user);
    const badgeId = String(award.badge);
    const badgeDef = badgeById.get(badgeId);
    if (!badgeDef) continue;
    if (!map.has(userId)) {
      map.set(userId, []);
    }
    map.get(userId).push({
      code: badgeDef.code,
      name: badgeDef.name,
      description: badgeDef.description,
      threshold: badgeDef.threshold,
      icon: badgeDef.icon,
      theme: badgeDef.theme,
      order: badgeDef.order,
      awardedAt: award.awardedAt || null,
      pointsAtAward: award.pointsAtAward ?? 0,
    });
  }

  for (const list of map.values()) {
    list.sort((a, b) => a.threshold - b.threshold);
  }

  return map;
};

const computeHighlightReasons = (entry, topThreshold) => {
  const reasons = [];
  if (entry.rank <= 3) {
    reasons.push('podium');
  }
  if (entry.currentBadge && entry.currentBadge.threshold >= topThreshold) {
    reasons.push('badge');
  }
  if (entry.isSelf) {
    reasons.push('self');
  }
  return reasons;
};

export const getLeaderboard = async (req, res) => {
  try {
    await connectDB();
    await ensureDefaultBadges();

    const gradeFilter = parseGrade(req.query.grade);
    const limit = parseLimit(req.query.limit);
    const schoolId = parseObjectId(req.query.school);
    const userObjectId = parseObjectId(req.query.userId);

    const baseFilter = {};
    if (gradeFilter) baseFilter.grade = gradeFilter;
    if (schoolId) baseFilter.school = schoolId;

    let scores = await UserScore.find(baseFilter)
      .sort({ totalPoints: -1, updatedAt: 1 })
      .limit(limit)
      .lean();

    let includeSelf = false;
    let selfScoreDoc = null;
    if (userObjectId) {
      const existingIndex = scores.findIndex((entry) => String(entry.user) === String(userObjectId));
      if (existingIndex >= 0) {
        selfScoreDoc = scores[existingIndex];
      } else {
        const selfFilter = { user: userObjectId, ...baseFilter };
        selfScoreDoc = await UserScore.findOne(selfFilter).lean();
        if (selfScoreDoc) {
          scores = [...scores, selfScoreDoc];
          includeSelf = true;
        }
      }
    }

    const userIds = [...new Set(scores.map((score) => String(score.user)))];
    const badgeDefinitions = await getBadgeDefinitions();
    const badgeById = new Map(badgeDefinitions.map((badge) => [badge.id, badge]));
    const topBadgeThreshold = badgeDefinitions.length
      ? badgeDefinitions[Math.max(0, badgeDefinitions.length - 2)].threshold
      : 0;

    if (!userIds.length) {
      const availableGrades = await collectGradeOptions(schoolId);
      return res.json({
        meta: {
          grade: gradeFilter,
          availableGrades,
          limit,
          includeSelf: false,
          totalEntries: 0,
          totalParticipants: 0,
          self: null,
        },
        badges: badgeDefinitions,
        leaderboard: [],
        podium: [],
      });
    }

    const [users, awards, totalParticipants] = await Promise.all([
      User.find({ _id: { $in: userIds } })
        .select('name image role student.grade school')
        .populate('school', 'name')
        .lean(),
      BadgeAward.find({ user: { $in: userIds } })
        .select('user badge awardedAt pointsAtAward')
        .lean(),
      UserScore.countDocuments(baseFilter),
    ]);

    const userMap = new Map(users.map((doc) => [String(doc._id), doc]));
    const awardsByUser = buildAwardsMap(awards, badgeById);

    const entries = scores
      .map((score) => {
        const id = String(score.user);
        const user = userMap.get(id);
        if (!user) return null;

        const gradeValue = score.grade || user.student?.grade || null;
        const badgeList = awardsByUser.get(id) || [];
        const currentBadge = badgeList.length ? badgeList[badgeList.length - 1] : null;
        const nextBadge = badgeDefinitions.find((badge) => badge.threshold > (score.totalPoints || 0)) || null;
        const pointsToNextBadge = nextBadge ? Math.max(0, nextBadge.threshold - (score.totalPoints || 0)) : 0;

        const school = user.school;
        let schoolName = null;
        let schoolIdStr = null;
        if (school) {
          if (typeof school === 'object' && school !== null) {
            schoolName = school.name || null;
            if (school._id) {
              schoolIdStr = String(school._id);
            }
          } else {
            schoolIdStr = String(school);
          }
        }

        return {
          rank: 0,
          userId: id,
          name: user.name || 'Eco Learner',
          avatar: user.image || '',
          role: user.role || 'student',
          grade: gradeValue,
          schoolId: schoolIdStr,
          schoolName,
          points: score.totalPoints || 0,
          lastUpdatedAt: toIsoString(score.lastUpdatedAt || score.updatedAt || score.createdAt),
          badges: badgeList,
          currentBadge,
          nextBadge,
          pointsToNextBadge,
          highlight: false,
          highlightReasons: [],
          isSelf: userObjectId ? id === String(userObjectId) : false,
        };
      })
      .filter(Boolean);

    entries.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      const aTime = new Date(a.lastUpdatedAt || 0).getTime();
      const bTime = new Date(b.lastUpdatedAt || 0).getTime();
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      return a.name.localeCompare(b.name);
    });

    let rank = 0;
    let previousPoints = null;
    entries.forEach((entry, idx) => {
      if (previousPoints === null || entry.points < previousPoints) {
        rank = idx + 1;
        previousPoints = entry.points;
      }
      entry.rank = rank;
      entry.highlightReasons = computeHighlightReasons(entry, topBadgeThreshold);
      entry.highlight = entry.highlightReasons.length > 0;
    });

    const podium = entries.filter((entry) => entry.rank <= 3).slice(0, 3);

    let accurateSelf = null;
    if (userObjectId) {
      const targetEntry = entries.find((entry) => entry.userId === String(userObjectId));
      let accurateRank = targetEntry?.rank ?? null;
      if (!targetEntry && selfScoreDoc) {
        const aheadFilter = { ...baseFilter, totalPoints: { $gt: selfScoreDoc.totalPoints || 0 } };
        const aheadCount = await UserScore.countDocuments(aheadFilter);
        accurateRank = aheadCount + 1;
      }
      if (targetEntry || selfScoreDoc) {
        accurateSelf = {
          rank: accurateRank,
          points: targetEntry?.points ?? selfScoreDoc?.totalPoints ?? 0,
          grade: targetEntry?.grade ?? selfScoreDoc?.grade ?? null,
        };
      }
    }

    const availableGrades = await collectGradeOptions(schoolId);

    return res.json({
      meta: {
        grade: gradeFilter,
        availableGrades,
        limit,
        includeSelf,
        totalEntries: entries.length,
        totalParticipants,
        self: accurateSelf,
      },
      badges: badgeDefinitions,
      leaderboard: entries,
      podium,
    });
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch leaderboard' });
  }
};

export const getBadges = async (_req, res) => {
  try {
    await connectDB();
    const badges = await getBadgeDefinitions();
    return res.json({ badges });
  } catch (error) {
    console.error('Failed to fetch badges:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch badges' });
  }
};

export default {
  getLeaderboard,
  getBadges,
};
