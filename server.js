const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "https://thevibemetaverse.com",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Add CORS headers for all routes
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://thevibemetaverse.com');
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

io.on('connection', (socket) => {
    console.log(`[Server] New socket connected: ${socket.id}`);

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
    });

    socket.on('playerUpdate', (data) => {
        const playerId = connectedSockets.get(socket.id);
        if (playerId) {
            handlePlayerUpdate(playerId, data);
        }
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
        portalLikes.forEach((count, portalId) => {
            likesData[portalId] = count;
        });
        socket.emit('initialPortalLikes', likesData);
        
        // Send this player's liked portals
        const playerLikedPortals = Array.from(userPortalLikes.get(playerId) || []);
        socket.emit('playerLikedPortals', playerLikedPortals);
    });

    socket.on('disconnect', () => {
        const playerId = connectedSockets.get(socket.id);
        if (playerId) {
            console.log(`[Server] Player disconnected: ${playerId} (Socket: ${socket.id})`);
            handlePlayerDisconnect(playerId);
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
    player.position = { x: 0, y: 0, z: 0 };
    player.rotation = { x: 0, y: 0, z: 0 };

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
function handlePortalLike(playerId, portalId) {
    // Initialize portal likes if not present
    if (!portalLikes.has(portalId)) {
        portalLikes.set(portalId, 0);
    }
    
    // Initialize player's liked portals if not present
    if (!userPortalLikes.has(playerId)) {
        userPortalLikes.set(playerId, new Set());
    }
    
    // Check if player has already liked this portal
    const playerLikedPortals = userPortalLikes.get(playerId);
    if (playerLikedPortals.has(portalId)) {
        console.log(`[Server] Player ${playerId} already liked portal ${portalId}`);
        return; // Player already liked this portal
    }
    
    // Record that this player liked the portal
    playerLikedPortals.add(portalId);
    
    // Increment like count
    portalLikes.set(portalId, portalLikes.get(portalId) + 1);
    console.log(`[Server] Portal ${portalId} liked by player ${playerId}. New count: ${portalLikes.get(portalId)}`);
    
    // Broadcast updated like count to all players
    io.emit('portalLikeUpdate', {
        portalId: portalId,
        likeCount: portalLikes.get(portalId) || 0
    });
}

const PORT = process.env.PORT || 8080;
http.listen(PORT, () => {
    console.log(`[Server] Socket.IO server started on port ${PORT}`);
}); 