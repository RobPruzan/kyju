import { Server, Socket } from "socket.io";
import { type Server as HttpServer } from "node:http";
export const injectWebSocket = (server: HttpServer) => {
  const ioServer = new Server(server, {
    path: "/ws",
    serveClient: false,
    cors: {
      origin: "*", // narrow later
      methods: ["GET", "POST"],
    },
    transports: ["websocket"],
  });

  ioServer.use(async (socket, next) => {
    next();
  });

  ioServer.on("connection", async (socket) => {
    const roomId = socket.handshake.query.roomId as string;

    if (!roomId) {
      throw new Error("Invariant: roomId is required for socket connection");
    }

    socket.join(roomId);
    socket.on(
      "message",
      async () => {
        // will need to internal rpc same thing as iframe really
      }
    );
  });
};