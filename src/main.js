import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { io } from 'socket.io-client';

import { createEnvironment } from './components/environment.js';
import { createAvatar, createSimpleAvatar, createDirectAvatar, createCleanAvatar, createPureAvatar, updateAvatarAnimations } from './components/avatar.js';
import { setupControls } from './components/controls.js';
import { setupUI } from './components/ui.js';
import { NPCManager } from './components/npcs.js';

// Create loading screen
const loadingScreen = document.createElement('div');
loadingScreen.style.position = 'fixed';
loadingScreen.style.top = '0';
loadingScreen.style.left = '0';
loadingScreen.style.width = '100%';
loadingScreen.style.height = '100%';
loadingScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
loadingScreen.style.display = 'flex';
loadingScreen.style.flexDirection = 'column';
loadingScreen.style.justifyContent = 'center';
loadingScreen.style.alignItems = 'center';
loadingScreen.style.zIndex = '1000';
loadingScreen.style.color = 'white';
loadingScreen.style.fontFamily = 'Arial, sans-serif';

const loadingText = document.createElement('h2');
loadingText.textContent = 'Loading Metaverse...';
loadingScreen.appendChild(loadingText);

const progressContainer = document.createElement('div');
progressContainer.style.width = '80%';
progressContainer.style.maxWidth = '400px';
progressContainer.style.height = '20px';
progressContainer.style.backgroundColor = '#333';
progressContainer.style.borderRadius = '10px';
progressContainer.style.overflow = 'hidden';
progressContainer.style.marginTop = '20px';
loadingScreen.appendChild(progressContainer);

const progressBar = document.createElement('div');
progressBar.style.width = '0%';
progressBar.style.height = '100%';
progressBar.style.backgroundColor = '#4CAF50';
progressBar.style.transition = 'width 0.3s ease';
progressContainer.appendChild(progressBar);

document.body.appendChild(loadingScreen);

// Setup loading manager
const loadingManager = new THREE.LoadingManager();
loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
  const progress = (itemsLoaded / itemsTotal) * 100;
  progressBar.style.width = progress + '%';
  loadingText.textContent = `Loading Metaverse... ${Math.round(progress)}%`;
  console.log(`Loading file: ${url} (${itemsLoaded}/${itemsTotal})`);
};

loadingManager.onLoad = function() {
  // Hide loading screen when everything is loaded
  setTimeout(() => {
    loadingScreen.style.opacity = '0';
    loadingScreen.style.transition = 'opacity 1s ease';
    setTimeout(() => {
      document.body.removeChild(loadingScreen);
    }, 1000);
  }, 500);
};

loadingManager.onError = function(url) {
  console.error('Error loading:', url);
  loadingText.textContent = 'Error loading some assets. The experience may be limited.';
  loadingText.style.color = '#ff5555';
  
  // Still hide loading screen after a delay
  setTimeout(() => {
    loadingScreen.style.opacity = '0';
    loadingScreen.style.transition = 'opacity 1s ease';
    setTimeout(() => {
      document.body.removeChild(loadingScreen);
    }, 1000);
  }, 2000);
};

// Game state
const gameState = {
  players: {},
  username: 'Mark Z. ' + Math.floor(Math.random() * 1000),
  settings: {
    volume: 50,
    graphics: 'medium',
  }
};

// Initialize Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Setup lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 200, 100);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
scene.add(directionalLight);

// Create environment
const environment = createEnvironment(scene, loadingManager);

