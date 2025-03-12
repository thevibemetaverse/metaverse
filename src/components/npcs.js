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
      '/assets/models/zuckerberg2.glb',
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
        
        // Add name label - increase height for the much larger model
        this.addNameLabel(model, npcName, 100);
        
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
        console.error('Error loading giant Zuckerberg model:', error);
        // Try alternative model or create a basic avatar
        this.tryAlternativeZuckerberg(x, z, true);
      }
    );
  }

  // Try to load an alternative Zuckerberg model
  tryAlternativeZuckerberg(x, z, isGiant = false) {
    // For giant NPCs, try zuckerberg2.glb first before falling back to createAvatar
    if (isGiant) {
      const gltfLoader = new GLTFLoader(this.loadingManager);
      gltfLoader.load(
        '/assets/models/zuckerberg2.glb',
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
          
          // Add name label with increased height
          this.addNameLabel(model, "Giant Zuck", 100);
          
          // Register as pokeable if poke mechanic is available
          if (this.pokeMechanic) {
            this.pokeMechanic.registerPokeableObject(model, "Giant Zuck");
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
              console.log(`Playing idle animation for Alternative Giant Zuck`);
            }
          }
          
          // Store giant NPC data
          const giant = {
            model: model,
            name: "Giant Zuck",
            position: model.position,
            mixer: mixer,
            idleAction: idleAction
          };
          
          this.giantNPCs.push(giant);
        },
        undefined,
        (error) => {
          console.error('Error loading alternative giant Zuckerberg2 model:', error);
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
    // Create a basic avatar as fallback
    const avatar = createAvatar(this.scene, "Giant Zuck");
    
    // Scale and position the avatar - make it MUCH bigger (50x)
    avatar.scale.set(50, 50, 50);
    avatar.position.set(x, 0, z);
    
    // Add the avatar to the scene
    this.scene.add(avatar);
    
    // Store NPC data
    const giant = {
      model: avatar,
      name: "Giant Zuck",
      position: avatar.position,
      // The avatar created by createAvatar should already have animation setup
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
      this.pokeMechanic.registerPokeableObject(avatar, "Giant Zuck");
    }
  }
  
  // Create a fallback regular NPC using createAvatar
  createFallbackNPC(x, z) {
    // Create a basic avatar as fallback
    const npcName = `Mark Z. ${Math.floor(Math.random() * 1000)}`;
    const avatar = createAvatar(this.scene, npcName);
    
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
      // The avatar created by createAvatar should already have animation setup
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
      
      // Update animation mixer if available
      if (npc.mixer) {
        npc.mixer.update(deltaTime);
      }
      
      // Update name label position
      if (npc.model.userData.nameLabel) {
        this.updateLabelPosition(npc.model, npc.model.userData.nameLabel);
      }
    }
    
    // Update giant NPCs (if any)
    for (let i = 0; i < this.giantNPCs.length; i++) {
      const giant = this.giantNPCs[i];
      
      // Update animation mixer if available
      if (giant.mixer) {
        giant.mixer.update(deltaTime);
      }
      
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