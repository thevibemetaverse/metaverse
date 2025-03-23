import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createAvatar, createPureAvatar } from './avatar.js';

// Class to manage NPCs
export class NPCManager {
  constructor(scene, loadingManager) {
    this.scene = scene;
    this.loadingManager = loadingManager;
    this.npcs = [];
    this.maxNPCs = 5; // Maximum number of regular NPCs to spawn
    this.spawnRadius = 30; // Maximum distance from center to spawn NPCs
    this.moveSpeed = 2; // Movement speed of NPCs
    this.changeDirectionInterval = 3; // Time in seconds before changing direction
    this.giantNPCs = []; // Array to store giant Zuckerberg NPCs
    
    // Poke mechanic will be set later when camera is available
    this.pokeMechanic = null;
    
    // Multiplayer synchronization
    this.isNPCHost = false; // Whether this client is responsible for NPC updates
    this.syncInterval = 1000; // How often to sync NPCs in ms (1 second)
    this.lastSyncTime = 0; // Last time NPCs were synced
    
    // Clean up any existing name labels from previous sessions
    this.cleanupExistingLabels();
  }

  // Clean up any existing name labels
  cleanupExistingLabels() {
    const nameLabels = document.querySelectorAll('.npc-name');
    if (nameLabels.length > 0) {
      console.log(`Cleaning up ${nameLabels.length} existing name labels`);
      nameLabels.forEach(label => {
        try {
          document.body.removeChild(label);
        } catch (e) {
          console.log('Error removing existing name label:', e);
        }
      });
    }
  }

  // Set the poke mechanic
  setPokeMechanic(pokeMechanic) {
    this.pokeMechanic = pokeMechanic;
  }
  
  // Set this client as the NPC host
  setAsNPCHost() {
    this.isNPCHost = true;
    console.log('This client is now the NPC host');
  }
  
  // Set up multiplayer - pass socket instance
  setupMultiplayer(socket) {
    this.socket = socket;
    
    // Default to being the NPC host if we're the first player
    if (socket && socket.id && !this.isNPCHost) {
      this.setAsNPCHost();
    }
    
    // Listen for NPC updates from the server
    if (socket) {
      // Handle NPC updates received from server
      socket.on('npcs-update', (npcsData) => {
        // Only apply updates if we're not the host
        if (!this.isNPCHost) {
          this.applyNPCsFromServer(npcsData);
        }
      });
      
      // Listen for becoming the NPC host (if the original host disconnects)
      socket.on('become-npc-host', () => {
        this.setAsNPCHost();
        // Send the current NPC state to the server
        this.syncNPCsToServer();
      });
    }
  }
  
  // Apply NPCs data received from the server
  applyNPCsFromServer(npcsData) {
    console.log('Applying NPC data from server');
    
    // First, remove all existing NPCs
    this.removeAll();
    
    // Create NPCs from server data
    if (npcsData.regularNPCs && npcsData.regularNPCs.length > 0) {
      npcsData.regularNPCs.forEach(npcData => {
        this.createNPCFromData(npcData);
      });
    }
    
    // Create giant NPCs from server data
    if (npcsData.giantNPCs && npcsData.giantNPCs.length > 0) {
      npcsData.giantNPCs.forEach(giantData => {
        this.createGiantNPCFromData(giantData);
      });
    }
  }
  
