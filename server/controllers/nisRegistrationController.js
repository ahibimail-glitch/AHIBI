const NISRegistration = require('../models/NISRegistration');
const ApiResponse = require('../utils/apiResponse');

exports.createRegistration = async (req, res, next) => {
	try {
		const payload = req.body;

		// Basic backend validation mirroring frontend step checks
		if (!payload.fullName || !payload.creatorName || !payload.dateOfBirth || !payload.gender) {
			return ApiResponse.badRequest(res, 'Missing required personal information');
		}
		if (!payload.bio || payload.bio.length < 50 || !payload.nagalandResident) {
			return ApiResponse.badRequest(res, 'Eligibility criteria not met');
		}
		if (!Array.isArray(payload.platforms) || payload.platforms.length === 0 || (payload.totalFollowers ?? 0) < 4000) {
			return ApiResponse.badRequest(res, 'Social presence requirements not met');
		}
		if (!Array.isArray(payload.topContent) || payload.topContent.length < 3) {
			return ApiResponse.badRequest(res, 'At least 3 top content items required');
		}
		if (!Array.isArray(payload.contentNiches) || payload.contentNiches.length === 0 || !payload.awardCategory) {
			return ApiResponse.badRequest(res, 'Category and experience requirements not met');
		}
		if (!payload.consents || !payload.consents.accuracy || !payload.consents.terms || !payload.consents.dataUsage) {
			return ApiResponse.badRequest(res, 'Required consents not provided');
		}

        const created = await NISRegistration.create({
			...payload,
			analyticsFileUrl: req.file?.path || payload.analyticsFileUrl,
		});

		return ApiResponse.success(res, 'Registration submitted', created, 201);
    } catch (err) {
        // Handle duplicate key (e.g., unique email or registrationId)
        if (err && err.code === 11000) {
			const field = (err.keyPattern && Object.keys(err.keyPattern)[0]) || 'field';
			return ApiResponse.error(res, `A registration with this ${field} already exists`, {}, 409);
        }
        next(err);
	}
};

exports.getRegistrationById = async (req, res, next) => {
	try {
		const { id } = req.params;
		const doc = await NISRegistration.findById(id);
		if (!doc) return ApiResponse.notFound(res, 'Registration not found');
		return ApiResponse.success(res, 'Registration fetched', doc);
	} catch (err) {
		next(err);
	}
};

exports.listRegistrations = async (req, res, next) => {
	try {
		const { page = 1, limit = 20, search } = req.query;
		const query = {};
		if (search) {
			query.$or = [
				{ fullName: new RegExp(search, 'i') },
				{ creatorName: new RegExp(search, 'i') },
				{ email: new RegExp(search, 'i') },
				{ registrationId: new RegExp(search, 'i') },
			];
		}
		const docs = await NISRegistration.find(query)
			.sort({ createdAt: -1 })
			.skip((Number(page) - 1) * Number(limit))
			.limit(Number(limit));
		const total = await NISRegistration.countDocuments(query);
		return ApiResponse.success(res, 'Registrations list', { docs, total });
	} catch (err) {
		next(err);
	}
};


