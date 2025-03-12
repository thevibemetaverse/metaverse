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
    
    // Poke mechanic will be set later when camera is available
    this.pokeMechanic = null;
  }

  // Set the poke mechanic
  setPokeMechanic(pokeMechanic) {
    this.pokeMechanic = pokeMechanic;
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
        
        // Add name label
        this.addNameLabel(model, npcName);
        
        // Register as pokeable if poke mechanic is available
        if (this.pokeMechanic) {
          this.pokeMechanic.registerPokeableObject(model, npcName);
        }
        
        // Store NPC data
        const npc = {
          model: model,
          name: npcName,
          position: model.position,
          direction: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(),
          timeToChangeDirection: Math.random() * this.changeDirectionInterval
        };
        
        this.npcs.push(npc);
      },
      undefined,
      (error) => {
        console.error('Error loading Zuckerberg model:', error);
        // Try alternative model or create a basic avatar
        this.tryAlternativeZuckerberg(x, z);
      }
    );
  }

  // Spawn a giant Zuckerberg NPC
  spawnGiantZuckerberg(x, z) {
    // Create a giant Zuckerberg NPC
    const npcName = `Giant Zuck`;
    
    // Load the Zuckerberg model
    const gltfLoader = new GLTFLoader(this.loadingManager);
    
    gltfLoader.load(
      '/assets/models/zuckerberg.glb',
      (gltf) => {
        const model = gltf.scene;
        const animations = gltf.animations;
        
        // Scale and position the model - make it giant
        model.scale.set(3, 3, 3);
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
        
        // Add name label
        this.addNameLabel(model, npcName, 6);
        
        // Register as pokeable if poke mechanic is available
        if (this.pokeMechanic) {
          this.pokeMechanic.registerPokeableObject(model, npcName);
        }
        
        // Store giant NPC data
        const giant = {
          model: model,
          name: npcName,
          position: model.position
        };
        
        this.giantNPCs.push(giant);
      },
      undefined,
      (error) => {
        console.error('Error loading giant Zuckerberg model:', error);
        // Try alternative model or create a basic avatar
        this.tryAlternativeZuckerberg(x, z, true);
      }
    );
  }

  // Try to load an alternative Zuckerberg model
  tryAlternativeZuckerberg(x, z, isGiant = false) {
    // Create a basic avatar as fallback
    const avatar = createAvatar(this.scene, isGiant ? "Giant Zuck" : `Mark Z. ${Math.floor(Math.random() * 1000)}`);
    
    // Scale and position the avatar
    if (isGiant) {
      avatar.scale.set(3, 3, 3);
    }
    avatar.position.set(x, 0, z);
    
    // Add the avatar to the scene
    this.scene.add(avatar);
    
    // Store NPC data
    if (isGiant) {
      const giant = {
        model: avatar,
        name: "Giant Zuck",
        position: avatar.position
      };
      this.giantNPCs.push(giant);
    } else {
      const npc = {
        model: avatar,
        name: `Mark Z. ${Math.floor(Math.random() * 1000)}`,
        position: avatar.position,
        direction: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(),
        timeToChangeDirection: Math.random() * this.changeDirectionInterval
      };
      this.npcs.push(npc);
    }
    
    // Register as pokeable if poke mechanic is available
    if (this.pokeMechanic) {
      this.pokeMechanic.registerPokeableObject(avatar, isGiant ? "Giant Zuck" : `Mark Z. ${Math.floor(Math.random() * 1000)}`);
    }
  }

  // Add name label above NPC
  addNameLabel(model, name, height = 3) {
    // Create a div for the name label
    const nameLabel = document.createElement('div');
    nameLabel.className = 'npc-name';
    nameLabel.textContent = name;
    nameLabel.style.position = 'absolute';
    nameLabel.style.color = 'white';
    nameLabel.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    nameLabel.style.padding = '2px 5px';
    nameLabel.style.borderRadius = '10px';
    nameLabel.style.fontSize = '0.8em';
    nameLabel.style.fontWeight = 'bold';
    nameLabel.style.textAlign = 'center';
    nameLabel.style.zIndex = '1000';
    nameLabel.style.pointerEvents = 'none'; // Prevent the label from blocking clicks
    
    document.body.appendChild(nameLabel);
    
    // Store the label element and height in the model's userData
    model.userData.nameLabel = nameLabel;
    model.userData.labelHeight = height;
  }

  // Update label position to follow NPC
  updateLabelPosition(model, labelElement) {
    // Convert 3D position to screen position
    const vector = new THREE.Vector3();
    vector.setFromMatrixPosition(model.matrixWorld);
    vector.y += model.userData.labelHeight || 3; // Use stored height or default
    
    vector.project(window.camera);
    
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
    
    // Update label position
    labelElement.style.left = `${x}px`;
    labelElement.style.top = `${y}px`;
    labelElement.style.transform = 'translate(-50%, -50%)';
  }

  // Update method to be called in animation loop
  update(deltaTime, playerPosition) {
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
      
      // Update name label position
      if (npc.model.userData.nameLabel) {
        this.updateLabelPosition(npc.model, npc.model.userData.nameLabel);
      }
    }
    
    // Update giant NPCs (if any)
    for (let i = 0; i < this.giantNPCs.length; i++) {
      const giant = this.giantNPCs[i];
      
      // Update name label position
      if (giant.model.userData.nameLabel) {
        this.updateLabelPosition(giant.model, giant.model.userData.nameLabel);
      }
    }
  }

  // Remove all NPCs
  removeAll() {
    // Remove regular NPCs
    this.npcs.forEach(npc => {
      this.scene.remove(npc.model);
    });
    this.npcs = [];
    
    // Remove giant NPCs
    this.giantNPCs.forEach(giant => {
      this.scene.remove(giant.model);
    });
    this.giantNPCs = [];
  }
} 