const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();
const users = new Map();

io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  socket.on('join-room', (roomId, userId, userName) => {
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        elements: [],
        users: new Map()
      });
    }

    const room = rooms.get(roomId);
    room.users.set(socket.id, { id: userId, name: userName, socketId: socket.id });
    users.set(socket.id, { roomId, userId, userName });

    const userList = Array.from(room.users.values()).map(u => ({
      id: u.id,
      name: u.name
    }));

    socket.emit('room-data', {
      elements: room.elements,
      users: userList
    });

    socket.to(roomId).emit('user-joined', {
      id: userId,
      name: userName
    });

    console.log(`用户 ${userName} 加入房间 ${roomId}`);
  });

  socket.on('update-element', (roomId, element) => {
    const room = rooms.get(roomId);
    if (room) {
      const existingIndex = room.elements.findIndex(e => e.id === element.id);
      if (existingIndex >= 0) {
        room.elements[existingIndex] = element;
      } else {
        room.elements.push(element);
      }
      socket.to(roomId).emit('element-updated', element);
    }
  });

  socket.on('delete-element', (roomId, elementId) => {
    const room = rooms.get(roomId);
    if (room) {
      room.elements = room.elements.filter(e => e.id !== elementId);
      socket.to(roomId).emit('element-deleted', elementId);
    }
  });

  socket.on('leave-room', (roomId) => {
    const userData = users.get(socket.id);
    if (userData) {
      const { userId, userName } = userData;
      const room = rooms.get(roomId);
      if (room) {
        room.users.delete(socket.id);
        socket.to(roomId).emit('user-left', userId);
        if (room.users.size === 0) {
          rooms.delete(roomId);
        }
      }
      socket.leave(roomId);
      users.delete(socket.id);
      console.log(`用户 ${userName} 主动离开房间 ${roomId}`);
    }
  });

  socket.on('update-cursor', (roomId, userId, cursorPosition) => {
    socket.to(roomId).emit('cursor-updated', userId, cursorPosition);
  });

  socket.on('disconnect', () => {
    const userData = users.get(socket.id);
    if (userData) {
      const { roomId, userId, userName } = userData;
      const room = rooms.get(roomId);
      
      if (room) {
        room.users.delete(socket.id);
        socket.to(roomId).emit('user-left', userId);
        
        if (room.users.size === 0) {
          rooms.delete(roomId);
        }
      }
      
      users.delete(socket.id);
      console.log(`用户 ${userName} 离开房间 ${roomId}`);
    }
    console.log('用户断开连接:', socket.id);
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/create-room', (req, res) => {
  const roomId = uuidv4().substring(0, 8);
  res.json({ roomId });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`NexaDraw 后端服务运行在端口 ${PORT}`);
  console.log(`WebSocket 服务已就绪`);
});
