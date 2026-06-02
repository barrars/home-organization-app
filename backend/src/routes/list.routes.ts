import { Router } from 'express'
import listController from '../controllers/list.controller'

const router = Router()

router.get('/', listController.getLists.bind(listController))
router.post('/', listController.createList.bind(listController))
router.get('/for-item/:itemId', listController.getListsForItem.bind(listController))
router.get('/:id', listController.getList.bind(listController))
router.patch('/:id', listController.updateList.bind(listController))
router.delete('/:id', listController.deleteList.bind(listController))
router.post('/:id/items', listController.addItem.bind(listController))
router.delete('/:id/items/:itemId', listController.removeItem.bind(listController))
router.patch('/:id/items/:itemId', listController.updateListItem.bind(listController))

export default router
