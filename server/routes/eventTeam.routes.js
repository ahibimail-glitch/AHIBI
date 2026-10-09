const express = require('express');
const { check } = require('express-validator');
const eventTeamController = require('../controllers/eventTeamController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.get('/invites', protect, eventTeamController.getMyInvites);
router.get('/invites/token/:token', protect, eventTeamController.getInviteByToken);
router.get('/events', protect, eventTeamController.getMyEvents);
router.get('/events/:eventId', protect, eventTeamController.getEventForMember);
router.patch('/events/:eventId/checklists/:checklistId/items/:itemId', protect, eventTeamController.updateChecklistItemForMember);
router.patch('/events/:eventId/tasks/:taskId', protect, eventTeamController.updateTaskForMember);
router.post('/events/:eventId/incidents', protect, eventTeamController.createIncidentForMember);
router.get('/access/:eventId', protect, eventTeamController.checkEventAccess);
router.post('/invites/:inviteId/accept', protect, eventTeamController.acceptInvite);
router.post('/invites/token/:token/accept', protect, eventTeamController.acceptInviteByToken);
router.post('/invites/:inviteId/decline', protect, eventTeamController.declineInvite);

module.exports = router;
