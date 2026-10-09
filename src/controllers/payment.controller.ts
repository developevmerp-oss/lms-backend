import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import db from '../models';

const { User, SalesRecord, Notification, CommunityWin, LevelTier, PaymentTransaction, Course, UserCourse, StudentInstallmentPlan } = db;

// Helper to compute next installment due date based on frequency
export const computeNextDueDate = (frequency: string, fromDate = new Date()): Date => {
  const d = new Date(fromDate);
  const freqLower = (frequency || 'monthly').toLowerCase().trim();
  switch (freqLower) {
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'biweekly':
      d.setDate(d.getDate() + 14);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case '2months':
      d.setMonth(d.getMonth() + 2);
      break;
    case '3months':
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case '6months':
    case 'halfyearly':
      d.setMonth(d.getMonth() + 6);
      break;
    default: {
      const daysMatch = freqLower.match(/(\d+)\s*days?/);
      if (daysMatch) {
        d.setDate(d.getDate() + parseInt(daysMatch[1], 10));
      } else {
        const monthsMatch = freqLower.match(/(\d+)\s*months?/);
        if (monthsMatch) {
          d.setMonth(d.getMonth() + parseInt(monthsMatch[1], 10));
        } else {
          d.setMonth(d.getMonth() + 1);
        }
      }
      break;
    }
  }
  return d;
};

let dynamicRazorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_1DP5mmOlF5G5ag';
let dynamicRazorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// Helper to resolve active Razorpay keys with DB persistence fallback
const resolveRazorpayKeys = async () => {
  // If valid non-dummy keys exist in env, use them
  if (
    process.env.RAZORPAY_KEY_ID &&
    !process.env.RAZORPAY_KEY_ID.includes('1DP5mmOlF5G5ag') &&
    process.env.RAZORPAY_KEY_SECRET
  ) {
    dynamicRazorpayKeyId = process.env.RAZORPAY_KEY_ID.trim();
    dynamicRazorpayKeySecret = process.env.RAZORPAY_KEY_SECRET.trim();
    return { keyId: dynamicRazorpayKeyId, keySecret: dynamicRazorpayKeySecret };
  }

  // Otherwise check persistent SystemSettings table in Postgres
  try {
    const [rows]: any = await db.sequelize.query(
      `SELECT "key", "value" FROM "SystemSettings" WHERE "key" IN ('RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET');`
    );
    if (rows && rows.length > 0) {
      const dbKeyId = rows.find((r: any) => r.key === 'RAZORPAY_KEY_ID')?.value;
      const dbKeySecret = rows.find((r: any) => r.key === 'RAZORPAY_KEY_SECRET')?.value;
      if (dbKeyId) dynamicRazorpayKeyId = dbKeyId.trim();
      if (dbKeySecret) dynamicRazorpayKeySecret = dbKeySecret.trim();
    }
  } catch (_) {}

  return { keyId: dynamicRazorpayKeyId, keySecret: dynamicRazorpayKeySecret };
};

// ── GET PUBLIC RAZORPAY KEY & STATUS ──
export const getRazorpayKey = async (_req: Request, res: Response): Promise<any> => {
  const { keyId, keySecret } = await resolveRazorpayKeys();
  const isConfigured = !!(keyId && keySecret && !keyId.includes('1DP5mmOlF5G5ag'));
  return res.status(200).json({
    keyId,
    isConfigured,
  });
};

