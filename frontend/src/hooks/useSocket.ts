import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth.store";

export function useSocket(
  room: { type: "session" | "restaurant"; id: string } | null,
  handlers: Record<string, (data: any) => void>,
) {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);
  const token = useAuthStore((state) => state.token);
  const eventNames = Object.keys(handlers).sort().join("|");

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!room?.id || !token) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "/";

    const socket = io(wsUrl, {
      transports: ["polling", "websocket"],
      auth: { token },
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    let loggedError = false;

    socket.on("connect", () => {
      loggedError = false;
      if (room.type === "session") {
        socket.emit("join_session", room.id);
      } else {
        socket.emit("join_restaurant", room.id);
      }
    });

    socket.on("connect_error", (err) => {
      if (!loggedError) {
        console.warn("[socket] connection error:", err.message);
        loggedError = true;
      }
    });

    eventNames.split("|").filter(Boolean).forEach((event) => {
      socket.on(event, (data) => handlersRef.current[event]?.(data));
    });

    return () => {
      socket.disconnect();
    };
  }, [eventNames, room?.id, room?.type, token]);
}
