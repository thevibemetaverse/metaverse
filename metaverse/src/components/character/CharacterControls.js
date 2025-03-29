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

        // Bind event handlers to preserve 'this' context
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
    }
    
    handleKeyDown(event) {
        // Prevent default behavior for movement keys
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE'].includes(event.code)) {
            event.preventDefault();
        }
        
        console.log('[Controls] Keydown:', event.code);
        
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = true;
                console.log('[Controls] Forward movement started');
                break;
                
            case 'ArrowLeft':
            case 'KeyQ': // Added Q for rotation
                this.rotateLeft = true;
                break;
                
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = true;
                break;
                
            case 'ArrowRight':
            case 'KeyE': // Added E for rotation
                this.rotateRight = true;
                break;

            case 'KeyA':
                this.moveLeft = true;
                break;

            case 'KeyD':
                this.moveRight = true;
                break;
        }
    }
    
    handleKeyUp(event) {
        console.log('[Controls] Keyup:', event.code);
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = false;
                break;
                
            case 'ArrowLeft':
            case 'KeyQ': // Added Q for rotation
                this.rotateLeft = false;
                break;
                
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = false;
                break;
                
            case 'ArrowRight':
            case 'KeyE': // Added E for rotation
                this.rotateRight = false;
                break;

            case 'KeyA':
                this.moveLeft = false;
                break;

            case 'KeyD':
                this.moveRight = false;
                break;
        }
    }
    
    setupMobileControls() {
        // Create a simple virtual joystick for mobile
        this.createVirtualJoystick();
        
        // Set up touch events
        this.joystickActive = false;
        // Ensure domElement is valid before adding listeners
        if (this.domElement && this.joystickContainer) {
            this.joystickContainer.addEventListener('touchstart', (e) => this.handleJoystickStart(e));
            this.domElement.addEventListener('touchmove', (e) => this.handleJoystickMove(e));
            this.domElement.addEventListener('touchend', (e) => this.handleJoystickEnd(e));
        } else {
            console.error('[Controls] Cannot setup mobile controls: domElement or joystickContainer missing.');
        }
    }
    
    createVirtualJoystick() {
        // Prevent creating multiple joysticks if called again
        if (document.getElementById('joystick-container')) return;

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
        joystickContainer.style.touchAction = 'none'; // Prevent page scroll
        joystickContainer.style.zIndex = '10'; // Ensure it's above other elements
        
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
        // Append to specific domElement if provided, otherwise body
        (this.domElement || document.body).appendChild(joystickContainer);
        
        this.joystickContainer = joystickContainer;
        this.joystickThumb = joystickThumb;
        this.joystickSize = joystickSize;
    }
    
    handleJoystickStart(event) {
        // Prevent default touch behavior like scrolling
        event.preventDefault(); 
        this.joystickActive = true;
        this.handleJoystickMove(event);
    }
    
    handleJoystickMove(event) {
        if (!this.joystickActive) return;
        // Prevent default touch behavior
        event.preventDefault();
        
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
        // Adjust threshold for better sensitivity
        const threshold = 0.2;
        this.moveForward = normalizedY < -threshold;
        this.moveBackward = normalizedY > threshold;
        this.moveLeft = normalizedX < -threshold;
        this.moveRight = normalizedX > threshold;
    }
    
    handleJoystickEnd(event) {
        // Prevent default touch behavior
        event.preventDefault();
        this.joystickActive = false;
        this.joystickThumb.style.transform = 'translate(0px, 0px)';
        
        // Reset movement
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
    }

    update(deltaTime) {
        // Calculate movement direction based on character's rotation
        const moveAngle = this.character.rotation.y;
        const forwardVector = new THREE.Vector3(Math.sin(moveAngle), 0, Math.cos(moveAngle));
        const rightVector = new THREE.Vector3(Math.sin(moveAngle + Math.PI/2), 0, Math.cos(moveAngle + Math.PI/2));

        // Update character position based on movement flags
        let moveDirection = new THREE.Vector3();
        if (this.moveForward) {
            moveDirection.add(forwardVector);
        }
        if (this.moveBackward) {
            moveDirection.sub(forwardVector);
        }
        if (this.moveLeft) {
            // Assuming A/D keys or left/right joystick controls strafing
            moveDirection.sub(rightVector);
        }
        if (this.moveRight) {
            // Assuming A/D keys or left/right joystick controls strafing
            moveDirection.add(rightVector);
        }

        // Normalize diagonal movement
        if (moveDirection.length() > 0) {
            moveDirection.normalize();
            this.character.position.add(moveDirection.multiplyScalar(this.moveSpeed * deltaTime));
        }
        
        // Update character rotation based on Q/E keys or separate input
        if (this.rotateLeft) {
            this.character.rotation.y += this.rotateSpeed * deltaTime;
        }
        if (this.rotateRight) {
            this.character.rotation.y -= this.rotateSpeed * deltaTime;
        }
    }
    
    isMoving() {
        const isMovingState = this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
        /* // Reduce console spam
        const movementState = {
            forward: this.moveForward,
            backward: this.moveBackward,
            left: this.moveLeft,
            right: this.moveRight
        };
        console.log('[Controls] isMoving check:', isMovingState, movementState);
        */
        return isMovingState;
    }
} 