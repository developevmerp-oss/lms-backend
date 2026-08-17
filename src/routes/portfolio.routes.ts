import { Router } from 'express';
import { createPortfolio, getPendingPortfolios, reviewPortfolio } from '../controllers/portfolio.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Student creates a new portfolio item
router.post('/', authenticate, authorize(['student']), createPortfolio);

// Admin gets all pending portfolios to review
router.get('/pending', authenticate, authorize(['admin']), getPendingPortfolios);

// Admin submits review and scores for a portfolio item
router.put('/:id/review', authenticate, authorize(['admin']), reviewPortfolio);

export default router;
