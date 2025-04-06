import * as THREE from 'three';

export class RaycastManager {
  constructor(scene, camera, renderer) {
    console.log('RaycastManager constructor called with:', {
      scene: scene ? 'Scene exists' : 'No scene',
      camera: camera ? 'Camera exists' : 'No camera',
      renderer: renderer ? 'Renderer exists' : 'No renderer',
      domElement: renderer && renderer.domElement ? 'DOM element exists' : 'No DOM element'
    });
    
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.interactables = [];
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.currentHovered = null;
    
    // Set up event listeners
    if (renderer && renderer.domElement) {
      console.log('Setting up event listeners for raycasting');
      renderer.domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
      renderer.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
      renderer.domElement.addEventListener('pointerup', this.onPointerUp.bind(this));
    } else {
      console.error('Cannot initialize RaycastManager: renderer or domElement is undefined');
    }
  }
  
  registerInteractable(object, options = {}) {
    console.log('Registering interactable object:', object);
    
    // Validate object
    if (!object) {
      console.error('Cannot register null or undefined object as interactable');
      return;
    }
    
    // Store options with defaults
    const interactableOptions = {
      onClick: options.onClick || null,
      onHover: options.onHover || null,
      onHoverExit: options.onHoverExit || null
    };
    
    // Add to interactables array
    this.interactables.push({
      object,
      onClick: interactableOptions.onClick,
      onHover: interactableOptions.onHover,
      onHoverExit: interactableOptions.onHoverExit
    });
    
    console.log(`Object registered as interactable. Total interactables: ${this.interactables.length}`);
  }
  
  update() {
    if (!this.camera) {
      console.warn('RaycastManager update called without camera');
      return;
    }
    
    this.checkIntersections();
  }
  
  checkIntersections() {
    // Make sure we have required components
    if (!this.camera || this.interactables.length === 0) {
      return;
    }
    
    // Update raycaster
    this.raycaster.setFromCamera(this.pointer, this.camera);
    
    // Get all interactable objects
    const interactableObjects = this.interactables.map(item => item.object);
    
    // Perform intersection test
    const intersects = this.raycaster.intersectObjects(interactableObjects, true);
    
    if (intersects.length > 0) {
      const firstIntersect = intersects[0];
      
      // Find matching interactable
      const interactable = this.interactables.find(item => 
        item.object === firstIntersect.object || 
        this.isChildOf(firstIntersect.object, item.object)
      );
      
      if (interactable) {
        if (this.currentHovered !== interactable) {
          // Handle hover exit for previous object
          if (this.currentHovered && this.currentHovered.onHoverExit) {
            this.currentHovered.onHoverExit();
          }
          
          // Set new hovered object
          this.currentHovered = interactable;
          
          // Call hover callback
          if (interactable.onHover) {
            interactable.onHover();
          }
        }
      }
    } else if (this.currentHovered) {
      // No intersections but we had a previously hovered object
      if (this.currentHovered.onHoverExit) {
        this.currentHovered.onHoverExit();
      }
      this.currentHovered = null;
    }
  }
  
  // Helper to check if an object is a child of another
  isChildOf(child, parent) {
    let current = child;
    
    // Traverse up the parent chain
    while (current && current !== parent) {
      current = current.parent;
    }
    
    return current === parent;
  }
  
  onPointerMove(event) {
    if (!this.renderer || !this.renderer.domElement) {
      return;
    }
    
    // Calculate pointer position in normalized device coordinates (-1 to +1)
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }
  
  onPointerDown(event) {
    if (!this.camera || this.interactables.length === 0) {
      return;
    }
    
    // Update raycaster with current pointer position
    this.raycaster.setFromCamera(this.pointer, this.camera);
    
    // Get all interactable objects
    const interactableObjects = this.interactables.map(item => item.object);
    
    // Perform intersection test
    const intersects = this.raycaster.intersectObjects(interactableObjects, true);
    
    if (intersects.length > 0) {
      const firstIntersect = intersects[0];
      
      // Find matching interactable
      const interactable = this.interactables.find(item => 
        item.object === firstIntersect.object || 
        this.isChildOf(firstIntersect.object, item.object)
      );
      
      if (interactable && interactable.onClick) {
        console.log('Object clicked:', interactable.object);
        interactable.onClick();
      }
    }
  }
  
  onPointerUp(event) {
    // Handle any pointer up specific logic if needed
  }
} 