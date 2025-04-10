import * as THREE from 'three';

export class PieterPortal {
    constructor(scene, playerState) {
        this.scene = scene;
        this.playerState = playerState;
        this.startPortal = null;
        this.exitPortal = null;
        this.startPortalBox = null;
        this.exitPortalBox = null;
        
        // Store shared geometries and materials for instancing
        this.portalGeometries = {
            torus: null,
            circle: null,
            particles: null
        };
        
        this.portalMaterials = {
            startTorus: null,
            startCircle: null,
            startParticles: null,
            exitTorus: null,
            exitCircle: null,
            exitParticles: null
        };
        
        // Instances and animation handlers
        this.particleSystems = [];
        this.animationIds = [];
        
        // Check if portal parameter is true in URL
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('portal') === 'true') {
            this.createExitPortal();
        }
        
        console.log('[PieterPortal] Initialized with scene and playerState');
    }

    // Create shared portal geometries for instancing
    createSharedGeometries() {
        // Create geometries only once
        if (!this.portalGeometries.torus) {
            this.portalGeometries.torus = new THREE.TorusGeometry(15, 2, 16, 100);
            this.portalGeometries.circle = new THREE.CircleGeometry(13, 32);
            
            // Create a buffer geometry for particles
            this.portalGeometries.particles = new THREE.BufferGeometry();
            
            // Create materials for start portal (red)
            this.portalMaterials.startTorus = new THREE.MeshPhongMaterial({
                color: 0xff0000,
                emissive: 0xff0000,
                transparent: true,
                opacity: 0.8
            });
            
            this.portalMaterials.startCircle = new THREE.MeshBasicMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide
            });
            
            this.portalMaterials.startParticles = new THREE.PointsMaterial({
                size: 0.2,
                vertexColors: true,
                transparent: true,
                opacity: 0.6
            });
            
            // Create materials for exit portal (green)
            this.portalMaterials.exitTorus = new THREE.MeshPhongMaterial({
                color: 0x00ff00,
                emissive: 0x00ff00,
                transparent: true,
                opacity: 0.8
            });
            
            this.portalMaterials.exitCircle = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide
            });
            
            this.portalMaterials.exitParticles = new THREE.PointsMaterial({
                size: 0.2,
                vertexColors: true,
                transparent: true,
                opacity: 0.6
            });
        }
    }

    createStartPortal() {
        // Create shared geometries and materials if not created yet
        this.createSharedGeometries();
        
        // Create portal group to contain all portal elements
        const startPortalGroup = new THREE.Group();
        
        // Create the torus mesh using shared geometry and material
        const startPortal = new THREE.Mesh(
            this.portalGeometries.torus, 
            this.portalMaterials.startTorus
        );
        startPortalGroup.add(startPortal);
                    
        // Create portal inner surface
        const startPortalInner = new THREE.Mesh(
            this.portalGeometries.circle, 
            this.portalMaterials.startCircle
        );
        startPortalGroup.add(startPortalInner);

        // Create particle system for portal effect
        const startPortalParticleCount = 1000;
        const startPortalPositions = new Float32Array(startPortalParticleCount * 3);
        const startPortalColors = new Float32Array(startPortalParticleCount * 3);

        for (let i = 0; i < startPortalParticleCount * 3; i += 3) {
            // Create particles in a ring around the portal
            const angle = Math.random() * Math.PI * 2;
            const radius = 15 + (Math.random() - 0.5) * 4;
            startPortalPositions[i] = Math.cos(angle) * radius;
            startPortalPositions[i + 1] = Math.sin(angle) * radius;
            startPortalPositions[i + 2] = (Math.random() - 0.5) * 4;

            // Red color with slight variation
            startPortalColors[i] = 0.8 + Math.random() * 0.2;
            startPortalColors[i + 1] = 0;
            startPortalColors[i + 2] = 0;
        }

        // Create an instance of particles for this portal
        const startPortalParticles = this.portalGeometries.particles.clone();
        startPortalParticles.setAttribute('position', new THREE.BufferAttribute(startPortalPositions, 3));
        startPortalParticles.setAttribute('color', new THREE.BufferAttribute(startPortalColors, 3));

        const startPortalParticleSystem = new THREE.Points(startPortalParticles, this.portalMaterials.startParticles);
        startPortalGroup.add(startPortalParticleSystem);

        // Add portal group to scene
        this.scene.add(startPortalGroup);

        // Create portal collision box
        this.startPortalBox = new THREE.Box3().setFromObject(startPortalGroup);
        this.startPortal = startPortalGroup;
        
        // Store reference to particle system for animation
        this.particleSystems.push({
            system: startPortalParticleSystem,
            particles: startPortalParticles
        });

        // Animate particles
        this.animatePortalParticles(startPortalParticles);
    }

    createExitPortal() {
        // Create shared geometries and materials if not created yet
        this.createSharedGeometries();
        
        // Create portal group to contain all portal elements
        const exitPortalGroup = new THREE.Group();
        
        // Position behind the user (negative z position)
        exitPortalGroup.position.set(0, 0, -25);
        exitPortalGroup.rotation.x = 0.35;
        exitPortalGroup.rotation.y = Math.PI; // Rotate to face the user

        // Create portal effect using the shared geometry
        const exitPortal = new THREE.Mesh(
            this.portalGeometries.torus,
            this.portalMaterials.exitTorus
        );
        exitPortalGroup.add(exitPortal);

        // Create portal inner surface
        const exitPortalInner = new THREE.Mesh(
            this.portalGeometries.circle,
            this.portalMaterials.exitCircle
        );
        exitPortalGroup.add(exitPortalInner);
        
        // Add portal label
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 64;
        context.fillStyle = '#00ff00';
        context.font = 'bold 32px Arial';
        context.textAlign = 'center';
        context.fillText('VIBEVERSE PORTAL', canvas.width/2, canvas.height/2);
        const texture = new THREE.CanvasTexture(canvas);
        const labelGeometry = new THREE.PlaneGeometry(30, 5);
        const labelMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        label.position.y = 20;
        exitPortalGroup.add(label);

        // Create particle system for portal effect - use instanced approach
        const exitPortalParticleCount = 1000;
        const exitPortalPositions = new Float32Array(exitPortalParticleCount * 3);
        const exitPortalColors = new Float32Array(exitPortalParticleCount * 3);

        for (let i = 0; i < exitPortalParticleCount * 3; i += 3) {
            // Create particles in a ring around the portal
            const angle = Math.random() * Math.PI * 2;
            const radius = 15 + (Math.random() - 0.5) * 4;
            exitPortalPositions[i] = Math.cos(angle) * radius;
            exitPortalPositions[i + 1] = Math.sin(angle) * radius;
            exitPortalPositions[i + 2] = (Math.random() - 0.5) * 4;

            // Green color with slight variation
            exitPortalColors[i] = 0;
            exitPortalColors[i + 1] = 0.8 + Math.random() * 0.2;
            exitPortalColors[i + 2] = 0;
        }

        // Create an instance of particles for this portal
        const exitPortalParticles = this.portalGeometries.particles.clone();
        exitPortalParticles.setAttribute('position', new THREE.BufferAttribute(exitPortalPositions, 3));
        exitPortalParticles.setAttribute('color', new THREE.BufferAttribute(exitPortalColors, 3));

        const exitPortalParticleSystem = new THREE.Points(exitPortalParticles, this.portalMaterials.exitParticles);
        exitPortalGroup.add(exitPortalParticleSystem);

        // Add portal group to scene
        this.scene.add(exitPortalGroup);

        // Create portal collision box
        this.exitPortalBox = new THREE.Box3().setFromObject(exitPortalGroup);
        this.exitPortal = exitPortalGroup;
        
        // Store reference to particle system for animation
        this.particleSystems.push({
            system: exitPortalParticleSystem,
            particles: exitPortalParticles
        });

        // Animate particles
        this.animatePortalParticles(exitPortalParticles);
    }
    
    // Single animation method for all particle systems
    animatePortalParticles(particles) {
        const animate = () => {
            const positions = particles.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] += 0.05 * Math.sin(Date.now() * 0.001 + i);
            }
            particles.attributes.position.needsUpdate = true;
            
            const animationId = requestAnimationFrame(animate);
            this.animationIds.push(animationId);
        };
        
        animate();
    }

    checkCollisions(playerPosition) {
        if (new URLSearchParams(window.location.search).get('portal')) {
            // Check start portal collision
            if (this.startPortalBox && playerPosition) {
                const playerBox = new THREE.Box3().setFromObject({ position: playerPosition });
                const portalDistance = playerBox.getCenter(new THREE.Vector3()).distanceTo(this.startPortalBox.getCenter(new THREE.Vector3()));
                if (portalDistance < 50) {
                    // Get ref from URL params
                    const urlParams = new URLSearchParams(window.location.search);
                    const refUrl = urlParams.get('ref');
                    if (refUrl) {
                        // Add https if not present and include query params
                        let url = refUrl;
                        if (!url.startsWith('http://') && !url.startsWith('https://')) {
                            url = 'https://' + url;
                        }
                        const currentParams = new URLSearchParams(window.location.search);
                        const newParams = new URLSearchParams();
                        for (const [key, value] of currentParams) {
                            if (key !== 'ref') { // Skip ref param since it's in the base URL
                                newParams.append(key, value);
                            }
                        }
                        const paramString = newParams.toString();
                        window.location.href = url + (paramString ? '?' + paramString : '');
                    }
                }
            }
        }

        // Check exit portal collision
        if (this.exitPortalBox && playerPosition) {
            const playerBox = new THREE.Box3().setFromObject({ position: playerPosition });
            const portalDistance = playerBox.getCenter(new THREE.Vector3()).distanceTo(this.exitPortalBox.getCenter(new THREE.Vector3()));
            if (portalDistance < 50) {
                // Start loading the next page in the background
                const currentParams = new URLSearchParams(window.location.search);
                const newParams = new URLSearchParams();
                newParams.append('portal', true);
                newParams.append('username', this.playerState.username);
                newParams.append('color', this.playerState.color);
                newParams.append('speed', this.playerState.speed);

                for (const [key, value] of currentParams) {
                    newParams.append(key, value);
                }
                const paramString = newParams.toString();
                const nextPage = 'https://portal.pieter.com' + (paramString ? '?' + paramString : '');

                // Create hidden iframe to preload next page
                if (!document.getElementById('preloadFrame')) {
                    const iframe = document.createElement('iframe');
                    iframe.id = 'preloadFrame';
                    iframe.style.display = 'none';
                    iframe.src = nextPage;
                    document.body.appendChild(iframe);
                }

                // Only redirect once actually in the portal
                if (playerBox.intersectsBox(this.exitPortalBox)) {
                    window.location.href = nextPage;
                }
            }
        }
    }

    initialize() {
        console.log('[PieterPortal] Starting initialization');
        
        // Create special portals if needed
        if (new URLSearchParams(window.location.search).get('portal')) {
            console.log('[PieterPortal] Creating start portal');
            this.createStartPortal();
        }
        console.log('[PieterPortal] Creating exit portal');
        this.createExitPortal();
        
        console.log('[PieterPortal] Initialization complete');
    }

    update(playerPosition) {
        // Check portal collisions if player position is available
        if (playerPosition) {
            this.checkCollisions(playerPosition);
        }
    }

    dispose() {
        // Cancel all animation frames
        this.animationIds.forEach(id => cancelAnimationFrame(id));
        this.animationIds = [];
        
        // Remove special portals
        if (this.startPortal) {
            this.scene.remove(this.startPortal);
            this.startPortal = null;
            this.startPortalBox = null;
        }
        if (this.exitPortal) {
            this.scene.remove(this.exitPortal);
            this.exitPortal = null;
            this.exitPortalBox = null;
        }
        
        // Dispose of geometries
        for (const key in this.portalGeometries) {
            if (this.portalGeometries[key]) {
                this.portalGeometries[key].dispose();
            }
        }
        
        // Dispose of materials
        for (const key in this.portalMaterials) {
            if (this.portalMaterials[key]) {
                this.portalMaterials[key].dispose();
            }
        }
        
        // Clear references
        this.portalGeometries = {};
        this.portalMaterials = {};
        this.particleSystems = [];
    }
} 