// ── UPDATE RAZORPAY KEYS (ADMIN) ──
export const updateRazorpayConfig = async (req: Request, res: Response): Promise<any> => {
  try {
    const { keyId, keySecret } = req.body;
    if (keyId) dynamicRazorpayKeyId = keyId.trim();
    if (keySecret) dynamicRazorpayKeySecret = keySecret.trim();

    // Persist to database so Render restarts never lose the keys
    try {
      if (keyId) {
        await db.sequelize.query(
          `INSERT INTO "SystemSettings" ("key", "value", "createdAt", "updatedAt")
           VALUES ('RAZORPAY_KEY_ID', :val, NOW(), NOW())
           ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();`,
          { replacements: { val: keyId.trim() } }
        );
      }
      if (keySecret) {
        await db.sequelize.query(
          `INSERT INTO "SystemSettings" ("key", "value", "createdAt", "updatedAt")
           VALUES ('RAZORPAY_KEY_SECRET', :val, NOW(), NOW())
           ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();`,
          { replacements: { val: keySecret.trim() } }
        );
      }
    } catch (dbErr: any) {
      console.warn('Could not persist keys to SystemSettings table:', dbErr?.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Razorpay keys updated and saved permanently to database!',
      keyId: dynamicRazorpayKeyId,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to update keys', error: error?.message });
  }
};

// ── CREATE RAZORPAY ORDER & LOG TRANSACTION AS PENDING ──
export const createPaymentOrder = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      amount,
      currency = 'INR',
      tierCode = 'L0',
      tierName = 'Fast Track',
      courseId,
      customerEmail,
      customerPhone,
      customerName,
    } = req.body;

    if (!amount) {
      return res.status(400).json({ message: 'Payment amount is required' });
    }

    let resolvedTierCode = tierCode;
    let resolvedTierName = tierName;

    if (courseId) {
      try {
        const c = await Course.findByPk(courseId);
        if (c) {
          resolvedTierCode = 'COURSE';
          resolvedTierName = c.title;
        }
      } catch (_) {}
    }

    const cleanAmount = parseFloat(amount);
    const amountInPaise = Math.round(cleanAmount * 100);
    let orderId = `order_${resolvedTierCode.toLowerCase()}_${Date.now()}`;

    const { keyId, keySecret } = await resolveRazorpayKeys();

    // If live/test Razorpay credentials exist, create order via Razorpay API
    if (keyId && keySecret && !keyId.includes('1DP5mmOlF5G5ag')) {
      try {
        const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${authHeader}`,
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency,
            receipt: `rcpt_${resolvedTierCode.toLowerCase()}_${Date.now()}`,
            notes: {
              tierCode: resolvedTierCode,
              tierName: resolvedTierName,
              courseId: courseId || '',
              customerEmail: customerEmail || '',
              customerName: customerName || '',
            },
          }),
        });

        const orderData = await response.json();
        if (response.ok && orderData.id) {
          orderId = orderData.id;
        }
      } catch (rErr) {
        console.warn('Razorpay API order creation warning, using direct order tracking:', rErr);
      }
    }

    // Try finding existing student by email
    let matchedUserId: string | null = null;
    if (customerEmail) {
      const existingUser = await User.findOne({ where: { email: customerEmail.trim().toLowerCase() } });
      if (existingUser) matchedUserId = existingUser.id;
    }

    // Record initial transaction in database as 'pending'
    try {
      await PaymentTransaction.create({
        orderId,
        tierCode: resolvedTierCode,
        tierName: resolvedTierName,
        courseId: courseId || null,
        amount: cleanAmount,
        currency,
        customerName: customerName || 'Art Student',
        customerEmail: (customerEmail || '').trim().toLowerCase(),
        customerPhone: customerPhone || '',
        userId: matchedUserId,
        status: 'pending',
      });
    } catch (dbErr: any) {
      console.warn('Could not insert initial pending payment transaction:', dbErr?.message);
    }

    return res.status(200).json({
      success: true,
      orderId,
      amount: amountInPaise,
      currency,
      keyId,
      tierCode,
      tierName,
    });
  } catch (error: any) {
    console.error('Error creating payment order:', error);
    return res.status(500).json({ message: 'Failed to create payment order', error: error?.message });
  }
};

// ── RECORD PAYMENT FAILURE OR USER CANCELLATION ──
export const recordPaymentFailure = async (req: Request, res: Response): Promise<any> => {
  try {
    const { orderId, paymentId, reason, status = 'failed' } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'orderId is required' });
    }

    const tx = await PaymentTransaction.findOne({ where: { orderId } });
    if (tx) {
      await tx.update({
        status: status === 'cancelled' ? 'cancelled' : 'failed',
        paymentId: paymentId || tx.paymentId,
        failureReason: reason || (status === 'cancelled' ? 'User closed checkout window' : 'Payment was declined or failed'),
      });
    }

    return res.status(200).json({ success: true, message: 'Transaction failure logged.' });
  } catch (error: any) {
    console.error('Error logging payment failure:', error);
    return res.status(500).json({ message: 'Failed to log payment failure', error: error?.message });
  }
};

// ── STRICT VERIFY RAZORPAY PAYMENT & UNLOCK MEMBERSHIP ──
export const verifyPayment = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      tierCode = 'L0',
      tierName = 'Fast Track',
      courseId,
      amount = 499,
      email,
      name,
      phone,
      password,
      paymentMethod = 'Online / Razorpay',
      // Installment parameters
      isInstallment,
      planId,
      planName,
      planFrequency,
      installmentAmount,
      totalInstallments,
      existingPlanId,
    } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment parameters. Payment could not be verified.',
      });
    }

    const { keyId, keySecret } = await resolveRazorpayKeys();

    // 1. STRICT Cryptographic Signature Verification
    if (keySecret && !keyId.includes('1DP5mmOlF5G5ag')) {
      if (!razorpay_signature) {
        // Mark transaction as failed
        await PaymentTransaction.update(
          { status: 'failed', failureReason: 'Missing payment signature' },
          { where: { orderId: razorpay_order_id } }
        );
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed: Missing Razorpay cryptographic signature.',
        });
      }

      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        console.warn(`Signature mismatch: expected ${generatedSignature}, got ${razorpay_signature}`);
        await PaymentTransaction.update(
          { status: 'failed', paymentId: razorpay_payment_id, failureReason: 'Signature mismatch: unauthorized or altered transaction' },
          { where: { orderId: razorpay_order_id } }
        );
        return res.status(400).json({
          success: false,
          message: 'Security validation failed: Payment signature does not match.',
        });
      }
    }

    // 2. Mark Transaction as Completed in Database
    const cleanAmount = parseFloat(amount) || 499;
    const targetEmail = (email || '').trim().toLowerCase();

    let [tx] = await PaymentTransaction.findOrCreate({
      where: { orderId: razorpay_order_id },
      defaults: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature || null,
        tierCode,
        tierName,
        courseId: courseId || null,
        amount: cleanAmount,
        currency: 'INR',
        customerEmail: targetEmail,
        customerName: name || 'Art Student',
        customerPhone: phone || '',
        status: 'completed',
        paymentMethod,
        paidAt: new Date(),
      },
    });

    const resolvedCourseId = courseId || tx?.courseId;
    const isCoursePurchase = Boolean(resolvedCourseId || tierCode === 'COURSE');

    let targetCourse: any = null;
    if (resolvedCourseId) {
      try {
        targetCourse = await Course.findByPk(resolvedCourseId);
      } catch (_) {}
    }

    const resolvedTierCode = isCoursePurchase ? 'COURSE' : tierCode;
    const resolvedTierName = isCoursePurchase ? (targetCourse?.title || tierName) : tierName;

    if (tx) {
      await tx.update({
        status: 'completed',
        paymentId: razorpay_payment_id,
        signature: razorpay_signature || tx.signature,
        paymentMethod: paymentMethod || tx.paymentMethod,
        tierCode: resolvedTierCode,
        tierName: resolvedTierName,
        courseId: resolvedCourseId || tx.courseId,
        paidAt: new Date(),
        failureReason: null,
      });
    }

    // 3. User tier upgrade or Course enrollment logic
    const fullTierLabel = `${resolvedTierName} (${resolvedTierCode})`;

    let membershipExpiresAt: Date | null = null;
    if (!isCoursePurchase) {
      try {
        const matchedTier = await LevelTier.findOne({ where: { code: tierCode.trim().toUpperCase() } });
        if (matchedTier && matchedTier.validityDays && Number(matchedTier.validityDays) > 0) {
          membershipExpiresAt = new Date(Date.now() + Number(matchedTier.validityDays) * 24 * 60 * 60 * 1000);
        }
      } catch (_) {}
    }

    let user: any = null;
    if (targetEmail) {
      user = await User.findOne({ where: { email: targetEmail } });

      if (user) {
        if (!isCoursePurchase) {
          await user.update({
            membershipLevel: fullTierLabel,
            rank: fullTierLabel,
            role: 'student',
            membershipExpiresAt,
          });
        }
      } else {
        const defaultPwd = password || 'ArtStudent@2026';
        const hashedPassword = await bcrypt.hash(defaultPwd, 10);

        user = await User.create({
          name: name || 'Art Student',
          email: targetEmail,
          password: hashedPassword,
          phone: phone || '',
          role: 'student',
          membershipLevel: isCoursePurchase ? 'General Member' : fullTierLabel,
          rank: isCoursePurchase ? 'General Member' : fullTierLabel,
          membershipExpiresAt,
          points: 100,
          streak: 1,
        });
      }
    }

    if (user && tx) {
      await tx.update({ userId: user.id });
    }

    // 4. If this is an Individual Course Purchase, enroll student in UserCourse
    if (user && resolvedCourseId) {
      try {
        const [uc, created] = await UserCourse.findOrCreate({
          where: { userId: user.id, courseId: resolvedCourseId },
          defaults: {
            userId: user.id,
            courseId: resolvedCourseId,
            status: 'enrolled',
            progress: 0,
          },
        });
        if (!created) {
          await uc.update({ status: 'enrolled' });
        }
      } catch (ucErr) {
        console.error('Error enrolling student in UserCourse:', ucErr);
      }
    }

    // 4b. Installment Plan Handling (if paying via installment)
    let studentInstallmentPlanRecord: any = null;
    if (user && isInstallment) {
      try {
        if (existingPlanId) {
          // Paying an ongoing installment for an existing plan
          studentInstallmentPlanRecord = await StudentInstallmentPlan.findByPk(existingPlanId);
          if (studentInstallmentPlanRecord) {
            const nextPaidCount = (studentInstallmentPlanRecord.paidInstallments || 0) + 1;
            const isCompleted = nextPaidCount >= studentInstallmentPlanRecord.totalInstallments;
            const nextDueDate = isCompleted
              ? null
              : computeNextDueDate(studentInstallmentPlanRecord.frequency || 'monthly', new Date());

            await studentInstallmentPlanRecord.update({
              paidInstallments: nextPaidCount,
              status: isCompleted ? 'completed' : 'active',
              nextDueDate,
              notes: `Paid installment ${nextPaidCount} of ${studentInstallmentPlanRecord.totalInstallments} on ${new Date().toISOString()}`,
            });

            if (isCompleted) {
              await Notification.create({
                userId: user.id,
                title: '🎓 All Installments Completed!',
                message: `Congratulations! You have completed all ${studentInstallmentPlanRecord.totalInstallments} installments for ${studentInstallmentPlanRecord.tierName || resolvedTierName}.`,
                type: 'milestone',
                link: '/student/dashboard',
                isRead: false,
              });
            }
          }
        } else {
          // Starting a brand new installment plan
          let parsedTotal = parseInt(totalInstallments, 10) || 3;
          try {
            const matchedTier = await LevelTier.findOne({ where: { code: resolvedTierCode.trim().toUpperCase() } });
            if (matchedTier && matchedTier.totalInstallments && Number(matchedTier.totalInstallments) >= 2) {
              parsedTotal = Number(matchedTier.totalInstallments);
            }
          } catch (_) {}
          const parsedInstAmount = parseFloat(installmentAmount) || cleanAmount;
          const freq = planFrequency || 'monthly';
          const nextDueDate = parsedTotal > 1 ? computeNextDueDate(freq, new Date()) : null;

          studentInstallmentPlanRecord = await StudentInstallmentPlan.create({
            userId: user.id,
            tierCode: resolvedTierCode,
            tierName: resolvedTierName,
            planId: planId || 'plan_' + Date.now(),
            planName: planName || `${resolvedTierName} Installment`,
            frequency: freq,
            installmentAmount: parsedInstAmount,
            totalInstallments: parsedTotal,
            paidInstallments: 1,
            totalAmount: parsedInstAmount * parsedTotal,
            nextDueDate,
            status: parsedTotal <= 1 ? 'completed' : 'active',
            notes: `Started installment plan on ${new Date().toISOString()}. Paid 1/${parsedTotal}.`,
          });
        }
      } catch (instErr: any) {
        console.error('Error handling student installment plan:', instErr);
      }
    }

    // 5. Log in SalesRecord & create Community Win
    if (user) {
      let displayProductName = isCoursePurchase
        ? `Masterclass: ${resolvedTierName}`
        : `${resolvedTierName} Membership (${resolvedTierCode})`;

      if (isInstallment && studentInstallmentPlanRecord) {
        displayProductName = `${resolvedTierName} (Installment ${studentInstallmentPlanRecord.paidInstallments}/${studentInstallmentPlanRecord.totalInstallments})`;
      }

      try {
        await SalesRecord.create({
          userId: user.id,
          productName: displayProductName,
          amount: cleanAmount,
          date: new Date(),
        });
      } catch (_) {}

      try {
        await CommunityWin.create({
          userId: user.id,
          studentName: user.name,
          title: isCoursePurchase ? `Unlocked Course: ${resolvedTierName}!` : `Unlocked ${resolvedTierName} (${resolvedTierCode})!`,
          story: `${user.name} enrolled in ${resolvedTierName} to master resin art and commercial creations!`,
          badge: isCoursePurchase ? 'Masterclass Enrolled' : `${resolvedTierCode} Member`,
          amount: `₹${cleanAmount.toLocaleString('en-IN')}`,
          avatarUrl: user.avatarUrl || '',
        });
      } catch (_) {}

      try {
        let notifMessage = isCoursePurchase
          ? `You now have full access to ${resolvedTierName}! Enjoy your video lessons in the Course Library.`
          : `Welcome to ${resolvedTierName}! All video lessons and tools for ${resolvedTierCode} are now accessible in your Course Library.`;

        if (isInstallment && studentInstallmentPlanRecord) {
          const dueDateStr = studentInstallmentPlanRecord.nextDueDate
            ? new Date(studentInstallmentPlanRecord.nextDueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'N/A';
          notifMessage = `Installment ${studentInstallmentPlanRecord.paidInstallments}/${studentInstallmentPlanRecord.totalInstallments} for ${resolvedTierName} paid! Next installment due on ${dueDateStr}.`;
        }

        await Notification.create({
          userId: user.id,
          title: `🎉 ${resolvedTierName} Unlocked!`,
          message: notifMessage,
          type: 'milestone',
          read: false,
        });
      } catch (_) {}
    }

    let token = '';
    if (user) {
      token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '30d' }
      );
    }

    return res.status(200).json({
      success: true,
      message: `Payment verified! ${resolvedTierName} unlocked successfully.`,
      tierCode: resolvedTierCode,
      tierName: resolvedTierName,
      courseId: resolvedCourseId || null,
      isCoursePurchase,
      installmentPlan: studentInstallmentPlanRecord,
      paymentId: razorpay_payment_id,
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            membershipLevel: user.membershipLevel,
            role: user.role,
          }
        : null,
      token,
    });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ message: 'Payment verification failed', error: error?.message });
  }
};

// ── GET ALL PAYMENT TRANSACTIONS & STATS (ADMIN) ──
export const getPaymentHistory = async (req: Request, res: Response): Promise<any> => {
  try {
    const { status, search } = req.query;

    const whereClause: any = {};

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    if (search) {
      const searchStr = `%${String(search).trim()}%`;
      whereClause[Op.or] = [
        { customerName: { [Op.iLike]: searchStr } },
        { customerEmail: { [Op.iLike]: searchStr } },
        { orderId: { [Op.iLike]: searchStr } },
        { paymentId: { [Op.iLike]: searchStr } },
        { tierName: { [Op.iLike]: searchStr } },
      ];
    }

    const { page, limit, offset } = (() => {
      const p = Math.max(1, parseInt(String(req.query.page || 1), 10));
      const l = Math.min(200, Math.max(1, parseInt(String(req.query.limit || 50), 10)));
      return { page: p, limit: l, offset: (p - 1) * l };
    })();

    const { count, rows: transactions } = await PaymentTransaction.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    // Compute Summary Stats using SQL aggregates — NOT by loading all rows into JS
    const statsRows: any = await PaymentTransaction.findAll({
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
        [db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('amount')), 0), 'totalAmount'],
      ],
      group: ['status'],
      raw: true,
    });

    let totalRevenue = 0;
    let completedCount = 0;
    let pendingCount = 0;
    let failedCount = 0;
    let totalAttempts = 0;

    for (const row of (statsRows || [])) {
      const c = parseInt(String(row.count || 0), 10);
      const amt = parseFloat(String(row.totalAmount || 0));
      totalAttempts += c;
      if (row.status === 'completed') {
        completedCount += c;
        totalRevenue += amt;
      } else if (row.status === 'pending') {
        pendingCount += c;
      } else if (row.status === 'failed' || row.status === 'cancelled') {
        failedCount += c;
      }
    }

    return res.status(200).json({
      success: true,
      transactions,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      limit,
      stats: {
        totalRevenue,
        completedCount,
        pendingCount,
        failedCount,
        totalAttempts,
      },
    });
  } catch (error: any) {
    console.error('Error fetching payment history:', error);
    return res.status(500).json({ message: 'Failed to fetch payment history', error: error?.message });
  }
};

// ── DELETE TRANSACTION (ADMIN) ──
export const deletePaymentTransaction = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    await PaymentTransaction.destroy({ where: { id } });
    return res.status(200).json({ success: true, message: 'Transaction record deleted' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to delete transaction', error: error?.message });
  }
};

// ── GET CURRENT STUDENT'S ACTIVE INSTALLMENT PLANS ──
export const getMyInstallmentPlans = async (req: any, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Authentication required' });

    const plans = await StudentInstallmentPlan.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({ success: true, plans });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to fetch installment plans', error: err?.message });
  }
};

// ── GET ALL STUDENT INSTALLMENT PLANS (ADMIN) ──
export const getAllStudentInstallmentPlans = async (req: Request, res: Response): Promise<any> => {
  try {
    const plans = await StudentInstallmentPlan.findAll({
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'membershipLevel'] }],
      order: [['nextDueDate', 'ASC'], ['createdAt', 'DESC']],
    });
    return res.status(200).json({ success: true, plans });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to fetch installment plans', error: err?.message });
  }
};

// ── CHECK AND SEND DUE-DATE INSTALLMENT REMINDERS (AUTO/SCHEDULED/ADMIN) ──
export const checkAndSendInstallmentReminders = async (req?: Request, res?: Response): Promise<any> => {
  try {
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const plansToRemind = await StudentInstallmentPlan.findAll({
      where: {
        status: 'active',
        nextDueDate: { [Op.lte]: threeDaysFromNow },
        [Op.or]: [
          { lastReminderSentAt: null },
          { lastReminderSentAt: { [Op.lte]: oneDayAgo } },
        ],
      },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
    });

    let remindersSent = 0;
    for (const plan of plansToRemind) {
      const dueDateStr = plan.nextDueDate
        ? new Date(plan.nextDueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'soon';
      const isOverdue = plan.nextDueDate && new Date(plan.nextDueDate).getTime() < Date.now();

      const title = isOverdue
        ? '⚠️ Level 3 Installment Payment Overdue'
        : '🔔 Level 3 Installment Due Reminder';
      const message = isOverdue
        ? `Your Level 3 installment #${plan.paidInstallments + 1} of ₹${plan.installmentAmount} was due on ${dueDateStr}. Please pay now to avoid access interruption.`
        : `Reminder: Your Level 3 installment #${plan.paidInstallments + 1} of ₹${plan.installmentAmount} is due on ${dueDateStr}. Please complete your payment on time.`;

      await Notification.create({
        userId: plan.userId,
        title,
        message,
        type: isOverdue ? 'alert' : 'info',
        link: '/student/dashboard',
        isRead: false,
      });

      await plan.update({
        lastReminderSentAt: new Date(),
        status: isOverdue ? 'overdue' : 'active',
      });
      remindersSent++;
    }

    if (res) {
      return res.status(200).json({
        success: true,
        message: `Installment scan completed. Sent ${remindersSent} reminder notifications.`,
        remindersSent,
      });
    }
    return remindersSent;
  } catch (err: any) {
    console.error('Error checking installment reminders:', err);
    if (res) return res.status(500).json({ message: 'Failed to process reminders', error: err?.message });
  }
};

// ── MANUAL REMINDER TRIGGER FOR A SPECIFIC PLAN (ADMIN) ──
export const sendManualInstallmentReminder = async (req: Request, res: Response): Promise<any> => {
  try {
    const { planId } = req.params;
    const plan = await StudentInstallmentPlan.findByPk(planId, {
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
    });

    if (!plan) return res.status(404).json({ message: 'Installment plan not found' });

    const dueDateStr = plan.nextDueDate
      ? new Date(plan.nextDueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'soon';

    await Notification.create({
      userId: plan.userId,
      title: '🔔 Level 3 Installment Payment Reminder',
      message: `Friendly reminder from Admin: Your Level 3 installment #${plan.paidInstallments + 1} of ₹${plan.installmentAmount} is scheduled for ${dueDateStr}.`,
      type: 'info',
      link: '/student/dashboard',
      isRead: false,
    });

    await plan.update({ lastReminderSentAt: new Date() });

    return res.status(200).json({
      success: true,
      message: `Reminder sent to ${(plan as any).user?.name || 'student'}!`,
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to send manual reminder', error: err?.message });
  }
};
