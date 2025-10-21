import { Router } from 'express';
import botRouter from './bot';
import searchRouter from './search';
import membersRouter from './members';
import whatsappRouter from './whatsapp';

const router = Router();

// Existing bot routes
router.use('/messages', botRouter);

// Phase 2: Search and member routes
router.use('/search', searchRouter);
router.use('/members', membersRouter);

// WhatsApp webhook
router.use('/whatsapp', whatsappRouter);

export default router;
