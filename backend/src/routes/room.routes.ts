import { Router } from 'express'
import roomController from '../controllers/room.controller'

const router = Router()

router.get('/', roomController.getAll.bind(roomController))
router.post('/', roomController.create.bind(roomController))
router.patch('/:id', roomController.update.bind(roomController))
router.delete('/:id', roomController.remove.bind(roomController))

export default router
