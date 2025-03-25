const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configure CORS for production
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://metaverse-simulator.vercel.app', 'https://*.vercel.app', 'http://localhost:5173', 'http://localhost:8080'] 
    : '*',
  methods: ['GET', 'POST']
}));
app.use(express.json()); // Add JSON body parser

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

// In-memory store for portal counters
const portalCounters = new Map();

// Portal counter endpoints
app.get('/portal-counter', (req, res) => {
  const portalURL = req.query.portalURL;
  if (!portalURL) {
    return res.status(400).json({ error: 'portalURL is required' });
  }
  
  const count = portalCounters.get(portalURL) || 0;
  res.json({ count });
});

app.post('/portal-counter', (req, res) => {
  console.log('Received portal counter request:', req.body);
  const { portalURL } = req.body;
  if (!portalURL) {
    console.error('No portalURL provided in request');
    return res.status(400).json({ error: 'portalURL is required' });
  }
  
  const currentCount = portalCounters.get(portalURL) || 0;
  const newCount = currentCount + 1;
  portalCounters.set(portalURL, newCount);
  
  console.log(`Portal counter updated for ${portalURL}: ${currentCount} -> ${newCount}`);
  
  // Broadcast the updated count to all connected clients
  io.emit('portal-count-update', { portalURL, count: newCount });
  
  res.json({ count: newCount });
});

// Serve static files from the dist directory if we're running in production
// This allows us to use the same server for both game assets and Socket.IO in dev
app.use(express.static(path.join(__dirname, 'dist')));

// Add a simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    players: Object.keys(players).length,
    portals: portalCounters.size
  });
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
  worldTime: Date.now(),
  // Add NPC tracking
  npcs: {
    regularNPCs: [], // For standard NPCs
    giantNPCs: [],   // For giant NPCs
    initialized: false,
    lastUpdate: Date.now()
  }
};

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  // Send current portal counts to new players
  const portalCounts = {};
  portalCounters.forEach((count, url) => {
    portalCounts[url] = count;
  });
  socket.emit('portal-counts', portalCounts);
  
  // Handle get-portal-counts request
  socket.on('get-portal-counts', () => {
    console.log(`Player ${socket.id} requested portal counts`);
    const portalCounts = {};
    portalCounters.forEach((count, url) => {
      portalCounts[url] = count;
    });
    console.log('Sending portal counts:', portalCounts);
    socket.emit('portal-counts', portalCounts);
    console.log('Portal counts sent to client');
  });
  
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
    
    // If NPCs have been initialized, send them to the new player too
    if (gameState.npcs.initialized) {
      socket.emit('npcs-update', gameState.npcs);
    }
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
      
      // Add skateboard-specific data
      if (data.tilt !== undefined) {
        players[socket.id].tilt = data.tilt;
      }
      
      if (data.speed !== undefined) {
        players[socket.id].speed = data.speed;
      }
      
      // Broadcast updated players to all clients
      socket.broadcast.emit('players-update', players);
    }
  });
  
  // Handle NPC updates from host player (first player to connect becomes NPC host)
  socket.on('npcs-initialize', (npcsData) => {
    // Only accept NPC initialization if not already initialized
    // or if this is the host player (first to connect)
    if (!gameState.npcs.initialized || socket.id === Object.keys(players)[0]) {
      console.log('Initializing NPCs from host player');
      gameState.npcs.regularNPCs = npcsData.regularNPCs;
      gameState.npcs.giantNPCs = npcsData.giantNPCs;
      gameState.npcs.initialized = true;
      gameState.npcs.lastUpdate = Date.now();
      
      // Broadcast NPC data to all clients except the sender
      socket.broadcast.emit('npcs-update', gameState.npcs);
    }
  });
  
  // Handle NPC updates from host player
  socket.on('npcs-update', (npcsData) => {
    // Only accept updates from host player (first to connect)
    if (socket.id === Object.keys(players)[0]) {
      gameState.npcs.regularNPCs = npcsData.regularNPCs;
      gameState.npcs.giantNPCs = npcsData.giantNPCs;
      gameState.npcs.lastUpdate = Date.now();
      
      // Broadcast updated NPCs to all clients except the sender
      socket.broadcast.emit('npcs-update', gameState.npcs);
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
      
      // If the disconnected player was the host (first player), 
      // reassign host to the next player if any exist
      const remainingPlayers = Object.keys(players);
      if (remainingPlayers.length > 0) {
        const newHostId = remainingPlayers[0];
        io.to(newHostId).emit('become-npc-host');
        console.log(`New NPC host assigned: ${players[newHostId].username}`);
      }
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 