const mongoose = require("mongoose");

const EmergencyAlertSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    type: {
        type: String,
        enum: ["police", "ambulance", "fire", "help", "other"],
        required: true
    },

    location: {
        lat: Number,
        lng: Number
    },

    status: {
        type: String,
        enum: ["active", "resolved"],
        default: "active"
    }
}, {timestamps: true})

module.exports = mongoose.model("EmergencyAlert", EmergencyAlertSchema)