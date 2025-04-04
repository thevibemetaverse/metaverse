// ChatBubble.js
// Displays messages above players
import * as THREE from 'three';

export class ChatBubble {
  constructor(scene, position, text, character) {
    this.scene = scene;
    this.position = position.clone();
    this.text = text;
    this.opacity = 1.0;
    this.fadeTime = 1000; // Time in ms to fade out bubble
    this.creationTime = Date.now();
    this.lifespan = 5000; // Total lifespan of bubble in ms
    this.character = character; // Store reference to the character
    this.heightOffset = 4.5; // Reduced height above character's head
    this.horizontalOffset = -.2; // Offset to the right
    
    // Create visual elements
    this.createTextSprite();
  }
  
  createTextSprite() {
    // Calculate appropriate canvas size based on text length
    const fontSize = 20;
    const padding = 20;
    const textWidth = this.measureTextWidth(this.text, fontSize);
    const minCanvasWidth = 150; // Minimum width to fit the background image
    // Scale up for higher resolution
    const resolution = window.devicePixelRatio || 2;
    const canvasWidth = Math.max(textWidth + (padding * 2), minCanvasWidth) * resolution;
    const canvasHeight = 100 * resolution; // Fixed height for the background image
    
    // Create canvas and context
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const context = canvas.getContext('2d');
    
    // Scale the rendering context to match the resolution
    context.scale(resolution, resolution);
    
    // Fill with transparency
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Load background bubble image
    const bubbleImage = new Image();
    bubbleImage.src = '/assets/images/chat_bubble.png';
    bubbleImage.crossOrigin = 'anonymous'; // To prevent texture taint issues
    
    // Draw everything once the image is loaded
    bubbleImage.onload = () => {
      // Draw the bubble image using 9-slice scaling
      this.drawNineSlicedImage(
        context,
        bubbleImage, 
        0, 
        0, 
        canvasWidth / resolution, 
        canvasHeight / resolution
      );
      
      // Draw text
      context.font = `${fontSize}px Arial`;
      context.fillStyle = 'white';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      
      // Position text in the upper part of the bubble (not including the pointer)
      context.fillText(
        this.text, 
        (canvasWidth / resolution) / 2, 
        (canvasHeight / resolution) * 0.5 // Position at center (50%) of the height
      );
      
      // Update the texture
      if (this.sprite && this.sprite.material && this.sprite.material.map) {
        this.sprite.material.map.needsUpdate = true;
      }
    };
    
    // Create texture and material first (will be updated when image loads)
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter; // Improve texture quality
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });
    
    // Create and position sprite
    this.sprite = new THREE.Sprite(material);
    
    // Scale appropriately for better visibility, adjust for resolution
    const scale = 0.03 / resolution; // Adjust scale factor for the higher resolution
    this.sprite.scale.set(
      canvasWidth * scale, 
      canvasHeight * scale, 
      1
    );
    this.sprite.position.copy(this.position);
    
    // Add to scene
    this.scene.add(this.sprite);
  }
  
  // Helper function to draw nine-sliced image
  drawNineSlicedImage(ctx, image, x, y, width, height, slice = 20) {
    // If the image isn't loaded yet, just return
    if (!image.complete) return;
    
    // Corner slices
    const cornerSize = slice;
    
    // Using higher quality image drawing with smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Draw corners
    // Top-left
    ctx.drawImage(
      image, 
      0, 0, cornerSize, cornerSize, 
      x, y, cornerSize, cornerSize
    );
    
    // Top-right
    ctx.drawImage(
      image, 
      image.width - cornerSize, 0, cornerSize, cornerSize, 
      x + width - cornerSize, y, cornerSize, cornerSize
    );
    
    // Bottom-left
    ctx.drawImage(
      image, 
      0, image.height - cornerSize, cornerSize, cornerSize, 
      x, y + height - cornerSize, cornerSize, cornerSize
    );
    
    // Bottom-right
    ctx.drawImage(
      image, 
      image.width - cornerSize, image.height - cornerSize, cornerSize, cornerSize, 
      x + width - cornerSize, y + height - cornerSize, cornerSize, cornerSize
    );
    
    // Draw edges
    // Top
    ctx.drawImage(
      image, 
      cornerSize, 0, image.width - (cornerSize * 2), cornerSize, 
      x + cornerSize, y, width - (cornerSize * 2), cornerSize
    );
    
    // Bottom
    ctx.drawImage(
      image, 
      cornerSize, image.height - cornerSize, image.width - (cornerSize * 2), cornerSize, 
      x + cornerSize, y + height - cornerSize, width - (cornerSize * 2), cornerSize
    );
    
    // Left
    ctx.drawImage(
      image, 
      0, cornerSize, cornerSize, image.height - (cornerSize * 2), 
      x, y + cornerSize, cornerSize, height - (cornerSize * 2)
    );
    
    // Right
    ctx.drawImage(
      image, 
      image.width - cornerSize, cornerSize, cornerSize, image.height - (cornerSize * 2), 
      x + width - cornerSize, y + cornerSize, cornerSize, height - (cornerSize * 2)
    );
    
    // Middle
    ctx.drawImage(
      image, 
      cornerSize, cornerSize, image.width - (cornerSize * 2), image.height - (cornerSize * 2), 
      x + cornerSize, y + cornerSize, width - (cornerSize * 2), height - (cornerSize * 2)
    );
  }
  
  // Helper function to measure text width
  measureTextWidth(text, fontSize) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = `${fontSize}px Arial`;
    return context.measureText(text).width;
  }
  
  update(camera) {
    if (!this.sprite) return;
    
    // Update position to stay above character's head if character reference exists
    if (this.character && this.character.position) {
      const characterPosition = this.character.position.clone();
      
      // Calculate offset position relative to character's rotation
      if (this.character.rotation) {
        // Create a vector for the horizontal offset
        const offsetVector = new THREE.Vector3(this.horizontalOffset, 0, 0);
        // Apply character's rotation to the offset vector
        offsetVector.applyEuler(this.character.rotation);
        // Add the rotated offset to the position
        characterPosition.add(offsetVector);
      }
      
      // Add vertical offset
      characterPosition.y += this.heightOffset;
      
      this.sprite.position.copy(characterPosition);
    }
    
    // Make bubble always face camera
    if (camera) {
      this.sprite.lookAt(camera.position);
    }
    
    // Handle fading out
    const age = Date.now() - this.creationTime;
    if (age > this.lifespan - this.fadeTime) {
      // Calculate fade based on time
      const fadeProgress = (age - (this.lifespan - this.fadeTime)) / this.fadeTime;
      this.opacity = 1.0 - fadeProgress;
      
      // Apply opacity
      if (this.sprite.material) {
        this.sprite.material.opacity = Math.max(0, this.opacity);
      }
    }
  }
  
  remove() {
    if (this.sprite && this.scene) {
      this.scene.remove(this.sprite);
      
      // Dispose of materials and textures to avoid memory leaks
      if (this.sprite.material) {
        if (this.sprite.material.map) {
          this.sprite.material.map.dispose();
        }
        this.sprite.material.dispose();
      }
    }
  }
}