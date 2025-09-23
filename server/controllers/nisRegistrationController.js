const NISRegistration = require('../models/NISRegistration');
const ApiResponse = require('../utils/apiResponse');

// Valid content niches - original categories plus others option
const VALID_CONTENT_NICHES = [
	'lifestyle',
	'fashion-beauty',
	'food',
	'travel',
	'fitness',
	'technology',
	'education',
	'entertainment',
	'music',
	'photography',
	'art',
	'business',
	'health-wellness',
	'gaming',
	'others'
];

exports.createRegistration = async (req, res, next) => {
	try {
		const payload = req.body;

		// Backward compatibility: map legacy single field to new array
		if ((!Array.isArray(payload.awardCategories) || payload.awardCategories.length === 0) && payload.awardCategory) {
			payload.awardCategories = [payload.awardCategory];
		}

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
		if (!Array.isArray(payload.contentNiches) || payload.contentNiches.length === 0) {
			return ApiResponse.badRequest(res, 'Category and experience requirements not met');
		}

		// Validate award categories (1 to 3)
		if (!Array.isArray(payload.awardCategories) || payload.awardCategories.length === 0 || payload.awardCategories.length > 3) {
			return ApiResponse.badRequest(res, 'Select between 1 and 3 award categories');
		}

		// Campus name required if campus-voice selected
		if (payload.awardCategories.includes('campus-voice')) {
			if (!payload.campusName || String(payload.campusName).trim() === '') {
				return ApiResponse.badRequest(res, 'Campus name is required for Campus Voice category');
			}
		}
		
		// Validate content niches against allowed values
		const invalidNiches = payload.contentNiches.filter(niche => !VALID_CONTENT_NICHES.includes(niche));
		if (invalidNiches.length > 0) {
			return ApiResponse.badRequest(res, `Invalid content niches: ${invalidNiches.join(', ')}`);
		}
		
		// Validate custom niches if "others" is selected
		if (payload.contentNiches.includes('others')) {
			if (!Array.isArray(payload.customNiches) || payload.customNiches.length === 0) {
				return ApiResponse.badRequest(res, 'Custom niches are required when "Others" is selected');
			}
			
			// Validate that all custom niches are non-empty strings
			const emptyCustomNiches = payload.customNiches.filter(niche => !niche || niche.trim() === '');
			if (emptyCustomNiches.length > 0) {
				return ApiResponse.badRequest(res, 'All custom niches must be non-empty');
			}
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
		// Ensure response includes awardCategories for legacy docs
		const json = doc.toObject();
		if ((!Array.isArray(json.awardCategories) || json.awardCategories.length === 0) && json.awardCategory) {
			json.awardCategories = [json.awardCategory];
		}
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
		// Map legacy records to include awardCategories
		const mapped = docs.map(d => {
			const o = d.toObject();
			if ((!Array.isArray(o.awardCategories) || o.awardCategories.length === 0) && o.awardCategory) {
				o.awardCategories = [o.awardCategory];
			}
			return o;
		});
		return ApiResponse.success(res, 'Registrations list', { docs: mapped, total });
	} catch (err) {
		next(err);
	}
};

exports.getValidContentNiches = async (req, res, next) => {
	try {
		return ApiResponse.success(res, 'Valid content niches', VALID_CONTENT_NICHES);
	} catch (err) {
		next(err);
	}
};


