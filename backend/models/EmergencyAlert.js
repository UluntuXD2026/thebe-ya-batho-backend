const mongoose = require("mongoose");

const EmergencyAlertSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["sickness", "crime", "accident", "violence", "other"],
      required: true,
    },

    description: {
      type: String,
    },

    location: {
      lat: Number,
      lng: Number,
    },

    status: {
      type: String,
      enum: ["active", "resolved"],
      default: "active",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("EmergencyAlert", EmergencyAlertSchema);
