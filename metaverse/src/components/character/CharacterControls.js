import * as THREE from 'three';

export default class CharacterControls {
    constructor(character, camera, domElement) {
        this.character = character;
        this.camera = camera;
        this.domElement = domElement || document;
        
        // Movement state
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        
        // Character speed
        this.moveSpeed = 5;
        
        // Force desktop controls for testing
        this.isMobile = false;
        this.setupControls();
        
        // Log initialization
        console.log('CharacterControls initialized with:', {
            character: !!this.character,
            camera: !!this.camera,
            domElement: !!this.domElement,
            isMobile: this.isMobile
        });
    }
    
    setupControls() {
        console.log('Setting up controls for device type:', this.isMobile ? 'mobile' : 'desktop');
        if (this.isMobile) {
            this.setupMobileControls();
        } else {
            this.setupKeyboardControls();
        }
    }
    
    setupKeyboardControls() {
        console.log('Setting up keyboard controls...');
        
        // Keyboard down event
        window.addEventListener('keydown', (event) => {
            console.log('Key pressed:', event.code);
            
            // Prevent default behavior for movement keys
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
                event.preventDefault();
            }
            
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.moveForward = true;
                    console.log('Move forward activated');
                    break;
                    
                case 'ArrowLeft':
                case 'KeyA':
                    this.moveLeft = true;
                    console.log('Move left activated');
                    break;
                    
                case 'ArrowDown':
                case 'KeyS':
                    this.moveBackward = true;
                    console.log('Move backward activated');
                    break;
                    
                case 'ArrowRight':
                case 'KeyD':
                    this.moveRight = true;
                    console.log('Move right activated');
                    break;
            }
        }, false);
        
        // Keyboard up event
        window.addEventListener('keyup', (event) => {
            console.log('Key released:', event.code);
            
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.moveForward = false;
                    console.log('Move forward deactivated');
                    break;
                    
                case 'ArrowLeft':
                case 'KeyA':
                    this.moveLeft = false;
                    console.log('Move left deactivated');
                    break;
                    
                case 'ArrowDown':
                case 'KeyS':
                    this.moveBackward = false;
                    console.log('Move backward deactivated');
                    break;
                    
                case 'ArrowRight':
                case 'KeyD':
                    this.moveRight = false;
                    console.log('Move right deactivated');
                    break;
            }
        }, false);
        
        console.log('Keyboard controls setup complete');
    }
    
    setupMobileControls() {
        // Create a simple virtual joystick for mobile
        this.createVirtualJoystick();
        
        // Set up touch events
        this.joystickActive = false;
        this.joystickContainer.addEventListener('touchstart', (e) => this.handleJoystickStart(e));
        this.domElement.addEventListener('touchmove', (e) => this.handleJoystickMove(e));
        this.domElement.addEventListener('touchend', (e) => this.handleJoystickEnd(e));
    }
    
    createVirtualJoystick() {
        // Create joystick container
        const joystickSize = 100;
        
        const joystickContainer = document.createElement('div');
        joystickContainer.id = 'joystick-container';
        joystickContainer.style.position = 'absolute';
        joystickContainer.style.bottom = '50px';
        joystickContainer.style.left = '50px';
        joystickContainer.style.width = `${joystickSize}px`;
        joystickContainer.style.height = `${joystickSize}px`;
        joystickContainer.style.borderRadius = '50%';
        joystickContainer.style.background = 'rgba(255, 255, 255, 0.3)';
        joystickContainer.style.border = '2px solid rgba(255, 255, 255, 0.5)';
        joystickContainer.style.touchAction = 'none';
        
        // Create joystick thumb
        const joystickThumb = document.createElement('div');
        joystickThumb.id = 'joystick-thumb';
        joystickThumb.style.position = 'absolute';
        joystickThumb.style.top = '50%';
        joystickThumb.style.left = '50%';
        joystickThumb.style.width = `${joystickSize * 0.4}px`;
        joystickThumb.style.height = `${joystickSize * 0.4}px`;
        joystickThumb.style.marginLeft = `-${joystickSize * 0.2}px`;
        joystickThumb.style.marginTop = `-${joystickSize * 0.2}px`;
        joystickThumb.style.borderRadius = '50%';
        joystickThumb.style.background = 'rgba(255, 255, 255, 0.7)';
        
        joystickContainer.appendChild(joystickThumb);
        document.body.appendChild(joystickContainer);
        
        this.joystickContainer = joystickContainer;
        this.joystickThumb = joystickThumb;
        this.joystickSize = joystickSize;
    }
    
    handleJoystickStart(event) {
        this.joystickActive = true;
        this.handleJoystickMove(event);
    }
    
    handleJoystickMove(event) {
        if (!this.joystickActive) return;
        
        const touch = event.touches[0];
        const rect = this.joystickContainer.getBoundingClientRect();
        
        // Calculate center of joystick
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Calculate touch offset from center
        let offsetX = touch.clientX - centerX;
        let offsetY = touch.clientY - centerY;
        
        // Limit to joystick radius
        const maxDistance = this.joystickSize / 2;
        const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
        
        if (distance > maxDistance) {
            const scale = maxDistance / distance;
            offsetX *= scale;
            offsetY *= scale;
        }
        
        // Update thumb position
        this.joystickThumb.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        
        // Convert to movement values
        const normalizedX = offsetX / maxDistance;
        const normalizedY = offsetY / maxDistance;
        
        // Set movement flags based on joystick position
        this.moveForward = normalizedY < -0.3;
        this.moveBackward = normalizedY > 0.3;
        this.moveLeft = normalizedX < -0.3;
        this.moveRight = normalizedX > 0.3;
        
        event.preventDefault();
    }
    
    handleJoystickEnd() {
        this.joystickActive = false;
        this.joystickThumb.style.transform = 'translate(0px, 0px)';
        
        // Reset movement
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
    }
    
    update(deltaTime) {
        if (!this.character) {
            console.warn('Character controls update: character is null');
            return;
        }
        
        // Movement direction vector
        const moveDirection = new THREE.Vector3(0, 0, 0);
        
        // Get camera direction for movement relative to view
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0; // Keep movement on xz plane
        cameraDirection.normalize();
        
        // Get right vector (perpendicular to camera direction)
        const rightVector = new THREE.Vector3(-cameraDirection.z, 0, cameraDirection.x);
        
        // Apply movement inputs
        if (this.moveForward) {
            moveDirection.add(cameraDirection);
        }
        if (this.moveBackward) {
            moveDirection.sub(cameraDirection);
        }
        if (this.moveLeft) {
            moveDirection.sub(rightVector);
        }
        if (this.moveRight) {
            moveDirection.add(rightVector);
        }
        
        // Normalize and scale by speed
        if (moveDirection.length() > 0) {
            moveDirection.normalize().multiplyScalar(this.moveSpeed * deltaTime);
            this.character.position.add(moveDirection);
            
            // Rotate character to face movement direction
            this.character.lookAt(
                this.character.position.x + moveDirection.x,
                this.character.position.y,
                this.character.position.z + moveDirection.z
            );
            
            console.log('Character position:', this.character.position);
            console.log('Movement flags:', {
                forward: this.moveForward,
                backward: this.moveBackward,
                left: this.moveLeft,
                right: this.moveRight
            });
            
            // Play walk animation
            if (this.character.userData && this.character.userData.animationController) {
                this.character.userData.animationController.playAnimation('walk');
            }
        } else {
            // Play idle animation when not moving
            if (this.character.userData && this.character.userData.animationController) {
                this.character.userData.animationController.playAnimation('idle');
            }
        }
    }

    isMoving() {
        return this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
    }
} 