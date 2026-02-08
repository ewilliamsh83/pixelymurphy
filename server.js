const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server);

const MAX_PLAYERS = 3;
const players = new Map();

io.on("connection", (socket) => {
  socket.on("join", (payload, cb) => {
    const name = String(payload?.name || "").trim().slice(0, 16);
    if (!name) {
      cb?.({ ok: false, reason: "name" });
      return;
    }
    if (players.size >= MAX_PLAYERS) {
      cb?.({ ok: false, reason: "full" });
      return;
    }
    const player = { id: socket.id, name, x: 0, y: 0, z: 0, yaw: 0 };
    players.set(socket.id, player);
    cb?.({ ok: true, id: socket.id, max: MAX_PLAYERS });
  });

  socket.on("state", (data) => {
    const player = players.get(socket.id);
    if (!player) return;
    player.x = Number(data?.x) || 0;
    player.y = Number(data?.y) || 0;
    player.z = Number(data?.z) || 0;
    player.yaw = Number(data?.yaw) || 0;
  });

  socket.on("disconnect", () => {
    players.delete(socket.id);
  });
});

setInterval(() => {
  io.emit("players", Array.from(players.values()));
}, 100);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
