const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      trim: true,
    },

    lastName: {
      type: String,
      trim: true,
    },

    number: {
      type: String,
      required: true,
      unique: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    verificationCode: String,

    verificationCodeExpires: Date,

    refreshToken: String,

    pushToken: {
      type: String
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
