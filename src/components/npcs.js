import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createAvatar } from './avatar.js';

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
  }

  // Initialize NPCs
  initialize() {
    // Create initial NPCs using zuckerberg.glb
    for (let i = 0; i < this.maxNPCs; i++) {
      this.spawnNPC();
    }
    
    // Spawn 2 giant Zuckerberg NPCs
    this.spawnGiantZuckerberg(50, 50); // Position at x=50, z=50
    this.spawnGiantZuckerberg(-50, -50); // Position at x=-50, z=-50
  }

  // Spawn a single NPC using zuckerberg.glb
  spawnNPC() {
    // Generate random position within spawn radius
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * this.spawnRadius;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    // Create NPC with Mark Z. naming convention
    const markNumber = Math.floor(Math.random() * 1000);
    const npcName = `Mark Z. ${markNumber}`;
    
    // Load the Zuckerberg model for regular NPCs
    const gltfLoader = new GLTFLoader(this.loadingManager);
    
    gltfLoader.load(
      '/assets/models/zuckerberg.glb',
      (gltf) => {
        const model = gltf.scene;
        const animations = gltf.animations;
        
        // Scale the model (smaller than the giant ones)
        model.scale.set(1.5, 1.5, 1.5);
        
        // Position the NPC
        model.position.set(x, 0, z);
        
        // Add random rotation
        model.rotation.y = Math.random() * Math.PI * 2;
        
        // Add shadows to the model
        model.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
        
        // Add to scene
        this.scene.add(model);
        
        // Add name label above the NPC
        this.addNameLabel(model, npcName, 3);
        
        // Setup animations if available
        if (animations && animations.length > 0) {
          // Create animation mixer
          const mixer = new THREE.AnimationMixer(model);
          
          // Find running animation
          let runAction = null;
          for (let i = 0; i < animations.length; i++) {
            const clip = animations[i];
            console.log(`Animation ${i}: "${clip.name}" (duration: ${clip.duration}s)`);
            
            if (clip.name.toLowerCase().includes('run') || 
                clip.name.toLowerCase().includes('walk')) {
              runAction = mixer.clipAction(clip);
              break;
            }
          }
          
          // If no specific run animation found, use the first animation
          if (!runAction && animations.length > 0) {
            runAction = mixer.clipAction(animations[0]);
          }
          
          // Play running animation if found
          if (runAction) {
            runAction.play();
          }
          
          // Create NPC data object with animation mixer
          const npc = {
            avatar: model,
            name: npcName,
            direction: new THREE.Vector3(
              Math.random() * 2 - 1, 
              0, 
              Math.random() * 2 - 1
            ).normalize(),
            lastDirectionChange: performance.now(),
            isMoving: true,
            mixer: mixer,
            runAction: runAction
          };
          
          // Add to NPCs array
          this.npcs.push(npc);
        } else {
          // Create NPC data object without animations
          const npc = {
            avatar: model,
            name: npcName,
            direction: new THREE.Vector3(
              Math.random() * 2 - 1, 
              0, 
              Math.random() * 2 - 1
            ).normalize(),
            lastDirectionChange: performance.now(),
            isMoving: true
          };
          
          // Add to NPCs array
          this.npcs.push(npc);
        }
        
        console.log(`Regular NPC ${npcName} spawned at`, x, z);
      },
      undefined,
      (error) => {
        console.error('Error loading regular Zuckerberg model:', error);
      }
    );
  }

  // Spawn a giant Zuckerberg NPC
  spawnGiantZuckerberg(x, z) {
    // Load the Zuckerberg model directly
    const gltfLoader = new GLTFLoader(this.loadingManager);
    const modelPath = '/assets/models/zuckerberg2.glb'; // Using zuckerberg2.glb model
    
    gltfLoader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;
        
        // Make it larger (200x normal size)
        model.scale.set(50, 50, 50);
        
        // Position the giant NPC - adjust y position to make sure it's on the ground
        model.position.set(x, 0, z);
        
        // Add random rotation
        model.rotation.y = Math.random() * Math.PI * 2;
        
        // Add shadows to the model
        model.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
        
        // Add to scene
        this.scene.add(model);
        
        // Create giant NPC data object
        const giantNPC = {
          avatar: model,
          name: "GIANT ZUCK",
          isGiant: true,
          rotationSpeed: 0.05 + Math.random() * 0.1 // Slower rotation for massive NPCs
        };
        
        // Add to giant NPCs array
        this.giantNPCs.push(giantNPC);
        
        // Add name label above the giant NPC
        this.addNameLabel(model, "GIANT ZUCK", 400); // Position for the label due to large size
        
        console.log("MASSIVE Zuckerberg NPC (zuckerberg2.glb) spawned at", x, z);
      },
      (xhr) => {
        // Loading progress
        console.log(`Loading zuckerberg2.glb: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`);
      },
      (error) => {
        console.error('Error loading giant Zuckerberg model:', error);
        // Try the alternative model if available
        this.tryAlternativeZuckerberg(x, z);
      }
    );
  }
  
  // Try loading an alternative Zuckerberg model if the main one fails
  tryAlternativeZuckerberg(x, z) {
    console.warn('Trying alternative zuckerberg.glb model');
    const gltfLoader = new GLTFLoader(this.loadingManager);
    
    gltfLoader.load(
      '/assets/models/zuckerberg.glb',
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(200, 200, 200); // Also make the fallback 200x larger
        model.position.set(x, 0, z);
        model.rotation.y = Math.random() * Math.PI * 2;
        
        model.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
        
        this.scene.add(model);
        
        const giantNPC = {
          avatar: model,
          name: "GIANT ZUCK",
          isGiant: true,
          rotationSpeed: 0.05 + Math.random() * 0.1
        };
        
        this.giantNPCs.push(giantNPC);
        this.addNameLabel(model, "GIANT ZUCK", 400);
        
        console.log("Alternative MASSIVE Zuckerberg NPC (zuckerberg.glb) spawned at", x, z);
      },
      undefined,
      (error) => {
        console.error('Error loading alternative Zuckerberg model:', error);
      }
    );
  }

  // Add a name label above an NPC
  addNameLabel(model, name, height = 3) {
    // Create canvas for the text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    // Set text properties
    context.font = 'Bold 24px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Add background
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add text
    context.fillStyle = 'white';
    context.fillText(name, canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create sprite material
    const material = new THREE.SpriteMaterial({ map: texture });
    
    // Create sprite
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(5, 1.25, 1); // Adjust scale as needed
    sprite.position.y = height; // Position above the model
    
    // Add sprite to model
    model.add(sprite);
    
    return sprite;
  }

  // Update all NPCs
  update(deltaTime, playerPosition) {
    const currentTime = performance.now();
    
    // Update regular NPCs
    this.npcs.forEach(npc => {
      // Update animation mixer if available
      if (npc.mixer) {
        npc.mixer.update(deltaTime);
      }
      
      // Check if it's time to change direction
      if (currentTime - npc.lastDirectionChange > this.changeDirectionInterval * 1000) {
        // Generate new random direction
        npc.direction.set(
          Math.random() * 2 - 1,
          0,
          Math.random() * 2 - 1
        ).normalize();
        
        // Update last direction change time
        npc.lastDirectionChange = currentTime;
        
        // Update NPC rotation to face movement direction
        npc.avatar.rotation.y = Math.atan2(npc.direction.x, npc.direction.z);
      }
      
      // Move NPC in current direction
      npc.avatar.position.x += npc.direction.x * this.moveSpeed * deltaTime;
      npc.avatar.position.z += npc.direction.z * this.moveSpeed * deltaTime;
      
      // Keep NPCs within bounds
      const distanceFromCenter = Math.sqrt(
        npc.avatar.position.x * npc.avatar.position.x + 
        npc.avatar.position.z * npc.avatar.position.z
      );
      
      if (distanceFromCenter > this.spawnRadius) {
        // If NPC is too far, direct it back toward center
        const toCenter = new THREE.Vector3(
          -npc.avatar.position.x,
          0,
          -npc.avatar.position.z
        ).normalize();
        
        // Blend current direction with direction to center
        npc.direction.lerp(toCenter, 0.2).normalize();
        
        // Update NPC rotation
        npc.avatar.rotation.y = Math.atan2(npc.direction.x, npc.direction.z);
      }
      
      // Simple collision avoidance with player
      if (playerPosition) {
        const distToPlayer = new THREE.Vector3(
          npc.avatar.position.x - playerPosition.x,
          0,
          npc.avatar.position.z - playerPosition.z
        ).length();
        
        if (distToPlayer < 5) {
          // Move away from player
          const awayFromPlayer = new THREE.Vector3(
            npc.avatar.position.x - playerPosition.x,
            0,
            npc.avatar.position.z - playerPosition.z
          ).normalize();
          
          // Blend current direction with direction away from player
          npc.direction.lerp(awayFromPlayer, 0.5).normalize();
          
          // Update NPC rotation
          npc.avatar.rotation.y = Math.atan2(npc.direction.x, npc.direction.z);
        }
      }
    });
    
    // Update giant NPCs (just rotate them slowly)
    this.giantNPCs.forEach(giant => {
      // Rotate the giant NPC slowly
      giant.avatar.rotation.y += giant.rotationSpeed * deltaTime;
    });
  }

  // Remove all NPCs
  removeAll() {
    // Remove regular NPCs
    this.npcs.forEach(npc => {
      this.scene.remove(npc.avatar);
    });
    this.npcs = [];
    
    // Remove giant NPCs
    this.giantNPCs.forEach(giant => {
      this.scene.remove(giant.avatar);
    });
    this.giantNPCs = [];
  }
} 