// Create player avatar
console.log('Creating player avatar...');
try {
  let playerAvatar = createPureAvatar(scene, gameState.username, loadingManager);
  playerAvatar.position.set(0, 0, 0); // Set player at ground level
  scene.add(playerAvatar);
  
  // Log the player avatar structure to help debug
  console.log('Player avatar structure:', playerAvatar);
  
  // Setup controls
  const controls = setupControls(camera, playerAvatar, renderer.domElement, gameState);
  
  // Setup UI
  setupUI(gameState);
  
  // Create NPC manager and initialize NPCs
  const npcManager = new NPCManager(scene, loadingManager);
  npcManager.initialize();
  
  // Setup socket connection for multiplayer
  let socket;
  try {
    socket = io('http://localhost:3000');
    
    socket.on('connect', () => {
      console.log('Connected to server');
      
      // Send player info to server
      socket.emit('player-join', {
        id: socket.id,
        username: gameState.username,
        position: {
          x: playerAvatar.position.x,
          y: playerAvatar.position.y,
          z: playerAvatar.position.z
        },
        rotation: playerAvatar.rotation.y
      });
    });
    
    socket.on('players-update', (players) => {
      // Update other players
      Object.keys(players).forEach(id => {
        if (id !== socket.id) {
          const playerData = players[id];
          
          // If player doesn't exist in our game state, create them
          if (!gameState.players[id]) {
            const newPlayerAvatar = createAvatar(scene, playerData.username, loadingManager);
            gameState.players[id] = {
              avatar: newPlayerAvatar,
              username: playerData.username
            };
            scene.add(newPlayerAvatar);
          }
          
          // Update player position and rotation
          const avatar = gameState.players[id].avatar;
          avatar.position.set(playerData.position.x, playerData.position.y, playerData.position.z);
          avatar.rotation.y = playerData.rotation;
          
          // Update animation state if available
          if (avatar.setMoving && playerData.isMoving !== undefined) {
            avatar.setMoving(playerData.isMoving);
          }
        }
      });
      
      // Remove disconnected players
      Object.keys(gameState.players).forEach(id => {
        if (!players[id]) {
          scene.remove(gameState.players[id].avatar);
          delete gameState.players[id];
        }
      });
    });
    
    socket.on('player-joined', (data) => {
      console.log(`${data.username} joined the game`);
    });
    
    socket.on('player-left', (id) => {
      if (gameState.players[id]) {
        console.log(`${gameState.players[id].username} left the game`);
        scene.remove(gameState.players[id].avatar);
        delete gameState.players[id];
      }
    });
    
  } catch (error) {
    console.error('Failed to connect to server:', error);
  }
  
  // Handle window resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  
  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    
    // Calculate delta time for smooth animation
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
    lastTime = currentTime;
    
    // Update controls
    controls.update();
    
    // Update avatar animations
    updateAvatarAnimations();
    
    // Check if player is moving and update animation state
    const isMoving = controls.moveForward || controls.moveBackward || 
                     controls.moveLeft || controls.moveRight;
    
    if (playerAvatar && playerAvatar.setMoving) {
      playerAvatar.setMoving(isMoving);
    }
    
    // Update NPCs
    npcManager.update(deltaTime, playerAvatar.position);
    
    // Update player position on server
    if (socket && socket.connected) {
      socket.emit('player-update', {
        position: {
          x: playerAvatar.position.x,
          y: playerAvatar.position.y,
          z: playerAvatar.position.z
        },
        rotation: playerAvatar.rotation.y,
        isMoving: isMoving
      });
    }
    
    // Render scene
    renderer.render(scene, camera);
  }
  
  // Initialize time for animation
  let lastTime = performance.now();
  
  animate();
  
  // Debug functionality
  const showDebugButton = document.getElementById('show-debug');
  const debugPanel = document.getElementById('debug-panel');
  const reloadModelButton = document.getElementById('reload-model');
  const resetModelButton = document.getElementById('reset-model');
  const modelScaleSlider = document.getElementById('model-scale');
  const modelYPosSlider = document.getElementById('model-y-pos');
  const modelRotationSlider = document.getElementById('model-rotation');
  const modelVerticalScaleSlider = document.getElementById('model-vertical-scale');
  const scaleValueSpan = document.getElementById('scale-value');
  const yPosValueSpan = document.getElementById('y-pos-value');
  const rotationValueSpan = document.getElementById('rotation-value');
  const verticalScaleValueSpan = document.getElementById('vertical-scale-value');
  const toggleDebugButton = document.getElementById('toggle-debug');
  const toggleNPCsButton = document.getElementById('toggle-npcs');
  
  if (showDebugButton) {
    showDebugButton.addEventListener('click', () => {
      debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
      showDebugButton.style.display = debugPanel.style.display === 'block' ? 'none' : 'block';
    });
  }
  
  if (debugPanel) {
    // Close debug panel when clicking outside
    document.addEventListener('click', (event) => {
      if (debugPanel.style.display === 'block' && 
          !debugPanel.contains(event.target) && 
          event.target !== showDebugButton) {
        debugPanel.style.display = 'none';
        showDebugButton.style.display = 'block';
      }
    });
    
    // Reload model button
    if (reloadModelButton) {
      reloadModelButton.addEventListener('click', () => {
        console.log('Reloading player avatar model...');
        
        // Remove current avatar from scene
        scene.remove(playerAvatar);
        
        // Remove from mixers map to stop animations
        try {
          // Import mixers from avatar.js if needed
          const mixers = window.mixers || {};
          if (mixers && typeof mixers.delete === 'function' && mixers.has(playerAvatar)) {
            mixers.delete(playerAvatar);
          }
        } catch (error) {
          console.error('Error cleaning up mixers:', error);
        }
        
        // Dispose of geometries and materials
        try {
          playerAvatar.traverse((node) => {
            if (node.geometry) {
              node.geometry.dispose();
            }
            
            if (node.material) {
              if (Array.isArray(node.material)) {
                node.material.forEach(material => material.dispose());
              } else {
                node.material.dispose();
              }
            }
          });
        } catch (error) {
          console.error('Error disposing resources:', error);
        }
        
        // Set to null to help garbage collection
        playerAvatar = null;
        
        // Force reload by clearing cache
        window.zuckerbergModelCache = null;
        window.zuckerbergAnimations = null;
        window.isLoadingModel = false;
        
        // Create new avatar using our pure avatar function
        try {
          playerAvatar = createPureAvatar(scene, gameState.username, loadingManager);
          playerAvatar.position.set(0, 0, 0);
          scene.add(playerAvatar);
          console.log('Player avatar model reload requested');
        } catch (error) {
          console.error('Error creating new avatar:', error);
        }
      });
    }
    
    // Reset model button
    if (resetModelButton) {
      resetModelButton.addEventListener('click', () => {
        console.log('Resetting model to default settings...');
        
        // Reset sliders to default values for the new model
        if (modelScaleSlider) {
          modelScaleSlider.value = 0.6;
          scaleValueSpan.textContent = '0.6';
        }
        
        if (modelYPosSlider) {
          modelYPosSlider.value = 0.0;
          yPosValueSpan.textContent = '0.0';
        }
        
        if (modelVerticalScaleSlider) {
          modelVerticalScaleSlider.value = 1.0;
          verticalScaleValueSpan.textContent = '1.0';
        }
        
        if (modelRotationSlider) {
          modelRotationSlider.value = 3.14;
          rotationValueSpan.textContent = '3.14';
        }
        
        // Apply default settings to the model
        playerAvatar.traverse((node) => {
          if (node.isGroup && node !== playerAvatar) {
            node.scale.set(0.6, 0.6, 0.6);
            node.position.y = 0.0;
            node.rotation.y = Math.PI;
          }
        });
        
        console.log('Model reset to default settings');
      });
    }
    
    // Model scale slider
    if (modelScaleSlider) {
      modelScaleSlider.addEventListener('input', () => {
        const scale = parseFloat(modelScaleSlider.value);
        scaleValueSpan.textContent = scale.toFixed(1);
        
        // Find the model in the player avatar
        playerAvatar.traverse((node) => {
          if (node.isGroup && node !== playerAvatar) {
            // Preserve the Y scale when changing overall scale
            const yScale = node.scale.y / node.scale.x;
            node.scale.set(scale, scale * yScale, scale);
          }
        });
      });
    }
    
    // Model Y position slider
    if (modelYPosSlider) {
      modelYPosSlider.addEventListener('input', () => {
        const yPos = parseFloat(modelYPosSlider.value);
        yPosValueSpan.textContent = yPos.toFixed(1);
        
        // Find the model in the player avatar
        playerAvatar.traverse((node) => {
          if (node.isGroup && node !== playerAvatar) {
            node.position.y = yPos;
          }
        });
      });
    }
    
    // Model vertical scale slider
    if (modelVerticalScaleSlider) {
      modelVerticalScaleSlider.addEventListener('input', () => {
        const verticalScale = parseFloat(modelVerticalScaleSlider.value);
        verticalScaleValueSpan.textContent = verticalScale.toFixed(1);
        
        // Find the model in the player avatar
        playerAvatar.traverse((node) => {
          if (node.isGroup && node !== playerAvatar) {
            // Keep the X and Z scales the same, only change Y
            const currentScale = node.scale.x;
            node.scale.set(currentScale, verticalScale, currentScale);
          }
        });
      });
    }
    
    // Model rotation slider
    if (modelRotationSlider) {
      modelRotationSlider.addEventListener('input', () => {
        const rotation = parseFloat(modelRotationSlider.value);
        rotationValueSpan.textContent = rotation.toFixed(2);
        
        // Find the model in the player avatar
        playerAvatar.traverse((node) => {
          if (node.isGroup && node !== playerAvatar) {
            node.rotation.y = rotation;
          }
        });
      });
    }
    
    // Toggle debug visuals
    if (toggleDebugButton) {
      toggleDebugButton.addEventListener('click', () => {
        // Toggle debug mode
        window.DEBUG_MODE = !window.DEBUG_MODE;
        toggleDebugButton.textContent = window.DEBUG_MODE ? 'Hide Debug Visuals' : 'Show Debug Visuals';
        
        // Toggle visibility of debug helpers
        playerAvatar.traverse((node) => {
          if (node.isHelper || 
              (node.name && (node.name.includes('helper') || 
                            node.name.includes('debug') || 
                            node.name.includes('collision') || 
                            node.name.includes('bound')))) {
            node.visible = window.DEBUG_MODE;
          }
        });
      });
    }
    
    // Toggle NPCs
    if (toggleNPCsButton) {
      let npcsEnabled = true;
      toggleNPCsButton.textContent = 'Disable NPCs';
      
      toggleNPCsButton.addEventListener('click', () => {
        npcsEnabled = !npcsEnabled;
        toggleNPCsButton.textContent = npcsEnabled ? 'Disable NPCs' : 'Enable NPCs';
        
        if (npcsEnabled) {
          // Re-initialize NPCs
          npcManager.initialize();
        } else {
          // Remove all NPCs
          npcManager.removeAll();
        }
      });
    }
  }
  
  // Add control help panel close button functionality
  const controlsHelp = document.getElementById('controls-help');
  const closeControlsHelpButton = document.getElementById('close-controls-help');
  
  if (closeControlsHelpButton && controlsHelp) {
    closeControlsHelpButton.addEventListener('click', () => {
      controlsHelp.style.display = 'none';
    });
  }
} catch (error) {
  console.error('Error initializing game:', error);
  // Display error message to user
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '50%';
  errorDiv.style.left = '50%';
  errorDiv.style.transform = 'translate(-50%, -50%)';
  errorDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
  errorDiv.style.color = 'white';
  errorDiv.style.padding = '20px';
  errorDiv.style.borderRadius = '10px';
  errorDiv.style.fontFamily = 'Arial, sans-serif';
  errorDiv.style.zIndex = '1000';
  errorDiv.innerHTML = `<h2>Error Loading Game</h2><p>${error.message}</p><p>Please check the console for more details.</p>`;
  document.body.appendChild(errorDiv);
}