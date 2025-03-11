const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Store connected players
const players = {};

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
      rotation: data.rotation
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
      
      // Add isMoving property for animations
      if (data.isMoving !== undefined) {
        players[socket.id].isMoving = data.isMoving;
      }
      
      // Broadcast updated players to all clients
      io.emit('players-update', players);
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