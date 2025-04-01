import * as THREE from 'three';

export default class HillsGenerator {
  constructor(params = {}) {
    // Default parameters
    this.params = {
      smallHillCount: params.smallHillCount || 40,
      largeHillCount: params.largeHillCount || 8,
      baseDistance: params.baseDistance || 10000,
      distanceVariation: params.distanceVariation || 80,
      colors: params.colors || [0x8AE68A, 0x9EEE9E, 0xB0F7B0],
      randomNumber: 69 / 100, // Normalized to be between 0 and 1
      ...params
    };
    
    console.log('Using random number:', this.params.randomNumber);
    this.hillsGroup = new THREE.Group();
    this.initialized = false;
  }
  
  init() {
    if (this.initialized) return this.hillsGroup;
    
    this._createLargeHills();
    this._createSmallHills();
    
    this.initialized = true;
    return this.hillsGroup;
  }
  
  _createSmallHills() {
    // Create base hill geometry that will be instanced
    const hillGeometry = new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    
    // Create instanced mesh
    const instanceCount = this.params.smallHillCount;
    const hillsMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.6,
      metalness: 0.1,
      flatShading: false
    });
    
    const instancedHills = new THREE.InstancedMesh(
      hillGeometry,
      hillsMaterial,
      instanceCount
    );
    
    // Configure each instance
    const dummy = new THREE.Object3D();
    const colorArray = new Float32Array(instanceCount * 3);
    
    for (let i = 0; i < instanceCount; i++) {
      // Position hills in a circle around the scene
      const angle = (i / instanceCount) * Math.PI * 2;
      const baseDistance = this.params.baseDistance + this.params.randomNumber * this.params.distanceVariation;
      const distance = baseDistance - this.params.randomNumber * 40;
      
      // Set position
      dummy.position.x = Math.cos(angle) * distance;
      dummy.position.z = Math.sin(angle) * distance;
      dummy.position.y = -10; // Slightly buried
      
      // Set rotation
      dummy.rotation.y = this.params.randomNumber * Math.PI * 2;
      
      // Set scale - make hills wider than tall
      const radius = 50 + this.params.randomNumber * 100;
      const scaleX = radius * (1.0 + this.params.randomNumber * 0.5);
      const scaleZ = radius * (1.0 + this.params.randomNumber * 0.5);
      dummy.scale.set(scaleX, radius * 0.7, scaleZ);
      
      // Apply transform to instance
      dummy.updateMatrix();
      instancedHills.setMatrixAt(i, dummy.matrix);
      
      // Set color for this instance
      const colorIndex = Math.floor(this.params.randomNumber * this.params.colors.length);
      const color = new THREE.Color(this.params.colors[colorIndex]);
      instancedHills.setColorAt(i, color);
    }
    
    // Update the instance matrices and colors
    instancedHills.instanceMatrix.needsUpdate = true;
    instancedHills.instanceColor.needsUpdate = true;
    
    // Set up shadows
    instancedHills.castShadow = true;
    instancedHills.receiveShadow = true;
    
    this.hillsGroup.add(instancedHills);
  }
  
  _createLargeHills() {
    // Create base hill geometry for larger landmark hills
    const landmarkGeometry = new THREE.SphereGeometry(1, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    
    // Create instanced mesh for landmark hills
    const instanceCount = this.params.largeHillCount;
    const landmarkMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.6,
      metalness: 0.1,
      flatShading: false
    });
    
    const instancedLandmarks = new THREE.InstancedMesh(
      landmarkGeometry,
      landmarkMaterial,
      instanceCount
    );
    
    // Configure each landmark instance
    const dummy = new THREE.Object3D();
    
    for (let i = 0; i < instanceCount; i++) {
      // Place these at specific angles for best visual effect
      const landmarkAngle = (i / instanceCount) * Math.PI * 2;
      const landmarkDistance = 480; // Further back
      
      // Set position
      dummy.position.x = Math.cos(landmarkAngle) * landmarkDistance;
      dummy.position.z = Math.sin(landmarkAngle) * landmarkDistance;
      dummy.position.y = -30;
      
      // Set scale - extra large and wide
      const radius = 120 + this.params.randomNumber * 40;
      dummy.scale.set(radius * 1.6, radius * 0.7, radius * 1.6);
      
      // Apply transform to instance
      dummy.updateMatrix();
      instancedLandmarks.setMatrixAt(i, dummy.matrix);
      
      // Set color for this landmark
      const colorIndex = Math.floor(this.params.randomNumber * this.params.colors.length);
      const color = new THREE.Color(this.params.colors[colorIndex]);
      instancedLandmarks.setColorAt(i, color);
    }
    
    // Update the instance matrices and colors
    instancedLandmarks.instanceMatrix.needsUpdate = true;
    instancedLandmarks.instanceColor.needsUpdate = true;
    
    // Set up shadows
    instancedLandmarks.castShadow = true;
    instancedLandmarks.receiveShadow = true;
    
    this.hillsGroup.add(instancedLandmarks);
  }
  
  // Method to set quality level - useful for performance adjustment
  setQuality(quality) {
    // quality is a number between 0 and 1
    const smallCount = Math.floor(this.params.smallHillCount * quality);
    const largeCount = Math.floor(this.params.largeHillCount * quality);
    
    // Update hill counts
    this.params.smallHillCount = Math.max(8, smallCount);
    this.params.largeHillCount = Math.max(2, largeCount);
    
    // Clear existing hills
    while (this.hillsGroup.children.length > 0) {
      this.hillsGroup.remove(this.hillsGroup.children[0]);
    }
    
    this.initialized = false;
    return this.init();
  }
}