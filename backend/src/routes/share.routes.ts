import { Router } from 'express'
import shareController from '../controllers/share.controller'

const router = Router()

router.post('/', shareController.create.bind(shareController))
router.get('/shared-with-me', shareController.sharedWithMe.bind(shareController))
router.get('/shared-by-me', shareController.sharedByMe.bind(shareController))
router.patch('/:id', shareController.update.bind(shareController))
router.delete('/:id', shareController.remove.bind(shareController))

export default router
