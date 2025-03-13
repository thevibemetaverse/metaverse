import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Class to manage the BBQ sauce model in the scene
export class BBQModel {
  constructor(scene, loadingManager = new THREE.LoadingManager()) {
    this.scene = scene;
    this.loadingManager = loadingManager;
    this.model = null;
    this.mixer = null;
    this.animations = [];
    this.clock = new THREE.Clock();
    this.shouldRotate = false; // Disable rotation by default
    
    // Path to the model
    this.modelPath = '/assets/models/sweet_baby_rays_bbq_sauce.glb';
    
    console.log('BBQModel initialized');
  }
  
  // Load the model and add it to the scene
  loadModel(position = new THREE.Vector3(0, 0, 0), scale = 1) {
    console.log(`Loading BBQ model from: ${this.modelPath}`);
    
    // Create a placeholder while loading
    const placeholder = this.createPlaceholder();
    placeholder.position.copy(position);
    this.scene.add(placeholder);
    
    // Load the actual model
    const loader = new GLTFLoader(this.loadingManager);
    loader.load(
      this.modelPath,
      (gltf) => {
        console.log('BBQ model loaded successfully', gltf);
        
        this.model = gltf.scene;
        
        // Apply position and scale
        this.model.position.copy(position);
        this.model.scale.set(scale, scale, scale);
        
        // Handle animations if they exist
        if (gltf.animations && gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(this.model);
          this.animations = gltf.animations;
          console.log(`Loaded ${this.animations.length} animations for BBQ model`);
          
          // Play the first animation by default
          const action = this.mixer.clipAction(this.animations[0]);
          action.play();
        }
        
        // Add model to scene and remove placeholder
        this.scene.add(this.model);
        this.scene.remove(placeholder);
        
        console.log('BBQ model added to scene');
      },
      (xhr) => {
        console.log(`BBQ model loading: ${(xhr.loaded / xhr.total) * 100}% loaded`);
      },
      (error) => {
        console.error('Error loading BBQ model:', error);
        // Keep the placeholder in case of error
      }
    );
  }
  
  // Create a single BBQ sauce bottle at a specific position and height
  createSingleBBQ(x = 0, z = 0, height = 5, scale = 2) {
    console.log(`Creating a single BBQ bottle at position (${x}, ${height}, ${z})`);
    
    const position = new THREE.Vector3(x, height, z);
    this.loadModel(position, scale);
  }
  
  // Create a simple placeholder object
  createPlaceholder() {
    const geometry = new THREE.BoxGeometry(0.5, 1, 0.5);
    const material = new THREE.MeshBasicMaterial({ color: 0xff5500, wireframe: true });
    return new THREE.Mesh(geometry, material);
  }
  
  // Update animations (call this in the animation loop)
  update() {
    if (this.mixer) {
      this.mixer.update(this.clock.getDelta());
    }
    
    // Only rotate if rotation is enabled
    if (this.model && this.shouldRotate) {
      this.model.rotation.y += 0.005;
    }
  }
  
  // Create multiple BBQ sauce bottles randomly in the scene
  createRandomBBQs(count = 5, minDistance = 5, maxDistance = 20, height = 1) {
    console.log(`Creating ${count} random BBQ bottles in the scene`);
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = minDistance + Math.random() * (maxDistance - minDistance);
      
      const position = new THREE.Vector3(
        Math.cos(angle) * distance,
        height + Math.random() * 0.5, // Slight height variation
        Math.sin(angle) * distance
      );
      
      // Random scale between 0.5 and 1.5
      const scale = 0.5 + Math.random();
      
      // Load model with position and scale
      this.loadModel(position, scale);
    }
  }
} 