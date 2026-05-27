import { Router } from 'express'
import categoryController from '../controllers/category.controller'

const router = Router()

router.get('/', categoryController.getAll.bind(categoryController))
router.post('/', categoryController.findOrCreate.bind(categoryController))

export default router
