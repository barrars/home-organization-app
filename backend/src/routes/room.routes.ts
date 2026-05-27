import { Router } from 'express'
import roomController from '../controllers/room.controller'

const router = Router()

router.get('/', roomController.getAll.bind(roomController))
router.post('/', roomController.create.bind(roomController))
router.delete('/:id', roomController.remove.bind(roomController))

export default router
