import * as THREE from 'three';
import { createAvatar } from './avatar.js';

// Class to manage NPCs
export class NPCManager {
  constructor(scene, loadingManager) {
    this.scene = scene;
    this.loadingManager = loadingManager;
    this.npcs = [];
    this.maxNPCs = 5; // Maximum number of NPCs to spawn
    this.spawnRadius = 30; // Maximum distance from center to spawn NPCs
    this.moveSpeed = 2; // Movement speed of NPCs
    this.changeDirectionInterval = 3; // Time in seconds before changing direction
  }

  // Initialize NPCs
  initialize() {
    // Create initial NPCs
    for (let i = 0; i < this.maxNPCs; i++) {
      this.spawnNPC();
    }
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

  // Update all NPCs
  update(deltaTime, playerPosition) {
    const currentTime = performance.now();
    
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
  }

  // Remove all NPCs
  removeAll() {
    this.npcs.forEach(npc => {
      this.scene.remove(npc.avatar);
    });
    this.npcs = [];
  }
} 