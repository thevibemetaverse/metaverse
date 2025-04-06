import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class LoadingManager {
    constructor() {
        this.loadingManager = new THREE.LoadingManager();
        this.gltfLoader = new GLTFLoader(this.loadingManager);
        this.loadedAssets = new Map();
        this.pendingLoads = new Set();
    }

    async preloadAssets() {
        // Preload character models
        await this.preloadCharacterModels();
        
        // Preload environment models
        await this.preloadEnvironmentModels();
        
        // Preload portal models
        await this.preloadPortalModels();
    }

    async preloadCharacterModels() {
        const characterModels = [
            './assets/models/metaverse-explorer.glb',
            './assets/models/metaverse-jump.glb'
        ];

        for (const modelPath of characterModels) {
            this.pendingLoads.add(modelPath);
            this.gltfLoader.load(
                modelPath,
                (gltf) => {
                    this.loadedAssets.set(modelPath, gltf);
                    this.pendingLoads.delete(modelPath);
                },
                undefined,
                (error) => {
                    console.error('Error preloading character model:', error);
                    this.pendingLoads.delete(modelPath);
                }
            );
        }
    }

    async preloadEnvironmentModels() {
        const environmentModels = [
            '/assets/models/eiffel_tower.glb',
            '/assets/models/sagrada_familia_2.glb',
            '/assets/models/runway.glb',
            '/assets/models/vibermart.glb'
        ];

        for (const modelPath of environmentModels) {
            this.pendingLoads.add(modelPath);
            this.gltfLoader.load(
                modelPath,
                (gltf) => {
                    this.loadedAssets.set(modelPath, gltf);
                    this.pendingLoads.delete(modelPath);
                },
                undefined,
                (error) => {
                    console.error('Error preloading environment model:', error);
                    this.pendingLoads.delete(modelPath);
                }
            );
        }
    }

    async preloadPortalModels() {
        const portalModels = [
            '/assets/models/portal/portal-new.gltf'
        ];

        for (const modelPath of portalModels) {
            this.pendingLoads.add(modelPath);
            this.gltfLoader.load(
                modelPath,
                (gltf) => {
                    this.loadedAssets.set(modelPath, gltf);
                    this.pendingLoads.delete(modelPath);
                },
                undefined,
                (error) => {
                    console.error('Error preloading portal model:', error);
                    this.pendingLoads.delete(modelPath);
                }
            );
        }
    }

    getAsset(path) {
        return this.loadedAssets.get(path);
    }

    isAssetLoaded(path) {
        return this.loadedAssets.has(path);
    }

    isPreloadingComplete() {
        return this.pendingLoads.size === 0;
    }
} 