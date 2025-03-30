import Game from './Game.js';

// Create game instance
const game = new Game();

// Wait for portals to be initialized
const checkPortals = () => {
    if (game.portalManager && game.portalManager.portals.length > 0) {
        // Log all available portals
        console.log('Available portals:', game.portalManager.portals.map(p => ({
            id: p.portalId,
            position: p.mesh?.position,
            isActive: p.isActive
        })));

        // Update texture for portal-1
        game.portalManager.updatePortalTexture('portal-1', 'Cube002_3', '/images/thevibemetaverse.png');
        console.log('Portal texture update requested');
    } else {
        console.log('Waiting for portals to initialize...');
        setTimeout(checkPortals, 1000); // Check again in 1 second
    }
};

// Start checking for portals
setTimeout(checkPortals, 2000); 