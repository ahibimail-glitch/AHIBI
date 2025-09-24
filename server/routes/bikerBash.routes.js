const express = require('express');
const router = express.Router();
const {
  getAllBikerBashRegistrations,
  getBikerBashRegistrationById,
  getBikerBashRegistrationsByEvent,
  updateBikerBashStatus,
  getBikerBashStatistics,
  exportBikerBashRegistrations
} = require('../controllers/bikerBashController');
const { protect, adminOnly } = require('../middlewares/auth');

// Apply admin authentication to all routes
router.use(protect);
router.use(adminOnly);

// Get all BikerBash registrations with pagination
router.get('/', getAllBikerBashRegistrations);

// Get BikerBash statistics
router.get('/statistics', getBikerBashStatistics);

// Export BikerBash registrations to CSV
router.get('/export', exportBikerBashRegistrations);

// Get BikerBash registrations by event ID
router.get('/event/:eventId', getBikerBashRegistrationsByEvent);

// Get BikerBash registration by ID
router.get('/:id', getBikerBashRegistrationById);

// Update BikerBash registration status
router.patch('/:id/status', updateBikerBashStatus);

module.exports = router;
