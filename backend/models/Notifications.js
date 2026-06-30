const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["emergency", "system", "contact-request"],
      default: "emergency",
    },

    title: {
      type: String,
      required: true,
    },

    body: {
      type: String,
      required: true,
    },

    data: {
      type: Object,
      default: {},
    },

    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Notifications", NotificationSchema);
