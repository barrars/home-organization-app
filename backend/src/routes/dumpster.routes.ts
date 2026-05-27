import { Router } from 'express'
import dumpsterController from '../controllers/dumpster.controller'

const router = Router()

router.get('/', dumpsterController.getAll.bind(dumpsterController))
router.get('/count', dumpsterController.getCount.bind(dumpsterController))
router.post('/items/:id/restore', dumpsterController.restoreItem.bind(dumpsterController))
router.post('/rooms/:id/restore', dumpsterController.restoreRoom.bind(dumpsterController))
router.delete('/items/:id', dumpsterController.destroyItem.bind(dumpsterController))
router.delete('/rooms/:id', dumpsterController.destroyRoom.bind(dumpsterController))
router.delete('/', dumpsterController.springCleaning.bind(dumpsterController))

export default router
