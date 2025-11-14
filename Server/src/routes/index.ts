import { Router } from 'express';
import botRouter from './bot';
import searchRouter from './search';
import membersRouter from './members';
import whatsappRouter from './whatsapp';
import adminRouter from './admin';
import groupsRouter from './groups';
import analyticsRouter from './analytics';
import { getRedisHealth } from '../config/redis';
import usersRouter from './users';

const router = Router();

// Health check endpoint (includes Redis status)
router.get('/health', async (req, res) => {
    const redisHealth = await getRedisHealth();

    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        redis: redisHealth
    });
});

// Existing bot routes
router.use('/messages', botRouter);

// Phase 2: Search and member routes
router.use('/search', searchRouter);
router.use('/groups', groupsRouter)
router.use('/members', membersRouter);

// Admin routes (Phase 2: Day 5)
router.use('/admin', adminRouter);

// Analytics routes (Phase 2: Day 5)
router.use('/analytics', analyticsRouter);

// WhatsApp webhook
router.use('/whatsapp', whatsappRouter);

// Login
router.use('/users', usersRouter);


export default router;
