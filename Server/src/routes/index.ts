import { Router } from 'express';
import botRouter from './bot';
import searchRouter from './search';
import membersRouter from './members';
import whatsappRouter from './whatsapp';
import { getRedisHealth } from '../config/redis';

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
router.use('/members', membersRouter);

// WhatsApp webhook
router.use('/whatsapp', whatsappRouter);

export default router;
