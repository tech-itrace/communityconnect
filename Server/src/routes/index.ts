import { Router } from 'express';
import botRouter from './bot';

const router = Router();
router.use('/messages', botRouter);

export default router;
