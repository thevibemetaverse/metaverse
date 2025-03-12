import * as THREE from 'three';

// Class to manage the poke mechanic
export class PokeMechanic {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.pokeableObjects = []; // Array to store all pokeable objects
    this.pokeCooldown = false; // Cooldown flag
    this.cooldownTime = 3; // Cooldown time in seconds
    this.leaderboard = []; // Array to store poke leaderboard data
    this.isHoveringPokeable = false; // Flag to track if hovering over a pokeable object
    this.currentHoverObject = null; // Currently hovered object
    this.hoverAnimationFrame = null; // Animation frame for hover effect
    this.hoverStartTime = 0; // Time when hover started
    this.customCursorElement = null; // Custom cursor element
    
    // Set up custom cursor
    this.setupCustomCursor();
    
    // Initialize event listeners
    this.initEventListeners();
    
    // Create leaderboard UI
    this.createLeaderboardUI();
    
    console.log('PokeMechanic initialized with custom cursor');
  }
  
  // Initialize event listeners
  initEventListeners() {
    // Add click event listener for poking
    document.addEventListener('click', this.onPokeClick.bind(this));
    
    // Add mousemove event listener for cursor changes
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
  }
  
  // Set up custom cursor
  setupCustomCursor() {
    // Remove all previous cursor-related styles
    const oldStyles = document.querySelectorAll('#poke-cursor-style, #poke-cursor-fallback-style');
    oldStyles.forEach(style => {
      if (style && style.parentNode) {
        style.parentNode.removeChild(style);
      }
    });
    
    // Remove any existing custom cursor elements
    const oldCursors = document.querySelectorAll('.custom-cursor-element');
    oldCursors.forEach(cursor => {
      if (cursor && cursor.parentNode) {
        cursor.parentNode.removeChild(cursor);
      }
    });
    
    // Create a simple style for the cooldown cursor
    const style = document.createElement('style');
    style.id = 'poke-cursor-style';
    style.textContent = `
      body.poke-cooldown {
        cursor: wait !important;
      }
      
      body.hide-cursor {
        cursor: none !important;
      }
    `;
    document.head.appendChild(style);
    
    // Create a custom cursor element that follows the mouse
    this.customCursorElement = document.createElement('img');
    this.customCursorElement.className = 'custom-cursor-element';
    this.customCursorElement.src = '/assets/images/poke.png';
    this.customCursorElement.style.position = 'fixed';
    this.customCursorElement.style.pointerEvents = 'none';
    this.customCursorElement.style.zIndex = '9999';
    this.customCursorElement.style.width = '32px';
    this.customCursorElement.style.height = '32px';
    this.customCursorElement.style.display = 'none';
    this.customCursorElement.style.transform = 'translate(-5px, 0)'; // Adjust hotspot
    document.body.appendChild(this.customCursorElement);
    
    // Add global mousemove listener for the custom cursor
    document.addEventListener('mousemove', this.updateCustomCursor.bind(this));
    
    console.log('Custom cursor setup complete');
  }
  
  // Update custom cursor position
  updateCustomCursor(event) {
    if (this.customCursorElement) {
      // Adjust position to account for rotation
      this.customCursorElement.style.left = `${event.clientX}px`;
      this.customCursorElement.style.top = `${event.clientY}px`;
    }
  }
  
  // Handle mouse move event
  onMouseMove(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Skip if on cooldown
    if (this.pokeCooldown) return;
    
    // Update the raycaster with the camera and mouse position
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Find intersections with pokeable objects
    const intersects = this.raycaster.intersectObjects(this.pokeableObjects, true);
    
    // Reset glow effect on all objects
    this.resetGlowEffects();
    
    // Hide custom cursor by default
    if (this.customCursorElement) {
      this.customCursorElement.style.display = 'none';
    }
    document.body.classList.remove('hide-cursor');
    this.isHoveringPokeable = false;
    
    if (intersects.length > 0) {
      // Find the first pokeable object
      let pokeableObject = null;
      
      // Find the actual pokeable object from the intersected object
      for (let i = 0; i < intersects.length; i++) {
        let obj = intersects[i].object;
        while (obj && !obj.userData.isPokeable) {
          obj = obj.parent;
        }
        
        if (obj && obj.userData.isPokeable) {
          pokeableObject = obj;
          break;
        }
      }
      
      if (pokeableObject) {
        // Show custom cursor
        if (this.customCursorElement) {
          document.body.classList.add('hide-cursor');
          this.customCursorElement.style.display = 'block';
        }
        this.isHoveringPokeable = true;
        
        // Add glow effect to the object
        this.addGlowEffect(pokeableObject);
        
        return;
      }
    }
  }
  
  // Register an object as pokeable
  registerPokeableObject(object, name) {
    // Add poke counter to the object
    this.addPokeCounter(object, 0);
    
    // Add to pokeable objects array
    this.pokeableObjects.push(object);
    
    // Add to leaderboard
    this.leaderboard.push({
      name: name,
      pokeCount: 0,
      object: object
    });
    
    // Sort leaderboard
    this.sortLeaderboard();
    
    // Update leaderboard UI
    this.updateLeaderboardUI();
    
    return object;
  }
  
  // Add poke counter above object
  addPokeCounter(object, initialCount) {
    // Create a div for the poke counter
    const pokeCounterDiv = document.createElement('div');
    pokeCounterDiv.className = 'poke-counter';
    pokeCounterDiv.textContent = `Pokes: ${initialCount}`;
    pokeCounterDiv.style.position = 'absolute';
    pokeCounterDiv.style.color = '#FF5722'; // Distinct orange color
    pokeCounterDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    pokeCounterDiv.style.padding = '2px 5px';
    pokeCounterDiv.style.borderRadius = '10px';
    pokeCounterDiv.style.fontSize = '0.8em';
    pokeCounterDiv.style.fontWeight = 'bold';
    pokeCounterDiv.style.textAlign = 'center';
    pokeCounterDiv.style.zIndex = '1000';
    pokeCounterDiv.style.pointerEvents = 'none'; // Prevent the label from blocking clicks
    pokeCounterDiv.style.opacity = '0'; // Start hidden
    pokeCounterDiv.style.transition = 'opacity 0.3s ease';
    
    document.body.appendChild(pokeCounterDiv);
    
    // Store the counter element in the object's userData
    object.userData.pokeCounter = pokeCounterDiv;
    object.userData.pokeCount = initialCount;
    object.userData.isPokeable = true;
  }
  
  // Handle click event for poking
  onPokeClick(event) {
    // If on cooldown, don't process the click
    if (this.pokeCooldown) return;
    
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update the raycaster with the camera and mouse position
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Find intersections with pokeable objects
    const intersects = this.raycaster.intersectObjects(this.pokeableObjects, true);
    
    if (intersects.length > 0) {
      // Find the first pokeable object
      let pokedObject = null;
      
      // Find the actual pokeable object from the intersected object
      for (let i = 0; i < intersects.length; i++) {
        let obj = intersects[i].object;
        while (obj && !obj.userData.isPokeable) {
          obj = obj.parent;
        }
        
        if (obj && obj.userData.isPokeable) {
          pokedObject = obj;
          break;
        }
      }
      
      if (pokedObject) {
        this.pokeObject(pokedObject);
      }
    }
  }
  
  // Poke an object
  pokeObject(object) {
    // Increment poke count
    object.userData.pokeCount++;
    
    // Find the object in the leaderboard
    let leaderboardEntry = null;
    for (let i = 0; i < this.leaderboard.length; i++) {
      if (this.leaderboard[i].object === object) {
        leaderboardEntry = this.leaderboard[i];
        break;
      }
    }
    
    if (leaderboardEntry) {
      leaderboardEntry.pokeCount = object.userData.pokeCount;
    }
    
    // Update poke counter display
    if (object.userData.pokeCounter) {
      const counterElement = object.userData.pokeCounter;
      counterElement.textContent = `Pokes: ${object.userData.pokeCount}`;
      
      // Show the counter
      counterElement.style.opacity = '1';
      
      // Hide the counter after 3 seconds
      setTimeout(() => {
        counterElement.style.opacity = '0';
      }, 3000);
    }
    
    // Play poke animation
    this.playPokeAnimation(object);
    
    // Play poke sound
    this.playPokeSound();
    
    // Sort leaderboard
    this.sortLeaderboard();
    
    // Update leaderboard UI
    this.updateLeaderboardUI();
    
    // Start cooldown
    this.startCooldown();
  }
  
  // Play poke animation
  playPokeAnimation(object) {
    // Create a ripple effect
    const ripple = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 32),
      new THREE.MeshBasicMaterial({
        color: 0xFF5722,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      })
    );
    
    // Position the ripple at the center of the object
    ripple.position.copy(object.position);
    ripple.position.y = 1.5; // Position at chest height
    ripple.rotation.x = Math.PI / 2; // Rotate to be horizontal
    
    this.scene.add(ripple);
    
    // Create a poke impact effect (starburst)
    const impactGeometry = new THREE.BufferGeometry();
    const impactMaterial = new THREE.LineBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.8
    });
    
    // Create starburst lines
    const vertices = [];
    const numLines = 16;
    const innerRadius = 0.1;
    const outerRadius = 0.5;
    
    for (let i = 0; i < numLines; i++) {
      const angle = (i / numLines) * Math.PI * 2;
      const x1 = Math.cos(angle) * innerRadius;
      const z1 = Math.sin(angle) * innerRadius;
      const x2 = Math.cos(angle) * outerRadius;
      const z2 = Math.sin(angle) * outerRadius;
      
      vertices.push(x1, 0, z1);
      vertices.push(x2, 0, z2);
    }
    
    impactGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const impact = new THREE.LineSegments(impactGeometry, impactMaterial);
    
    // Position the impact at the center of the object
    impact.position.copy(object.position);
    impact.position.y = 1.5; // Position at chest height
    
    this.scene.add(impact);
    
    // Create a +1 particle
    const particleDiv = document.createElement('div');
    particleDiv.className = 'poke-particle';
    particleDiv.textContent = '+1';
    particleDiv.style.position = 'absolute';
    particleDiv.style.color = '#FF5722';
    particleDiv.style.fontSize = '1.2em';
    particleDiv.style.fontWeight = 'bold';
    particleDiv.style.pointerEvents = 'none';
    particleDiv.style.zIndex = '1000';
    
    // Position the particle at the mouse position
    particleDiv.style.left = `${this.mouse.x * window.innerWidth / 2 + window.innerWidth / 2}px`;
    particleDiv.style.top = `${-this.mouse.y * window.innerHeight / 2 + window.innerHeight / 2}px`;
    
    // Add animation
    particleDiv.style.animation = 'float-up 1.5s ease-out forwards';
    
    // Add animation style if it doesn't exist
    if (!document.querySelector('#poke-animation')) {
      const style = document.createElement('style');
      style.id = 'poke-animation';
      style.textContent = `
        @keyframes float-up {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          50% { opacity: 1; transform: translateY(-25px) scale(1.2); }
          100% { opacity: 0; transform: translateY(-50px) scale(1); }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(particleDiv);
    
    // Remove the particle after animation completes
    setTimeout(() => {
      document.body.removeChild(particleDiv);
    }, 1500);
    
    // Create a "poke" text effect
    const pokeTextDiv = document.createElement('div');
    pokeTextDiv.className = 'poke-text';
    pokeTextDiv.textContent = 'POKE!';
    pokeTextDiv.style.position = 'absolute';
    pokeTextDiv.style.color = '#FF5722';
    pokeTextDiv.style.fontSize = '1.5em';
    pokeTextDiv.style.fontWeight = 'bold';
    pokeTextDiv.style.pointerEvents = 'none';
    pokeTextDiv.style.zIndex = '1000';
    pokeTextDiv.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
    
    // Convert 3D position to screen position
    const vector = new THREE.Vector3();
    vector.setFromMatrixPosition(object.matrixWorld);
    vector.y += 2; // Position above the object
    
    vector.project(this.camera);
    
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
    
    // Position the text
    pokeTextDiv.style.left = `${x}px`;
    pokeTextDiv.style.top = `${y}px`;
    pokeTextDiv.style.transform = 'translate(-50%, -50%)';
    
    // Add animation
    pokeTextDiv.style.animation = 'poke-text 1s ease-out forwards';
    
    // Add animation style if it doesn't exist
    if (!document.querySelector('#poke-text-animation')) {
      const style = document.createElement('style');
      style.id = 'poke-text-animation';
      style.textContent = `
        @keyframes poke-text {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          20% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
          80% { opacity: 1; transform: translate(-50%, -80%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -100%) scale(0.8); }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(pokeTextDiv);
    
    // Remove the text after animation completes
    setTimeout(() => {
      document.body.removeChild(pokeTextDiv);
    }, 1000);
    
    // Apply a quick "push back" effect to the object
    if (object.userData.originalPosition) {
      const originalPosition = object.userData.originalPosition.clone();
      
      // Calculate direction from camera to object
      const direction = new THREE.Vector3().subVectors(object.position, this.camera.position).normalize();
      
      // Push the object back slightly
      object.position.add(direction.multiplyScalar(0.2));
      
      // Animate the object back to its original position
      const startTime = performance.now();
      const duration = 300; // 300ms
      
      const animateBack = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Use an elastic easing function
        const elasticProgress = this.elasticEaseOut(progress);
        
        // Interpolate position
        object.position.lerpVectors(
          object.position.clone(),
          originalPosition,
          elasticProgress
        );
        
        if (progress < 1) {
          requestAnimationFrame(animateBack);
        }
      };
      
      animateBack();
    }
    
    // Animate the ripple
    let scale = 0.1;
    const animateRipple = () => {
      scale += 0.15; // Faster expansion
      ripple.scale.set(scale, scale, scale);
      ripple.material.opacity -= 0.05;
      
      if (ripple.material.opacity > 0) {
        requestAnimationFrame(animateRipple);
      } else {
        this.scene.remove(ripple);
      }
    };
    
    animateRipple();
    
    // Animate the impact effect
    const animateImpact = () => {
      impact.scale.x += 0.1;
      impact.scale.z += 0.1;
      impact.material.opacity -= 0.05;
      
      if (impact.material.opacity > 0) {
        requestAnimationFrame(animateImpact);
      } else {
        this.scene.remove(impact);
      }
    };
    
    animateImpact();
    
    // Special effects for milestone numbers
    if (object.userData.pokeCount === 10 || 
        object.userData.pokeCount === 50 || 
        object.userData.pokeCount === 100) {
      this.playMilestoneEffect(object, object.userData.pokeCount);
    }
  }
  
  // Elastic easing function
  elasticEaseOut(t) {
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
  }
  
  // Play milestone effect
  playMilestoneEffect(object, count) {
    // Create a special particle effect for milestones
    const particles = [];
    const particleCount = count === 10 ? 10 : count === 50 ? 20 : 30;
    
    // Pre-create all particles at once to avoid frame drops
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 8, 8),
        new THREE.MeshBasicMaterial({
          color: count === 10 ? 0x4CAF50 : count === 50 ? 0x2196F3 : 0xFFC107,
          transparent: true,
          opacity: 0.8
        })
      );
      
      // Position at the object
      particle.position.copy(object.position);
      particle.position.y = 1.5;
      
      // Random velocity
      particle.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        Math.random() * 0.1,
        (Math.random() - 0.5) * 0.1
      );
      
      this.scene.add(particle);
      particles.push(particle);
    }
    
    // Create milestone text element
    const milestoneDiv = document.createElement('div');
    milestoneDiv.className = 'milestone-text';
    milestoneDiv.textContent = `${count} POKES!`;
    milestoneDiv.style.position = 'absolute';
    milestoneDiv.style.color = count === 10 ? '#4CAF50' : count === 50 ? '#2196F3' : '#FFC107';
    milestoneDiv.style.fontSize = '2em';
    milestoneDiv.style.fontWeight = 'bold';
    milestoneDiv.style.textAlign = 'center';
    milestoneDiv.style.width = '100%';
    milestoneDiv.style.top = '30%';
    milestoneDiv.style.zIndex = '1000';
    milestoneDiv.style.pointerEvents = 'none';
    milestoneDiv.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
    milestoneDiv.style.animation = 'milestone-anim 2s ease-out forwards';
    
    // Add animation style if it doesn't exist
    if (!document.querySelector('#milestone-animation')) {
      const style = document.createElement('style');
      style.id = 'milestone-animation';
      style.textContent = `
        @keyframes milestone-anim {
          0% { opacity: 0; transform: scale(0.5); }
          20% { opacity: 1; transform: scale(1.2); }
          80% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.8); }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(milestoneDiv);
    
    // Remove the milestone text after animation completes
    setTimeout(() => {
      document.body.removeChild(milestoneDiv);
    }, 2000);
    
    // Use requestAnimationFrame for smoother animation
    let lastTime = performance.now();
    const animateParticles = (currentTime) => {
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;
      
      let allDone = true;
      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        
        // Move particle with time-based movement
        particle.position.x += particle.userData.velocity.x * deltaTime * 60;
        particle.position.y += particle.userData.velocity.y * deltaTime * 60;
        particle.position.z += particle.userData.velocity.z * deltaTime * 60;
        
        // Add gravity with time-based calculation
        particle.userData.velocity.y -= 0.005 * deltaTime * 60;
        
        // Fade out
        particle.material.opacity -= 0.01 * deltaTime * 60;
        
        if (particle.material.opacity > 0) {
          allDone = false;
        } else {
          this.scene.remove(particle);
        }
      }
      
      if (!allDone) {
        requestAnimationFrame(animateParticles);
      }
    };
    
    requestAnimationFrame(animateParticles);
  }
  
  // Play poke sound
  playPokeSound() {
    // Create a simple beep sound
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 440; // A4 note
      
      gainNode.gain.value = 0.1; // Low volume
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      
      // Short duration
      setTimeout(() => {
        oscillator.stop();
      }, 100);
    } catch (e) {
      console.error('Error playing poke sound:', e);
    }
  }
  
  // Start cooldown
  startCooldown() {
    this.pokeCooldown = true;
    
    // Change cursor to waiting
    document.body.classList.remove('hide-cursor');
    document.body.classList.add('poke-cooldown');
    
    // Hide custom cursor during cooldown
    if (this.customCursorElement) {
      this.customCursorElement.style.display = 'none';
    }
    
    // Create cooldown indicator
    const cooldownIndicator = document.createElement('div');
    cooldownIndicator.className = 'cooldown-indicator';
    cooldownIndicator.style.position = 'absolute';
    cooldownIndicator.style.bottom = '20px';
    cooldownIndicator.style.left = '50%';
    cooldownIndicator.style.transform = 'translateX(-50%)';
    cooldownIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    cooldownIndicator.style.color = 'white';
    cooldownIndicator.style.padding = '5px 10px';
    cooldownIndicator.style.borderRadius = '5px';
    cooldownIndicator.style.zIndex = '1000';
    cooldownIndicator.textContent = `Poke cooldown: ${this.cooldownTime}s`;
    
    document.body.appendChild(cooldownIndicator);
    
    // Update cooldown timer
    let timeLeft = this.cooldownTime;
    const cooldownInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(cooldownInterval);
        this.pokeCooldown = false;
        document.body.removeChild(cooldownIndicator);
        
        // Reset cursor
        document.body.classList.remove('poke-cooldown');
        
        // Check if mouse is over a pokeable object and update cursor accordingly
        const event = { 
          clientX: this.mouse.x * window.innerWidth / 2 + window.innerWidth / 2,
          clientY: -this.mouse.y * window.innerHeight / 2 + window.innerHeight / 2
        };
        this.onMouseMove(event);
      } else {
        cooldownIndicator.textContent = `Poke cooldown: ${timeLeft}s`;
      }
    }, 1000);
  }
  
  // Create leaderboard UI
  createLeaderboardUI() {
    // Create leaderboard container
    const leaderboardContainer = document.createElement('div');
    leaderboardContainer.id = 'poke-leaderboard';
    leaderboardContainer.style.position = 'absolute';
    leaderboardContainer.style.top = '10px';
    leaderboardContainer.style.right = '10px';
    leaderboardContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    leaderboardContainer.style.color = 'white';
    leaderboardContainer.style.padding = '10px';
    leaderboardContainer.style.borderRadius = '5px';
    leaderboardContainer.style.maxWidth = '250px';
    leaderboardContainer.style.maxHeight = '300px';
    leaderboardContainer.style.overflowY = 'auto';
    leaderboardContainer.style.zIndex = '1000';
    leaderboardContainer.style.display = 'none'; // Hidden by default
    
    // Create leaderboard title
    const leaderboardTitle = document.createElement('h3');
    leaderboardTitle.textContent = 'Poke Leaderboard';
    leaderboardTitle.style.margin = '0 0 10px 0';
    leaderboardTitle.style.textAlign = 'center';
    leaderboardContainer.appendChild(leaderboardTitle);
    
    // Create leaderboard list
    const leaderboardList = document.createElement('ul');
    leaderboardList.id = 'poke-leaderboard-list';
    leaderboardList.style.listStyle = 'none';
    leaderboardList.style.padding = '0';
    leaderboardList.style.margin = '0';
    leaderboardContainer.appendChild(leaderboardList);
    
    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Poke Leaderboard';
    toggleButton.style.position = 'absolute';
    toggleButton.style.top = '10px';
    toggleButton.style.right = '10px';
    toggleButton.style.padding = '5px 10px';
    toggleButton.style.backgroundColor = '#4CAF50';
    toggleButton.style.color = 'white';
    toggleButton.style.border = 'none';
    toggleButton.style.borderRadius = '5px';
    toggleButton.style.cursor = 'pointer';
    toggleButton.style.zIndex = '1001';
    
    // Toggle leaderboard visibility
    toggleButton.addEventListener('click', () => {
      if (leaderboardContainer.style.display === 'none') {
        leaderboardContainer.style.display = 'block';
        toggleButton.textContent = 'Hide Leaderboard';
      } else {
        leaderboardContainer.style.display = 'none';
        toggleButton.textContent = 'Poke Leaderboard';
      }
    });
    
    document.body.appendChild(leaderboardContainer);
    document.body.appendChild(toggleButton);
  }
  
  // Sort leaderboard
  sortLeaderboard() {
    this.leaderboard.sort((a, b) => b.pokeCount - a.pokeCount);
  }
  
  // Update leaderboard UI
  updateLeaderboardUI() {
    const leaderboardList = document.getElementById('poke-leaderboard-list');
    if (!leaderboardList) return;
    
    // Clear the list
    leaderboardList.innerHTML = '';
    
    // Add top 10 objects to the list
    const topObjects = this.leaderboard.slice(0, 10);
    
    topObjects.forEach((entry, index) => {
      const listItem = document.createElement('li');
      listItem.style.padding = '5px 0';
      listItem.style.borderBottom = index < topObjects.length - 1 ? '1px solid rgba(255, 255, 255, 0.2)' : 'none';
      
      // Add medal for top 3
      let medal = '';
      if (index === 0) medal = '🥇 ';
      else if (index === 1) medal = '🥈 ';
      else if (index === 2) medal = '🥉 ';
      
      listItem.innerHTML = `${medal}${index + 1}. <strong>${entry.name}</strong>: ${entry.pokeCount} pokes`;
      
      // Highlight if it has pokes
      if (entry.pokeCount > 0) {
        listItem.style.color = index === 0 ? '#FFC107' : index === 1 ? '#E0E0E0' : index === 2 ? '#CD7F32' : 'white';
      }
      
      leaderboardList.appendChild(listItem);
    });
  }
  
  // Update method to be called in animation loop
  update() {
    // Update poke counter positions
    for (let i = 0; i < this.pokeableObjects.length; i++) {
      const object = this.pokeableObjects[i];
      if (object.userData.pokeCounter) {
        this.updatePokeCounterPosition(object, object.userData.pokeCounter);
      }
    }
  }
  
  // Update poke counter position
  updatePokeCounterPosition(object, counterElement) {
    // Convert 3D position to screen position
    const vector = new THREE.Vector3();
    vector.setFromMatrixPosition(object.matrixWorld);
    vector.y += 3.5; // Position above the name label
    
    vector.project(this.camera);
    
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
    
    // Update counter position
    counterElement.style.left = `${x}px`;
    counterElement.style.top = `${y}px`;
    counterElement.style.transform = 'translate(-50%, -50%)';
  }
  
  // Add glow effect to an object
  addGlowEffect(object) {
    // Store the currently hovered object
    this.currentHoverObject = object;
    
    // Start hover animation
    this.startHoverAnimation();
    
    // Apply glow effect to all meshes in the object
    object.traverse(node => {
      if (node.isMesh) {
        // Store original material if not already stored
        if (!node.userData.originalMaterial) {
          node.userData.originalMaterial = node.material.clone();
        }
        
        // Create a glowing material based on the original
        const glowMaterial = node.userData.originalMaterial.clone();
        
        // Increase emissive property for a subtle glow
        glowMaterial.emissive = new THREE.Color(0x555555);
        glowMaterial.emissiveIntensity = 0.5;
        
        // Apply the glowing material
        node.material = glowMaterial;
        
        // Mark as glowing
        node.userData.isGlowing = true;
      }
    });
  }
  
  // Reset glow effects on all objects
  resetGlowEffects() {
    // Cancel any ongoing hover animation
    if (this.hoverAnimationFrame) {
      cancelAnimationFrame(this.hoverAnimationFrame);
      this.hoverAnimationFrame = null;
    }
    
    // Reset the currently hovered object
    if (this.currentHoverObject) {
      // Reset any animation transformations
      if (this.currentHoverObject.userData.originalPosition) {
        this.currentHoverObject.position.copy(this.currentHoverObject.userData.originalPosition);
        delete this.currentHoverObject.userData.originalPosition;
      }
      
      if (this.currentHoverObject.userData.originalScale) {
        this.currentHoverObject.scale.copy(this.currentHoverObject.userData.originalScale);
        delete this.currentHoverObject.userData.originalScale;
      }
      
      this.currentHoverObject = null;
    }
    
    this.pokeableObjects.forEach(object => {
      object.traverse(node => {
        if (node.isMesh && node.userData.isGlowing) {
          // Restore original material
          if (node.userData.originalMaterial) {
            node.material = node.userData.originalMaterial;
          }
          
          // Mark as not glowing
          node.userData.isGlowing = false;
        }
      });
    });
  }
  
  // Start hover animation
  startHoverAnimation() {
    // Cancel any existing animation
    if (this.hoverAnimationFrame) {
      cancelAnimationFrame(this.hoverAnimationFrame);
      this.hoverAnimationFrame = null;
    }
    
    // Store the start time
    this.hoverStartTime = performance.now();
    
    // Store original position and scale if not already stored
    if (!this.currentHoverObject.userData.originalPosition) {
      this.currentHoverObject.userData.originalPosition = this.currentHoverObject.position.clone();
    }
    
    if (!this.currentHoverObject.userData.originalScale) {
      this.currentHoverObject.userData.originalScale = this.currentHoverObject.scale.clone();
    }
    
    // Start the animation loop with time-based animation
    this.lastHoverTime = performance.now();
    this.animateHover(this.lastHoverTime);
  }
  
  // Animate hover effect
  animateHover(currentTime) {
    if (!this.currentHoverObject) return;
    
    // Calculate delta time for smooth animation regardless of frame rate
    const deltaTime = currentTime - this.lastHoverTime;
    this.lastHoverTime = currentTime;
    
    // Limit the maximum delta time to prevent large jumps after tab switching
    const limitedDeltaTime = Math.min(deltaTime, 33); // Cap at ~30fps equivalent
    
    const elapsed = currentTime - this.hoverStartTime;
    
    // Create a subtle bobbing effect
    const floatOffset = Math.sin(elapsed * 0.005) * 0.1;
    
    // Apply the animation
    if (this.currentHoverObject && this.currentHoverObject.userData.originalPosition) {
      this.currentHoverObject.position.y = this.currentHoverObject.userData.originalPosition.y + floatOffset;
      
      // Create a subtle pulsing effect
      const scaleOffset = 1.0 + Math.sin(elapsed * 0.003) * 0.03;
      
      if (this.currentHoverObject.userData.originalScale) {
        this.currentHoverObject.scale.set(
          this.currentHoverObject.userData.originalScale.x * scaleOffset,
          this.currentHoverObject.userData.originalScale.y * scaleOffset,
          this.currentHoverObject.userData.originalScale.z * scaleOffset
        );
      }
    }
    
    // Continue the animation
    this.hoverAnimationFrame = requestAnimationFrame((time) => this.animateHover(time));
  }
} 