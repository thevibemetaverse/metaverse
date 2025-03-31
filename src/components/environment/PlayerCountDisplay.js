import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';

export default class PlayerCountDisplay {
    constructor(scene, socket, position = new THREE.Vector3(15, 7, 60)) {
        this.scene = scene;
        this.socket = socket;
        this.position = position;
        this.playerCount = 0;
        this.textMesh = null;
        this.font = null;
        this.group = new THREE.Group();
        this.scene.add(this.group);
        
        // Load font and create initial display
        this.loadFont();
        
        // Create background panel
        this.createPanel();
        
        // Set up socket event listener for player count updates
        if (this.socket) {
            this.setupSocketListeners();
        } else {
            console.warn('[PlayerCountDisplay] No socket provided. Count will not update dynamically.');
            // Set a default player count for testing
            this.playerCount = 1;
            setTimeout(() => this.createTextMesh(), 2000);
        }
    }
    
    loadFont() {
        const fontLoader = new FontLoader();
        fontLoader.load('/assets/fonts/helvetiker_regular.typeface.json', (font) => {
            this.font = font;
            this.createTextMesh();
            console.log('[PlayerCountDisplay] Font loaded successfully');
        });
    }
    
    createPanel() {
        // Create a panel background
        const panelGeometry = new THREE.BoxGeometry(12, 6, 0.2);
        const panelMaterial = new THREE.MeshStandardMaterial({
            color: 0x2c3e50,
            roughness: 0.7,
            metalness: 0.3
        });
        
        this.panel = new THREE.Mesh(panelGeometry, panelMaterial);
        this.panel.position.copy(this.position);
        // Rotate panel 180 degrees around Y axis to face opposite direction
        this.panel.rotation.y = 180;
        this.panel.castShadow = true;
        this.panel.receiveShadow = true;
        
        // Create a simple title for the panel using planes with text textures
        const titleCanvas = document.createElement('canvas');
        titleCanvas.width = 512; // Increase canvas width for text
        titleCanvas.height = 128; // Increase canvas height
        const titleContext = titleCanvas.getContext('2d');
        titleContext.fillStyle = '#2c3e50';
        titleContext.fillRect(0, 0, titleCanvas.width, titleCanvas.height);
        
        // Make text smaller relative to the canvas to avoid cutoff
        titleContext.font = 'bold 60px Arial';
        titleContext.textAlign = 'center';
        titleContext.textBaseline = 'middle';
        titleContext.fillStyle = '#ecf0f1';
        titleContext.fillText('PLAYERS ONLINE', titleCanvas.width / 2, titleCanvas.height / 2);
        
        const titleTexture = new THREE.CanvasTexture(titleCanvas);
        const titleMaterial = new THREE.MeshBasicMaterial({ 
            map: titleTexture,
            transparent: true
        });
        
        const titleGeometry = new THREE.PlaneGeometry(10, 2);
        const titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
        titleMesh.position.set(0, 1.8, 0.11);
        
        this.panel.add(titleMesh);
        this.group.add(this.panel);
    }
    
    createTextMesh() {
        if (!this.font) {
            console.warn('[PlayerCountDisplay] Font not loaded yet');
            return;
        }
        
        // Remove existing text mesh if it exists
        if (this.textMesh) {
            this.panel.remove(this.textMesh);
            this.textMesh.geometry.dispose();
            this.textMesh.material.dispose();
        }
        
        console.log(`[PlayerCountDisplay] Creating text mesh for count: ${this.playerCount}`);
        
        // Create text geometry with smaller size and less height
        const textGeometry = new TextGeometry(this.playerCount.toString(), {
            font: this.font,
            size: 2.5,
            height: 0.2,
            curveSegments: 12,
            bevelEnabled: false
        });
        
        // Center the text
        textGeometry.computeBoundingBox();
        const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
        
        // Create text mesh
        const textMaterial = new THREE.MeshStandardMaterial({ color: 0xecf0f1 });
        this.textMesh = new THREE.Mesh(textGeometry, textMaterial);
        // Move the text lower on the panel to avoid clipping with the banner
        this.textMesh.position.set(-textWidth / 2, -1.8, 0.11);
        this.textMesh.castShadow = true;
        
        // Add to panel
        this.panel.add(this.textMesh);
    }
    
    setupSocketListeners() {
        this.socket.on('playerCount', (data) => {
            console.log(`[PlayerCountDisplay] Received player count update: ${data.count}`);
            this.updatePlayerCount(data.count);
        });
        
        // Request initial player count
        this.socket.emit('getPlayerCount');
    }
    
    updatePlayerCount(count) {
        this.playerCount = count;
        if (this.font) {
            this.createTextMesh();
        }
    }
    
    setSocket(socket) {
        this.socket = socket;
        this.setupSocketListeners();
    }
} 