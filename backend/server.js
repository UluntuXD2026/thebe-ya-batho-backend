require("dotenv").config()
const express = require("express");
const http = require("http")
const mongoose = require("mongoose");
const cors = require("cors")
const User = require("./models/User");
const authRoutes = require("./routes/auth");
const contactRoutes = require("./routes/contacts")
const emergencyRoutes = require("./routes/emergency")
const notificationsRoutes = require("./routes/notifications")
const socketManager = require("./socket")

const { Server } = require("socket.io")

const app = express();
const PORT = process.env.PORT;
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: "*"
  }
})

socketManager.init(io)
socketManager.setup()

mongoose
  .connect(
    process.env.MONGO_URI,
  )
  .then(() => {
    console.log("connected to mongoDB");
  })
  .catch((err) => {
    console.error("mongoDB connection has failed", err);
  });

app.use(express.json())
app.use(cors())

app.get("/", async (req, res) => {
  const users = await User.find();

  res.status(200).send(users);
});

//route for test purposes
app.delete("/delete", async(req, res) => {
    const deleted = await User.deleteMany()

    res.status(200).send("all users deleted")
})

app.use("/auth", authRoutes)
app.use("/contacts", contactRoutes)
app.use("/emergency", emergencyRoutes)
app.use("/notifications", notificationsRoutes)

server.listen(PORT, () => {
  console.log(`app is listening on port ${PORT}`);
});
