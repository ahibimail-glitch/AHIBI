const express = require('express');
const { protect, authorize } = require('../middlewares/auth');
const { analyticsRateLimit } = require('../middlewares/analyticsRateLimit');
const analyticsController = require('../controllers/analyticsController');

const adminRouter = express.Router();
adminRouter.use(protect);
adminRouter.use(authorize('admin'));
adminRouter.use(analyticsRateLimit({ windowMs: 60 * 1000, max: 40 }));

adminRouter.get('/overview', analyticsController.getOverview);
adminRouter.get('/events', analyticsController.getEventsList);
adminRouter.get('/events/:eventId', analyticsController.getEventAnalytics);
adminRouter.get('/artists', analyticsController.getArtistsList);
adminRouter.get('/artists/:artistId', analyticsController.getArtistAnalytics);
adminRouter.get('/realtime', analyticsController.getRealtime);

const organizerRouter = express.Router();
organizerRouter.use(protect);
organizerRouter.use(authorize('organizer'));
organizerRouter.use(analyticsRateLimit({ windowMs: 60 * 1000, max: 30 }));

organizerRouter.get('/overview', analyticsController.getOverview);
organizerRouter.get('/events', analyticsController.getEventsList);
organizerRouter.get('/events/:eventId', analyticsController.getEventAnalytics);

const artistRouter = express.Router();
artistRouter.use(protect);
artistRouter.use(authorize('artist'));
artistRouter.use(analyticsRateLimit({ windowMs: 60 * 1000, max: 30 }));

artistRouter.get('/me', (req, res) => {
  req.params.artistId = 'me';
  return analyticsController.getArtistAnalytics(req, res);
});
artistRouter.get('/:artistId', analyticsController.getArtistAnalytics);

module.exports = {
  adminAnalyticsRoutes: adminRouter,
  organizerAnalyticsRoutes: organizerRouter,
  artistAnalyticsRoutes: artistRouter,
};
