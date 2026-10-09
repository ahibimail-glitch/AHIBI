const cloudinary = require('cloudinary').v2;

// Validate environment variables
const requiredEnvVars = {
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET
};

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

if (missingVars.length > 0) {
    console.error('❌ Missing Cloudinary environment variables:', missingVars);
    console.error('Please set the following environment variables in your .env file:');
    missingVars.forEach(varName => {
        console.error(`  ${varName}=your_${varName.toLowerCase()}_here`);
    });
} else {
    console.log('✅ Cloudinary environment variables found');
    console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
}

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload photo to Cloudinary
const uploadPhoto = async (file, folder = 'ahibi', options = {}) => {
    try {
        const uploadOptions = {
            folder,
            resource_type: 'image',
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            transformation: [
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ],
            ...options
        };

        // Convert buffer to base64 for Cloudinary upload
        const b64 = Buffer.from(file.buffer).toString('base64');
        let dataURI = 'data:' + file.mimetype + ';base64,' + b64;

        const result = await cloudinary.uploader.upload(dataURI, uploadOptions);

        return {
            public_id: result.public_id,
            url: result.secure_url,
            width: result.width,
            height: result.height,
            format: result.format,
            size: result.bytes,
            created_at: result.created_at
        };
    } catch (error) {
        throw new Error(`Upload failed: ${error.message}`);
    }
};

// Upload document (e.g., PDF) to Cloudinary as raw resource
const uploadDocument = async (file, folder = 'ahibi/documents', options = {}) => {
    try {
        const uploadOptions = {
            folder,
            resource_type: 'raw',
            allowed_formats: ['pdf'],
            ...options
        };

        const b64 = Buffer.from(file.buffer).toString('base64');
        const dataURI = 'data:' + file.mimetype + ';base64,' + b64;

        const result = await cloudinary.uploader.upload(dataURI, uploadOptions);

        return {
            public_id: result.public_id,
            url: result.secure_url,
            format: result.format,
            size: result.bytes,
            created_at: result.created_at
        };
    } catch (error) {
        throw new Error(`Document upload failed: ${error.message}`);
    }
};

// Upload multiple photos
const uploadMultiplePhotos = async (files, folder = 'ahibi', options = {}) => {
    try {
        const uploadPromises = files.map(file => uploadPhoto(file, folder, options));
        const results = await Promise.all(uploadPromises);
        return results;
    } catch (error) {
        throw new Error(`Multiple upload failed: ${error.message}`);
    }
};

// Delete photo from Cloudinary
const deletePhoto = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        throw new Error(`Delete failed: ${error.message}`);
    }
};

// Get photo info
const getPhotoInfo = async (publicId) => {
    try {
        const result = await cloudinary.api.resource(publicId);
        return {
            public_id: result.public_id,
            url: result.secure_url,
            width: result.width,
            height: result.height,
            format: result.format,
            size: result.bytes,
            created_at: result.created_at
        };
    } catch (error) {
        throw new Error(`Get info failed: ${error.message}`);
    }
};

// Generate optimized URL with transformations
const getOptimizedUrl = (publicId, options = {}) => {
    const defaultOptions = {
        quality: 'auto:good',
        fetch_format: 'auto',
        ...options
    };

    return cloudinary.url(publicId, defaultOptions);
};

// Generate thumbnail URL
const getThumbnailUrl = (publicId, width = 300, height = 300) => {
    return cloudinary.url(publicId, {
        width,
        height,
        crop: 'fill',
        quality: 'auto:good',
        fetch_format: 'auto'
    });
};

// Generate responsive image URLs
const getResponsiveUrls = (publicId) => {
    return {
        thumbnail: getThumbnailUrl(publicId, 150, 150),
        small: getThumbnailUrl(publicId, 300, 300),
        medium: getThumbnailUrl(publicId, 600, 600),
        large: getThumbnailUrl(publicId, 1200, 1200),
        original: cloudinary.url(publicId, { quality: 'auto:good' })
    };
};

module.exports = {
    cloudinary,
    uploadPhoto,
    uploadDocument,
    uploadMultiplePhotos,
    deletePhoto,
    getPhotoInfo,
    getOptimizedUrl,
    getThumbnailUrl,
    getResponsiveUrls
}; 