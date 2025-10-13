const mongoose = require('mongoose');

const SocialPlatformSchema = new mongoose.Schema(
	{
		platform: { type: String, required: true },
		handle: { type: String, required: true },
		profileUrl: { type: String, required: true },
		followerCount: { type: Number, required: true, min: 0 },
		isPrimary: { type: Boolean, default: false },
		engagementRate: { type: Number },
	},
	{ _id: false }
);

const TopContentSchema = new mongoose.Schema(
	{
		title: { type: String, required: true },
		platform: { type: String, required: true },
		url: { type: String, required: true },
		type: { type: String, required: true },
		views: { type: Number, default: 0 },
		likes: { type: Number, default: 0 },
		shares: { type: Number, default: 0 },
		comments: { type: Number, default: 0 },
	},
	{ _id: false }
);

const BrandCollaborationSchema = new mongoose.Schema(
	{
		brandName: { type: String, required: true },
		campaignTitle: { type: String, required: true },
		year: { type: String, required: true },
		type: { type: String, required: true },
		description: { type: String },
	},
	{ _id: false }
);

const ConsentsSchema = new mongoose.Schema(
	{
		accuracy: { type: Boolean, required: true },
		terms: { type: Boolean, required: true },
		dataUsage: { type: Boolean, required: true },
		emailCopy: { type: Boolean, default: false },
	},
	{ _id: false }
);

const NISRegistrationSchema = new mongoose.Schema(
	{
		registrationId: { type: String, unique: true, index: true },
		// Personal Info
		fullName: { type: String, required: true },
		creatorName: { type: String, required: true },
		email: { type: String, required: true, index: true },
		mobileNumber: { type: String, required: true },
		dateOfBirth: { type: String, required: true },
		gender: { type: String, required: true },
		bio: { type: String, required: true, minlength: 50 },
		nagalandResident: { type: Boolean, required: true },

		// Social Media
		platforms: { type: [SocialPlatformSchema], default: [] },
		totalFollowers: { type: Number, required: true, min: 0 },

		// Content Portfolio
		topContent: { type: [TopContentSchema], default: [] },
		analyticsFileUrl: { type: String },

		// Category & Experience
		contentNiches: { type: [String], default: [] },
		customNiches: { type: [String], default: [] },
		awardCategories: { 
			type: [String], 
			default: [],
			validate: {
				validator: function(arr) {
					return Array.isArray(arr) && arr.length > 0 && arr.length <= 3;
				},
				message: 'Select between 1 and 3 award categories'
			}
		},
		campusName: { 
			type: String,
			required: function() {
				return Array.isArray(this.awardCategories) && this.awardCategories.includes('campus-voice');
			}
		},
		yearsActive: { type: Number, required: true, min: 0 },
		achievements: { type: String },
		brandCollaborations: { type: [BrandCollaborationSchema], default: [] },

		// Consent
		consents: { type: ConsentsSchema, required: true },
	},
	{ timestamps: true }
);

// Pre-save hook to generate registrationId if missing
NISRegistrationSchema.pre('save', function (next) {
	if (!this.registrationId) {
		const rand = Math.random().toString(36).substr(2, 9).toUpperCase();
		this.registrationId = `NIS2025-${rand}`;
	}
	next();
});

module.exports = mongoose.model('NISRegistration', NISRegistrationSchema);


