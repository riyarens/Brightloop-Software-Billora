import { Router } from 'express';
import leakageController from './leakage.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', leakageController.getLeakageReport);
router.get('/alerts', leakageController.getAlerts);

export default router;