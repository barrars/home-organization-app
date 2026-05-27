import { Router } from 'express'
import itemController from '../controllers/inventory.controller'

const router = Router()

router.get('/', itemController.getAll.bind(itemController))
router.get('/search', itemController.search.bind(itemController))
router.get('/counts-by-room', itemController.countsByRoom.bind(itemController))
router.post('/', itemController.create.bind(itemController))
router.post('/bulk-insert', itemController.bulkInsert.bind(itemController))
router.patch('/:id', itemController.patch.bind(itemController))
router.delete('/:id', itemController.remove.bind(itemController))

export default router
