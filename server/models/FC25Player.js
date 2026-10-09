const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    fullName: { 
        type: String, 
        required: true,
        trim: true
    },
    
    gender: { 
        type: String, 
        enum: ['Male', 'Female'],
        required: true 
    },
    
    phone: {
        type: String,
        required: true,
        validate: {
            validator: v => /^[0-9]{10}$/.test(v),
            message: 'Phone number must be 10 digits'
        }
    },
    
    choice_of_controller: {
        type: String,
        enum: ['PS5', 'Xbox', 'Keyboard'],
        required: true
    },
    
    photo: {
        type: String, // This will store the file path or URL to the uploaded image
        required: true
    },
    
    // Additional fields for tournament management
    registrationStatus: {
        type: String,
        enum: ['pending', 'confirmed', 'rejected'],
        default: 'pending'
    },
    

    
   
    
}, { 
    timestamps: true 
});

// Add indexes for better query performance
playerSchema.index({ phone: 1 }, { unique: true }); // Prevent duplicate phone numbers
playerSchema.index({ fullName: 1 });
playerSchema.index({ registrationStatus: 1 });

// Virtual for getting registration date in a formatted way
playerSchema.virtual('registrationDate').get(function() {
    return this.createdAt.toDateString();
});

// Pre-save middleware to format phone number
playerSchema.pre('save', function(next) {
    // Remove any non-digit characters from phone
    this.phone = this.phone.replace(/\D/g, '');
    
    // Capitalize full name
    this.fullName = this.fullName.replace(/\b\w/g, l => l.toUpperCase());
    
    next();
});

// Static method to get registration stats
playerSchema.statics.getRegistrationStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: '$registrationStatus',
                count: { $sum: 1 }
            }
        }
    ]);
};

// Static method to get controller preferences
playerSchema.statics.getControllerStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: '$choice_of_controller',
                count: { $sum: 1 }
            }
        }
    ]);
};

// Instance method to confirm registration
playerSchema.methods.confirmRegistration = function() {
    this.registrationStatus = 'confirmed';
    return this.save();
};

module.exports = mongoose.model('FC25Player', playerSchema);