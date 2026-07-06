const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const Notifications = require("../models/Notifications");
const mongoose = require("mongoose");

router.get("/", authenticateToken, async (req, res) => {
  const notifications = await Notifications.find({
    user: req.user.userid,
  }).sort({ createdAt: -1 });

  res.json(notifications);
});

router.post("/mark-read/:id", authenticateToken, async (req, res) => {
  const notification = await Notifications.findById(req.params.id);

  if (!notification) {
    return res.status(404).json({ message: "notification not found" });
  }

  notification.read = true;

  await notification.save();

  res.status(200).json({ message: "notification marked as read" });
});

router.post(
  "/mark-read-by-emergency/:emergencyId",
  authenticateToken,
  async (req, res) => {
    try {
      const result = await Notifications.updateMany(
        {
          user: req.user.userid,
          "data.emergencyId": new mongoose.Types.ObjectId(
            req.params.emergencyId,
          ),
        },
        { read: true },
      );
      res
        .status(200)
        .json({ message: "marked as read", matched: result.matchedCount });
    } catch (err) {
      res.status(500).json({ message: "internal server error", err });
    }
  },
);

router.post(
  "/mark-read-by-request/:requestId",
  authenticateToken,
  async (req, res) => {
    try {
      const result = await Notifications.updateMany(
        {
          user: req.user.userid,
          "data.requestId": new mongoose.Types.ObjectId(req.params.requestId),
        },
        { read: true },
      );
      res
        .status(200)
        .json({ message: "marked as read", matched: result.matchedCount });
    } catch (err) {
      res.status(500).json({ message: "internal server error", err });
    }
  },
);

module.exports = router;
