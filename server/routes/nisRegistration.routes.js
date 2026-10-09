const express = require('express');
const router = express.Router();
const controller = require('../controllers/nisRegistrationController');

// For optional file upload later, we can reuse existing upload middleware if needed
// const { upload } = require('../middlewares/uploadMiddleware');

router.post('/', controller.createRegistration);
router.get('/', controller.listRegistrations);
router.get('/valid-niches', controller.getValidContentNiches);
router.get('/:id', controller.getRegistrationById);

module.exports = router;


