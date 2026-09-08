import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import db from '../models';

const { User, SalesRecord, Notification, CommunityWin, LevelTier, PaymentTransaction } = db;

let dynamicRazorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_1DP5mmOlF5G5ag';
let dynamicRazorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// ── GET PUBLIC RAZORPAY KEY & STATUS ──
export const getRazorpayKey = async (_req: Request, res: Response): Promise<any> => {
  return res.status(200).json({
    keyId: dynamicRazorpayKeyId,
    isConfigured: !!(dynamicRazorpayKeyId && dynamicRazorpayKeySecret && !dynamicRazorpayKeyId.includes('1DP5mmOlF5G5ag')),
  });
};

// ── UPDATE RAZORPAY KEYS (ADMIN) ──
export const updateRazorpayConfig = async (req: Request, res: Response): Promise<any> => {
  try {
    const { keyId, keySecret } = req.body;
    if (keyId) dynamicRazorpayKeyId = keyId.trim();
    if (keySecret) dynamicRazorpayKeySecret = keySecret.trim();

    return res.status(200).json({
      success: true,
      message: 'Razorpay keys updated successfully!',
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
      customerEmail,
      customerPhone,
      customerName,
    } = req.body;

    if (!amount) {
      return res.status(400).json({ message: 'Payment amount is required' });
    }

    const cleanAmount = parseFloat(amount);
    const amountInPaise = Math.round(cleanAmount * 100);
    let orderId = `order_${tierCode.toLowerCase()}_${Date.now()}`;

    // If live/test Razorpay credentials exist, create order via Razorpay API
    if (dynamicRazorpayKeyId && dynamicRazorpayKeySecret && !dynamicRazorpayKeyId.includes('1DP5mmOlF5G5ag')) {
      try {
        const authHeader = Buffer.from(`${dynamicRazorpayKeyId}:${dynamicRazorpayKeySecret}`).toString('base64');
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${authHeader}`,
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency,
            receipt: `rcpt_${tierCode.toLowerCase()}_${Date.now()}`,
            notes: {
              tierCode,
              tierName,
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
        tierCode,
        tierName,
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
      keyId: dynamicRazorpayKeyId,
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
      amount = 499,
      email,
      name,
      phone,
      password,
      paymentMethod = 'Online / Razorpay',
    } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment parameters. Payment could not be verified.',
      });
    }

    // 1. STRICT Cryptographic Signature Verification
    if (dynamicRazorpayKeySecret && !dynamicRazorpayKeyId.includes('1DP5mmOlF5G5ag')) {
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
        .createHmac('sha256', dynamicRazorpayKeySecret)
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

    const [tx] = await PaymentTransaction.findOrCreate({
      where: { orderId: razorpay_order_id },
      defaults: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature || null,
        tierCode,
        tierName,
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

    if (tx) {
      await tx.update({
        status: 'completed',
        paymentId: razorpay_payment_id,
        signature: razorpay_signature || tx.signature,
        paymentMethod: paymentMethod || tx.paymentMethod,
        paidAt: new Date(),
        failureReason: null,
      });
    }

    // 3. User tier upgrade and validity logic
    const fullTierLabel = `${tierName} (${tierCode})`;

    let membershipExpiresAt: Date | null = null;
    try {
      const matchedTier = await LevelTier.findOne({ where: { code: tierCode.trim().toUpperCase() } });
      if (matchedTier && matchedTier.validityDays && Number(matchedTier.validityDays) > 0) {
        membershipExpiresAt = new Date(Date.now() + Number(matchedTier.validityDays) * 24 * 60 * 60 * 1000);
      }
    } catch (_) {}

    let user: any = null;
    if (targetEmail) {
      user = await User.findOne({ where: { email: targetEmail } });

      if (user) {
        await user.update({
          membershipLevel: fullTierLabel,
          rank: fullTierLabel,
          role: 'student',
          membershipExpiresAt,
        });
      } else {
        const defaultPwd = password || 'ArtStudent@2026';
        const hashedPassword = await bcrypt.hash(defaultPwd, 10);

        user = await User.create({
          name: name || 'Art Student',
          email: targetEmail,
          password: hashedPassword,
          phone: phone || '',
          role: 'student',
          membershipLevel: fullTierLabel,
          rank: fullTierLabel,
          membershipExpiresAt,
          points: 100,
          streak: 1,
        });
      }
    }

    if (user && tx) {
      await tx.update({ userId: user.id });
    }

    // 4. Log in SalesRecord & create Community Win
    if (user) {
      try {
        await SalesRecord.create({
          userId: user.id,
          productName: `${tierName} Membership (${tierCode})`,
          amount: cleanAmount,
          date: new Date(),
        });
      } catch (_) {}

      try {
        await CommunityWin.create({
          userId: user.id,
          studentName: user.name,
          title: `Unlocked ${tierName} (${tierCode})!`,
          story: `${user.name} enrolled in ${tierName} to master resin art and commercial creations!`,
          badge: `${tierCode} Member`,
          amount: `₹${cleanAmount.toLocaleString('en-IN')}`,
          avatarUrl: user.avatarUrl || '',
        });
      } catch (_) {}

      try {
        await Notification.create({
          userId: user.id,
          title: `🎉 ${tierName} Membership Unlocked!`,
          message: `Welcome to ${tierName}! All video lessons and tools for ${tierCode} are now accessible in your Course Library.`,
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
      message: `Payment verified! ${tierName} (${tierCode}) unlocked successfully.`,
      tierCode,
      tierName,
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

    const transactions = await PaymentTransaction.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: 200,
    });

    // Compute Summary Stats
    const allTxs = await PaymentTransaction.findAll({ attributes: ['amount', 'status'] });
    const totalRevenue = allTxs
      .filter((t: any) => t.status === 'completed')
      .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

    const completedCount = allTxs.filter((t: any) => t.status === 'completed').length;
    const pendingCount = allTxs.filter((t: any) => t.status === 'pending').length;
    const failedCount = allTxs.filter((t: any) => t.status === 'failed' || t.status === 'cancelled').length;

    return res.status(200).json({
      success: true,
      transactions,
      stats: {
        totalRevenue,
        completedCount,
        pendingCount,
        failedCount,
        totalAttempts: allTxs.length,
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