  // Create a regular NPC from server data
  createNPCFromData(npcData) {
    // Load the Metaverse Explorer model
    const gltfLoader = new GLTFLoader(this.loadingManager);
    
    gltfLoader.load(
      '/assets/models/metaverse-explorer.glb',
      (gltf) => {
        const model = gltf.scene;
        const animations = gltf.animations;
        
        // Scale and position the model
        model.scale.set(0.8, 0.8, 0.8);
        model.position.set(npcData.position.x, npcData.position.y, npcData.position.z);
        model.rotation.y = npcData.rotation || 0;
        
        // Add shadows
        model.traverse(function(node) {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
        
        // Add the model to the scene
        this.scene.add(model);
        
        // Register as pokeable if poke mechanic is available
        if (this.pokeMechanic) {
          this.pokeMechanic.registerPokeableObject(model, npcData.name);
        }
        
        // Setup animations if available
        let mixer = null;
        let runAction = null;
        let idleAction = null;
        
        if (animations && animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);
          
          // Find a running or walking animation
          for (const animation of animations) {
            // Convert to lowercase to make comparison easier
            const lowerName = animation.name.toLowerCase();
            
            // Check for run or walk animations
            if (lowerName.includes('run') || lowerName.includes('walk')) {
              runAction = mixer.clipAction(animation);
              break; // Found a running animation, exit the loop
            }
            
            // Check for idle animations as fallback
            if (lowerName.includes('idle') || lowerName.includes('stand')) {
              idleAction = mixer.clipAction(animation);
              // Don't break here, continue looking for a running animation
            }
          }
          
          // If we found a run animation, play it
          if (runAction) {
            runAction.reset().play();
          } else if (idleAction) {
            // Fallback to idle if no run animation
            idleAction.reset().play();
          }
        }
        
        // Store NPC data with the data from server
        const npc = {
          model: model,
          name: npcData.name,
          position: model.position,
          // Use server direction or create a new one
          direction: npcData.direction ? 
            new THREE.Vector3(npcData.direction.x, npcData.direction.y, npcData.direction.z) : 
            new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(),
          timeToChangeDirection: npcData.timeToChangeDirection || (Math.random() * this.changeDirectionInterval),
          mixer: mixer,
          runAction: runAction,
          idleAction: idleAction,
          serverId: npcData.id // Store server ID if available
        };
        
        this.npcs.push(npc);
      },
      undefined,
      (error) => {
        console.error('Error loading synchronized NPC model:', error);
      }
    );
  }
  
  // Create a giant NPC from server data
  createGiantNPCFromData(giantData) {
    // Load the Metaverse Explorer model
    const gltfLoader = new GLTFLoader(this.loadingManager);
    
    gltfLoader.load(
      '/assets/models/metaverse-explorer.glb', // Use same model for consistency
      (gltf) => {
        const model = gltf.scene;
        const animations = gltf.animations;
        
        // Scale and position the model - make it MUCH bigger (50x instead of 3x)
        model.scale.set(50, 50, 50);
        model.position.set(giantData.position.x, giantData.position.y, giantData.position.z);
        
        // Add shadows
        model.traverse(function(node) {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
        
        // Add the model to the scene
        this.scene.add(model);
        
        // Register as pokeable if poke mechanic is available
        if (this.pokeMechanic) {
          this.pokeMechanic.registerPokeableObject(model, giantData.name);
        }
        
        // Setup animations if available
        let mixer = null;
        let idleAction = null;
        
        if (animations && animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);
          
          // Find idle animation
          for (const animation of animations) {
            const lowerName = animation.name.toLowerCase();
            
            // Check for idle animations
            if (lowerName.includes('idle') || lowerName.includes('stand')) {
              idleAction = mixer.clipAction(animation);
              break; // Found an idle animation, exit the loop
            }
          }
          
          // Play idle animation if found
          if (idleAction) {
            idleAction.reset().play();
          }
        }
        
        // Store giant NPC data
        const giant = {
          model: model,
          name: giantData.name,
          position: model.position,
          mixer: mixer,
          idleAction: idleAction,
          serverId: giantData.id // Store server ID if available
        };
        
        this.giantNPCs.push(giant);
      },
      undefined,
      (error) => {
        console.error('Error loading synchronized giant NPC model:', error);
      }
    );
  }
  
  // Get serializable NPC data to send to server
  getNPCsData() {
    // Prepare regular NPCs data
    const regularNPCs = this.npcs.map(npc => {
      return {
        id: npc.serverId || crypto.randomUUID(),
        name: npc.name,
        position: {
          x: npc.position.x,
          y: npc.position.y,
          z: npc.position.z
        },
        rotation: npc.model.rotation.y,
        direction: {
          x: npc.direction.x,
          y: npc.direction.y,
          z: npc.direction.z
        },
        timeToChangeDirection: npc.timeToChangeDirection
      };
    });
    
    // Prepare giant NPCs data
    const giantNPCs = this.giantNPCs.map(giant => {
      return {
        id: giant.serverId || crypto.randomUUID(),
        name: giant.name,
        position: {
          x: giant.position.x,
          y: giant.position.y,
          z: giant.position.z
        }
      };
    });
    
    return {
      regularNPCs,
      giantNPCs
    };
  }
  
  // Sync NPCs to the server if we're the host
  syncNPCsToServer() {
    if (this.socket && this.isNPCHost) {
      const npcsData = this.getNPCsData();
      
      // Send to server
      this.socket.emit('npcs-update', npcsData);
      console.log('Sent NPC update to server');
    }
  }
  
  // Initialize NPCs for multiplayer
  initializeForMultiplayer() {
    if (this.socket && this.isNPCHost) {
      // Create NPCs locally first
      this.initialize();
      
      // Then send to server
      const npcsData = this.getNPCsData();
      this.socket.emit('npcs-initialize', npcsData);
      console.log('Initialized NPCs for multiplayer');
    }
  }

  // Initialize NPCs
  initialize() {
    // Create initial NPCs using metaverse-explorer.glb
    for (let i = 0; i < this.maxNPCs; i++) {
      this.spawnNPC();
    }
    
    // Spawn 2 giant Zuckerberg NPCs
    this.spawnGiantZuckerberg(50, 50); // Position at x=50, z=50
    this.spawnGiantZuckerberg(-50, -50); // Position at x=-50, z=-50
  }

  // Spawn a single NPC using metaverse-explorer.glb
  spawnNPC() {
    // Generate random position within spawn radius
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * this.spawnRadius;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    // Create NPC with a fun name instead of Mark Z.
    const npcNames = ["Metaverse Citizen", "Digital Dweller", "Virtual Visitor", "Pixel Person", "Data Denizen"];
    const npcName = npcNames[Math.floor(Math.random() * npcNames.length)];
    
    // Load the Metaverse Explorer model for regular NPCs
    const gltfLoader = new GLTFLoader(this.loadingManager);
    
    gltfLoader.load(
      '/assets/models/metaverse-explorer.glb',
      (gltf) => {
        const model = gltf.scene;
        const animations = gltf.animations;
        
        // Scale and position the model
        model.scale.set(0.8, 0.8, 0.8);
        model.position.set(x, 0, z);
        
        // Add shadows
        model.traverse(function(node) {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
        
        // Add the model to the scene
        this.scene.add(model);
        
        // Register as pokeable if poke mechanic is available
        if (this.pokeMechanic) {
          this.pokeMechanic.registerPokeableObject(model, npcName);
        }
        
        // Setup animations if available
        let mixer = null;
        let runAction = null;
        let idleAction = null;
        
        if (animations && animations.length > 0) {
          // Create animation mixer
          mixer = new THREE.AnimationMixer(model);
          
          // Log available animations to help with debugging
          console.log(`NPC ${npcName} animations:`, animations.map(a => a.name).join(', '));
          
          // Find run and idle animations
          animations.forEach((clip) => {
            const lowerName = clip.name.toLowerCase();
            if (lowerName.includes('run') || lowerName.includes('walk')) {
              console.log(`Found running animation: ${clip.name}`);
              runAction = mixer.clipAction(clip);
            } else if (lowerName.includes('idle') || lowerName.includes('stand')) {
              console.log(`Found idle animation: ${clip.name}`);
              idleAction = mixer.clipAction(clip);
            }
          });
          
          // If we couldn't find specific animations, try to use any animation
          if (!runAction && animations.length > 0) {
            // Try to find the most likely running animation by name or use the first animation
            for (const clip of animations) {
              const lowerName = clip.name.toLowerCase();
              // Common names for running/walking animations
              if (lowerName.includes('run') || lowerName.includes('walk') || 
                  lowerName.includes('jog') || lowerName.includes('move')) {
                runAction = mixer.clipAction(clip);
                console.log(`Using animation ${clip.name} as running animation`);
                break;
              }
            }
            
            // If still no running animation, use the first animation
            if (!runAction && animations.length > 0) {
              runAction = mixer.clipAction(animations[0]);
              console.log(`Using first animation ${animations[0].name} as running animation`);
            }
          }
          
          // If we found a run animation, play it
          if (runAction) {
            runAction.reset().play();
            console.log(`Playing running animation for NPC ${npcName}`);
          } else if (idleAction) {
            // Fallback to idle if no run animation
            idleAction.reset().play();
            console.log(`No running animation found, playing idle for NPC ${npcName}`);
          }
        }
        
        // Store NPC data
        const npc = {
          model: model,
          name: npcName,
          position: model.position,
          direction: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(),
          timeToChangeDirection: Math.random() * this.changeDirectionInterval,
          mixer: mixer,
          runAction: runAction,
          idleAction: idleAction
        };
        
        this.npcs.push(npc);
      },
      undefined,
      (error) => {
        console.error('Error loading Metaverse Explorer model:', error);
        // Try alternative model or create a basic avatar
        this.tryAlternativeZuckerberg(x, z);
      }
    );
  }

  // Spawn a giant Zuckerberg NPC
  spawnGiantZuckerberg(x, z) {
    // Create a giant Zuckerberg NPC with a more interesting name
    const npcName = `Colossal Entity`;
    
    // Load the Metaverse Explorer model
    const gltfLoader = new GLTFLoader(this.loadingManager);
    
    gltfLoader.load(
      '/assets/models/metaverse-explorer.glb', // Use same model for consistency
      (gltf) => {
        const model = gltf.scene;
        const animations = gltf.animations;
        
        // Scale and position the model - make it MUCH bigger (50x instead of 3x)
        model.scale.set(50, 50, 50);
        model.position.set(x, 0, z);
        
        // Add shadows
        model.traverse(function(node) {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
        
        // Add the model to the scene
        this.scene.add(model);
        
        // Register as pokeable if poke mechanic is available
        if (this.pokeMechanic) {
          this.pokeMechanic.registerPokeableObject(model, npcName);
        }
        
        // Setup animations if available
        let mixer = null;
        let idleAction = null;
        
        if (animations && animations.length > 0) {
          // Create animation mixer
          mixer = new THREE.AnimationMixer(model);
          
          // Log available animations to help with debugging
          console.log(`Giant NPC animations:`, animations.map(a => a.name).join(', '));
          
          // Find idle animation
          animations.forEach((clip) => {
            const lowerName = clip.name.toLowerCase();
            if (lowerName.includes('idle') || lowerName.includes('stand')) {
              console.log(`Found idle animation: ${clip.name}`);
              idleAction = mixer.clipAction(clip);
            }
          });
          
          // If we couldn't find an idle animation, try to use any animation
          if (!idleAction && animations.length > 0) {
            // Try to find the most likely idle animation by name or use the first animation
            for (const clip of animations) {
              const lowerName = clip.name.toLowerCase();
              if (lowerName.includes('idle') || lowerName.includes('stand') || 
                  lowerName.includes('pose') || lowerName.includes('static')) {
                idleAction = mixer.clipAction(clip);
                console.log(`Using animation ${clip.name} as idle animation`);
                break;
              }
            }
            
            // If still no idle animation, use the first animation
            if (!idleAction && animations.length > 0) {
              idleAction = mixer.clipAction(animations[0]);
              console.log(`Using first animation ${animations[0].name} as idle animation`);
            }
          }
          
          // Play idle animation if found
          if (idleAction) {
            idleAction.reset().play();
            console.log(`Playing idle animation for Giant Zuck`);
          }
        }
        
        // Store giant NPC data
        const giant = {
          model: model,
          name: npcName,
          position: model.position,
          mixer: mixer,
          idleAction: idleAction
        };
        
        this.giantNPCs.push(giant);
      },
      undefined,
      (error) => {
        console.error('Error loading giant Metaverse Explorer model:', error);
        // Try alternative model or create a basic avatar
        this.tryAlternativeZuckerberg(x, z, true);
      }
    );
  }

  // Try to load an alternative Metaverse Explorer model
  tryAlternativeZuckerberg(x, z, isGiant = false) {
    // For giant NPCs, try metaverse-explorer.glb first before falling back to createAvatar
    if (isGiant) {
      const gltfLoader = new GLTFLoader(this.loadingManager);
      gltfLoader.load(
        '/assets/models/metaverse-explorer.glb', // Use metaverse-explorer.glb for giant NPCs
        (gltf) => {
          const model = gltf.scene;
          const animations = gltf.animations;
          
          // Scale and position the model - make it MUCH bigger (50x)
          model.scale.set(50, 50, 50);
          model.position.set(x, 0, z);
          
          // Add shadows
          model.traverse(function(node) {
            if (node.isMesh) {
              node.castShadow = true;
              node.receiveShadow = true;
            }
          });
          
          // Add the model to the scene
          this.scene.add(model);
          
          // Register as pokeable if poke mechanic is available
          if (this.pokeMechanic) {
            this.pokeMechanic.registerPokeableObject(model, "Colossal Entity");
          }
          
          // Setup animations if available
          let mixer = null;
          let idleAction = null;
          
          if (animations && animations.length > 0) {
            // Create animation mixer
            mixer = new THREE.AnimationMixer(model);
            
            // Log available animations
            console.log(`Alternative Giant NPC animations:`, animations.map(a => a.name).join(', '));
            
            // Find idle animation
            for (const clip of animations) {
              const lowerName = clip.name.toLowerCase();
              if (lowerName.includes('idle') || lowerName.includes('stand')) {
                idleAction = mixer.clipAction(clip);
                console.log(`Found idle animation: ${clip.name}`);
                break;
              }
            }
            
            // If no idle animation found, use first animation
            if (!idleAction && animations.length > 0) {
              idleAction = mixer.clipAction(animations[0]);
              console.log(`Using first animation ${animations[0].name} as idle animation`);
            }
            
            // Play idle animation if found
            if (idleAction) {
              idleAction.reset().play();
              console.log(`Playing idle animation for Alternative Giant NPC`);
            }
          }
          
          // Store giant NPC data
          const giant = {
            model: model,
            name: "Colossal Entity",
            position: model.position,
            mixer: mixer,
            idleAction: idleAction
          };
          
          this.giantNPCs.push(giant);
        },
        undefined,
        (error) => {
          console.error('Error loading alternative giant Metaverse Explorer model:', error);
          // Fall back to createAvatar
          this.createFallbackGiant(x, z);
        }
      );
    } else {
      // For regular NPCs, use createAvatar directly
      this.createFallbackNPC(x, z);
    }
  }
  
  // Create a fallback giant NPC using createAvatar
  createFallbackGiant(x, z) {
    // Create a basic avatar as fallback using createPureAvatar instead of createAvatar
    const avatar = createPureAvatar(this.scene, "Colossal Entity", this.loadingManager);
    
    // Scale and position the avatar - make it MUCH bigger (50x)
    avatar.scale.set(50, 50, 50);
    avatar.position.set(x, 0, z);
    
    // Add the avatar to the scene
    this.scene.add(avatar);
    
    // Store NPC data
    const giant = {
      model: avatar,
      name: "Colossal Entity",
      position: avatar.position,
      // The avatar created by createPureAvatar should already have animation setup
      mixer: avatar.userData.mixer || null,
      idleAction: avatar.userData.idleAction || null
    };
    this.giantNPCs.push(giant);
    
    // If the avatar has animation controls, play idle animation
    if (avatar.userData && avatar.userData.animationActions) {
      console.log('Fallback Giant NPC animations:', Object.keys(avatar.userData.animationActions).join(', '));
      
      // Try to play idle animation
      if (avatar.playAnimation) {
        // Try to find idle animation
        for (const name in avatar.userData.animationActions) {
          if (name.toLowerCase().includes('idle') || name.toLowerCase().includes('stand')) {
            avatar.playAnimation(name);
            console.log(`Playing idle animation ${name} for Fallback Giant Zuck`);
            break;
          }
        }
      }
    }
    
    // Register as pokeable if poke mechanic is available
    if (this.pokeMechanic) {
      this.pokeMechanic.registerPokeableObject(avatar, "Colossal Entity");
    }
  }
  
  // Create a fallback regular NPC using createAvatar
  createFallbackNPC(x, z) {
    // Create a basic avatar as fallback with a fun name using createPureAvatar
    const npcNames = ["Metaverse Citizen", "Digital Dweller", "Virtual Visitor", "Pixel Person", "Data Denizen"];
    const npcName = npcNames[Math.floor(Math.random() * npcNames.length)];
    const avatar = createPureAvatar(this.scene, npcName, this.loadingManager);
    
    // Position the avatar
    avatar.position.set(x, 0, z);
    
    // Add the avatar to the scene
    this.scene.add(avatar);
    
    // Store NPC data
    const npc = {
      model: avatar,
      name: npcName,
      position: avatar.position,
      direction: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(),
      timeToChangeDirection: Math.random() * this.changeDirectionInterval,
      // The avatar created by createPureAvatar should already have animation setup
      mixer: avatar.userData.mixer || null,
      runAction: avatar.userData.runAction || null,
      idleAction: avatar.userData.idleAction || null
    };
    this.npcs.push(npc);
    
    // If the avatar has animation controls, play running animation
    if (avatar.userData && avatar.userData.animationActions) {
      console.log('Fallback NPC animations:', Object.keys(avatar.userData.animationActions).join(', '));
      
      // Try to find and play running animation
      if (avatar.playAnimation) {
        // Try to find running animation
        let foundRunning = false;
        for (const name in avatar.userData.animationActions) {
          const lowerName = name.toLowerCase();
          if (lowerName.includes('run') || lowerName.includes('walk') || 
              lowerName.includes('jog') || lowerName.includes('move')) {
            avatar.playAnimation(name);
            console.log(`Playing running animation ${name} for Fallback NPC`);
            foundRunning = true;
            break;
          }
        }
        
        // If no running animation found, use the first animation
        if (!foundRunning && Object.keys(avatar.userData.animationActions).length > 0) {
          const firstAnim = Object.keys(avatar.userData.animationActions)[0];
          avatar.playAnimation(firstAnim);
          console.log(`No running animation found, playing ${firstAnim} for Fallback NPC`);
        }
      }
      
      // Also try the setMoving method as a backup
      if (avatar.setMoving) {
        avatar.setMoving(true);
        console.log('Set Fallback NPC to moving state');
      }
    }
    
    // Register as pokeable if poke mechanic is available
    if (this.pokeMechanic) {
      this.pokeMechanic.registerPokeableObject(avatar, npcName);
    }
  }

  // Add name label above NPC - modified to do nothing
  addNameLabel(model, name, height = 3) {
    // Method now does nothing - name labels are disabled
    console.log('Name labels are disabled');
  }

  // Update label position to follow NPC - modified to do nothing
  updateLabelPosition(model, labelElement) {
    // Method now does nothing - name labels are disabled
    // No need to update positions of non-existent labels
  }

  // Update method to be called in animation loop
  update(deltaTime, playerPosition) {
    // Only update NPC movement if we're the host
    if (this.isNPCHost) {
      // Update NPC positions and animations
      for (let i = 0; i < this.npcs.length; i++) {
        const npc = this.npcs[i];
        
        // Update direction change timer
        npc.timeToChangeDirection -= deltaTime;
        if (npc.timeToChangeDirection <= 0) {
          // Change to a new random direction
          npc.direction.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
          npc.timeToChangeDirection = Math.random() * this.changeDirectionInterval;
        }
        
        // Move NPC in current direction
        const moveDistance = this.moveSpeed * deltaTime;
        npc.position.x += npc.direction.x * moveDistance;
        npc.position.z += npc.direction.z * moveDistance;
        
        // Rotate NPC to face movement direction
        if (npc.direction.length() > 0.1) {
          const targetRotation = Math.atan2(npc.direction.x, npc.direction.z);
          npc.model.rotation.y = targetRotation;
        }
      }
      
      // Sync to server if it's time
      if (this.socket) {
        const now = Date.now();
        if (now - this.lastSyncTime > this.syncInterval) {
          this.syncNPCsToServer();
          this.lastSyncTime = now;
        }
      }
    }
    
    // Always update animations for all clients
    for (let i = 0; i < this.npcs.length; i++) {
      const npc = this.npcs[i];
      
      // Update animation mixer if available
      if (npc.mixer) {
        npc.mixer.update(deltaTime);
      }
    }
    
    // Update giant NPCs (if any)
    for (let i = 0; i < this.giantNPCs.length; i++) {
      const giant = this.giantNPCs[i];
      
      // Update animation mixer if available
      if (giant.mixer) {
        giant.mixer.update(deltaTime);
      }
    }
  }

  // Remove all NPCs
  removeAll() {
    // Remove regular NPCs
    this.npcs.forEach(npc => {
      // Remove any existing name labels from the DOM
      if (npc.model && npc.model.userData && npc.model.userData.nameLabel) {
        try {
          document.body.removeChild(npc.model.userData.nameLabel);
        } catch (e) {
          console.log('Error removing name label:', e);
        }
      }
      this.scene.remove(npc.model);
    });
    this.npcs = [];
    
    // Remove giant NPCs
    this.giantNPCs.forEach(giant => {
      // Remove any existing name labels from the DOM
      if (giant.model && giant.model.userData && giant.model.userData.nameLabel) {
        try {
          document.body.removeChild(giant.model.userData.nameLabel);
        } catch (e) {
          console.log('Error removing name label:', e);
        }
      }
      this.scene.remove(giant.model);
    });
    this.giantNPCs = [];
    
    // Clean up any orphaned name labels
    const nameLabels = document.querySelectorAll('.npc-name');
    nameLabels.forEach(label => {
      try {
        document.body.removeChild(label);
      } catch (e) {
        console.log('Error removing orphaned name label:', e);
      }
    });
  }
} 