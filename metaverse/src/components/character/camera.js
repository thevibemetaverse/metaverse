import * as THREE from 'three';

/**
 * GTA-style following camera for VibeMetaverse
 * Always positions behind the player character
 */
export class FollowCamera {
  constructor(player) {
    // Create the camera
    this.camera = new THREE.PerspectiveCamera(
      75,                                          // Field of view
      window.innerWidth / window.innerHeight,      // Aspect ratio
      0.1,                                         // Near clipping plane
      1000                                         // Far clipping plane
    );
    
    // Store reference to player
    this.player = player;
    
    // Camera settings
    this.distance = 8;        // Distance behind player
    this.height = 3;          // Height above player
    this.lookHeight = 1;      // Height above player to look at (eyes level)
    this.smoothFactor = 0.1;  // Smoothing factor for camera movement (0-1)
    
    // Initialize camera position
    this.updatePosition(true); // Force immediate position
  }

  /**
   * Update camera position to follow behind player
   * @param {boolean} immediate - If true, camera moves instantly without smoothing
   */
  updatePosition(immediate = false) {
    // Calculate the direction vector behind the player based on player's rotation
    const behindVector = new THREE.Vector3(0, 0, -1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.player.rotation.y
    );
    
    // Calculate desired camera position behind player
    const targetPosition = new THREE.Vector3(
      this.player.position.x + (behindVector.x * this.distance),
      this.player.position.y + this.height,
      this.player.position.z + (behindVector.z * this.distance)
    );
    
    if (immediate) {
      // Set camera position immediately
      this.camera.position.copy(targetPosition);
    } else {
      // Smoothly move camera towards target position
      this.camera.position.lerp(targetPosition, this.smoothFactor);
    }
    
    // Calculate the point to look at (slightly above player position)
    const lookAtPoint = new THREE.Vector3(
      this.player.position.x,
      this.player.position.y + this.lookHeight,
      this.player.position.z
    );
    
    // Make camera look at the player
    this.camera.lookAt(lookAtPoint);
  }

  /**
   * Update the camera - call this every frame
   */
  update() {
    this.updatePosition();
  }

  /**
   * Handle window resize
   */
  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Adjust camera distance and height
   * @param {number} heightChange - Amount to change height by
   * @param {number} distanceChange - Amount to change distance by
   */
  adjust(heightChange, distanceChange) {
    this.height = Math.max(1, Math.min(10, this.height + heightChange));
    this.distance = Math.max(3, Math.min(20, this.distance + distanceChange));
  }

  /**
   * Get the camera instance
   */
  getCamera() {
    return this.camera;
  }
} 