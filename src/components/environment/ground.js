import * as THREE from 'three';

export default class Ground {
  constructor(params = {}) {
    this.params = {
      size: params.size || 200,
      color: params.color || 0x4CAF50,
      roughness: params.roughness || 0.8,
      metalness: params.metalness || 0.2,
      ...params
    };
    
    this.mesh = null;
  }
  
  init() {
    if (this.mesh) return this.mesh;
    
    const geometry = new THREE.PlaneGeometry(this.params.size, this.params.size);
    const material = new THREE.MeshStandardMaterial({ 
      color: this.params.color,
      roughness: this.params.roughness,
      metalness: this.params.metalness
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    this.mesh.receiveShadow = true;
    this.mesh.userData.isGround = true; // Flag for collision detection
    
    return this.mesh;
  }
}