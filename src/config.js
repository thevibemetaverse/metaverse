/**
 * Application configuration and feature flags
 * 
 * This file contains configuration settings for the metaverse application,
 * including feature flags that can be toggled to enable or disable functionality.
 */

const config = {
  // Feature flags - toggle these to enable/disable functionality
  features: {
    /**
     * Multiplayer functionality
     * 
     * When enabled (true):
     * - Players can see other users in the metaverse
     * - Real-time position, rotation and animation updates are shared
     * - Players can interact with each other
     * 
     * When disabled (false):
     * - Single player mode only
     * - No connection to multiplayer server is made
     * - Reduced network usage and processing overhead
     */
    multiplayer: false,
  },
  
  // Server configuration
  server: {
    /**
     * Socket.io server URL
     * - Empty string ('') uses relative URL in development, or localhost:8080 in production
     * - Set to specific URL like 'https://your-socket-server.com' for custom deployment
     */
    socketUrl: '',
  },
  
  // Environment settings
  environment: {
    skyColor: 0x87CEEB,
    groundColor: 0x4CAF50,
  },
};

export default config; 