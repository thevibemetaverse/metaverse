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
        
        // Rotation state
        this.rotateLeft = false;
        this.rotateRight = false;
        
        // Character speed
        this.moveSpeed = 5;
        this.rotateSpeed = 3; // Speed of rotation in radians per second
        
        // Force desktop controls for testing
        this.isMobile = false;
        this.setupControls();
    }
    
    setupControls() {
        if (this.isMobile) {
            this.setupMobileControls();
        } else {
            this.setupKeyboardControls();
        }
    }
    
    setupKeyboardControls() {
        // Keyboard down event
        window.addEventListener('keydown', (event) => {
            // Prevent default behavior for movement keys
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE'].includes(event.code)) {
                event.preventDefault();
            }
            
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.moveForward = true;
                    break;
                    
                case 'ArrowLeft':
                    this.rotateLeft = true;
                    break;
                    
                case 'ArrowDown':
                case 'KeyS':
                    this.moveBackward = true;
                    break;
                    
                case 'ArrowRight':
                    this.rotateRight = true;
                    break;

                case 'KeyA':
                    this.moveLeft = true;
                    break;

                case 'KeyD':
                    this.moveRight = true;
                    break;

                case 'KeyQ':
                    this.rotateLeft = true;
                    break;

                case 'KeyE':
                    this.rotateRight = true;
                    break;
            }
        }, false);
        
        // Keyboard up event
        window.addEventListener('keyup', (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.moveForward = false;
                    break;
                    
                case 'ArrowLeft':
                    this.rotateLeft = false;
                    break;
                    
                case 'ArrowDown':
                case 'KeyS':
                    this.moveBackward = false;
                    break;
                    
                case 'ArrowRight':
                    this.rotateRight = false;
                    break;

                case 'KeyA':
                    this.moveLeft = false;
                    break;

                case 'KeyD':
                    this.moveRight = false;
                    break;

                case 'KeyQ':
                    this.rotateLeft = false;
                    break;

                case 'KeyE':
                    this.rotateRight = false;
                    break;
            }
        }, false);
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
        // Update character position based on movement flags
        if (this.moveForward) {
            this.character.position.z -= this.moveSpeed * deltaTime;
        }
        if (this.moveBackward) {
            this.character.position.z += this.moveSpeed * deltaTime;
        }
        if (this.moveLeft) {
            this.character.position.x -= this.moveSpeed * deltaTime;
        }
        if (this.moveRight) {
            this.character.position.x += this.moveSpeed * deltaTime;
        }
        
        // Update character rotation
        if (this.rotateLeft) {
            this.character.rotation.y += this.rotateSpeed * deltaTime;
        }
        if (this.rotateRight) {
            this.character.rotation.y -= this.rotateSpeed * deltaTime;
        }
    }
    
    isMoving() {
        return this.moveForward || this.moveBackward || this.moveLeft || this.moveRight || this.rotateLeft || this.rotateRight;
    }
} 