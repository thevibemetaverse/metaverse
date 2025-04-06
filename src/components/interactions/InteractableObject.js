import * as THREE from 'three';

export class InteractableObject extends THREE.Object3D {
  constructor(options = {}) {
    super();
    this.isInteractable = true;
    this.interactionState = {
      isHovered: false,
      isSelected: false,
      isActive: false
    };
    
    this.callbacks = {
      onClick: options.onClick || null,
      onHover: options.onHover || null,
      onHoverExit: options.onHoverExit || null
    };
  }
  
  setInteractionState(state, value) {
    this.interactionState[state] = value;
    this.dispatchEvent({ type: `${state}Changed`, value });
  }
  
  onClick() {
    if (this.callbacks.onClick) {
      this.callbacks.onClick();
    }
    this.setInteractionState('isSelected', true);
  }
  
  onHover() {
    if (this.callbacks.onHover) {
      this.callbacks.onHover();
    }
    this.setInteractionState('isHovered', true);
  }
  
  onHoverExit() {
    if (this.callbacks.onHoverExit) {
      this.callbacks.onHoverExit();
    }
    this.setInteractionState('isHovered', false);
  }
} 