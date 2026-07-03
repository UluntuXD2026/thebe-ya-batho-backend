const express = require("express");
const User = require("../models/User");
const ContactRequest = require("../models/ContactRequest");
const router = express.Router();
const { sendNotification } = require("../services/notificationService");
const authenticateToken = require("../middleware/auth");
const EmergencyAlert = require("../models/EmergencyAlert");
const { sendSMS } = require("../utils/sms");

async function notifyContacts(userId, { title, body, data }) {
  const appUserContacts = await ContactRequest.find({
    from: userId,
    status: "accepted",
    appUser: true,
  }).populate("to", "firstName lastName number");

  const smsOnlyContacts = await ContactRequest.find({
    from: userId,
    status: "accepted",
    appUser: false,
  });

  for (let x = 0; x < appUserContacts.length; x++) {
    await sendNotification(appUserContacts[x].to._id, { title, body, data });
  }

  for (let x = 0; x < smsOnlyContacts.length; x++) {
    try {
      await sendSMS(smsOnlyContacts[x].toNumber, `${title}: ${body}`);
    } catch (err) {
      console.log("SMS failed:", err.message);
    }
  }
}

router.post("/", authenticateToken, async (req, res) => {
  try {
    const { type, location } = req.body;
    const user = await User.findById(req.user.userid);

    const alert = await EmergencyAlert.create({
      user: req.user.userid,
      type,
      location,
    });

    const mapsLink =
      location?.lat && location?.lng
        ? ` Location: https://maps.google.com/?q=${location.lat},${location.lng}`
        : "";

    await notifyContacts(req.user.userid, {
      title: "Emergency Alert",
      body: `${user.firstName} needs help (${type}).${mapsLink}`,
      data: {
        emergencyId: alert._id,
        type,
        location,
        time: alert.createdAt,
        sender: req.user.userid,
      },
    });

    res.status(200).json({ message: "Emergency sent", alertId: alert._id });
  } catch (err) {
    res.status(500).json({ message: "internal server error", err });
  }
});

router.get("/getEmergency", authenticateToken, async (req, res) => {
  const alert = await EmergencyAlert.find({ user: req.user.userid }).sort({
    status: 1,
    createdAt: -1,
  });

  res.send(alert);
});

router.get("/getEmergencyFromId/:id", authenticateToken, async (req, res) => {
  const alert = await EmergencyAlert.findById(req.params.id);

  if (!alert) {
    return res.status(404).json({ message: "alert not found" });
  }

  res.json(alert);
});

router.delete("/deleteEmergency/:id", authenticateToken, async (req, res) => {
  const alert = await EmergencyAlert.findByIdAndDelete(req.params.id);

  res.send("emergency removed");
});

router.post("/resolve/:id", authenticateToken, async (req, res) => {
  try {
    const alert = await EmergencyAlert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({ message: "alert not found" });
    }

    if (alert.user.toString() !== req.user.userid) {
      return res.status(403).json({ message: "not allowed" });
    }

    alert.status = "resolved";
    await alert.save();

    const user = await User.findById(req.user.userid);

    await notifyContacts(req.user.userid, {
      title: "Emergency resolved",
      body: `${user.firstName} is safe. The emergency has been resolved.`,
      data: {
        emergencyId: alert._id,
        type: alert.type,
        status: "resolved",
        time: alert.updatedAt,
        sender: req.user.userid,
      },
    });

    res.status(200).json({ message: "emergency has been resolved" });
  } catch (err) {
    res.status(500).json({ message: "internal server error", err });
  }
});

module.exports = router;
