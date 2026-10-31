import { Router } from 'express';
import invoiceController from './invoice.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', invoiceController.getInvoices);
router.get('/:id', invoiceController.getInvoiceById);

export default router;