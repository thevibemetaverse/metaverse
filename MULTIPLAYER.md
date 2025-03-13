# Multiplayer Setup Guide

This document explains how to set up and deploy the multiplayer functionality for your 3D game.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run both the game client and server in development mode:
   ```bash
   npm run dev:all
   ```

   This will start:
   - The game client on http://localhost:5173
   - The multiplayer server on http://localhost:3000

## Deployment Steps

### 1. Deploy the Game Client on Vercel

Your game client can continue to be deployed on Vercel as you've been doing:

1. Connect your GitHub repository to Vercel
2. Ensure your build settings are:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### 2. Deploy the Multiplayer Server on Railway

Railway is recommended for the multiplayer server because it supports WebSockets, has a generous free tier, and is easy to set up.

1. Create a Railway account at https://railway.app/

2. Connect your GitHub repository to Railway

3. Create a new project from your GitHub repo

4. Set the following environment variables in Railway:
   - `NODE_ENV`: `production`
   - `CLIENT_URL`: Your Vercel domain (e.g., `https://your-game.vercel.app`)

5. Update the CORS settings in `server.js` to include your Vercel domain

6. Update the Socket.IO connection URL in `src/main.js` to your Railway domain

### Configuration Files

The repository includes these important configuration files for deployment:

- `railway.json`: Railway-specific configuration
- `.env`: Environment variables (used in development)
- `server.js`: Socket.IO server implementation
- `package.json`: Includes scripts for running both server and client

## Key Features of the Multiplayer Implementation

- Real-time player positions and rotations
- Avatar appearance synchronization
- Emoji reactions between players
- Automatic reconnection handling
- Graceful fallback to single-player mode

## Troubleshooting

### CORS Issues

If you're experiencing CORS issues, make sure:
1. Your Railway server has the correct CORS settings in `server.js`
2. Your Vercel domain is listed in the `origin` array
3. The WebSocket connection is not being blocked by a firewall

### Connection Problems

If players cannot connect:
1. Check that the Railway server is running
2. Verify that the Socket.IO URL in the client code is correct
3. Ensure Railway's free tier limits have not been exceeded
4. Check browser console for connection errors

## Scaling Considerations

The current implementation works well for small to medium player counts (up to ~50 concurrent users). For larger scale:

1. Consider using a dedicated game server solution (like Colyseus)
2. Implement room/zone-based architectures to limit player data broadcasts
3. Upgrade Railway to a paid tier for better performance
4. Add state validation and anti-cheat measures 