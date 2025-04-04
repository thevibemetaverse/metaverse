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
    this.heightOffset = 4.6; // Height above character's head
    
    // Create visual elements
    this.createTextSprite();
  }
  
  createTextSprite() {
    // Calculate appropriate canvas size based on text length
    const fontSize = 20;
    const padding = 15;
    const pointerHeight = 10; // Height of speech bubble pointer
    const textWidth = this.measureTextWidth(this.text, fontSize);
    const canvasWidth = Math.max(textWidth + (padding * 2), 80); // Min width of 80px
    const canvasHeight = fontSize + (padding * 2) + pointerHeight;
    
    // Create canvas and context
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const context = canvas.getContext('2d');
    
    // Fill with transparency
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw background bubble - darker blue color with slightly rounded corners
    const bubbleColor = 'rgba(25, 70, 160, 0.9)'; // Darker blue with high opacity
    const borderColor = 'rgba(255, 255, 255, 0.9)'; // White border
    const bubbleRadius = 10; // Corner radius
    
    // Draw main bubble body (without the pointer)
    context.fillStyle = bubbleColor;
    context.strokeStyle = borderColor;
    context.lineWidth = 1.5;
    this.roundRect(
      context, 
      0, 
      0, 
      canvasWidth, 
      canvasHeight - pointerHeight, 
      bubbleRadius
    );
    context.fill();
    context.stroke();
    
    // Draw the speech pointer
    context.beginPath();
    const pointerWidth = 14;
    const centerX = canvasWidth / 2;
    context.moveTo(centerX - pointerWidth / 2, canvasHeight - pointerHeight);
    context.lineTo(centerX, canvasHeight); // Pointer tip
    context.lineTo(centerX + pointerWidth / 2, canvasHeight - pointerHeight);
    context.closePath();
    context.fillStyle = bubbleColor;
    context.fill();
    context.strokeStyle = borderColor;
    context.stroke();
    
    // Draw text
    context.font = `${fontSize}px Arial`;
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(
      this.text, 
      canvasWidth / 2, 
      (canvasHeight - pointerHeight) / 2
    );
    
    // Create sprite using canvas as texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });
    
    // Create and position sprite
    this.sprite = new THREE.Sprite(material);
    
    // Scale appropriately - make it a bit bigger for better visibility
    const scale = 0.015; // Base scale factor for better visibility
    this.sprite.scale.set(
      canvasWidth * scale, 
      canvasHeight * scale, 
      1
    );
    this.sprite.position.copy(this.position);
    
    // Add to scene
    this.scene.add(this.sprite);
  }
  
  // Helper function to measure text width
  measureTextWidth(text, fontSize) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = `${fontSize}px Arial`;
    return context.measureText(text).width;
  }
  
  // Helper function to create rounded rectangle
  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
  
  update(camera) {
    if (!this.sprite) return;
    
    // Update position to stay above character's head if character reference exists
    if (this.character && this.character.position) {
      const characterPosition = this.character.position.clone();
      characterPosition.y += this.heightOffset; // Add height offset
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