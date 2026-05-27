import { Router } from 'express'
import tagController from '../controllers/tag.controller'

const router = Router()

router.get('/', tagController.getAll.bind(tagController))
router.post('/', tagController.findOrCreate.bind(tagController))

export default router
