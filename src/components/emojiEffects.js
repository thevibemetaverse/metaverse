import * as THREE from 'three';

// Class to manage 3D emoji effects in the scene
export class EmojiEffects {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.emojis = []; // Array to store active emoji objects
    this.maxEmojis = 20; // Maximum number of emojis to show at once
    
    // Create materials for each emoji with textures
    this.emojiMaterials = {
      '👋': this.createEmojiMaterial('👋', 0xFFFFFF),
      '👍': this.createEmojiMaterial('👍', 0xFFFFFF),
      '❤️': this.createEmojiMaterial('❤️', 0xFFFFFF),
      '😂': this.createEmojiMaterial('😂', 0xFFFFFF),
      '🎉': this.createEmojiMaterial('🎉', 0xFFFFFF)
    };
    
    console.log('EmojiEffects initialized with billboarded emoji textures');
  }
  
  // Create a material with emoji texture
  createEmojiMaterial(emoji, color) {
    // Create a canvas to draw the emoji
    const canvas = document.createElement('canvas');
    canvas.width = 512; // Larger canvas for better quality
    canvas.height = 512;
    const context = canvas.getContext('2d');
    
    // Clear canvas with transparent background
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw emoji centered and large
    context.font = '400px Arial'; // Larger font
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(emoji, canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Create material with the texture
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false, // Prevents z-fighting
      depthTest: false   // Ensures emojis are always visible
    });
    
    return material;
  }
  
  // Create a 3D emoji and add it to the scene
  createEmoji(emoji, position) {
    // Create a plane geometry for the emoji
    const geometry = new THREE.PlaneGeometry(1, 1);
    
    // Clone the material to avoid sharing
    const material = this.emojiMaterials[emoji].clone();
    
    // Create mesh
    const emojiMesh = new THREE.Mesh(geometry, material);
    
    // Position the emoji - if no position provided, create in front of the camera
    if (position) {
      emojiMesh.position.copy(position);
    } else {
      // If no position provided, create in front of the camera
      const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      emojiMesh.position.copy(this.camera.position).add(cameraDirection.multiplyScalar(3));
      // Add some random offset
      emojiMesh.position.x += (Math.random() - 0.5) * 1;
      emojiMesh.position.y += (Math.random() - 0.5) * 1 + 1; // Start a bit higher
    }
    
    // Add random scale variation - make them larger
    const scale = 1.0 + Math.random() * 0.5;
    emojiMesh.scale.set(scale, scale, scale);
    
    // Add to scene
    this.scene.add(emojiMesh);
    console.log(`Added emoji ${emoji} to scene at position:`, emojiMesh.position);
    
    // Store creation time and initial position for animation
    emojiMesh.userData = {
      creationTime: Date.now(),
      initialPosition: emojiMesh.position.clone(),
      initialScale: scale,
      emoji: emoji,
      // Add physics properties
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        0.02 + Math.random() * 0.02, // Slight upward drift
        (Math.random() - 0.5) * 0.02
      ),
      gravity: 0.0005, // Very light gravity
      rotationSpeed: Math.random() * 0.02 - 0.01 // Slight rotation
    };
    
    // Add to emojis array
    this.emojis.push(emojiMesh);
    
    // Remove oldest emoji if we exceed the maximum
    if (this.emojis.length > this.maxEmojis) {
      const oldestEmoji = this.emojis.shift();
      this.scene.remove(oldestEmoji);
      oldestEmoji.geometry.dispose();
      oldestEmoji.material.dispose();
    }
    
    return emojiMesh;
  }
  
  // Update emojis (call this in the animation loop)
  update() {
    // Make sure we have a camera
    if (!this.camera) {
      console.log('No camera available for emoji effects');
      return;
    }
    
    const currentTime = Date.now();
    
    // Update each emoji
    for (let i = this.emojis.length - 1; i >= 0; i--) {
      const emoji = this.emojis[i];
      const age = currentTime - emoji.userData.creationTime;
      const lifespan = 3000; // 3 seconds lifespan
      
      if (age > lifespan) {
        // Remove emoji if it's too old
        this.scene.remove(emoji);
        emoji.geometry.dispose();
        emoji.material.dispose();
        this.emojis.splice(i, 1);
      } else {
        // Animate emoji with gentle physics
        
        // Apply gravity to velocity
        emoji.userData.velocity.y -= emoji.userData.gravity;
        
        // Apply velocity to position
        emoji.position.add(emoji.userData.velocity);
        
        // Billboard effect - always face the camera
        emoji.lookAt(this.camera.position);
        
        // Add a slight rotation for variety
        emoji.rotateZ(emoji.userData.rotationSpeed);
        
        // Fade out by scaling and transparency near end of life
        const progress = age / lifespan;
        if (progress > 0.7) {
          const fadeProgress = (progress - 0.7) / 0.3; // Normalize to 0-1 for last 30% of life
          const fadeScale = emoji.userData.initialScale * (1 - fadeProgress * 0.3);
          emoji.scale.set(fadeScale, fadeScale, fadeScale);
          
          // Fade out opacity
          emoji.material.opacity = 1 - fadeProgress;
        }
      }
    }
  }
  
  // Create a burst of emojis
  createEmojiBurst(emoji, position, count = 5) {
    console.log(`Creating emoji burst: ${emoji}, count: ${count}`);
    
    // If position is not provided, create in front of the camera
    if (!position) {
      const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      position = this.camera.position.clone().add(cameraDirection.multiplyScalar(3));
      position.y += 0.5; // Slightly above eye level
    }
    
    for (let i = 0; i < count; i++) {
      // Create position with random offset
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5 + 0.5, // Slightly higher
        (Math.random() - 0.5) * 0.5 // Less depth variation
      );
      
      const burstPosition = position.clone().add(offset);
      
      // Create emoji
      const emojiMesh = this.createEmoji(emoji, burstPosition);
      
      // Add initial velocity for more dynamic movement
      emojiMesh.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.03,
        0.01 + Math.random() * 0.03, // Slight upward drift
        (Math.random() - 0.5) * 0.01
      );
    }
  }
} 