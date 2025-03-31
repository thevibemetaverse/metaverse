const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const players = new Map();
const usernames = new Set(); // Track used usernames
const connectedSockets = new Map(); // Map socket IDs to player IDs

// Serve static files from the public directory
app.use(express.static('public'));

io.on('connection', (socket) => {
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
    console.log(`[Server] New player connected: ${playerId} (Socket: ${socket.id})`);

    socket.on('join', (data) => {
        handlePlayerJoin(playerId, data);
    });

    socket.on('playerUpdate', (data) => {
        handlePlayerUpdate(playerId, data);
    });

    socket.on('disconnect', () => {
        console.log(`[Server] Player disconnected: ${playerId} (Socket: ${socket.id})`);
        const mappedPlayerId = connectedSockets.get(socket.id);
        if (mappedPlayerId === playerId) {
            connectedSockets.delete(socket.id);
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

const PORT = process.env.PORT || 8080;
http.listen(PORT, () => {
    console.log(`[Server] Socket.IO server started on port ${PORT}`);
}); 