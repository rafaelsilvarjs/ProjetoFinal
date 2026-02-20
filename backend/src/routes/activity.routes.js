const router = require('express').Router()
const controller = require('../controllers/activity.controller')
const auth = require('../middleware/auth.middleware')

router.get('/public', controller.publicList)
router.get('/teacher/stats', auth, controller.teacherStats)
router.get('/student/history', auth, controller.studentHistory)
router.post('/preview', auth, controller.preview)
router.post('/generate', auth, controller.generate)
router.get('/', auth, controller.list)
router.post('/:id/submit', auth, controller.submitAnswers)
router.delete('/:id', auth, controller.remove)

module.exports = router
