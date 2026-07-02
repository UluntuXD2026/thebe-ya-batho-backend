const mongoose = require("mongoose")

const ContactRequestSchema = new mongoose.Schema({
    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false
    },
    toNumber: {
        type: String,
        required: false
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending"
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    appUser: {
        type: Boolean,
        default: true
    }
})

module.exports = mongoose.model("ContactRequest", ContactRequestSchema)