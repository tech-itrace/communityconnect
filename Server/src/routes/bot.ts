import { Router } from 'express';
import { handleBotMessage } from '../controllers/botController';

const router = Router();
router.post('/', handleBotMessage);

export default router;
