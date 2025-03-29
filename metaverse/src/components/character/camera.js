import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * MetaverseCamera - A GTA-style camera system for the VibeMetaverse
 * Handles player following with smooth transitions and always stays behind the player
 */
export class MetaverseCamera {
  constructor(camera, player, domElement) {
    // Store references
    this.camera = camera;
    this.player = player;
    this.domElement = domElement;
    
    // Camera settings
    this.distance = 5;        // Distance behind player
    this.height = 2;          // Height above player
    this.lookAtHeight = 1.5;  // Height to look at (above player base)
    
    // Smoothing values
    this.positionLerpFactor = 0.15;  // How quickly camera follows player (0-1)
    this.rotationLerpFactor = 0.15;  // How quickly camera follows player rotation (0-1)
    
    // Track last known position and movement
    this.lastPlayerPosition = this.player ? this.player.position.clone() : new THREE.Vector3();
    this.currentDirection = new THREE.Vector3(0, 0, 1);
    this.isMoving = false;
    this.movementTimeout = null;
    
    // Set up OrbitControls with restricted movement
    this.setupOrbitControls();
    
    // Set initial camera position
    this.updateCameraPosition(true); // true = immediate, no smoothing
  }
  
  /**
   * Set up OrbitControls with restricted movement for GTA-style camera
   */
  setupOrbitControls() {
    this.orbitControls = new OrbitControls(this.camera, this.domElement);
    
    // Configure the controls for GTA-style camera
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.2;
    this.orbitControls.screenSpacePanning = false;
    
    // Disable orbit controls when moving
    this.orbitControls.enabled = false;
    
    // Set target to player position plus lookAtHeight
    this.updateOrbitTarget();
  }
  
  /**
   * Update the orbit controls target to focus on player
   */
  updateOrbitTarget() {
    if (!this.player) return;
    
    this.orbitControls.target.copy(this.player.position);
    this.orbitControls.target.y += this.lookAtHeight;
  }
  
  /**
   * Get player's forward direction based on their rotation
   */
  getPlayerForwardDirection() {
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.rotation.y);
    return forward;
  }
  
  /**
   * Calculate movement direction based on player's position change
   */
  updateMovementDirection() {
    if (!this.player) return;
    
    const currentPosition = this.player.position;
    const movement = new THREE.Vector3();
    movement.subVectors(currentPosition, this.lastPlayerPosition);
    
    // Check if player is moving
    const isMovingNow = movement.length() > 0.001;
    
    if (isMovingNow) {
      // Clear any existing timeout
      if (this.movementTimeout) {
        clearTimeout(this.movementTimeout);
      }
      this.isMoving = true;
      
      // Update direction based on movement
      movement.y = 0; // Keep direction horizontal
      movement.normalize();
      this.currentDirection.lerp(movement, 0.2); // Smooth direction change
      this.currentDirection.normalize();
      
      // Set timeout to handle when player stops moving
      this.movementTimeout = setTimeout(() => {
        this.isMoving = false;
      }, 100); // Adjust this value to change how quickly camera returns behind player
    } else if (!this.isMoving) {
      // When not moving, smoothly rotate towards player's forward direction
      const targetDirection = this.getPlayerForwardDirection();
      this.currentDirection.lerp(targetDirection, 0.1); // Smooth rotation back
      this.currentDirection.normalize();
    }
    
    // Update last known position
    this.lastPlayerPosition.copy(currentPosition);
  }
  
  /**
   * Calculate the position behind the player based on movement direction
   */
  calculateIdealPosition() {
    // Calculate the camera position behind the player
    const cameraPosition = new THREE.Vector3(
      this.player.position.x - (this.currentDirection.x * this.distance),
      this.player.position.y + this.height,
      this.player.position.z - (this.currentDirection.z * this.distance)
    );
    
    return cameraPosition;
  }
  
  /**
   * Update camera position to follow player
   * @param {boolean} immediate - If true, teleport camera; if false, smooth lerp
   */
  updateCameraPosition(immediate = false) {
    // Update movement direction
    this.updateMovementDirection();
    
    const idealPosition = this.calculateIdealPosition();
    
    if (immediate) {
      // Immediately set camera position
      this.camera.position.copy(idealPosition);
    } else {
      // Smoothly move camera towards ideal position
      this.camera.position.lerp(idealPosition, this.positionLerpFactor);
    }
    
    // Always look at the player's upper body
    const lookAtPosition = new THREE.Vector3(
      this.player.position.x,
      this.player.position.y + this.lookAtHeight,
      this.player.position.z
    );
    
    this.camera.lookAt(lookAtPosition);
  }
  
  /**
   * Set the camera distance from player
   * @param {number} distance - New distance from player
   */
  setDistance(distance) {
    this.distance = Math.max(3, Math.min(10, distance));
    this.updateCameraPosition();
  }
  
  /**
   * Set the camera height above player
   * @param {number} height - New height above player
   */
  setHeight(height) {
    this.height = Math.max(1, Math.min(5, height));
    this.updateCameraPosition();
  }
  
  /**
   * Adjust the current camera distance
   * @param {number} amount - Amount to adjust distance by
   */
  adjustDistance(amount) {
    this.setDistance(this.distance + amount);
  }
  
  /**
   * Adjust the current camera height
   * @param {number} amount - Amount to adjust height by
   */
  adjustHeight(amount) {
    this.setHeight(this.height + amount);
  }
  
  /**
   * Update method to call in animation loop
   * @param {number} delta - Time in seconds since last frame
   */
  update(delta) {
    if (!this.player) return;
    
    // Update camera position with smoothing
    this.updateCameraPosition(false);
  }
  
  /**
   * Handles keyboard input for camera adjustments
   * @param {KeyboardEvent} event - The keyboard event
   */
  handleKeyDown(event) {
    switch (event.code) {
      // Camera adjustments
      case 'KeyR': // Move camera higher
        this.adjustHeight(0.5);
        break;
      case 'KeyF': // Move camera lower
        this.adjustHeight(-0.5);
        break;
      case 'KeyZ': // Zoom camera in
        this.adjustDistance(-0.5);
        break;
      case 'KeyX': // Zoom camera out
        this.adjustDistance(0.5);
        break;
    }
  }
  
  /**
   * Setup keyboard event listeners for camera controls
   */
  setupKeyboardControls() {
    document.addEventListener('keydown', (event) => this.handleKeyDown(event));
  }
  
  /**
   * Reset camera to default position behind player
   */
  resetPosition() {
    this.distance = 5;
    this.height = 2;
    this.updateCameraPosition(true);
  }
  
  /**
   * Cleanup method to remove event listeners and dispose of resources
   */
  dispose() {
    if (this.orbitControls) {
      this.orbitControls.dispose();
    }
  }
}