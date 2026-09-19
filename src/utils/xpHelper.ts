export const XP_TABLE = {
  DAILY_STREAK: 20,
  COURSE_COMPLETION_50: 25,
  COURSE_COMPLETION_100: 50,
  LIVE_EVENT_ATTENDANCE: 100,
  COURSE_PRODUCT_SUBMISSION: 50,
  TODAYS_FOCUS: 30,
  FEED_COMMENT: 5,
  FEED_LIKE: 2,
  FEED_POST: 15,
  WIN_WALL_SHARE: 30,
  ART_O_THON_FINISHER: 500,
  HOF: 1000,
  ARTISTRY_PINNACLE_AWARD: 2000,
};


/**
 * Checks whether a student can earn XP across LMS modules.
 * L1 (Silver Member), L2 (Gold Member), and L3 (Diamond Club) can all earn XP.
 */
export const canEarnXp = (user: any): boolean => {
  if (!user) return false;
  const level = ((user.membershipLevel || user.rank || '') + '').toUpperCase();
  if (level === 'GENERAL' || level === 'L0' || level.includes('FAST START') || level.includes('FAST TRACK')) {
    if (!level.includes('L1') && !level.includes('L2') && !level.includes('L3') && !level.includes('SILVER') && !level.includes('GOLD') && !level.includes('DIAMOND')) {
      return false;
    }
  }
  return (
    level.includes('L1') ||
    level.includes('SILVER') ||
    level.includes('L2') ||
    level.includes('GOLD') ||
    level.includes('L3') ||
    level.includes('DIAMOND') ||
    level.includes('RENAISSANCE') ||
    level.includes('MASTERS')
  );
};

/**
 * Strictly checks whether a student has permission to redeem items from the Merch Store.
 * Merch Store redemption is strictly exclusive to Level 3 (Diamond Club / Masters Club).
 * L1 and L2 members accumulate XP across all modules but CANNOT redeem from the Merch Store.
 */
export const canRedeemMerchStore = (user: any): boolean => {
  if (!user) return false;
  const level = ((user.membershipLevel || user.rank || '') + '').toUpperCase();
  return (
    level.includes('L3') ||
    level.includes('DIAMOND') ||
    level.includes('RENAISSANCE') ||
    level.includes('MASTERS')
  );
};

/**
 * Backward compatibility alias for canRedeemMerchStore.
 */
export const isL3Student = canRedeemMerchStore;

/**
 * Safely awards XP to a user IF they belong to an XP-eligible level (L1, L2, L3).
 * Returns the amount of XP awarded (0 for non-eligible students).
 */
export const awardXp = async (user: any, xpAmount: number): Promise<number> => {
  if (!user) return 0;
  if (!canEarnXp(user)) return 0;

  user.points = (user.points || 0) + xpAmount;
  user.xpPoints = (user.xpPoints || 0) + xpAmount;
  await user.save();

  return xpAmount;
};

export const awardXpIfL3 = awardXp;

