import { Router } from 'express';
import listRoutes from './list.js';
import crudRoutes from './crud.js';
import workflowRoutes from './workflow.js';
import templatesRoutes from './templates.js';
import guestRoutes from './guest.js';

const router = Router();

// Assemble the routes
// Note: order matters. Specific routes should be registered before parameterized ones like /:id
// /api/tickets/guest goes first so it isn't caught by /:id
router.use('/', guestRoutes);
router.use('/', listRoutes);
router.use('/', workflowRoutes);
router.use('/templates', templatesRoutes);
router.use('/', crudRoutes); // CRUD comes last since it has /:id which is a catch-all

export default router;
