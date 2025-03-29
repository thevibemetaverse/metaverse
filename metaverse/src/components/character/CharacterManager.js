import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import CharacterControls from './CharacterControls';

export default class CharacterManager {
    constructor(scene, camera, domElement) {
        this.scene = scene;
        this.camera = camera;
        this.domElement = domElement;
        this.loader = new GLTFLoader();
        this.defaultCharacterUrl = './assets/models/metaverse-explorer.glb';
        this.character = null;
        this.characterMixer = null;
        this.animations = {};
        this.username = 'Guest';
        this.characterControls = null;
    }

    async initialize() {
        // Parse URL parameters to get username and avatar URL
        this.parseUrlParameters();
        
        // Load character model
        await this.loadCharacterModel();
        
        // Create username label
        this.createUsernameLabel();
        
        // Initialize character controls
        this.characterControls = new CharacterControls(this.character, this.camera, this.domElement);
        
        // Return the character for further use
        return this.character;
    }

    parseUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Get username from URL or use default
        this.username = urlParams.get('username') || 'Guest';
        
        // Get custom avatar URL if provided
        this.avatarUrl = urlParams.get('avatar_url') || null;
    }

    async loadCharacterModel() {
        try {
            // Determine which model to load
            const modelUrl = this.avatarUrl || this.defaultCharacterUrl;
            
            // Load the model
            const gltf = await this.loadModel(modelUrl);
            
            // Set up the character
            this.character = gltf.scene;
            this.character.name = 'playerCharacter';
            
            // Center the model and set scale
            this.character.scale.set(1, 1, 1);
            
            // Setup animations if available
            if (gltf.animations && gltf.animations.length) {
                this.characterMixer = new THREE.AnimationMixer(this.character);
                
                // Store animations by name
                gltf.animations.forEach(animation => {
                    this.animations[animation.name] = this.characterMixer.clipAction(animation);
                });
                
                // Play idle animation by default
                if (this.animations['idle']) {
                    this.animations['idle'].play();
                }
            }
            
            // Add character to scene
            this.scene.add(this.character);
            
            console.log('Character model loaded successfully');
        } catch (error) {
            console.error('Error loading character model:', error);
            
            // Create a fallback cube character
            this.createFallbackCharacter();
        }
    }

    createFallbackCharacter() {
        // Create a simple cube character
        const geometry = new THREE.BoxGeometry(1, 2, 1);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x00ff00,
            roughness: 0.7,
            metalness: 0.3
        });
        
        this.character = new THREE.Mesh(geometry, material);
        this.character.name = 'playerCharacter';
        this.character.position.y = 1; // Place on ground
        this.character.castShadow = true;
        
        // Add to scene
        this.scene.add(this.character);
        
        console.log('Created fallback cube character');
    }

    loadModel(url) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                url,
                (gltf) => resolve(gltf),
                (xhr) => console.log(`Loading model: ${(xhr.loaded / xhr.total) * 100}% loaded`),
                (error) => {
                    console.error('Error loading model:', error);
                    reject(error);
                }
            );
        });
    }

    createUsernameLabel() {
        if (!this.character) {
            console.warn('Cannot create username label: character is null');
            return;
        }

        // Create canvas for username
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        // Style the canvas
        context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = 'bold 24px Arial';
        context.textAlign = 'center';
        context.fillStyle = 'white';
        context.fillText(this.username, canvas.width / 2, canvas.height / 2 + 8);
        
        // Create sprite with canvas texture
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        
        // Position the sprite above the character
        sprite.position.y = 2; // Adjust based on character height
        this.character.add(sprite);
    }

    update(deltaTime) {
        // Update character animations
        if (this.characterMixer) {
            this.characterMixer.update(deltaTime);
        }
        
        // Update character controls
        if (this.characterControls) {
            this.characterControls.update(deltaTime);
        }
    }

    playAnimation(name) {
        // Stop current animations
        for (const anim in this.animations) {
            this.animations[anim].stop();
        }
        
        // Play requested animation if it exists
        if (this.animations[name]) {
            this.animations[name].play();
            return true;
        }
        
        return false;
    }
} 