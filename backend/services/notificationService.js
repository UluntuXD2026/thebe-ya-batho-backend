const Notifications = require("../models/Notifications");
const User = require("../models/User");
const socketManager = require("../socket");
const { Expo } = require("expo-server-sdk");

const expo = new Expo();

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

  try {
    const user = await User.findById(userId).select("pushToken");

    if (user?.pushToken && Expo.isExpoPushToken(user.pushToken)) {
      await expo.sendPushNotificationsAsync([
        {
          to: user.pushToken,
          sound: "default",
          title: payload.title,
          body: payload.body,
          data: payload.data,
          priority: "high",
          channelId: "default",
        },
      ]);
    }
  } catch (err) {
    console.log("Push send failed:", err.message);
  }

  return notification;
}

module.exports = { sendNotification };