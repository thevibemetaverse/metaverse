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
    // Create initial NPCs
    for (let i = 0; i < this.maxNPCs; i++) {
      this.spawnNPC();
    }
    
    // Spawn 2 giant Zuckerberg NPCs
    this.spawnGiantZuckerberg(50, 50); // Position at x=50, z=50
    this.spawnGiantZuckerberg(-50, -50); // Position at x=-50, z=-50
  }

  // Spawn a single NPC
  spawnNPC() {
    // Generate random position within spawn radius
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * this.spawnRadius;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    // Create NPC with Mark Z. naming convention
    const markNumber = Math.floor(Math.random() * 1000);
    const npcName = `Mark Z. ${markNumber}`;
    const npcAvatar = createAvatar(this.scene, npcName, this.loadingManager);
    
    // Position the NPC
    npcAvatar.position.set(x, 0, z);
    
    // Add random rotation
    npcAvatar.rotation.y = Math.random() * Math.PI * 2;
    
    // Add to scene
    this.scene.add(npcAvatar);
    
    // Create NPC data object
    const npc = {
      avatar: npcAvatar,
      name: npcName,
      direction: new THREE.Vector3(
        Math.random() * 2 - 1, 
        0, 
        Math.random() * 2 - 1
      ).normalize(),
      lastDirectionChange: performance.now(),
      isMoving: true
    };
    
    // Set NPC to be moving
    if (npcAvatar.setMoving) {
      npcAvatar.setMoving(true);
    }
    
    // Add to NPCs array
    this.npcs.push(npc);
    
    return npc;
  }

  // Spawn a giant Zuckerberg NPC
  spawnGiantZuckerberg(x, z) {
    // Load the Zuckerberg model directly
    const gltfLoader = new GLTFLoader(this.loadingManager);
    const modelPath = '/assets/models/zuckerberg.glb'; // Using the original zuckerberg.glb
    
    gltfLoader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;
        
        // Make it giant (5x normal size)
        model.scale.set(5, 5, 5);
        
        // Position the giant NPC
        model.position.set(x, 0, z);
        
        // Add random rotation
        model.rotation.y = Math.random() * Math.PI * 2;
        
        // Add to scene
        this.scene.add(model);
        
        // Create giant NPC data object
        const giantNPC = {
          avatar: model,
          name: "GIANT ZUCK",
          isGiant: true,
          rotationSpeed: 0.1 + Math.random() * 0.2 // Random slow rotation speed
        };
        
        // Add to giant NPCs array
        this.giantNPCs.push(giantNPC);
        
        // Add name label above the giant NPC
        this.addNameLabel(model, "GIANT ZUCK", 10); // Higher position for the label due to size
        
        console.log("Giant Zuckerberg NPC spawned at", x, z);
      },
      undefined,
      (error) => {
        console.error('Error loading giant Zuckerberg model:', error);
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