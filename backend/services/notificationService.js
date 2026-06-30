const Notifications = require("../models/Notifications");
const socketManager = require("../socket");

async function sendNotification(userId, payload) {
  const notification = await Notifications.create({
    user: userId,
    title: payload.title,
    body: payload.body,
    data: payload.data,
  });

  try {
    const io = socketManager.getIO();
    io.to(userId.toString()).emit("newNotification", notification);
  } catch (err) {
    console.log("Socket emit failed:", err.message);
  }

  return notification;
}

module.exports = { sendNotification };
