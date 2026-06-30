let io;

function init(socketIo) {
  io = socketIo;
}

function getIO() {
  if (!io) {
    throw new Error("socket io not initialized");
  }

  return io;
}

function setup() {
  const io = getIO();

  io.on("connection", (socket) => {
    console.log("User connected", socket.id);

    socket.on("register", (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined room`);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected", socket.id);
    });
  });
}

module.exports = {
  init,
  getIO,
  setup,
};
