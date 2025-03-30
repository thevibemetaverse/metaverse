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
        
        // Mobile controls state
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        console.log('[Controls] Mobile detection:', {
            userAgent: navigator.userAgent,
            isMobile: this.isMobile
        });
        
        this.moveJoystickActive = false;
        this.lookJoystickActive = false;
        this.moveJoystickTouchId = null;
        this.lookJoystickTouchId = null;

        // Bind event handlers to preserve 'this' context
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        
        // Initialize mobile controls if on mobile
        if (this.isMobile) {
            console.log('[Controls] Setting up mobile controls');
            this.setupMobileControls();
        }
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
        console.log('[Controls] Creating virtual joysticks');
        // Create virtual joysticks for movement and looking
        this.createVirtualJoysticks();
        
        // Set up touch events on the joystick containers instead of domElement
        if (this.moveJoystickContainer && this.lookJoystickContainer) {
            console.log('[Controls] Adding touch event listeners to joystick containers');
            
            // Movement joystick events
            this.moveJoystickContainer.addEventListener('touchstart', (e) => {
                e.preventDefault();
                // Find the first touch that's not being used by the look joystick
                const touch = Array.from(e.touches).find(t => t.identifier !== this.lookJoystickTouchId);
                if (touch && !this.moveJoystickActive) {
                    this.moveJoystickActive = true;
                    this.moveJoystickTouchId = touch.identifier;
                    this.updateMoveJoystick(touch);
                }
            }, { passive: false });
            
            this.moveJoystickContainer.addEventListener('touchmove', (e) => {
                e.preventDefault();
                // Find our specific touch in the touches array
                const touch = Array.from(e.touches).find(t => t.identifier === this.moveJoystickTouchId);
                if (touch) {
                    this.updateMoveJoystick(touch);
                }
            }, { passive: false });
            
            this.moveJoystickContainer.addEventListener('touchend', (e) => {
                e.preventDefault();
                // Find our specific touch in the changedTouches array
                const touch = Array.from(e.changedTouches).find(t => t.identifier === this.moveJoystickTouchId);
                if (touch) {
                    this.moveJoystickActive = false;
                    this.moveJoystickTouchId = null;
                    this.moveJoystickThumb.style.transform = 'translate(0px, 0px)';
                    this.moveForward = false;
                    this.moveBackward = false;
                    this.moveLeft = false;
                    this.moveRight = false;
                }
            }, { passive: false });
            
            // Look joystick events
            this.lookJoystickContainer.addEventListener('touchstart', (e) => {
                e.preventDefault();
                // Find the first touch that's not being used by the move joystick
                const touch = Array.from(e.touches).find(t => t.identifier !== this.moveJoystickTouchId);
                if (touch && !this.lookJoystickActive) {
                    this.lookJoystickActive = true;
                    this.lookJoystickTouchId = touch.identifier;
                    this.updateLookJoystick(touch);
                }
            }, { passive: false });
            
            this.lookJoystickContainer.addEventListener('touchmove', (e) => {
                e.preventDefault();
                // Find our specific touch in the touches array
                const touch = Array.from(e.touches).find(t => t.identifier === this.lookJoystickTouchId);
                if (touch) {
                    this.updateLookJoystick(touch);
                }
            }, { passive: false });
            
            this.lookJoystickContainer.addEventListener('touchend', (e) => {
                e.preventDefault();
                // Find our specific touch in the changedTouches array
                const touch = Array.from(e.changedTouches).find(t => t.identifier === this.lookJoystickTouchId);
                if (touch) {
                    this.lookJoystickActive = false;
                    this.lookJoystickTouchId = null;
                    this.lookJoystickThumb.style.transform = 'translate(0px, 0px)';
                    this.rotateLeft = false;
                    this.rotateRight = false;
                }
            }, { passive: false });
        } else {
            console.error('[Controls] Cannot setup mobile controls: joystick containers missing.');
        }
    }
    
    createVirtualJoysticks() {
        // Create movement joystick container
        const joystickSize = 100;
        
        // Movement joystick (left side)
        const moveJoystickContainer = document.createElement('div');
        moveJoystickContainer.id = 'move-joystick-container';
        moveJoystickContainer.style.position = 'fixed';
        moveJoystickContainer.style.bottom = '50px';
        moveJoystickContainer.style.left = '50px';
        moveJoystickContainer.style.width = `${joystickSize}px`;
        moveJoystickContainer.style.height = `${joystickSize}px`;
        moveJoystickContainer.style.borderRadius = '50%';
        moveJoystickContainer.style.background = 'rgba(255, 255, 255, 0.3)';
        moveJoystickContainer.style.border = '2px solid rgba(255, 255, 255, 0.5)';
        moveJoystickContainer.style.touchAction = 'none';
        moveJoystickContainer.style.zIndex = '9999';
        moveJoystickContainer.style.pointerEvents = 'auto';
        moveJoystickContainer.style.userSelect = 'none'; // Prevent text selection
        moveJoystickContainer.style.webkitUserSelect = 'none'; // For Safari
        
        // Movement joystick thumb
        const moveJoystickThumb = document.createElement('div');
        moveJoystickThumb.id = 'move-joystick-thumb';
        moveJoystickThumb.style.position = 'absolute';
        moveJoystickThumb.style.top = '50%';
        moveJoystickThumb.style.left = '50%';
        moveJoystickThumb.style.width = `${joystickSize * 0.4}px`;
        moveJoystickThumb.style.height = `${joystickSize * 0.4}px`;
        moveJoystickThumb.style.marginLeft = `-${joystickSize * 0.2}px`;
        moveJoystickThumb.style.marginTop = `-${joystickSize * 0.2}px`;
        moveJoystickThumb.style.borderRadius = '50%';
        moveJoystickThumb.style.background = 'rgba(255, 255, 255, 0.7)';
        moveJoystickThumb.style.pointerEvents = 'none';
        moveJoystickThumb.style.userSelect = 'none';
        moveJoystickThumb.style.webkitUserSelect = 'none';
        
        moveJoystickContainer.appendChild(moveJoystickThumb);
        
        // Look joystick (right side)
        const lookJoystickContainer = document.createElement('div');
        lookJoystickContainer.id = 'look-joystick-container';
        lookJoystickContainer.style.position = 'fixed';
        lookJoystickContainer.style.bottom = '50px';
        lookJoystickContainer.style.right = '50px';
        lookJoystickContainer.style.width = `${joystickSize}px`;
        lookJoystickContainer.style.height = `${joystickSize}px`;
        lookJoystickContainer.style.borderRadius = '50%';
        lookJoystickContainer.style.background = 'rgba(255, 255, 255, 0.3)';
        lookJoystickContainer.style.border = '2px solid rgba(255, 255, 255, 0.5)';
        lookJoystickContainer.style.touchAction = 'none';
        lookJoystickContainer.style.zIndex = '9999';
        lookJoystickContainer.style.pointerEvents = 'auto';
        lookJoystickContainer.style.userSelect = 'none';
        lookJoystickContainer.style.webkitUserSelect = 'none';
        
        // Look joystick thumb
        const lookJoystickThumb = document.createElement('div');
        lookJoystickThumb.id = 'look-joystick-thumb';
        lookJoystickThumb.style.position = 'absolute';
        lookJoystickThumb.style.top = '50%';
        lookJoystickThumb.style.left = '50%';
        lookJoystickThumb.style.width = `${joystickSize * 0.4}px`;
        lookJoystickThumb.style.height = `${joystickSize * 0.4}px`;
        lookJoystickThumb.style.marginLeft = `-${joystickSize * 0.2}px`;
        lookJoystickThumb.style.marginTop = `-${joystickSize * 0.2}px`;
        lookJoystickThumb.style.borderRadius = '50%';
        lookJoystickThumb.style.background = 'rgba(255, 255, 255, 0.7)';
        lookJoystickThumb.style.pointerEvents = 'none';
        lookJoystickThumb.style.userSelect = 'none';
        lookJoystickThumb.style.webkitUserSelect = 'none';
        
        lookJoystickContainer.appendChild(lookJoystickThumb);
        
        // Append joysticks to body
        document.body.appendChild(moveJoystickContainer);
        document.body.appendChild(lookJoystickContainer);
        
        console.log('[Controls] Joysticks created and added to DOM');
        
        // Store references
        this.moveJoystickContainer = moveJoystickContainer;
        this.moveJoystickThumb = moveJoystickThumb;
        this.lookJoystickContainer = lookJoystickContainer;
        this.lookJoystickThumb = lookJoystickThumb;
        this.joystickSize = joystickSize;
    }
    
    updateMoveJoystick(touch) {
        const rect = this.moveJoystickContainer.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
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
        this.moveJoystickThumb.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        
        // Convert to movement values
        const normalizedX = offsetX / maxDistance;
        const normalizedY = offsetY / maxDistance;
        
        // Set movement flags based on joystick position
        const threshold = 0.2;
        this.moveForward = normalizedY < -threshold;
        this.moveBackward = normalizedY > threshold;
        this.moveLeft = normalizedX > -threshold;
        this.moveRight = normalizedX < threshold;
    }
    
    updateLookJoystick(touch) {
        const rect = this.lookJoystickContainer.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
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
        this.lookJoystickThumb.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        
        // Convert to rotation values
        const normalizedX = offsetX / maxDistance;
        
        // Set rotation flags based on joystick position
        const threshold = 0.2;
        this.rotateLeft = normalizedX < -threshold;
        this.rotateRight = normalizedX > threshold;
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