const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    ign: { type: String, required: true },
    id: { type: String, required: true }
});

const squadSchema = new mongoose.Schema({
    squadName: { type: String, required: true },

    mainMembers: {
        type: [playerSchema],
        validate: [arr => arr.length === 4, 'Exactly 4 main members are required']
    },

    squadLeaderPhone: {
        type: String,
        required: true,
        validate: {
            validator: v => /^[0-9]{10}$/.test(v),
            message: 'Phone number must be 10 digits'
        }
    },

    substitutes: {
        type: [playerSchema],
        validate: [arr => arr.length <= 3, 'Maximum 3 substitutes allowed'],
        default: []
    },

    preferredContactMode: {
        type: String,
        enum: ['WhatsApp', 'Email', 'Phone Call'],
        required: true
    },

    mobileGamesInterested: {
        type: [String],
        enum: [
            'Clash of Clans',
            'Mobile Legends: Bang Bang',
            'BGMI (Battlegrounds Mobile India)',
            'Call of Duty: Mobile',
            'Honor of Kings'
        ],
        default: []
    },

    pcConsoleGamesInterested: {
        type: [String],
        enum: [
            'FIFA / EA FC',
            'Dota 2',
            'Tekken',
            'Counter-Strike 2 (CS2)',
            'Valorant'
        ],
        default: []
    },

    email: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('BGMI', squadSchema);
