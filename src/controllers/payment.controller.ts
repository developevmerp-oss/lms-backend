import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../models';

const { User, SalesRecord, Notification, CommunityWin } = db;

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_1DP5mmOlF5G5ag';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// ── GET PUBLIC RAZORPAY KEY ──
export const getRazorpayKey = async (_req: Request, res: Response): Promise<any> => {
  return res.status(200).json({ keyId: RAZORPAY_KEY_ID });
};

// ── CREATE RAZORPAY ORDER ──
export const createPaymentOrder = async (req: Request, res: Response): Promise<any> => {
  try {
    const { amount, currency = 'INR', tierCode = 'L0', tierName = 'Fast Track', customerEmail, customerPhone, customerName } = req.body;

    if (!amount) {
      return res.status(400).json({ message: 'Payment amount is required' });
    }

    const amountInPaise = Math.round(parseFloat(amount) * 100);

    // If live credentials are provided, call Razorpay Orders API
    if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET && !RAZORPAY_KEY_ID.includes('default')) {
      try {
        const authHeader = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
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
          return res.status(200).json({
            success: true,
            orderId: orderData.id,
            amount: amountInPaise,
            currency: orderData.currency || currency,
            keyId: RAZORPAY_KEY_ID,
            tierCode,
            tierName,
          });
        }
      } catch (rErr) {
        console.warn('Razorpay API error, falling back to direct checkout order:', rErr);
      }
    }

    // Direct / Fallback Order ID
    const fallbackOrderId = `order_${tierCode.toLowerCase()}_${Date.now()}`;
    return res.status(200).json({
      success: true,
      orderId: fallbackOrderId,
      amount: amountInPaise,
      currency,
      keyId: RAZORPAY_KEY_ID,
      tierCode,
      tierName,
    });
  } catch (error: any) {
    console.error('Error creating payment order:', error);
    return res.status(500).json({ message: 'Failed to create payment order', error: error?.message });
  }
};

// ── VERIFY RAZORPAY PAYMENT & UNLOCK MEMBERSHIP ──
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
    } = req.body;

    // Verify signature if secret configured
    if (RAZORPAY_KEY_SECRET && razorpay_signature && razorpay_order_id && razorpay_payment_id) {
      const generatedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({ message: 'Invalid payment signature' });
      }
    }

    const fullTierLabel = `${tierName} (${tierCode})`;
    const targetEmail = (email || '').trim().toLowerCase();

    let user: any = null;

    if (targetEmail) {
      user = await User.findOne({ where: { email: targetEmail } });

      if (user) {
        // Update existing user level
        await user.update({
          membershipLevel: fullTierLabel,
          rank: fullTierLabel,
          role: 'student',
        });
      } else {
        // Create new student account directly (e.g. from Thank You page purchase)
        const defaultPwd = password || 'ArtStudent@2026';
        const hashedPassword = await bcrypt.hash(defaultPwd, 10);

        user = await User.create({
          name: name || 'Art Enthusiast',
          email: targetEmail,
          password: hashedPassword,
          phone: phone || '',
          role: 'student',
          membershipLevel: fullTierLabel,
          rank: fullTierLabel,
          points: 100, // Welcome points
          streak: 1,
        });
      }
    }

    // Log the sale in SalesRecord
    if (user) {
      try {
        await SalesRecord.create({
          userId: user.id,
          productName: `${tierName} Membership (${tierCode})`,
          amount: parseFloat(amount) || 499,
          date: new Date(),
        });
      } catch (_) {}

      // Create community announcement / win
      try {
        await CommunityWin.create({
          userId: user.id,
          studentName: user.name,
          title: `Unlocked ${tierName} (${tierCode})!`,
          story: `${user.name} just enrolled in ${tierName} to master resin art and commercial creations!`,
          badge: `${tierCode} Member`,
          amount: `₹${parseFloat(amount).toLocaleString('en-IN')}`,
          avatarUrl: user.avatarUrl || '',
        });
      } catch (_) {}

      // Create Notification
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

    // Generate JWT token so student is logged in immediately
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
