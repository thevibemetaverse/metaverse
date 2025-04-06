import { RaycastManager } from './RaycastManager';
import { InteractionEvents } from './InteractionEvents';

export class InteractionManager {
  constructor(scene, camera, renderer) {
    console.log('Initializing InteractionManager with:', {
      scene: scene ? 'Scene exists' : 'No scene',
      camera: camera ? 'Camera exists' : 'No camera',
      renderer: renderer ? 'Renderer exists' : 'No renderer'
    });
    
    this.raycastManager = new RaycastManager(scene, camera, renderer);
    this.events = new InteractionEvents();
    this.renderer = renderer;
    
    // Ensure the renderer's DOM element has the correct style if it exists
    if (renderer && renderer.domElement) {
      this.renderer.domElement.style.cursor = 'auto';
      console.log('Styled renderer DOM element');
    } else {
      console.error('Renderer or DOM element missing in InteractionManager');
    }
  }

  makeObjectInteractable(object, options = {}) {
    console.log('Making object interactable:', object);
    
    // Ensure the object is properly set up for interaction
    if (object.isObject3D) {
      object.traverse((child) => {
        if (child.isMesh) {
          child.userData.isInteractable = true;
        }
      });
    }
    
    // Register with raycast manager
    this.raycastManager.registerInteractable(object, {
      onClick: () => {
        console.log('Object clicked:', object);
        
        // Dispatch event
        this.events.dispatchEvent({
          type: 'objectClicked',
          object: object
        });
        
        // Call options callback if provided
        if (options.onClick) {
          options.onClick();
        }
      },
      onHover: () => {
        // Change cursor to pointer
        if (this.renderer && this.renderer.domElement) {
          this.renderer.domElement.style.cursor = 'pointer';
        }
        
        // Dispatch event
        this.events.dispatchEvent({
          type: 'objectHovered',
          object: object
        });
        
        // Call options callback if provided
        if (options.onHover) {
          options.onHover();
        }
      },
      onHoverExit: () => {
        // Reset cursor
        if (this.renderer && this.renderer.domElement) {
          this.renderer.domElement.style.cursor = 'auto';
        }
        
        // Dispatch event
        this.events.dispatchEvent({
          type: 'objectHoverExit',
          object: object
        });
        
        // Call options callback if provided
        if (options.onHoverExit) {
          options.onHoverExit();
        }
      }
    });
    
    return object;
  }

  // Event registration methods
  onObjectClicked(callback) {
    this.events.onObjectClicked(callback);
  }
  
  onObjectHovered(callback) {
    this.events.onObjectHovered(callback);
  }
  
  onObjectHoverExit(callback) {
    this.events.onObjectHoverExit(callback);
  }
  
  update() {
    if (this.raycastManager) {
      this.raycastManager.update();
    } else {
      console.warn('RaycastManager is not initialized');
    }
  }
} 