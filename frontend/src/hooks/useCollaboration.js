import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

export function useCollaboration({
  userId,
  userName,
  onElementUpdate,
  onElementDelete,
  onUserJoined,
  onUserLeft,
  onCursorUpdate,
  onRoomData
}) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const callbacksRef = useRef({});

  // Keep callbacks ref up-to-date on every render without causing reconnects
  callbacksRef.current = { onElementUpdate, onElementDelete, onUserJoined, onUserLeft, onCursorUpdate, onRoomData };

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    socket.on('connect', () => {
      console.log('WebSocket 已连接');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket 已断开');
      setIsConnected(false);
    });

    socket.on('room-data', (data) => {
      callbacksRef.current.onRoomData?.(data);
    });

    socket.on('element-updated', (element) => {
      callbacksRef.current.onElementUpdate?.(element);
    });

    socket.on('element-deleted', (elementId) => {
      callbacksRef.current.onElementDelete?.(elementId);
    });

    socket.on('user-joined', (user) => {
      callbacksRef.current.onUserJoined?.(user);
    });

    socket.on('user-left', (userId) => {
      callbacksRef.current.onUserLeft?.(userId);
    });

    socket.on('cursor-updated', (uid, position) => {
      callbacksRef.current.onCursorUpdate?.(uid, position);
    });

    socketRef.current = socket;
  }, []); // No callback deps needed — accessed via callbacksRef

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const joinRoom = useCallback((roomId) => {
    if (!socketRef.current) {
      connect();
    }

    if (socketRef.current) {
      socketRef.current.emit('join-room', roomId, userId, userName);
    }
  }, [userId, userName, connect]);

  const leaveRoom = useCallback((roomId) => {
    if (socketRef.current) {
      socketRef.current.emit('leave-room', roomId);
    }
  }, []);

  const sendElementUpdate = useCallback((roomId, element) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('update-element', roomId, element);
    }
  }, []);

  const sendElementDelete = useCallback((roomId, elementId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('delete-element', roomId, elementId);
    }
  }, []);

  const sendCursorUpdate = useCallback((roomId, position) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('update-cursor', roomId, userId, position);
    }
  }, [userId]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    joinRoom,
    leaveRoom,
    sendElementUpdate,
    sendElementDelete,
    sendCursorUpdate
  };
}
