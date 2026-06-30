const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const Notifications = require("../models/Notifications");

router.get("/", authenticateToken, async(req, res) => {
    const notifications = await Notifications.find({
        user: req.user.userid
    }).sort({createdAt: -1})

    res.json(notifications)
})

router.post("/mark-read/:id", authenticateToken, async(req, res) => {
    const notification = await Notifications.findById(req.params.id)

    if(!notification){
        return res.status(404).json({message: "notification not found"})
    }

    notification.read = true

    await notification.save()

    res.status(200).json({message: "notification marked as read"})
})

module.exports = router;