import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { validate } from '../middlewares/validation.middleware';
import { createUserSchema, listUsersQuerySchema, updateUserSchema, userIdParamSchema } from '../schemas/user.schema';

const router = Router();

router.post('/', validate(createUserSchema, 'body'), userController.create);
router.get('/', validate(listUsersQuerySchema, 'query'), userController.list);
router.get('/:id', validate(userIdParamSchema, 'params'), userController.getById);
router.patch('/:id', validate(userIdParamSchema, 'params'), validate(updateUserSchema, 'body'), userController.update);
router.delete('/:id', validate(userIdParamSchema, 'params'), userController.delete);

export default router;
