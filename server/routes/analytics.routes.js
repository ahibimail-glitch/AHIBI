const express = require('express');
const { protect, authorize } = require('../middlewares/auth');
const { analyticsRateLimit } = require('../middlewares/analyticsRateLimit');
const analyticsController = require('../controllers/analyticsController');

const adminMiddleware = [
  protect,
  authorize('admin'),
  analyticsRateLimit({ windowMs: 60 * 1000, max: 40 }),
];

const organizerMiddleware = [
  protect,
  authorize('organizer'),
  analyticsRateLimit({ windowMs: 60 * 1000, max: 30 }),
];

const artistMiddleware = [
  protect,
  authorize('artist'),
  analyticsRateLimit({ windowMs: 60 * 1000, max: 30 }),
];

const adminRouter = express.Router();

adminRouter.get('/overview', ...adminMiddleware, analyticsController.getOverview);
adminRouter.get('/events', ...adminMiddleware, analyticsController.getEventsList);
adminRouter.get('/events/:eventId', ...adminMiddleware, analyticsController.getEventAnalytics);
adminRouter.get('/artists', ...adminMiddleware, analyticsController.getArtistsList);
adminRouter.get('/artists/:artistId', ...adminMiddleware, analyticsController.getArtistAnalytics);
adminRouter.get('/realtime', ...adminMiddleware, analyticsController.getRealtime);

adminRouter.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Admin analytics route not found: ${req.method} ${req.baseUrl}${req.path}`,
  });
});

const organizerRouter = express.Router();

organizerRouter.get('/overview', ...organizerMiddleware, analyticsController.getOverview);
organizerRouter.get('/events', ...organizerMiddleware, analyticsController.getEventsList);
organizerRouter.get('/events/:eventId', ...organizerMiddleware, analyticsController.getEventAnalytics);

organizerRouter.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Organizer analytics route not found: ${req.method} ${req.baseUrl}${req.path}`,
  });
});

const artistRouter = express.Router();

artistRouter.get('/me', ...artistMiddleware, (req, res) => {
  req.params.artistId = 'me';
  return analyticsController.getArtistAnalytics(req, res);
});
artistRouter.get('/:artistId', ...artistMiddleware, analyticsController.getArtistAnalytics);

artistRouter.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Artist analytics route not found: ${req.method} ${req.baseUrl}${req.path}`,
  });
});

module.exports = {
  adminAnalyticsRoutes: adminRouter,
  organizerAnalyticsRoutes: organizerRouter,
  artistAnalyticsRoutes: artistRouter,
};
