const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configure CORS for production
app.use(cors());

// Configure Socket.IO with production-ready settings
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://metaverse-simulator.vercel.app', 'https://*.vercel.app', 'http://localhost:5173'] 
      : '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 30000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Serve static files from the dist directory if we're running in production
// This allows us to use the same server for both game assets and Socket.IO in dev
app.use(express.static(path.join(__dirname, 'dist')));

// Add a simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', players: Object.keys(players).length });
});

// Serve our main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Store connected players
const players = {};

// Game state
const gameState = {
  players,
  worldTime: Date.now()
};

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  // Handle player joining
  socket.on('player-join', (data) => {
    console.log(`Player ${data.username} joined the game`);
    
    // Store player data
    players[socket.id] = {
      id: socket.id,
      username: data.username,
      position: data.position,
      rotation: data.rotation,
      joinTime: Date.now()
    };
    
    // Broadcast to all clients that a new player joined
    io.emit('player-joined', {
      id: socket.id,
      username: data.username
    });
    
    // Send the current players to the new player
    io.emit('players-update', players);
  });
  
  // Handle player updates (position, rotation)
  socket.on('player-update', (data) => {
    // Update player data if the player exists
    if (players[socket.id]) {
      players[socket.id].position = data.position;
      players[socket.id].rotation = data.rotation;
      
      // Add animation states
      if (data.isMoving !== undefined) {
        players[socket.id].isMoving = data.isMoving;
      }
      
      if (data.isJumping !== undefined) {
        players[socket.id].isJumping = data.isJumping;
      }
      
      if (data.isSkateboardMode !== undefined) {
        players[socket.id].isSkateboardMode = data.isSkateboardMode;
      }
      
      // Broadcast updated players to all clients
      socket.broadcast.emit('players-update', players);
    }
  });
  
  // Handle emoji reactions
  socket.on('emoji-reaction', (data) => {
    if (players[socket.id]) {
      // Broadcast emoji to all other players with sender's position
      socket.broadcast.emit('emoji-reaction', {
        emoji: data.emoji,
        position: players[socket.id].position,
        senderId: socket.id,
        senderName: players[socket.id].username
      });
    }
  });
  
  // Handle player disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    
    // Remove player from players object
    if (players[socket.id]) {
      const username = players[socket.id].username;
      delete players[socket.id];
      
      // Broadcast to all clients that a player left
      io.emit('player-left', socket.id);
      console.log(`Player ${username} left the game`);
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 