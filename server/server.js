require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: ["https://thevibemetaverse.com", "https://metaverse-delta.vercel.app"],
        methods: ["GET", "POST"],
        credentials: true
    }
});
const mongodbService = require('./services/mongodb');
const portalService = require('./services/portalService');

// Add CORS headers for all routes
app.use((req, res, next) => {
    const allowedOrigins = ['https://thevibemetaverse.com', 'https://metaverse-delta.vercel.app'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});

const players = new Map();
const usernames = new Set(); // Track used usernames
const connectedSockets = new Map(); // Map socket IDs to player IDs

// Memory-based storage for portal likes
const portalLikes = new Map(); // Maps portalId to like count
const userPortalLikes = new Map(); // Maps playerId to Set of portalIds they've liked

// Serve static files from the public directory
app.use(express.static('public'));

// Function to emit current player count to all clients
function broadcastPlayerCount() {
    const count = players.size;
    io.emit('playerCount', { count });
    console.log(`[Server] Broadcasting player count: ${count}`);
}

// Initialize MongoDB and PortalService
async function initializeServices() {
    try {
        await mongodbService.connect();
        await portalService.initialize();
        console.log('[Server] Services initialized successfully');
    } catch (error) {
        console.error('[Server] Failed to initialize services:', error);
    }
}

io.on('connection', (socket) => {
    console.log(`[Server] New socket connected: ${socket.id}`);

    // Handle heartbeat ping from clients
    socket.on('heartbeat', (data) => {
        // Find player ID associated with this socket
        const playerId = connectedSockets.get(socket.id);
        const logPrefix = playerId ? `Player ${playerId}` : `Socket ${socket.id}`;
        
        console.log(`[Server] Heartbeat received from ${logPrefix}`);
        
        // Reset player's last activity timestamp if found
        if (playerId && players.has(playerId)) {
            const player = players.get(playerId);
            player.lastActivity = Date.now();
        }
        
        // Respond to client heartbeat to confirm connection is alive
        socket.emit('heartbeat', { 
            timestamp: Date.now(),
            serverTime: new Date().toISOString()
        });
    });

    socket.on('join', (data) => {
        if (!data.username) {
            console.error(`[Server] Received join request without username from socket ${socket.id}`);
            socket.disconnect();
            return;
        }

        const playerId = generatePlayerId();
        
        // Clean up any existing player with this socket ID
        const existingPlayerId = connectedSockets.get(socket.id);
        if (existingPlayerId) {
            console.log(`[Server] Cleaning up existing player ${existingPlayerId} for socket ${socket.id}`);
            handlePlayerDisconnect(existingPlayerId);
        }
        
        // Store the mapping
        connectedSockets.set(socket.id, playerId);
        players.set(playerId, { socket, id: playerId });
        
        // Initialize empty set of liked portals for this player
        if (!userPortalLikes.has(playerId)) {
            userPortalLikes.set(playerId, new Set());
        }
        
        console.log(`[Server] New player joined: ${playerId} (Socket: ${socket.id})`);
        handlePlayerJoin(playerId, data);
        
        // Track visitor using clientId instead of playerId
        if (data.clientId) {
            portalService.trackVisitor(data.clientId).then(isNewVisitor => {
                if (isNewVisitor) {
                    // Broadcast updated daily visitor count
                    io.emit('dailyVisitorCount', { count: portalService.getDailyVisitorCount() });
                }
            });
        }
        
        // Broadcast updated player count
        broadcastPlayerCount();
    });

    socket.on('playerUpdate', (data) => {
        const playerId = connectedSockets.get(socket.id);
        if (playerId) {
            handlePlayerUpdate(playerId, data);
        }
    });

    // Voice chat event handlers
    socket.on('joinVoice', (data) => {
        const playerId = connectedSockets.get(socket.id);
        if (!playerId) {
            console.error(`[Server] Cannot join voice chat - invalid player ID for socket ${socket.id}`);
            return;
        }

        const player = players.get(playerId);
        if (!player) {
            console.error(`[Server] Cannot join voice chat - player ${playerId} not found`);
            return;
        }

        console.log(`[Server] Player ${playerId} joined voice chat`);

        // Broadcast to others that this player joined voice chat
        socket.broadcast.emit('voiceJoined', {
            id: playerId,
            username: player.username || 'Unknown'
        });

        console.log(`[Server] Broadcasting join event for ${playerId} to all other players`);

        // Send existing voice chat participants to the new player
        let participantCount = 0;
        players.forEach((existingPlayer, existingId) => {
            if (existingId !== playerId && existingPlayer.socket && existingPlayer.socket.connected) {
                console.log(`[Server] Sending existing voice participant ${existingId} to new player ${playerId}`);
                socket.emit('voiceJoined', {
                    id: existingId,
                    username: existingPlayer.username || 'Unknown'
                });
                participantCount++;
            }
        });
        
        console.log(`[Server] Sent ${participantCount} existing participants to ${playerId}`);
    });

    // Handle voice chat state updates
    socket.on('voiceChat:state', (data) => {
        const playerId = connectedSockets.get(socket.id);
        if (!playerId) return;
        
        console.log(`[Server] Voice state update from ${playerId}: isMuted=${data.isMuted}`);
        
        // Store voice state with player data
        const player = players.get(playerId);
        if (player) {
            player.isMuted = data.isMuted;
        }
        
        // Broadcast voice state to all other players
        socket.broadcast.emit('voiceChat:state', {
            userId: data.userId || playerId,
            isMuted: data.isMuted
        });
    });
    
    // Handle requests for player voice state
    socket.on('voiceChat:requestState', (data) => {
        const requestedPlayerId = data.userId;
        const requestingPlayerId = connectedSockets.get(socket.id);
        
        console.log(`[Server] Voice state requested by ${requestingPlayerId} for ${requestedPlayerId}`);
        
        // If we have this player and their voice state, send it back
        if (requestedPlayerId && players.has(requestedPlayerId)) {
            const player = players.get(requestedPlayerId);
            const isMuted = player.isMuted !== undefined ? player.isMuted : true; // Default to muted
            
            socket.emit('voiceChat:state', {
                userId: requestedPlayerId,
                isMuted: isMuted
            });
        }
    });

    socket.on('voiceSignal', (data) => {
        const playerId = connectedSockets.get(socket.id);
        if (!playerId) {
            console.error(`[Server] Cannot forward voice signal - invalid player ID for socket ${socket.id}`);
            return;
        }

        console.log(`[Server] Forwarding voice signal from ${playerId} to ${data.targetId}, type: ${data.signal.type || 'unknown'}`);

        // Forward the signal to the target peer
        const targetPlayer = players.get(data.targetId);
        if (targetPlayer && targetPlayer.socket && targetPlayer.socket.connected) {
            targetPlayer.socket.emit('voiceSignal', {
                signal: data.signal,
                fromId: playerId
            });
            console.log(`[Server] Successfully forwarded signal to ${data.targetId}`);
        } else {
            console.error(`[Server] Failed to forward signal - target player ${data.targetId} not found or not connected`);
        }
    });

    socket.on('leaveVoice', (data) => {
        const playerId = connectedSockets.get(socket.id);
        if (!playerId) return;

        console.log(`[Server] Player ${playerId} left voice chat`);

        // Broadcast to others that this player left voice chat
        socket.broadcast.emit('voiceLeft', {
            id: playerId
        });
    });

    // Portal like event handler
    socket.on('likePortal', (data) => {
        const playerId = connectedSockets.get(socket.id);
        if (playerId) {
            handlePortalLike(playerId, data.portalId);
        }
    });

    // Request for initial portal likes
    socket.on('getPortalLikes', () => {
        const playerId = connectedSockets.get(socket.id);
        if (!playerId) return;

        const likesData = {};
        portalService.portalLikes.forEach((count, portalId) => {
            likesData[portalId] = count;
        });
        socket.emit('initialPortalLikes', likesData);
        
        // Send this player's liked portals
        const playerLikedPortals = portalService.getUserLikedPortals(playerId);
        socket.emit('playerLikedPortals', playerLikedPortals);
    });

    // Handle request for player count and daily visitors
    socket.on('getCounts', () => {
        console.log(`[Server] Counts requested from socket ${socket.id}`);
        socket.emit('counts', { 
            playerCount: players.size,
            dailyVisitorCount: portalService.getDailyVisitorCount()
        });
    });

    socket.on('disconnect', () => {
        const playerId = connectedSockets.get(socket.id);
        if (playerId) {
            console.log(`[Server] Player disconnected: ${playerId} (Socket: ${socket.id})`);
            handlePlayerDisconnect(playerId);
            
            // Broadcast updated player count after disconnect
            broadcastPlayerCount();
        }
    });
});

function handlePlayerJoin(playerId, data) {
    const player = players.get(playerId);
    if (!player) return;

    // Ensure username is unique
    let username = data.username;
    let counter = 1;
    while (usernames.has(username)) {
        username = `${data.username}${counter}`;
        counter++;
    }
    usernames.add(username);

    // Store player info
    player.username = username;
    player.avatarUrl = data.avatarUrl;
    
    // Use position and rotation from client data if provided, otherwise default to origin
    player.position = data.position || { x: 0, y: 0, z: 0 };
    player.rotation = data.rotation || { x: 0, y: 0, z: 0 };
    
    // Initialize voice chat state to muted by default
    player.isMuted = true;
    
    // Track last activity
    player.lastActivity = Date.now();

    // Send player ID and potentially modified username to the new player
    player.socket.emit('playerId', { 
        id: playerId,
        username: username
    });

    // Broadcast new player to others
    broadcastToOthers(playerId, {
        type: 'playerJoined',
        id: playerId,
        username: username,
        avatarUrl: data.avatarUrl,
        position: player.position,
        rotation: player.rotation
    });

    // Send existing players to new player
    players.forEach((existingPlayer, existingId) => {
        if (existingId !== playerId && existingPlayer.socket.connected) {
            player.socket.emit('playerJoined', {
                id: existingId,
                username: existingPlayer.username,
                avatarUrl: existingPlayer.avatarUrl,
                position: existingPlayer.position || { x: 0, y: 0, z: 0 },
                rotation: existingPlayer.rotation || { x: 0, y: 0, z: 0 }
            });
        }
    });
}

function handlePlayerUpdate(playerId, data) {
    const player = players.get(playerId);
    if (!player || !player.socket.connected) return;

    // Store player position and rotation
    player.position = data.position;
    player.rotation = data.rotation;
    
    // Update avatarUrl if provided
    if (data.avatarUrl) {
        player.avatarUrl = data.avatarUrl;
    }

    // Broadcast update to other players immediately
    broadcastToOthers(playerId, {
        type: 'playerUpdate',
        id: playerId,
        position: data.position,
        rotation: data.rotation,
        avatarUrl: player.avatarUrl // Include avatarUrl in broadcast
    });
}

function handlePlayerDisconnect(playerId) {
    const player = players.get(playerId);
    if (!player) return;

    // Remove username from used set
    if (player.username) {
        usernames.delete(player.username);
    }

    // Broadcast player left to others
    broadcastToOthers(playerId, {
        type: 'playerLeft',
        id: playerId,
        username: player.username
    });

    // Remove player from maps
    players.delete(playerId);
    connectedSockets.delete(player.socket.id);
}

function broadcastToOthers(playerId, data) {
    players.forEach((player, id) => {
        if (id !== playerId && player.socket.connected) {
            player.socket.emit(data.type, data);
        }
    });
}

function generatePlayerId() {
    return Math.random().toString(36).substr(2, 9);
}

// Add a periodic cleanup of disconnected players
setInterval(() => {
    players.forEach((player, id) => {
        if (!player.socket.connected) {
            console.log(`[Server] Cleaning up disconnected player: ${id}`);
            handlePlayerDisconnect(id);
        }
    });
}, 5000); // Check every 5 seconds

// Handle portal like
async function handlePortalLike(playerId, portalId) {
    const success = await portalService.handlePortalLike(playerId, portalId);
    if (success) {
        // Broadcast updated like count to all players
        io.emit('portalLikeUpdate', {
            portalId: portalId,
            likeCount: portalService.getPortalLikeCount(portalId)
        });
    }
}

// Initialize services before starting the server
initializeServices().then(() => {
    const PORT = process.env.PORT || 8080;
    const server = http.listen(PORT, () => {
        console.log(`[Server] Listening on port ${PORT}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`[Server] Port ${PORT} is busy, trying ${PORT + 1}`);
            server.close();
            http.listen(PORT + 1, () => {
                console.log(`[Server] Listening on port ${PORT + 1}`);
            });
        } else {
            console.error('[Server] Error starting server:', err);
        }
    });
});

// Cleanup on server shutdown
process.on('SIGTERM', async () => {
    console.log('[Server] Received SIGTERM signal');
    await mongodbService.close();
    process.exit(0);
}); 