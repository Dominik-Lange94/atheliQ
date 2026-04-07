import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let lastToken: string | null = null;

export function getSocket(token: string) {
  if (socket && lastToken === token) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  lastToken = token;

  socket = io(
    import.meta.env.VITE_API_URL?.replace("/api", "") ||
      "http://localhost:5000",
    {
      transports: ["websocket"],
      autoConnect: true,
      auth: {
        token, // nur der rohe JWT, NICHT "Bearer ..."
      },
    }
  );

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    lastToken = null;
  }
}
