import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { trackEvent } from '../utils/posthog.js';
import React from 'react';
import ReactDOM from 'react-dom/client';

// Define the PortalForm component directly in this file
const PortalForm = ({ onSubmit, onCancel }) => {
  return React.createElement('div', { 
    className: 'portal-form-container',
    style: {
      animation: 'portal-form-appear 0.5s ease-out forwards'
    }
  },
    React.createElement('h2', {
      style: {
        textShadow: '0 0 10px #4a90e2, 0 0 20px #4a90e2',
        animation: 'portal-glow 2s infinite alternate'
      }
    }, 'Create New Portal'),
    React.createElement('form', { 
      id: 'portal-form',
      action: 'https://submit-form.com/OOKKM5IU8',
      onSubmit: (e) => {
        e.preventDefault();
        const form = e.target;
        
        // Check if the agreement checkbox is checked
        if (!form.agreement.checked) {
          alert('You must agree to add a portal to continue.');
          return;
        }
        
        const formData = {
          url: form.url.value,
          image: form.image.value,
          agreement: form.agreement.checked
        };

        // Submit to FormSpark
        fetch('https://submit-form.com/OOKKM5IU8', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(formData)
        })
        .then(response => {
          console.log('FormSpark submission successful:', response);
          
          // Show success message
          const successMessage = document.createElement('div');
          successMessage.className = 'portal-success-message';
          successMessage.innerHTML = `
            <div class="success-icon">✓</div>
            <div class="success-text">Portal request submitted successfully!</div>
          `;
          document.body.appendChild(successMessage);
          
          // Remove success message after 3 seconds
          setTimeout(() => {
            successMessage.remove();
          }, 3000);
          
          onSubmit(formData);
        })
        .catch(error => {
          console.error('FormSpark submission error:', error);
          // Still proceed with portal creation even if FormSpark submission fails
          onSubmit(formData);
        });
      }
    },
      React.createElement('div', { className: 'form-group' },
        React.createElement('label', { htmlFor: 'url' }, 'Portal URL:'),
        React.createElement('input', { 
          type: 'url', 
          id: 'url', 
          name: 'url', 
          required: true,
          placeholder: 'https://example.com',
          className: 'portal-3d-input'
        })
      ),
      React.createElement('div', { className: 'form-group' },
        React.createElement('label', { htmlFor: 'image' }, 'Portal Image URL:'),
        React.createElement('input', { 
          type: 'url', 
          id: 'image', 
          name: 'image', 
          required: true,
          placeholder: 'https://example.com/image.jpg',
          className: 'portal-3d-input'
        })
      ),
      React.createElement('div', { className: 'form-group checkbox-group' },
        React.createElement('label', { 
          htmlFor: 'agreement',
          className: 'checkbox-label'
        },
          React.createElement('input', { 
            type: 'checkbox', 
            id: 'agreement', 
            name: 'agreement', 
            required: true,
            className: 'portal-checkbox'
          }),
          " I agree to add this portal to the metaverse"
        )
      ),
      React.createElement('div', { className: 'form-buttons' },
        React.createElement('button', { 
          type: 'submit', 
          className: 'submit-button'
        }, 'Create Portal'),
        React.createElement('button', { 
          type: 'button', 
          className: 'cancel-button',
          onClick: onCancel
        }, 'Cancel')
      )
    )
  );
};

// Custom portal shader
const portalVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const portalFragmentShader = `
  uniform sampler2D map;
  uniform float time;
  uniform float distortionStrength;
  uniform vec3 glowColor;
  uniform float glowIntensity;
  
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    // Create a rippling effect
    float ripple = sin(vUv.x * 10.0 + time) * 0.5 + 0.5;
    ripple *= sin(vUv.y * 8.0 + time * 0.7) * 0.5 + 0.5;
    
    // Create a circular distortion
    vec2 center = vec2(0.5, 0.5);
    float dist = length(vUv - center);
    float circle = smoothstep(0.5, 0.0, dist);
    
    // Combine ripple and circle effects
    float distortion = ripple * circle * distortionStrength;
    
    // Apply distortion to UV coordinates
    vec2 distortedUv = vUv + vec2(distortion, distortion);
    
    // Sample the texture with distorted UVs
    vec4 texColor = texture2D(map, distortedUv);
    
    // Add glow effect
    vec3 glow = glowColor * glowIntensity * circle;
    
    // Combine texture and glow
    vec3 finalColor = texColor.rgb + glow;
    
    // Add some color shifting based on position
    finalColor += vec3(sin(vPosition.x * 0.1 + time) * 0.1,
                      sin(vPosition.y * 0.1 + time * 0.7) * 0.1,
                      sin(vPosition.z * 0.1 + time * 1.3) * 0.1);
    
    gl_FragColor = vec4(finalColor, texColor.a);
  }
`;

// Create a loader manager to track loading progress
const loadingManager = new THREE.LoadingManager();
loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
  console.log(`Loading file: ${url} (${itemsLoaded}/${itemsTotal})`);
};

// Global variables for billboard dragging
let isDragging = false;
let selectedBillboard = null;
let selectedAxis = null;
let dragStartPosition = new THREE.Vector3();
let dragPlane = new THREE.Plane();
let dragOffset = new THREE.Vector3();
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let camera = null;
let billboards = [];

// Add this global variable to track if the portal form is open
let isPortalFormOpen = false;

// Add this function after the imports
function createBlankTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  
  // Fill with transparent black
  context.fillStyle = 'rgba(0, 0, 0, 0)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  return new THREE.CanvasTexture(canvas);
}

// Function to get username from URL parameters
function getUsernameFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('username') || 'metaverse-explorer';
}

// Function to get avatar URL from current URL parameters
function getAvatarUrlFromParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const avatarUrl = urlParams.get('avatar_url');
  return avatarUrl ? decodeURIComponent(avatarUrl) : 'https://metaverse-delta.vercel.app';
}

// Function to add avatar URL to portal URL
function addAvatarToPortalUrl(portalUrl) {
  try {
    const url = new URL(portalUrl);
    const params = new URLSearchParams(url.search);
    
    // Only add avatar_url if it's not already present
    if (!params.has('avatar_url')) {
      params.set('avatar_url', getAvatarUrlFromParams());
    }
    
    url.search = params.toString();
    return url.toString();
  } catch (e) {
    console.error('Invalid portal URL:', portalUrl);
    return portalUrl;
  }
}

// Portal configurations
const portalConfigs = [
  {
    position: { x: -5, z: 15, y: 0 },  // Leftmost portal (levels)
    rotation: 0,
    imageUrl: 'assets/images/levels.jpeg',
    targetUrl: addAvatarToPortalUrl(`https://fly.pieter.com/?username=${getUsernameFromUrl()}&ref=https://metaverse-delta.vercel.app&portal=true`),
    scale: 1.0
  },
  {
    position: { x: 5, z: 15, y: 0 },  // Second from left (kyzo)
    rotation: 0,
    imageUrl: 'assets/images/kyzo.jpeg',
    targetUrl: addAvatarToPortalUrl(`https://game-one-two.vercel.app/?username=${getUsernameFromUrl()}&ref=https://metaverse-delta.vercel.app&portal=true`),
    scale: 1.0
  },
  {
    position: { x: 15, z: 15, y: 0 },  // Center portal (darefail)
    rotation: 0,
    imageUrl: 'assets/images/darefail.png',
    targetUrl: addAvatarToPortalUrl(`https://ai.darefail.com/flappy/arms/?username=${getUsernameFromUrl()}&ref=https://metaverse-delta.vercel.app&portal=true`),
    scale: 1.0
  },
  {
    position: { x: 25, z: 15, y: 0 },  // Second from right (yacht)
    rotation: 0,
    imageUrl: 'assets/images/yacht.png',
    targetUrl: addAvatarToPortalUrl(`https://yachtvibes.app/?username=${getUsernameFromUrl()}&ref=https://metaverse-delta.vercel.app&portal=true`),
    scale: 1.0
  },
  {
    position: { x: 35, z: 15, y: 0 },  // Rightmost portal (panda)
    rotation: 0,
    imageUrl: 'assets/images/panda.png',
    targetUrl: addAvatarToPortalUrl(`https://collidingscopes.github.io/red-panda-vibes/?username=${getUsernameFromUrl()}&ref=https://metaverse-delta.vercel.app&portal=true`),
    scale: 1.0
  },
  {
    position: { x: 45, z: 15, y: 0 },  // First blank portal
    rotation: 0,
    imageUrl: 'assets/images/spacerunner.png',
    targetUrl: addAvatarToPortalUrl(`https://spacerunner01.netlify.app/?username=${getUsernameFromUrl()}&ref=https://metaverse-delta.vercel.app&portal=true`),
    scale: 1.0,
  },
  {
    position: { x: 55, z: 15, y: 0 },  // Second blank portal
    rotation: 0,
    imageUrl: 'assets/images/snowbrawl-world.jpeg',
    targetUrl: addAvatarToPortalUrl(`https://snowbrawl.world/?username=${getUsernameFromUrl()}&ref=https://metaverse-delta.vercel.app&portal=true`),
    scale: 1.0,
  },
  {
    position: { x: 65, z: 15, y: 0 },  // Third blank portal
    rotation: 0,
    imageUrl: 'assets/images/viberates.png',
    targetUrl: addAvatarToPortalUrl(`https://viberates.io/?username=${getUsernameFromUrl()}&ref=https://metaverse-delta.vercel.app&portal=true`),
    scale: 1.0,
  },
  {
    position: { x: 75, z: 15, y: 0 },  // Fourth blank portal
    rotation: 0,
    imageUrl: 'assets/images/ronansruns.png',
    targetUrl: addAvatarToPortalUrl(`https://marcusedvalson.github.io/ronansrun.github.io/?username=${getUsernameFromUrl()}&ref=https://metaverse-delta.vercel.app&portal=true`),
    scale: 1.0,
  },
  {
    position: { x: 85, z: 15, y: 0 },  // Fifth blank portal
    rotation: 0,
    imageUrl: 'assets/images/foodrunner.png',
    targetUrl: addAvatarToPortalUrl(`https://foodvibers.netlify.app/?username=${getUsernameFromUrl()}&ref=https://metaverse-delta.vercel.app&portal=true`),
    scale: 1.0,
  },
  {
    position: { x: -25, z: -2, y: 0 },  // Second desk portal (left side)
    rotation: Math.PI / 2,  // Face towards the desk
    imageUrl: 'assets/images/neon.png',
    targetUrl: addAvatarToPortalUrl(`https://n02448428.github.io/NTB/?username=${getUsernameFromUrl()}&ref=https://metaverse-delta.vercel.app&portal=true`),
    scale: 1.0,
  },
  {
    position: { x: -25, z: -12, y: 0 },  // First desk portal (left side)
    rotation: Math.PI / 2,  // Face towards the desk
    imageUrl: 'assets/images/ocean-fables.png',
    targetUrl: addAvatarToPortalUrl(`https://oceanfables.com/?username=${getUsernameFromUrl()}&ref=https://metaverse-delta.vercel.app&portal=true`),
    scale: 1.0,
  },
  {
    position: { x: -25, z: -22, y: 0 },  // Third desk portal (left side)
    rotation: Math.PI / 2,  // Face towards the desk
    imageUrl: 'https://play.roostervibes.farm/',
    targetUrl: 'https://play.roostervibes.farm/',
    scale: 1.0,
  },
  {
    position: { x: -25, z: -32, y: 0 },  // Fourth desk portal (left side)
    rotation: Math.PI / 2,  // Face towards the desk
    imageUrl: 'assets/images/portal.jpg',
    targetUrl: '#',
    scale: 1.0,
    isFormPortal: true
  },
  {
    position: { x: -25, z: -42, y: 0 },  // Fifth desk portal (left side)
    rotation: Math.PI / 2,  // Face towards the desk
    imageUrl: 'assets/images/portal.jpg',
    targetUrl: '#',
    scale: 1.0,
    isFormPortal: true
  },
  {
    position: { x: 0, z: -25, y: 0 },  // Portal behind the user
    rotation: Math.PI,  // Rotate 180 degrees to face the user
    imageUrl: 'assets/images/portal.jpg',
    targetUrl: `https://portal.pieter.com?avatar_url=https://metaverse-delta.vercel.app/assets/models/metaverse-explorer.glb&username=${getUsernameFromUrl()}&ref=https://metaverse-delta.vercel.app`,
    scale: 1.0
  }
];

// Add this at the top of the file after the imports
const portalMaterials = [];

// Add this function near the top of the file, after the imports
function createPortalFormInputs(portalGroup) {
  // Create a container for the inputs that will be positioned over the portal
  const inputContainer = document.createElement('div');
  inputContainer.className = 'portal-form-inputs';
  inputContainer.style.cssText = `
    position: fixed;
    pointer-events: none;
    display: none;
  `;

  // Create input fields
  const urlInput = document.createElement('input');
  urlInput.type = 'url';
  urlInput.placeholder = 'Enter Portal URL';
  urlInput.className = 'portal-input';

  const imageInput = document.createElement('input');
  imageInput.type = 'url';
  imageInput.placeholder = 'Enter Image URL';
  imageInput.className = 'portal-input';

  const avatarInput = document.createElement('input');
  avatarInput.type = 'url';
  avatarInput.placeholder = 'Enter Avatar URL';
  avatarInput.className = 'portal-input';

  // Add inputs to container
  inputContainer.appendChild(urlInput);
  inputContainer.appendChild(imageInput);
  inputContainer.appendChild(avatarInput);

  // Add container to document
  document.body.appendChild(inputContainer);

  // Store the input container reference in the portal group
  portalGroup.userData.formInputs = inputContainer;

  // Add CSS for the inputs
  const style = document.createElement('style');
  style.textContent = `
    .portal-form-inputs {
      z-index: 1000;
    }
    .portal-input {
      position: absolute;
      width: 392px;
      height: 40px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid #4a90e2;
      color: white;
      padding: 8px;
      font-size: 16px;
      pointer-events: auto;
    }
    .portal-input:focus {
      outline: none;
      border-color: #66a0e2;
      background: rgba(255, 255, 255, 0.2);
    }
  `;
  document.head.appendChild(style);

  return inputContainer;
}

// Add this function to create the start portal
function createStartPortal(scene) {
  // Create portal group to contain all portal elements
  const startPortalGroup = new THREE.Group();
  startPortalGroup.position.set(-15, 15, 10);
  startPortalGroup.rotation.x = 0.35;
  startPortalGroup.rotation.y = 0;
  startPortalGroup.scale.set(0.2, 0.2, 0.2);

  // Create portal effect
  const startPortalGeometry = new THREE.TorusGeometry(15, 2, 16, 100);
  const startPortalMaterial = new THREE.MeshPhongMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    transparent: true,
    opacity: 0.8
  });
  const startPortal = new THREE.Mesh(startPortalGeometry, startPortalMaterial);
  startPortalGroup.add(startPortal);
              
  // Create portal inner surface
  const startPortalInnerGeometry = new THREE.CircleGeometry(13, 32);
  const startPortalInnerMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide
  });
  const startPortalInner = new THREE.Mesh(startPortalInnerGeometry, startPortalInnerMaterial);
  startPortalGroup.add(startPortalInner);

  // Create particle system for portal effect
  const startPortalParticleCount = 1000;
  const startPortalParticles = new THREE.BufferGeometry();
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

  startPortalParticles.setAttribute('position', new THREE.BufferAttribute(startPortalPositions, 3));
  startPortalParticles.setAttribute('color', new THREE.BufferAttribute(startPortalColors, 3));

  const startPortalParticleMaterial = new THREE.PointsMaterial({
    size: 0.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.6
  });

  const startPortalParticleSystem = new THREE.Points(startPortalParticles, startPortalParticleMaterial);
  startPortalGroup.add(startPortalParticleSystem);

  // Add portal group to scene
  scene.add(startPortalGroup);

  // Animate particles and portal
  function animateStartPortal() {
    const positions = startPortalParticles.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] += 0.05 * Math.sin(Date.now() * 0.001 + i);
    }
    startPortalParticles.attributes.position.needsUpdate = true;
    // Update portal shader time
    if (startPortalInnerMaterial.uniforms && startPortalInnerMaterial.uniforms.time) {
      startPortalInnerMaterial.uniforms.time.value = Date.now() * 0.001;
    }

    requestAnimationFrame(animateStartPortal);
  }
  animateStartPortal();
  
  return startPortalGroup;
}

// Add function to create exit portal
function createExitPortal(scene) {
  // Create portal group to contain all portal elements
  const exitPortalGroup = new THREE.Group();
  exitPortalGroup.position.set(-15, 5, 15);
  exitPortalGroup.rotation.x = 0.35;
  exitPortalGroup.rotation.y = Math.PI;
  exitPortalGroup.scale.set(0.2, 0.2, 0.2);

  // Create portal effect
  const exitPortalGeometry = new THREE.TorusGeometry(15, 2, 16, 100);
  const exitPortalMaterial = new THREE.MeshPhongMaterial({
      color: 0x00ff00,
      emissive: 0x00ff00,
      transparent: true,
      opacity: 0.8
  });
  const exitPortal = new THREE.Mesh(exitPortalGeometry, exitPortalMaterial);
  exitPortalGroup.add(exitPortal);

  // Create portal inner surface
  const exitPortalInnerGeometry = new THREE.CircleGeometry(13, 32);
  const exitPortalInnerMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
  });
  const exitPortalInner = new THREE.Mesh(exitPortalInnerGeometry, exitPortalInnerMaterial);
  exitPortalGroup.add(exitPortalInner);
  
  // Add portal label
  const loader = new THREE.TextureLoader();
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 512; // Increased width
  canvas.height = 64;
  context.fillStyle = '#00ff00';
  context.font = 'bold 32px Arial';
  context.textAlign = 'center';
  context.fillText('VIBEVERSE PORTAL', canvas.width/2, canvas.height/2);
  const texture = new THREE.CanvasTexture(canvas);
  const labelGeometry = new THREE.PlaneGeometry(30, 5); // Increased width
  const labelMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
  });
  const label = new THREE.Mesh(labelGeometry, labelMaterial);
  label.position.y = 20;
  exitPortalGroup.add(label);

  // Create particle system for portal effect
  const exitPortalParticleCount = 1000;
  const exitPortalParticles = new THREE.BufferGeometry();
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

  exitPortalParticles.setAttribute('position', new THREE.BufferAttribute(exitPortalPositions, 3));
  exitPortalParticles.setAttribute('color', new THREE.BufferAttribute(exitPortalColors, 3));

  const exitPortalParticleMaterial = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.6
  });

  const exitPortalParticleSystem = new THREE.Points(exitPortalParticles, exitPortalParticleMaterial);
  exitPortalGroup.add(exitPortalParticleSystem);

  // Create collision detection trigger
  const portalTriggerGeometry = new THREE.BoxGeometry(10, 10, 10);
  const portalTriggerMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    visible: false
  });
  const portalTrigger = new THREE.Mesh(portalTriggerGeometry, portalTriggerMaterial);
  portalTrigger.userData.isPortalTrigger = true;
  portalTrigger.userData.portalURL = 'https://portal.pieter.com';
  portalTrigger.position.z = -5; // Position trigger in front of portal
  exitPortalGroup.add(portalTrigger);

  // Add portal group to scene
  scene.add(exitPortalGroup);

  // Store the collision box in the group's userData
  const exitPortalBox = new THREE.Box3().setFromObject(exitPortalGroup);
  exitPortalGroup.userData.portalBox = exitPortalBox;
  window.exitPortalGroup = exitPortalGroup; // Store for collision detection

  // Animate particles and portal
  function animateExitPortal() {
      const positions = exitPortalParticles.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
          positions[i + 1] += 0.05 * Math.sin(Date.now() * 0.001 + i);
      }
      exitPortalParticles.attributes.position.needsUpdate = true;
      // Update portal shader time
      if (exitPortalInnerMaterial.uniforms && exitPortalInnerMaterial.uniforms.time) {
          exitPortalInnerMaterial.uniforms.time.value = Date.now() * 0.001;
      }

      requestAnimationFrame(animateExitPortal);
  }
  animateExitPortal();
  
  return exitPortalGroup;
}

// Add a function to check if player is entering the portal
export function checkPortalEntry(player) {
  if (!player || !window.exitPortalGroup) return false;
  
  // Create a bounding box for the player
  const playerBox = new THREE.Box3().setFromObject(player);
  
  // Get the portal trigger
  const portalTrigger = window.exitPortalGroup.children.find(child => 
    child.userData && child.userData.isPortalTrigger
  );
  
  if (!portalTrigger) return false;
  
  // Create a bounding box for the portal trigger
  const portalBox = new THREE.Box3().setFromObject(portalTrigger);
  
  // Check for collision
  if (playerBox.intersectsBox(portalBox)) {
    // Check if we're already in the process of entering a portal to prevent multiple triggers
    if (window.isEnteringPortal) return false;
    window.isEnteringPortal = true;
    
    console.log('Player entered the portal!');
    
    // Create portal entry particles
    createPortalEntryEffect(player.position);
    
    // Trigger jump animation when entering portal
    if (player.jump && typeof player.jump === 'function') {
      console.log('Triggering jump animation for portal entry!');
      player.jump();
      
      // Add physical jump by applying upward velocity to player
      // Check if controls is available on the window object
      if (window.controls && window.controls.velocity) {
        window.controls.velocity.y = 5.0; // Add upward velocity - adjust value as needed
        window.controls.isJumping = true;
        console.log('Applied physical jump velocity to player');
      }
    }
    
    // Add query parameters to maintain state
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username') || 'metaverse-explorer';
    
    // Construct URL with query parameters
    let portalUrl = portalTrigger.userData.portalURL;
    portalUrl += `?avatar_url=https://metaverse-delta.vercel.app/assets/models/metaverse-explorer.glb&username=${username}&ref=https://metaverse-delta.vercel.app`;
    
    // Create loading overlay
    const overlay = document.createElement('div');
    overlay.id = 'portal-entry-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 255, 0, 0.2);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      transition: opacity 0.5s;
    `;
    
    const message = document.createElement('div');
    message.innerHTML = 'Entering Portal...';
    message.style.cssText = `
      color: #00ff00;
      font-size: 32px;
      font-weight: bold;
      background: rgba(0, 0, 0, 0.7);
      padding: 20px 40px;
      border-radius: 10px;
      text-shadow: 0 0 10px #00ff00;
    `;
    
    overlay.appendChild(message);
    document.body.appendChild(overlay);
    
    // Function to clean up the overlay if it gets stuck
    const cleanupOverlay = () => {
      const existingOverlay = document.getElementById('portal-entry-overlay');
      if (existingOverlay) {
        existingOverlay.style.opacity = '0';
        setTimeout(() => {
          if (existingOverlay.parentNode) {
            existingOverlay.parentNode.removeChild(existingOverlay);
          }
        }, 500);
      }
      window.isEnteringPortal = false;
    };
    
    // Add event listener for page unload to clean up the overlay
    window.addEventListener('beforeunload', cleanupOverlay);
    
    // Safety timeout - if redirect doesn't happen, remove the overlay after 5 seconds
    const safetyTimeout = setTimeout(() => {
      console.log('Portal entry safety timeout triggered');
      cleanupOverlay();
    }, 5000);
    
    // Delay navigation to allow jump animation to play
    const jumpAnimationDelay = 800; // ms - adjust as needed for the jump animation
    
    setTimeout(() => {
      try {
        // Navigate to the portal URL
        console.log('Navigating to portal URL:', portalUrl);
        window.location.href = portalUrl;
        
        // Add another safety timeout after redirect attempt
        setTimeout(cleanupOverlay, 1000);
      } catch (error) {
        console.error('Error during portal redirect:', error);
        cleanupOverlay();
        clearTimeout(safetyTimeout);
      }
    }, jumpAnimationDelay);
    
    return true;
  }
  
  return false;
}

// Function to create particles effect when entering a portal
function createPortalEntryEffect(position) {
  if (!window.scene) return;
  
  // Number of particles to create
  const numParticles = 30;
  
  for (let i = 0; i < numParticles; i++) {
    // Create a simple particle as a small sphere
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.05 + Math.random() * 0.1, 8, 8),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0x00ff00).lerp(new THREE.Color(0xffffff), Math.random() * 0.5),
        transparent: true,
        opacity: 0.8
      })
    );
    
    // Position particles around the player
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.3 + Math.random() * 0.5;
    particle.position.set(
      position.x + Math.cos(angle) * radius,
      position.y + Math.random() * 2, // Distribute vertically
      position.z + Math.sin(angle) * radius
    );
    
    // Add random velocity
    particle.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      2 + Math.random() * 3,
      (Math.random() - 0.5) * 2
    );
    
    // Add to scene
    window.scene.add(particle);
    
    // Store reference for animation
    if (!window.portalParticles) window.portalParticles = [];
    window.portalParticles.push(particle);
    
    // Auto-remove particles after a delay
    setTimeout(() => {
      if (window.scene && particle.parent === window.scene) {
        window.scene.remove(particle);
      }
      if (window.portalParticles) {
        const index = window.portalParticles.indexOf(particle);
        if (index > -1) {
          window.portalParticles.splice(index, 1);
        }
      }
    }, 1500 + Math.random() * 500);
  }
}

export function createEnvironment(scene, mainCamera, loadingManager = new THREE.LoadingManager()) {
  // Store camera reference for dragging
  camera = mainCamera;
  
  // Create a group to hold all environment objects
  const environment = new THREE.Group();
  scene.add(environment);
  
  // Create sky
  createSky(scene);
  
  // Create terrain
  createTerrain(environment);
  
  // Create landmarks - position them to match the reference image
  createEiffelTower(environment, loadingManager);
  createSagradaFamilia(environment, loadingManager);
  
  // Create portals from configuration
  const portals = generatePortals(environment, portalConfigs, loadingManager);
  
  // Add office computer
  createOfficeComputer(environment, loadingManager);
  
  // Reduce the number of trees to make landmarks more visible
  createTrees(environment, 50); // Reduced number of trees
  
  // Create exit portal (replaces start portal)
  createExitPortal(scene);
  
  // Setup event listeners for dragging
  setupDragControls();
  
  return environment;
}

function createSky(scene) {
  // Create a bright blue sky similar to the screenshot
  scene.background = new THREE.Color(0x87CEEB);
  
  // Add a simple directional light to simulate sun
  const sunLight = new THREE.DirectionalLight(0xFFFFAA, 1.2);
  sunLight.position.set(100, 100, 100);
  sunLight.castShadow = true;
  
  // Improve shadow quality
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 500;
  sunLight.shadow.camera.left = -100;
  sunLight.shadow.camera.right = 100;
  sunLight.shadow.camera.top = 100;
  sunLight.shadow.camera.bottom = -100;
  
  scene.add(sunLight);
  
  // Add ambient light to brighten shadows
  const ambientLight = new THREE.AmbientLight(0xCCDDFF, 0.5);
  scene.add(ambientLight);
}

function createTerrain(environment) {
  // Create a completely flat ground plane for the player to walk on
  const groundGeometry = new THREE.PlaneGeometry(500, 500);
  
  // Create a vibrant green material for the ground
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x4CBB17, // Kelly Green - vibrant green
    side: THREE.DoubleSide,
    roughness: 0.8,
    metalness: 0.1
  });
  
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
  ground.position.y = 0; // Place at y=0
  ground.receiveShadow = true;
  environment.add(ground);
  
  // Add collision detection for the ground
  ground.userData.isGround = true;
  
  // Add background hills
  createBackgroundHills(environment);
}

// New function to create larger background hills
function createBackgroundHills(environment) {
  // Create several large hills in the background
  const hillColors = [
    0x7EC850, // Light green
    0x71BC78, // Fern green
    0x4CBB17, // Kelly green
    0x3CB371  // Medium sea green
  ];
  
  // Create a continuous range of hills in the far background
  const hillSegments = 16; // Increased number of segments for smoother appearance
  const baseDistance = 800; // Place hills even further back
  
  for (let i = 0; i < hillSegments; i++) {
    const angle = (i / hillSegments) * Math.PI * 2;
    const x = Math.cos(angle) * baseDistance;
    const z = Math.sin(angle) * baseDistance;
    
    // Create a hill geometry - use a half sphere for a smoother look
    const hillGeometry = new THREE.SphereGeometry(250 + Math.random() * 50, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const hillMaterial = new THREE.MeshStandardMaterial({
      color: hillColors[i % hillColors.length],
      flatShading: false,
      roughness: 0.9,
      metalness: 0.1
    });
    
    const hill = new THREE.Mesh(hillGeometry, hillMaterial);
    hill.position.set(x, -180, z); // Position lower to create just the top of hills visible
    hill.scale.y = 0.6 + Math.random() * 0.2; // Less height variation
    hill.scale.x = 1.8 + Math.random() * 0.4; // More horizontal stretch
    hill.scale.z = 1.8 + Math.random() * 0.4;
    hill.rotation.y = angle; // Align with the circle
    hill.castShadow = true;
    hill.receiveShadow = true;
    environment.add(hill);
  }
  
  // Add a second row of hills slightly closer with offset angles for more depth
  const innerHillSegments = 12;
  const innerDistance = baseDistance - 100;
  
  for (let i = 0; i < innerHillSegments; i++) {
    const offsetAngle = ((i + 0.5) / innerHillSegments) * Math.PI * 2;
    const innerX = Math.cos(offsetAngle) * innerDistance;
    const innerZ = Math.sin(offsetAngle) * innerDistance;
    
    const innerHillGeometry = new THREE.SphereGeometry(200 + Math.random() * 40, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const innerHill = new THREE.Mesh(innerHillGeometry, new THREE.MeshStandardMaterial({
      color: hillColors[(i + 1) % hillColors.length],
      flatShading: false,
      roughness: 0.9,
      metalness: 0.1
    }));
    
    innerHill.position.set(innerX, -150, innerZ);
    innerHill.scale.y = 0.5 + Math.random() * 0.2;
    innerHill.scale.x = 1.6 + Math.random() * 0.3;
    innerHill.scale.z = 1.6 + Math.random() * 0.3;
    innerHill.rotation.y = offsetAngle;
    innerHill.castShadow = true;
    innerHill.receiveShadow = true;
    environment.add(innerHill);
  }
}

// Function to create a billboard with an image
function createBillboard(parent, imagePath, position, rotationY) {
  // Create a loader for the texture
  const textureLoader = new THREE.TextureLoader();
  
  // Load the image texture
  textureLoader.load(
    imagePath,
    function(texture) {
      // Check if this is an AffordiHome billboard
      const isAffordiHome = imagePath.toLowerCase().includes('affordihome');
      
      // If it's AffordiHome, create a canvas to add text to the image
      if (isAffordiHome) {
        // Create a canvas to combine image and text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Set canvas size to match texture
        canvas.width = texture.image.width;
        canvas.height = texture.image.height;
        
        // Draw the original image
        context.drawImage(texture.image, 0, 0, canvas.width, canvas.height);
        
        // Add text
        context.font = 'bold 48px Arial';
        context.fillStyle = '#ffffff'; // White text
        context.strokeStyle = '#000000'; // Black outline
        context.lineWidth = 2;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Position text at the bottom center of the image
        const text = "AffordiHome";
        context.strokeText(text, canvas.width / 2, canvas.height * 0.85);
        context.fillText(text, canvas.width / 2, canvas.height * 0.85);
        
        // Create a new texture from the canvas
        texture = new THREE.CanvasTexture(canvas);
      }
      
      // Get the aspect ratio of the image
      const imageWidth = texture.image.width;
      const imageHeight = texture.image.height;
      const aspectRatio = imageWidth / imageHeight;
      
      // Create a plane with the correct aspect ratio
      const width = 10; // Increased base width in world units for better visibility
      const height = width / aspectRatio;
      const geometry = new THREE.PlaneGeometry(width, height);
      
      // Use MeshStandardMaterial instead of MeshBasicMaterial for better lighting
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        emissive: 0xffffff,     // Add emissive to make it glow slightly
        emissiveMap: texture,   // Use the same texture for the glow
        emissiveIntensity: 0.2, // Subtle glow
        roughness: 0.5,         // Semi-glossy finish
        metalness: 0.1          // Slight metallic look
      });
      
      // Create the billboard mesh
      const billboard = new THREE.Mesh(geometry, material);
      
      // Set position
      billboard.position.copy(position);
      
      // Apply rotation if specified
      billboard.rotation.y = rotationY;
      
      // Add the billboard to the parent
      parent.add(billboard);
      
      // Add to the global billboards array for dragging
      billboards.push(billboard);
      
      // Create axis handles for dragging
      createAxisHandles(billboard);
      
      console.log(`Billboard created with image: ${imagePath}`);
    },
    undefined,
    function(error) {
      console.error(`Error loading billboard image ${imagePath}:`, error);
    }
  );
}

function createEiffelTower(environment, loadingManager) {
  // Create a placeholder for the tower while it loads
  const placeholder = new THREE.Group();
  // Position the Eiffel Tower much closer to the starting position
  placeholder.position.set(30, 0, -25); // Moved to the right by 20 units
  environment.add(placeholder);
  
  // Try to load the GLB/GLTF model first
  const gltfLoader = new GLTFLoader(loadingManager);
  gltfLoader.load(
    '/assets/models/eiffel_tower.glb', // or .gltf
    function(gltf) {
      // Model loaded successfully
      const model = gltf.scene;
      
      // Scale and position the model - make it appropriate for closer viewing
      model.scale.set(3, 4, 3); // Adjusted scale for closer viewing
      model.position.set(0, 0, 0);
      
      // Add shadows
      model.traverse(function(node) {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      
      // Add the model to the placeholder
      placeholder.add(model);
      
      // Add collision detection
      placeholder.userData.isObstacle = true;
      
      // Add billboard to the Eiffel Tower
      createBillboard(placeholder, '/assets/images/Bidtreat.jpg', new THREE.Vector3(0, 20, 8), 0);
      
      // Add second billboard for afforihome
      createBillboard(placeholder, '/assets/images/affordihome.jpg', new THREE.Vector3(0, 15, 8), 0);
      
      console.log('Eiffel Tower model loaded successfully - positioned in the distance');
    },
    function(xhr) {
      // Loading progress
      console.log('Eiffel Tower: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function(error) {
      // Error loading GLTF, fall back to OBJ
      console.warn('Error loading GLTF model, falling back to OBJ:', error);
      loadOBJModel(placeholder, loadingManager);
    }
  );
  
  // Function to load OBJ model as fallback
  function loadOBJModel(placeholder, loadingManager) {
    const mtlLoader = new MTLLoader(loadingManager);
    mtlLoader.load(
      '/assets/models/eiffel_tower.mtl',
      function(materials) {
        materials.preload();
        
        const objLoader = new OBJLoader(loadingManager);
        objLoader.setMaterials(materials);
        objLoader.load(
          '/assets/models/eiffel_tower.obj',
          function(object) {
            // Scale and position the model
            object.scale.set(5, 5, 5); // Adjust scale as needed
            
            // Add shadows
            object.traverse(function(node) {
              if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
              }
            });
            
            // Add the model to the placeholder
            placeholder.add(object);
            
            // Add billboards to the Eiffel Tower
            addBillboardsToEiffelTower(placeholder);
            
            console.log('Eiffel Tower OBJ model loaded successfully');
          },
          function(xhr) {
            // Loading progress
            console.log('Eiffel Tower OBJ: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
          },
          function(error) {
            // Error loading OBJ, fall back to basic geometries
            console.warn('Error loading OBJ model, falling back to basic geometries:', error);
            createBasicEiffelTower(placeholder);
          }
        );
      },
      function(xhr) {
        // MTL loading progress
      },
      function(error) {
        // Error loading MTL, try loading OBJ without materials
        console.warn('Error loading MTL file, trying OBJ without materials:', error);
        
        const objLoader = new OBJLoader(loadingManager);
        objLoader.load(
          '/assets/models/eiffel_tower.obj',
          function(object) {
            // Apply a basic material
            object.traverse(function(node) {
              if (node.isMesh) {
                node.material = new THREE.MeshStandardMaterial({ color: 0x555555 });
                node.castShadow = true;
                node.receiveShadow = true;
              }
            });
            
            // Scale the model
            object.scale.set(5, 5, 5);
            
            // Add the model to the placeholder
            placeholder.add(object);
            
            // Add billboards to the Eiffel Tower
            addBillboardsToEiffelTower(placeholder);
            
            console.log('Eiffel Tower OBJ model loaded successfully without materials');
          },
          function(xhr) {
            // Loading progress
            console.log('Eiffel Tower OBJ (no materials): ' + (xhr.loaded / xhr.total * 100) + '% loaded');
          },
          function(error) {
            // Error loading OBJ, fall back to basic geometries
            console.warn('Error loading OBJ model without materials, falling back to basic geometries:', error);
            createBasicEiffelTower(placeholder);
          }
        );
      }
    );
  }
  
  // Function to create a basic Eiffel Tower using simple geometries
  function createBasicEiffelTower(placeholder) {
    // Create a basic tower using simple geometries
    const towerGroup = new THREE.Group();
    
    // Base of the tower (four legs)
    const legGeometry = new THREE.BoxGeometry(1, 10, 1);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
    
    // Create four legs
    const leg1 = new THREE.Mesh(legGeometry, legMaterial);
    leg1.position.set(2, 5, 2);
    leg1.rotation.z = Math.PI / 12; // Slight angle
    towerGroup.add(leg1);
    
    const leg2 = new THREE.Mesh(legGeometry, legMaterial);
    leg2.position.set(-2, 5, 2);
    leg2.rotation.z = -Math.PI / 12; // Slight angle
    towerGroup.add(leg2);
    
    const leg3 = new THREE.Mesh(legGeometry, legMaterial);
    leg3.position.set(2, 5, -2);
    leg3.rotation.z = Math.PI / 12; // Slight angle
    towerGroup.add(leg3);
    
    const leg4 = new THREE.Mesh(legGeometry, legMaterial);
    leg4.position.set(-2, 5, -2);
    leg4.rotation.z = -Math.PI / 12; // Slight angle
    towerGroup.add(leg4);
    
    // Middle section
    const middleGeometry = new THREE.BoxGeometry(3, 15, 3);
    const middleMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const middle = new THREE.Mesh(middleGeometry, middleMaterial);
    middle.position.y = 17.5;
    towerGroup.add(middle);
    
    // Top section
    const topGeometry = new THREE.ConeGeometry(1.5, 10, 4);
    const topMaterial = new THREE.MeshStandardMaterial({ color: 0x777777 });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = 30;
    towerGroup.add(top);
    
    // Add shadows
    towerGroup.traverse(function(node) {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    
    // Add the tower to the placeholder
    placeholder.add(towerGroup);
    
    // Add billboards to the basic Eiffel Tower
    addBillboardsToEiffelTower(placeholder);
    
    console.log('Basic Eiffel Tower created using geometries');
  }
  
  // Function to add billboards to the Eiffel Tower - removing duplicate billboard creation
  function addBillboardsToEiffelTower(towerGroup) {
    console.log('Adding billboards to Eiffel Tower');
    // Removed duplicate billboard creation calls
  }
  
  return placeholder;
}

function createSagradaFamilia(environment, loadingManager) {
  // Create a placeholder for the Sagrada Familia
  const placeholder = new THREE.Group();
  // Position it to be to the right and behind the Eiffel Tower relative to player spawn
  placeholder.position.set(50, 0, -70); // Right and behind the Eiffel Tower
  environment.add(placeholder);
  
  // Try to load the GLB model first
  const gltfLoader = new GLTFLoader(loadingManager);
  gltfLoader.load(
    '/assets/models/sagrada_familia_2.glb',
    function(gltf) {
      // Model loaded successfully
      const model = gltf.scene;
      
      // Scale and position the model - make it 10x smaller than current size
      model.scale.set(1, 1, 1); // Reduced from 0.8 to 0.08 (10x smaller than before)
      model.position.set(75, 0, -70);
      
      // Rotate the model to face toward the player
      model.rotation.y = Math.PI / 6; // 30-degree rotation to show a good angle from player's view
      
      // Add shadows
      model.traverse(function(node) {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      
      // Add the model to the placeholder
      placeholder.add(model);
      
      // Add collision detection
      placeholder.userData.isObstacle = true;
      
      console.log('Sagrada Familia model loaded successfully - scaled down to 1/100th of original size');
    },
    function(xhr) {
      // Loading progress
      console.log('Sagrada Familia: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function(error) {
      // Error loading GLTF, fall back to basic geometries
      console.warn('Error loading Sagrada Familia model, falling back to basic geometries:', error);
      createBasicSagradaFamilia(placeholder);
    }
  );
  
  // Function to create a basic Sagrada Familia with geometries as fallback
  function createBasicSagradaFamilia(placeholder) {
    console.log('Creating basic Sagrada Familia with geometries');
    
    // Create a simplified Sagrada Familia using basic geometries
    const sagradaGroup = new THREE.Group();
    
    // Base of the cathedral
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xD2B48C });
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(30, 5, 50),
      baseMaterial
    );
    base.position.y = 2.5;
    sagradaGroup.add(base);
    
    // Main towers
    const towerMaterial = new THREE.MeshStandardMaterial({ color: 0xE6BE8A });
    
    // Create multiple towers of different heights
    const towerPositions = [
      { x: -10, z: -20, height: 40, radius: 3 },
      { x: 10, z: -20, height: 45, radius: 3 },
      { x: -10, z: 0, height: 50, radius: 3 },
      { x: 10, z: 0, height: 55, radius: 3 },
      { x: -10, z: 20, height: 40, radius: 3 },
      { x: 10, z: 20, height: 45, radius: 3 },
    ];
    
    towerPositions.forEach(pos => {
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(pos.radius * 0.5, pos.radius, pos.height, 8),
        towerMaterial
      );
      tower.position.set(pos.x, pos.height / 2 + 5, pos.z);
      
      // Add a spire to each tower
      const spire = new THREE.Mesh(
        new THREE.ConeGeometry(pos.radius * 0.5, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0xFFD700 })
      );
      spire.position.y = pos.height / 2 + 5;
      tower.add(spire);
      
      sagradaGroup.add(tower);
    });
    
    // Add the basic Sagrada to the placeholder
    placeholder.add(sagradaGroup);
  }
  
  return placeholder;
}

function createTrees(environment, numTrees = 150) {
  // Create a set of simple low-poly trees scattered around
  const treePositions = [];
  
  // Generate random positions for trees, avoiding landmarks
  for (let i = 0; i < numTrees; i++) {
    const x = Math.random() * 800 - 400;
    const z = Math.random() * 800 - 400;
    
    // Avoid placing trees near landmarks and player spawn
    const distToEiffel = Math.sqrt(Math.pow(x - 30, 2) + Math.pow(z + 50, 2));
    const distToSagrada = Math.sqrt(Math.pow(x - 50, 2) + Math.pow(z + 30, 2));
    const distToSpawn = Math.sqrt(Math.pow(x, 2) + Math.pow(z, 2));
    
    if (distToEiffel > 50 && distToSagrada > 50 && distToSpawn > 30) {
      // Add some clustering to make tree groups
      if (Math.random() < 0.3) {
        // Add a cluster of trees
        const clusterSize = Math.floor(Math.random() * 3) + 2;
        for (let j = 0; j < clusterSize; j++) {
          const offsetX = Math.random() * 15 - 7.5;
          const offsetZ = Math.random() * 15 - 7.5;
          treePositions.push({ 
            x: x + offsetX, 
            z: z + offsetZ,
            scale: 0.7 + Math.random() * 0.6 // Varied scale for natural look
          });
        }
      } else {
        treePositions.push({ 
          x, 
          z,
          scale: 0.8 + Math.random() * 0.4 // Varied scale for natural look
        });
      }
    }
  }
  
  // Create tree instances
  treePositions.forEach(pos => {
    const tree = createTree();
    tree.position.set(pos.x, 0, pos.z);
    tree.scale.set(pos.scale, pos.scale, pos.scale);
    environment.add(tree);
  });
}

function createTree() {
  const treeGroup = new THREE.Group();
  
  // Tree trunk - shorter and thicker
  const trunkGeometry = new THREE.CylinderGeometry(0.7, 1.2, 3, 6);
  const trunkMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x8B4513,
    roughness: 0.9,
    metalness: 0.1
  });
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.position.y = 1.5;
  trunk.castShadow = true;
  treeGroup.add(trunk);
  
  // Tree foliage - more stylized, rounded shape like in the screenshot
  const foliageGeometry = new THREE.SphereGeometry(3, 8, 8);
  const foliageMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x228B22, // Forest green
    roughness: 0.8,
    metalness: 0.1
  });
  const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
  foliage.position.y = 5;
  foliage.scale.y = 1.2; // Slightly elongated vertically
  foliage.castShadow = true;
  treeGroup.add(foliage);
  
  // Add a second, smaller foliage sphere on top for some trees (randomly)
  if (Math.random() < 0.4) {
    const topFoliageGeometry = new THREE.SphereGeometry(2, 8, 8);
    const topFoliage = new THREE.Mesh(topFoliageGeometry, foliageMaterial);
    topFoliage.position.y = 7.5;
    topFoliage.scale.y = 1.1;
    topFoliage.castShadow = true;
    treeGroup.add(topFoliage);
  }
  
  // Add collision detection
  treeGroup.userData.isObstacle = true;
  
  return treeGroup;
}

// Setup event listeners for dragging billboards
function setupDragControls() {
  // Add event listeners to the document
  document.addEventListener('mousedown', onMouseDown, false);
  document.addEventListener('mousemove', onMouseMove, false);
  document.addEventListener('mouseup', onMouseUp, false);
  
  // Touch events for mobile
  document.addEventListener('touchstart', onTouchStart, false);
  document.addEventListener('touchmove', onTouchMove, false);
  document.addEventListener('touchend', onTouchEnd, false);
  
  console.log('Billboard drag controls initialized');
}

// Mouse event handlers
function onMouseDown(event) {
  // Calculate mouse position in normalized device coordinates (-1 to +1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  checkDragStart();
}

function onMouseMove(event) {
  if (!isDragging) return;
  
  // Calculate mouse position in normalized device coordinates (-1 to +1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  handleDrag();
}

function onMouseUp(event) {
  isDragging = false;
  selectedBillboard = null;
  selectedAxis = null;
}

// Touch event handlers
function onTouchStart(event) {
  if (event.touches.length > 0) {
    // Prevent default to avoid scrolling
    event.preventDefault();
    
    // Calculate touch position in normalized device coordinates (-1 to +1)
    mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
    
    checkDragStart();
  }
}

function onTouchMove(event) {
  if (!isDragging || event.touches.length === 0) return;
  
  // Prevent default to avoid scrolling
  event.preventDefault();
  
  // Calculate touch position in normalized device coordinates (-1 to +1)
  mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
  
  handleDrag();
}

function onTouchEnd(event) {
  isDragging = false;
  selectedBillboard = null;
  selectedAxis = null;
}

// Check if we're starting to drag a billboard or axis
function checkDragStart() {
  if (!camera) return;
  
  // Update the raycaster with the mouse position and camera
  raycaster.setFromCamera(mouse, camera);
  
  // Check for intersections with axis handles first
  const axisIntersects = raycaster.intersectObjects(
    billboards.flatMap(billboard => [
      billboard.userData.xAxis,
      billboard.userData.yAxis,
      billboard.userData.zAxis
    ].filter(axis => axis)), // Filter out any undefined axes
    true
  );
  
  if (axisIntersects.length > 0) {
    // We've clicked on an axis handle
    const axisHandle = axisIntersects[0].object;
    selectedAxis = axisHandle;
    selectedBillboard = axisHandle.userData.billboard;
    
    // Store the starting position
    dragStartPosition.copy(selectedBillboard.position);
    
    // Create a drag plane perpendicular to the camera
    const planeNormal = new THREE.Vector3().subVectors(
      camera.position,
      selectedBillboard.position
    ).normalize();
    
    dragPlane.setFromNormalAndCoplanarPoint(
      planeNormal,
      selectedBillboard.position
    );
    
    isDragging = true;
    return;
  }
  
  // If we didn't click an axis, check if we clicked a billboard
  const billboardIntersects = raycaster.intersectObjects(billboards, true);
  
  if (billboardIntersects.length > 0) {
    // We've clicked on a billboard
    selectedBillboard = billboardIntersects[0].object;
    
    // Show the axis handles for this billboard
    if (selectedBillboard.userData.xAxis) {
      selectedBillboard.userData.xAxis.visible = true;
      selectedBillboard.userData.yAxis.visible = true;
      selectedBillboard.userData.zAxis.visible = true;
    }
    
    // Hide axes for all other billboards
    billboards.forEach(billboard => {
      if (billboard !== selectedBillboard && billboard.userData.xAxis) {
        billboard.userData.xAxis.visible = false;
        billboard.userData.yAxis.visible = false;
        billboard.userData.zAxis.visible = false;
      }
    });
  } else {
    // Clicked on nothing, hide all axes
    billboards.forEach(billboard => {
      if (billboard.userData.xAxis) {
        billboard.userData.xAxis.visible = false;
        billboard.userData.yAxis.visible = false;
        billboard.userData.zAxis.visible = false;
      }
    });
  }
}

// Handle dragging along the selected axis
function handleDrag() {
  if (!isDragging || !selectedBillboard || !selectedAxis || !camera) return;
  
  // Cast a ray from the mouse into the scene
  raycaster.setFromCamera(mouse, camera);
  
  // Determine which axis we're dragging along
  const axisDirection = new THREE.Vector3();
  
  if (selectedAxis === selectedBillboard.userData.xAxis) {
    axisDirection.set(1, 0, 0);
  } else if (selectedAxis === selectedBillboard.userData.yAxis) {
    axisDirection.set(0, 1, 0);
  } else if (selectedAxis === selectedBillboard.userData.zAxis) {
    axisDirection.set(0, 0, 1);
  }
  
  // Transform axis direction to world space
  selectedBillboard.parent.localToWorld(axisDirection.add(selectedBillboard.position));
  selectedBillboard.parent.localToWorld(dragStartPosition.clone());
  
  // Create a line representing the drag axis
  const axisLine = new THREE.Line3(
    selectedBillboard.position.clone(),
    axisDirection
  );
  
  // Find the closest point on the axis to the ray
  const closestPoint = new THREE.Vector3();
  const ray = raycaster.ray;
  
  // Calculate the closest point between the ray and the axis line
  const rayPointToLine = new THREE.Vector3();
  ray.closestPointToPoint(axisLine.start, rayPointToLine);
  
  const rayToLineDistance = rayPointToLine.distanceTo(axisLine.start);
  const rayDirection = ray.direction.clone();
  const pointOnRay = ray.origin.clone().add(
    rayDirection.multiplyScalar(rayToLineDistance)
  );
  
  // Project the point onto the axis
  const axisVector = new THREE.Vector3().subVectors(
    axisLine.end,
    axisLine.start
  ).normalize();
  
  const projectedPoint = axisLine.start.clone().add(
    axisVector.multiplyScalar(
      new THREE.Vector3().subVectors(pointOnRay, axisLine.start).dot(axisVector)
    )
  );
  
  // Update the billboard position along the selected axis
  const newPosition = new THREE.Vector3();
  
  if (selectedAxis === selectedBillboard.userData.xAxis) {
    newPosition.set(
      projectedPoint.x,
      selectedBillboard.position.y,
      selectedBillboard.position.z
    );
  } else if (selectedAxis === selectedBillboard.userData.yAxis) {
    newPosition.set(
      selectedBillboard.position.x,
      projectedPoint.y,
      selectedBillboard.position.z
    );
  } else if (selectedAxis === selectedBillboard.userData.zAxis) {
    newPosition.set(
      selectedBillboard.position.x,
      selectedBillboard.position.y,
      projectedPoint.z
    );
  }
  
  // Convert the world position back to local space
  selectedBillboard.parent.worldToLocal(newPosition);
  
  // Update the billboard position
  selectedBillboard.position.copy(newPosition);
  
  // Update the axis handles position
  updateAxisHandles(selectedBillboard);
  
  // Log the new position for debugging
  console.log(`Billboard position: ${newPosition.x.toFixed(2)}, ${newPosition.y.toFixed(2)}, ${newPosition.z.toFixed(2)}`);
}

// Update the position of axis handles for a billboard
function updateAxisHandles(billboard) {
  if (!billboard.userData.xAxis) return;
  
  // Calculate axis length based on billboard geometry
  const geometry = billboard.geometry;
  const parameters = geometry.parameters;
  const axisLength = Math.max(parameters.width, parameters.height) * 0.5;
  
  // Position the axis handles relative to the billboard
  billboard.userData.xAxis.position.set(axisLength / 2, 0, 0);
  billboard.userData.yAxis.position.set(0, axisLength / 2, 0);
  billboard.userData.zAxis.position.set(0, 0, axisLength / 2);
}

// Create axis handles for dragging
function createAxisHandles(billboard) {
  // Create a group to hold the axis handles
  const axisGroup = new THREE.Group();
  billboard.add(axisGroup);
  
  // Calculate axis length based on billboard geometry
  const geometry = billboard.geometry;
  const parameters = geometry.parameters;
  const axisLength = Math.max(parameters.width, parameters.height) * 0.5;
  
  // Create X axis (red)
  const xAxisGeometry = new THREE.CylinderGeometry(0.1, 0.1, axisLength, 8);
  xAxisGeometry.rotateZ(Math.PI / 2); // Rotate to point along X axis
  const xAxisMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const xAxis = new THREE.Mesh(xAxisGeometry, xAxisMaterial);
  xAxis.position.set(axisLength / 2, 0, 0);
  
  // Create X axis arrow cone
  const xArrowGeometry = new THREE.ConeGeometry(0.2, 0.5, 8);
  xArrowGeometry.rotateZ(-Math.PI / 2); // Rotate to point along X axis
  const xArrow = new THREE.Mesh(xArrowGeometry, xAxisMaterial);
  xArrow.position.set(axisLength, 0, 0);
  
  // Create Y axis (green)
  const yAxisGeometry = new THREE.CylinderGeometry(0.1, 0.1, axisLength, 8);
  const yAxisMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const yAxis = new THREE.Mesh(yAxisGeometry, yAxisMaterial);
  yAxis.position.set(0, axisLength / 2, 0);
  
  // Create Y axis arrow cone
  const yArrowGeometry = new THREE.ConeGeometry(0.2, 0.5, 8);
  const yArrow = new THREE.Mesh(yArrowGeometry, yAxisMaterial);
  yArrow.position.set(0, axisLength, 0);
  
  // Create Z axis (blue)
  const zAxisGeometry = new THREE.CylinderGeometry(0.1, 0.1, axisLength, 8);
  zAxisGeometry.rotateX(Math.PI / 2); // Rotate to point along Z axis
  const zAxisMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
  const zAxis = new THREE.Mesh(zAxisGeometry, zAxisMaterial);
  zAxis.position.set(0, 0, axisLength / 2);
  
  // Create Z axis arrow cone
  const zArrowGeometry = new THREE.ConeGeometry(0.2, 0.5, 8);
  zArrowGeometry.rotateX(Math.PI / 2); // Rotate to point along Z axis
  const zArrow = new THREE.Mesh(zArrowGeometry, zAxisMaterial);
  zArrow.position.set(0, 0, axisLength);
  
  // Add all axes to the group
  axisGroup.add(xAxis);
  axisGroup.add(xArrow);
  axisGroup.add(yAxis);
  axisGroup.add(yArrow);
  axisGroup.add(zAxis);
  axisGroup.add(zArrow);
  
  // Store references to the axis handles
  billboard.userData.xAxis = xAxis;
  billboard.userData.yAxis = yAxis;
  billboard.userData.zAxis = zAxis;
  
  // Store reference to the billboard on each axis
  xAxis.userData.billboard = billboard;
  yAxis.userData.billboard = billboard;
  zAxis.userData.billboard = billboard;
  xArrow.userData.billboard = billboard;
  yArrow.userData.billboard = billboard;
  zArrow.userData.billboard = billboard;
  
  // Hide axes by default
  axisGroup.visible = false;
  
  return axisGroup;
}

function generatePortals(environment, configs, loadingManager) {
  const portals = [];
  
  configs.forEach(config => {
    const portal = createPortalWithConfig(environment, config, loadingManager);
    portals.push(portal);
  });
  
  return portals;
}

function createPortalWithConfig(environment, config, loadingManager) {
  const { position, rotation, imageUrl, targetUrl, scale, isFormPortal } = config;
  
  // Create portal group
  const portalGroup = new THREE.Group();
  portalGroup.position.set(position.x, position.y, position.z);
  portalGroup.rotation.y = rotation;
  portalGroup.scale.set(scale, scale, scale);
  environment.add(portalGroup);
  
  // Create portal trigger
  const portalTrigger = createPortalTrigger(targetUrl, isFormPortal);
  portalTrigger.position.set(0, 1.5, 0);
  portalTrigger.userData.isPortal = true;
  portalTrigger.userData.portalURL = targetUrl;
  portalTrigger.userData.isFormPortal = isFormPortal;
  portalGroup.add(portalTrigger);
  
  // Load portal frame
  loadPortalFrame(portalGroup, loadingManager);
  
  // Add portal image
  addPortalImage(portalGroup, imageUrl, loadingManager);
  
  return portalGroup;
}

function createPortalTrigger(targetUrl, isFormPortal = false) {
  const portalTrigger = new THREE.Mesh(
    new THREE.BoxGeometry(2, 3, 2),
    new THREE.MeshBasicMaterial({ 
      transparent: true, 
      opacity: 0,
      visible: false 
    })
  );
  
  portalTrigger.userData.isPortal = true;
  portalTrigger.userData.portalURL = addAvatarToPortalUrl(targetUrl);
  portalTrigger.userData.isFormPortal = isFormPortal;
  
  // Log portal trigger creation for debugging
  console.log(`Created portal trigger: ${targetUrl}, isFormPortal: ${isFormPortal}`);
  
  // Add click handler for tracking and form display
  portalTrigger.addEventListener('click', (event) => {
    console.log('Portal clicked!', portalTrigger.userData);
    
    // Check if this is a form portal or has '#' URL
    if (portalTrigger.userData.isFormPortal === true || portalTrigger.userData.portalURL === '#') {
      console.log('Opening portal form...');
      
      // Prevent event propagation
      event.stopPropagation();
      
      // Highlight the portal when clicked
      const portalGroup = portalTrigger.parent;
      
      // Find the portal image mesh(es)
      const portalMeshes = [];
      portalGroup.traverse(child => {
        if (child.isMesh && child !== portalTrigger) {
          portalMeshes.push(child);
        }
      });
      
      // Animate glow effect
      portalMeshes.forEach(mesh => {
        if (mesh.material && mesh.material.uniforms) {
          // Store the original intensity
          const originalIntensity = mesh.material.uniforms.glowIntensity.value;
          
          // Increase the glow
          mesh.material.uniforms.glowIntensity.value = 1.0;
          mesh.material.uniforms.glowColor.value = new THREE.Color(0x00ffff);
          
          // Animate back to normal
          setTimeout(() => {
            mesh.material.uniforms.glowIntensity.value = originalIntensity;
            mesh.material.uniforms.glowColor.value = new THREE.Color(0xffffff);
          }, 1000);
        }
      });
      
      // Show the form after a short delay to allow the glow effect to be seen
      setTimeout(() => {
        showPortalForm((formData) => {
          // Handle form submission
          console.log('Form submitted:', formData);
          
          // Show success animation
          const successAnimation = document.createElement('div');
          successAnimation.className = 'portal-success-animation';
          successAnimation.innerHTML = `
            <div class="success-icon">✓</div>
            <div class="success-message">Portal request was submitted</div>
          `;
          document.body.appendChild(successAnimation);
          
          // Remove the animation after it completes
          setTimeout(() => {
            successAnimation.remove();
          }, 2000);
          
          // Update the portal with new data
          if (formData.url && formData.url !== '') {
            portalTrigger.userData.portalURL = formData.url;
          }
          
          // Update the portal image if provided
          if (formData.image && formData.image !== '') {
            // Find the portal image mesh
            portalMeshes.forEach(mesh => {
              if (mesh.material && mesh.material.uniforms && mesh.material.uniforms.map) {
                // Load new texture
                const textureLoader = new THREE.TextureLoader();
                textureLoader.load(formData.image, (texture) => {
                  mesh.material.uniforms.map.value = texture;
                  
                  // Animate portal update effect
                  animatePortalUpdate(mesh);
                });
              }
            });
          } else {
            // Still animate even if no new image
            portalMeshes.forEach(mesh => {
              animatePortalUpdate(mesh);
            });
          }
          
          trackEvent('portal_form_submitted', formData);
        });
      }, 100);
    } else {
      // Regular portal click behavior - open the URL
      console.log('Opening regular portal:', targetUrl);
      window.open(targetUrl, '_blank');
      
      // Track the click event
      trackEvent('portal_clicked', {
        portal_url: targetUrl,
        portal_name: targetUrl.split('/')[2] || 'unknown'
      });
    }
  }); // End of click event listener
  
  return portalTrigger;
}

// Helper function to animate portal update
function animatePortalUpdate(mesh) {
  if (!mesh.material || !mesh.material.uniforms) return;
  
  // Save original values
  const originalDistortion = mesh.material.uniforms.distortionStrength.value;
  const originalGlowIntensity = mesh.material.uniforms.glowIntensity.value;
  const originalColor = mesh.material.uniforms.glowColor.value.clone();
  
  // Create animation timeline
  const startTime = Date.now();
  const duration = 2000; // 2 seconds
  
  // Animation function
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Increase distortion and glow at the start, then fade back
    const phase = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
    
    mesh.material.uniforms.distortionStrength.value = originalDistortion + phase * 0.3;
    mesh.material.uniforms.glowIntensity.value = originalGlowIntensity + phase * 1.5;
    
    // Change color to cyan during animation
    const color = new THREE.Color();
    color.r = originalColor.r * (1 - phase) + 0 * phase;
    color.g = originalColor.g * (1 - phase) + 1 * phase;
    color.b = originalColor.b * (1 - phase) + 1 * phase;
    mesh.material.uniforms.glowColor.value = color;
    
    // Continue animation if not complete
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // Reset to original values
      mesh.material.uniforms.distortionStrength.value = originalDistortion;
      mesh.material.uniforms.glowIntensity.value = originalGlowIntensity;
      mesh.material.uniforms.glowColor.value = originalColor;
    }
  }
  
  // Start animation
  animate();
}

export function showPortalForm(onSubmit) {
  // Prevent multiple forms from being opened at the same time
  if (isPortalFormOpen) {
    console.log('Portal form is already open');
    return;
  }
  
  console.log('Showing portal form...');
  isPortalFormOpen = true;
  
  // Create form container
  const formContainer = document.createElement('div');
  formContainer.className = 'portal-form-overlay';
  document.body.appendChild(formContainer);
  
  // Setup a safety cleanup mechanism in case the form is closed unexpectedly
  // (e.g., by browser refresh, navigation away, etc.)
  const cleanup = () => {
    if (isPortalFormOpen) {
      console.log('Cleaning up portal form state');
      isPortalFormOpen = false;
    }
  };
  
  // Add event listener to detect form removal
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.removedNodes) {
        for (let i = 0; i < mutation.removedNodes.length; i++) {
          if (mutation.removedNodes[i] === formContainer) {
            cleanup();
            observer.disconnect();
            break;
          }
        }
      }
    });
  });
  
  // Start observing
  observer.observe(document.body, { childList: true });
  
  // Also add an escape key handler to close the form
  const escKeyHandler = (event) => {
    if (event.key === 'Escape') {
      cleanup();
      formContainer.remove();
      document.removeEventListener('keydown', escKeyHandler);
    }
  };
  
  document.addEventListener('keydown', escKeyHandler);
  
  // Ensure the form is visible with important styles
  formContainer.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    background: rgba(0, 0, 0, 0.8) !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    z-index: 1000 !important;
    perspective: 1000px !important;
  `;
  
  // Create React form with FormSpark integration
  const PortalFormWithFormSpark = ({ onSubmit, onCancel }) => {
    return React.createElement('div', { 
      className: 'portal-form-container',
      style: {
        animation: 'portal-form-appear 0.5s ease-out forwards'
      }
    },
      React.createElement('h2', {
        style: {
          textShadow: '0 0 10px #4a90e2, 0 0 20px #4a90e2',
          animation: 'portal-glow 2s infinite alternate'
        }
      }, 'Submit New Portal'),
      React.createElement('form', { 
        id: 'portal-form',
        action: 'https://submit-form.com/OOKKM5IU8',
        onSubmit: (e) => {
          e.preventDefault();
          const form = e.target;
          
          // Check if the agreement checkbox is checked
          if (!form.agreement.checked) {
            alert('You must agree to add a portal to continue.');
            return;
          }
          
          const formData = {
            url: form.url.value,
            image: form.image.value,
            agreement: form.agreement.checked
          };

          // Submit to FormSpark
          fetch('https://submit-form.com/OOKKM5IU8', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(formData)
          })
          .then(response => {
            console.log('FormSpark submission successful:', response);
            
            // Show success message in the same style as the form
            const successContainer = document.createElement('div');
            successContainer.className = 'portal-form-overlay';
            successContainer.innerHTML = `
              <div class="portal-form-container" style="text-align: center; padding: 40px;">
                <h2 style="color: #4a90e2; text-shadow: 0 0 10px #4a90e2, 0 0 20px #4a90e2;">
                  Portal Request Submitted!
                </h2>
                <div style="font-size: 24px; color: #00ffff; margin: 20px 0;">
                  ✓
                </div>
                <p style="color: white; font-size: 18px; margin-bottom: 30px;">
                  Thank you for your submission. We'll review it shortly.
                </p>
                <button class="submit-button" style="width: 200px;" onclick="this.parentElement.parentElement.remove()">
                  Close
                </button>
              </div>
            `;
            document.body.appendChild(successContainer);
            
            // Close the form and call onSubmit
            formContainer.remove();
            root.unmount();
            isPortalFormOpen = false;
            onSubmit(formData);
          })
          .catch(error => {
            console.error('FormSpark submission error:', error);
            // Still proceed with portal creation even if FormSpark submission fails
            onSubmit(formData);
          });
        }
      },
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', { htmlFor: 'url' }, 'Portal URL:'),
          React.createElement('input', { 
            type: 'url', 
            id: 'url', 
            name: 'url', 
            required: true,
            placeholder: 'https://example.com',
            className: 'portal-3d-input'
          })
        ),
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', { htmlFor: 'image' }, 'Portal Image URL:'),
          React.createElement('input', { 
            type: 'url', 
            id: 'image', 
            name: 'image', 
            required: true,
            placeholder: 'https://example.com/image.jpg',
            className: 'portal-3d-input'
          })
        ),
        React.createElement('div', { className: 'form-group checkbox-group' },
          React.createElement('label', { 
            htmlFor: 'agreement',
            className: 'checkbox-label'
          },
            React.createElement('input', { 
              type: 'checkbox', 
              id: 'agreement', 
              name: 'agreement', 
              required: true,
              className: 'portal-checkbox'
            }),
            " I agree to add this portal to the metaverse"
          )
        ),
        React.createElement('div', { className: 'form-buttons' },
          React.createElement('button', { 
            type: 'submit', 
            className: 'submit-button'
          }, 'Submit Portal'),
          React.createElement('button', { 
            type: 'button', 
            className: 'cancel-button',
            onClick: onCancel
          }, 'Cancel')
        )
      )
    );
  };
  
  // Create React root and render the form
  const root = ReactDOM.createRoot(formContainer);
  
  try {
    root.render(
      React.createElement(PortalFormWithFormSpark, {
        onSubmit: (formData) => {
          onSubmit(formData);
          formContainer.remove();
          root.unmount();
          // Reset the form open flag
          isPortalFormOpen = false;
        },
        onCancel: () => {
          formContainer.remove();
          root.unmount();
          // Reset the form open flag
          isPortalFormOpen = false;
        }
      })
    );
    console.log('Portal form with FormSpark rendered successfully');
  } catch (error) {
    console.error('Error rendering portal form:', error);
    
    // Fallback to regular HTML form if React rendering fails
    formContainer.innerHTML = `
      <div class="portal-form-container" style="background: #1a1a2e; border: 2px solid #4a90e2; padding: 24px; width: 400px; color: white; border-radius: 8px;">
        <h2 style="color: #4a90e2; text-align: center; font-size: 28px;">Create New Portal</h2>
        <form id="fallback-portal-form" action="https://submit-form.com/OOKKM5IU8" method="POST">
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; color: #4a90e2;">Portal URL:</label>
            <input type="url" name="url" required placeholder="https://example.com" style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.2); border: 1px solid #4a90e2; color: white; border-radius: 4px;">
          </div>
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; color: #4a90e2;">Portal Image URL:</label>
            <input type="url" name="image" required placeholder="https://example.com/image.jpg" style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.2); border: 1px solid #4a90e2; color: white; border-radius: 4px;">
          </div>
          <div style="margin-bottom: 16px;">
            <label style="display: flex; align-items: center; color: #4a90e2; cursor: pointer;">
              <input type="checkbox" name="agreement" required style="margin-right: 8px;">
              I agree to add this portal to the metaverse
            </label>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 24px;">
            <button type="submit" style="padding: 10px 20px; background: linear-gradient(135deg, #4a90e2, #00ffff); color: white; border: none; border-radius: 4px; cursor: pointer;">Create Portal</button>
            <button type="button" class="cancel-button" style="padding: 10px 20px; background: #444; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
          </div>
        </form>
      </div>
    `;
    
    // Add event listeners to fallback form
    const fallbackForm = document.getElementById('fallback-portal-form');
    const cancelButton = formContainer.querySelector('.cancel-button');
    
    fallbackForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Check if the agreement checkbox is checked
      if (!fallbackForm.agreement.checked) {
        alert('You must agree to add a portal to continue.');
        return;
      }
      
      const formData = {
        url: fallbackForm.url.value,
        image: fallbackForm.image.value,
        agreement: fallbackForm.agreement.checked
      };
      
      // Submit to FormSpark
      fetch(fallbackForm.action, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      .then(response => {
        console.log('FormSpark submission successful:', response);
        
        // Show success message in the same style as the form
        const successContainer = document.createElement('div');
        successContainer.className = 'portal-form-overlay';
        successContainer.innerHTML = `
          <div class="portal-form-container" style="text-align: center; padding: 40px;">
            <h2 style="color: #4a90e2; text-shadow: 0 0 10px #4a90e2, 0 0 20px #4a90e2;">
              Portal Request Submitted!
            </h2>
            <div style="font-size: 24px; color: #00ffff; margin: 20px 0;">
              ✓
            </div>
            <p style="color: white; font-size: 18px; margin-bottom: 30px;">
              Thank you for your submission. We'll review it shortly.
            </p>
            <button class="submit-button" style="width: 200px;" onclick="this.parentElement.parentElement.remove()">
              Close
            </button>
          </div>
        `;
        document.body.appendChild(successContainer);
        
        // Close the form and call onSubmit
        formContainer.remove();
        isPortalFormOpen = false;
        onSubmit(formData);
      })
      .catch(error => {
        console.error('FormSpark submission error:', error);
        // Still proceed with portal creation even if FormSpark submission fails
        onSubmit(formData);
      });
    });
    
    cancelButton.addEventListener('click', () => {
      formContainer.remove();
      // Reset the form open flag
      isPortalFormOpen = false;
    });
  }
  
  // Add CSS for the form if it doesn't exist
  if (!document.getElementById('portal-form-styles')) {
    const style = document.createElement('style');
    style.id = 'portal-form-styles';
    style.textContent = `
      @keyframes portal-form-appear {
        0% { 
          transform: scale(0.5) rotateY(90deg); 
          opacity: 0;
        }
        100% { 
          transform: scale(1) rotateY(0deg); 
          opacity: 1;
        }
      }
      
      @keyframes portal-glow {
        0% { text-shadow: 0 0 10px #4a90e2, 0 0 20px #4a90e2; }
        100% { text-shadow: 0 0 15px #00ffff, 0 0 30px #00ffff; }
      }
      
      @keyframes input-focus {
        0% { box-shadow: 0 0 0px #4a90e2; }
        50% { box-shadow: 0 0 20px #00ffff; }
        100% { box-shadow: 0 0 0px #4a90e2; }
      }
      
      @keyframes success-message-appear {
        0% { 
          transform: translate(-50%, -50%) scale(0.5);
          opacity: 0;
        }
        20% { 
          transform: translate(-50%, -50%) scale(1.2);
          opacity: 1;
        }
        40% { 
          transform: translate(-50%, -50%) scale(0.9);
          opacity: 1;
        }
        60% { 
          transform: translate(-50%, -50%) scale(1.05);
          opacity: 1;
        }
        80% { 
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
        90% { 
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
        100% { 
          transform: translate(-50%, -50%) scale(1.1);
          opacity: 0;
        }
      }
      
      .checkbox-group {
        margin: 16px 0;
      }
      
      .checkbox-label {
        display: flex;
        align-items: center;
        cursor: pointer;
      }
      
      .portal-checkbox {
        margin-right: 10px;
        width: 18px;
        height: 18px;
        cursor: pointer;
      }
      
      .portal-checkbox:checked {
        accent-color: #00ffff;
      }
      
      .portal-success-animation {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        border-radius: 50%;
        width: 200px;
        height: 200px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        color: white;
        z-index: 2000;
        box-shadow: 0 0 50px #00ffff;
        animation: success-message-appear 3s forwards;
      }
      
      .success-icon {
        font-size: 70px;
        color: #00ffff;
        text-shadow: 0 0 20px #00ffff;
        margin-bottom: 10px;
      }
      
      .success-text {
        font-size: 24px;
        font-weight: bold;
        color: white;
        text-shadow: 0 0 10px #00ffff;
        text-align: center;
      }
      
      .portal-form-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: rgba(0, 0, 0, 0.8) !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        z-index: 1000 !important;
        perspective: 1000px !important;
      }
      
      .portal-form-container {
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border: 2px solid #4a90e2;
        box-shadow: 0 0 30px rgba(74, 144, 226, 0.6);
        border-radius: 8px;
        padding: 24px;
        width: 400px;
        color: white;
        transform-style: preserve-3d;
        animation: portal-form-appear 0.5s ease-out forwards !important;
      }
      
      .portal-form-container h2 {
        margin-top: 0;
        color: #4a90e2;
        text-align: center;
        font-size: 28px;
        letter-spacing: 1px;
        animation: portal-glow 2s infinite alternate;
      }
      
      .form-group {
        margin-bottom: 16px;
        transform-style: preserve-3d;
      }
      
      .form-group label {
        display: block;
        margin-bottom: 6px;
        color: #4a90e2;
        font-weight: bold;
      }
      
      .form-group input {
        width: 100% !important;
        padding: 12px !important;
        background: rgba(0, 0, 0, 0.2) !important;
        border: 1px solid #4a90e2 !important;
        color: white !important;
        border-radius: 4px !important;
        transition: all 0.3s ease !important;
      }
      
      .portal-3d-input {
        position: relative;
        transform: translateZ(10px);
      }
      
      .form-group input:focus {
        outline: none !important;
        border-color: #00ffff !important;
        box-shadow: 0 0 10px rgba(0, 255, 255, 0.5) !important;
        animation: input-focus 2s infinite !important;
        background: rgba(0, 0, 0, 0.4) !important;
      }
      
      .form-buttons {
        display: flex;
        justify-content: space-between;
        margin-top: 24px;
      }
      
      .form-buttons button {
        padding: 10px 20px !important;
        border-radius: 4px !important;
        border: none !important;
        cursor: pointer !important;
        font-weight: bold !important;
        transition: all 0.3s ease !important;
        transform: translateZ(15px) !important;
      }
      
      .submit-button {
        background: linear-gradient(135deg, #4a90e2, #00ffff) !important;
        color: white !important;
        box-shadow: 0 5px 15px rgba(0, 255, 255, 0.3) !important;
      }
      
      .submit-button:hover {
        background: linear-gradient(135deg, #00ffff, #4a90e2) !important;
        transform: translateZ(15px) translateY(-2px) !important;
        box-shadow: 0 7px 20px rgba(0, 255, 255, 0.5) !important;
      }
      
      .cancel-button {
        background: #444 !important;
        color: white !important;
      }
      
      .cancel-button:hover {
        background: #666 !important;
        transform: translateZ(15px) translateY(-2px) !important;
      }
    `;
    document.head.appendChild(style);
  }
}

function loadPortalFrame(portalGroup, loadingManager) {
  const gltfLoader = new GLTFLoader(loadingManager);
  gltfLoader.load(
    '/assets/models/portal_frame.glb',
    function(gltf) {
      const model = gltf.scene;
      model.scale.set(0.02, 0.02, 0.02);
      
      model.traverse(function(node) {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      
      portalGroup.add(model);
    },
    null,
    function(error) {
      console.warn('Error loading portal frame model:', error);
      createBasicPortalFrame(portalGroup);
    }
  );
}

function addPortalImage(portalGroup, imageUrl, loadingManager) {
  console.log('Attempting to load portal image:', imageUrl);
  
  // If this is a blank portal (targetUrl is '#'), use blank texture
  if (imageUrl === 'assets/images/portal.jpg' && portalGroup.children[0].userData.portalURL === '#') {
    const blankTexture = createBlankTexture();
    const imageGeometry = new THREE.PlaneGeometry(4, 6.5);
    
    // Create custom shader material with more subtle parameters
    const imageMaterial = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: blankTexture },
        time: { value: 0 },
        distortionStrength: { value: 0.05 },
        glowColor: { value: new THREE.Color(0xffffff) },
        glowIntensity: { value: 0.3 }
      },
      vertexShader: portalVertexShader,
      fragmentShader: portalFragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
      depthTest: true,
      renderOrder: 1
    });
    
    // Add the material to our global array
    portalMaterials.push(imageMaterial);
    
    // Create front plane
    const frontMesh = new THREE.Mesh(imageGeometry, imageMaterial);
    frontMesh.position.z = 0.01;
    frontMesh.position.y = 4;
    frontMesh.renderOrder = 1;
    
    // Create back plane
    const backMesh = new THREE.Mesh(imageGeometry, imageMaterial);
    backMesh.position.z = -0.01;
    backMesh.position.y = 4;
    backMesh.rotation.y = Math.PI;
    backMesh.renderOrder = 1;
    
    portalGroup.add(frontMesh);
    portalGroup.add(backMesh);
    return;
  }
  
  const textureLoader = new THREE.TextureLoader(loadingManager);
  textureLoader.load(
    imageUrl,
    function(texture) {
      console.log('Successfully loaded image:', imageUrl);
      
      const isKyzoImage = imageUrl.includes('kyzo.jpeg');
      const imageGeometry = new THREE.PlaneGeometry(
        4, // width stays the same
        isKyzoImage ? 7 : 6.5  // increased height for levels from 6 to 8
      );
      
      // Create custom shader material with more subtle parameters
      const imageMaterial = new THREE.ShaderMaterial({
        uniforms: {
          map: { value: texture },
          time: { value: 0 },
          distortionStrength: { value: 0.05 },
          glowColor: { value: new THREE.Color(0xffffff) },
          glowIntensity: { value: 0.3 }
        },
        vertexShader: portalVertexShader,
        fragmentShader: portalFragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: true,
        depthTest: true,
        renderOrder: 1
      });
      
      // Add the material to our global array
      portalMaterials.push(imageMaterial);
      
      // Create front plane
      const frontMesh = new THREE.Mesh(imageGeometry, imageMaterial);
      frontMesh.position.z = 0.01;
      frontMesh.position.y = isKyzoImage ? 3.5 : 4; // Adjusted Y position for taller levels image
      frontMesh.renderOrder = 1;
      
      // Create back plane
      const backMesh = new THREE.Mesh(imageGeometry, imageMaterial);
      backMesh.position.z = -0.01;
      backMesh.position.y = isKyzoImage ? 3.5 : 4; // Adjusted Y position for taller levels image
      backMesh.rotation.y = Math.PI; // Rotate 180 degrees to face the opposite direction
      backMesh.renderOrder = 1;
      
      console.log('Created portal image meshes:', {
        geometry: imageGeometry.parameters,
        frontPosition: frontMesh.position,
        backPosition: backMesh.position,
        scale: frontMesh.scale
      });
      
      portalGroup.add(frontMesh);
      portalGroup.add(backMesh);

      // If this is a form portal, create a form texture
      // Check if portalGroup has a portalTrigger with isFormPortal flag
      const isFormPortal = portalGroup.children.length > 0 && 
                          portalGroup.children[0].userData && 
                          portalGroup.children[0].userData.isFormPortal;
                          
      if (isFormPortal) {
        // Create the input elements
        const formInputs = createPortalFormInputs(portalGroup);

        // Add a function to update input positions
        portalGroup.userData.updateFormInputs = function() {
          if (!formInputs) return;

          // Get the portal's position in screen space
          const tempV = new THREE.Vector3();
          frontMesh.getWorldPosition(tempV);
          tempV.project(window.camera);

          // Convert to screen coordinates
          const x = (tempV.x + 1) * window.innerWidth / 2;
          const y = (-tempV.y + 1) * window.innerHeight / 2;

          // Only show inputs if portal is facing camera
          const facing = frontMesh.quaternion.dot(window.camera.quaternion) > 0;
          formInputs.style.display = facing ? 'block' : 'none';

          // Position inputs
          if (facing) {
            const inputs = formInputs.getElementsByClassName('portal-input');
            const inputPositions = [140, 240, 340]; // Y positions from the canvas
            Array.from(inputs).forEach((input, i) => {
              input.style.left = `${x - 196}px`; // Half of input width
              input.style.top = `${y + inputPositions[i] - 250}px`; // Adjusted for portal height
            });
          }
        };

        // Add to animation loop
        if (typeof window !== 'undefined') {
          if (!window.formPortals) window.formPortals = [];
          window.formPortals.push(portalGroup);
        }
      }
    },
    function(xhr) {
      console.log(imageUrl + ': ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function(error) {
      console.error('Error loading portal image:', imageUrl, error);
      createFallbackPortalImage(portalGroup);
    }
  );
}

function createFallbackPortalImage(portalGroup) {
  const geometry = new THREE.PlaneGeometry(0.08, 0.13);
  const material = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = -0.001;
  mesh.position.y = 0.07;
  
  portalGroup.add(mesh);
}

function createBasicPortalFrame(portalGroup) {
  const frameGeometry = new THREE.BoxGeometry(0.1, 0.15, 0.01);
  const frameMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x8B4513,
    roughness: 0.8,
    metalness: 0.2
  });
  
  const frame = new THREE.Mesh(frameGeometry, frameMaterial);
  frame.position.y = 0.075;
  portalGroup.add(frame);
}

// Add this function to update all portal materials
export function updatePortalMaterials(deltaTime) {
  portalMaterials.forEach(material => {
    material.uniforms.time.value += deltaTime * 0.5; // Slower animation speed
  });
}

function createOfficeComputer(environment, loadingManager) {
  const gltfLoader = new GLTFLoader(loadingManager);
  gltfLoader.load(
    '/assets/models/office_computer.glb',
    function(gltf) {
      const model = gltf.scene;
      
      // Scale and position the model - make it 100x smaller
      model.scale.set(0.04, 0.04, 0.04); // Reduced from 0.5 to 0.005
      model.position.set(-25, 0, 15); // Position it near the portals
      model.rotation.y = Math.PI + Math.PI / 7; // Face towards the player and rotate 30 degrees counterclockwise
      
      // Add shadows
      model.traverse(function(node) {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      
      // Create a group to hold the model and its bounding box
      const computerGroup = new THREE.Group();
      computerGroup.add(model);
      computerGroup.position.copy(model.position);
      model.position.set(0, 0, 0); // Reset model position since it's now relative to the group
      
      // Create a larger invisible bounding box for easier clicking
      const boundingBoxSize = new THREE.Vector3(3, 3, 3); // Much larger bounding box
      const boundingBoxGeo = new THREE.BoxGeometry(boundingBoxSize.x, boundingBoxSize.y, boundingBoxSize.z);
      const boundingBoxMat = new THREE.MeshBasicMaterial({ 
        transparent: true, 
        opacity: 0.0, // Completely invisible
        wireframe: false
      });
      
      const boundingBox = new THREE.Mesh(boundingBoxGeo, boundingBoxMat);
      boundingBox.position.set(0, 1.5, 0); // Position it above the ground, centered on the computer
      
      // For debugging - can be toggled via console with: window.debugPortalComputerBoundingBox = true;
      if (typeof window !== 'undefined') {
        Object.defineProperty(window, 'debugPortalComputerBoundingBox', {
          get: function() {
            return boundingBoxMat.opacity > 0;
          },
          set: function(value) {
            console.log('Setting computer bounding box visibility to:', value);
            boundingBoxMat.opacity = value ? 0.3 : 0.0;
            boundingBoxMat.wireframe = value;
            boundingBoxMat.needsUpdate = true;
          }
        });
      }
      
      // Make the bounding box clickable
      boundingBox.userData.isClickable = true;
      boundingBox.userData.isPortalComputer = true; // Flag to identify this as the computer for opening portal form
      
      // Add the bounding box to the group
      computerGroup.add(boundingBox);
      
      // Make the entire model clickable and set it to open the portal form
      model.userData.isClickable = true;
      model.userData.isPortalComputer = true; // Flag to identify this as the computer for opening portal form
      
      // Add the group to the environment instead of just the model
      environment.add(computerGroup);
      console.log('Office computer model loaded successfully with portal form trigger and large bounding box');
      
      // Create a simple hand cursor when hovering over the computer
      document.addEventListener('mousemove', function(event) {
        // Only proceed if camera is available
        if (!window.camera) return;
        
        // Calculate mouse position in normalized device coordinates
        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Cast a ray
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, window.camera);
        
        // Check for intersection with computer or its bounding box
        const intersects = raycaster.intersectObjects([boundingBox, model], true);
        
        if (intersects.length > 0) {
          // Change cursor to pointer when hovering over computer
          document.body.style.cursor = 'pointer';
          
          // Optional: Add a helper message
          const helpMessage = document.getElementById('computer-help-message');
          if (!helpMessage) {
            const message = document.createElement('div');
            message.id = 'computer-help-message';
            message.textContent = 'Click to create a portal';
            message.style.position = 'fixed';
            message.style.bottom = '20px';
            message.style.left = '50%';
            message.style.transform = 'translateX(-50%)';
            message.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            message.style.color = 'white';
            message.style.padding = '10px 20px';
            message.style.borderRadius = '5px';
            message.style.zIndex = '1000';
            document.body.appendChild(message);
          }
        } else {
          // Reset cursor
          document.body.style.cursor = 'auto';
          
          // Remove helper message if it exists
          const helpMessage = document.getElementById('computer-help-message');
          if (helpMessage) {
            document.body.removeChild(helpMessage);
          }
        }
      });
    },
    function(xhr) {
      console.log('Office computer: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function(error) {
      console.error('Error loading office computer model:', error);
    }
  );
}

// Add this to your animation loop (in main.js)
// Update form input positions
if (window.formPortals) {
  window.formPortals.forEach(portal => {
    if (portal.userData.updateFormInputs) {
      portal.userData.updateFormInputs();
    }
  });
}

// Add global portal click handler function
export function addGlobalPortalClickHandler() {
  console.log('Adding global portal click handler');
  
  // Function to handle manual portal clicks
  window.handleManualPortalClick = function(index) {
    console.log(`Manual portal click for index ${index}`);
    
    // Find the correct portal config
    if (index >= 0 && index < portalConfigs.length) {
      const config = portalConfigs[index];
      
      // Show form for blank or form portals
      if (config.isFormPortal || config.targetUrl === '#') {
        console.log('Opening form for blank portal');
        
        // Show form with a slight delay to allow any animations
        setTimeout(() => {
          showPortalForm((formData) => {
            console.log('Form submitted:', formData);
            
            // Show success animation
            const successAnimation = document.createElement('div');
            successAnimation.className = 'portal-success-animation';
            successAnimation.innerHTML = `
              <div class="success-icon">✓</div>
              <div class="success-message">Portal request was submitted</div>
            `;
            document.body.appendChild(successAnimation);
            
            // Remove the animation after it completes
            setTimeout(() => {
              successAnimation.remove();
            }, 2000);
            
            // Update the portal config
            if (formData.url) {
              portalConfigs[index].targetUrl = formData.url;
            }
            
            trackEvent('portal_form_submitted', formData);
          });
        }, 100);
      } else {
        // Regular portal - open URL
        window.open(config.targetUrl, '_blank');
        
        trackEvent('portal_clicked', {
          portal_url: config.targetUrl,
          portal_name: config.targetUrl.split('/')[2] || 'unknown'
        });
      }
    }
  }; // End of handleManualPortalClick function
  
  // Add button overlay to the page for all blank portals
  portalConfigs.forEach((config, index) => {
    if (config.isFormPortal || config.targetUrl === '#') {
      const portalButton = document.createElement('button');
      portalButton.className = 'portal-click-overlay';
      portalButton.setAttribute('data-portal-index', index);
      portalButton.style.cssText = `
        position: fixed;
        background: transparent;
        border: none;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        cursor: pointer;
        z-index: 100;
        opacity: 0.1;
        pointer-events: auto;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      `;
      
      // Position will be updated in animation loop
      document.body.appendChild(portalButton);
      
      // Add click handler
      portalButton.addEventListener('click', () => {
        window.handleManualPortalClick(index);
      });
      
      // Store reference to update position
      if (!window.portalButtons) window.portalButtons = [];
      window.portalButtons.push({
        button: portalButton,
        portalIndex: index,
        config: config
      });
    }
  });
  
  // Add CSS for portal overlays
  const overlayStyles = document.createElement('style');
  overlayStyles.textContent = `
    .portal-click-overlay:hover {
      opacity: 0.5 !important;
      box-shadow: 0 0 20px #00ffff !important;
    }
  `;
  document.head.appendChild(overlayStyles);
}

// Function to update portal button positions
export function updatePortalClickOverlays(camera) {
  if (window.portalButtons && window.portalButtons.length > 0) {
    window.portalButtons.forEach(item => {
      const { button, config } = item;
      
      // Create a temporary vector to hold portal position
      const tempVector = new THREE.Vector3(
        config.position.x,
        config.position.y + 4, // Add height offset to target middle of portal
        config.position.z
      );
      
      // Project position to screen space
      tempVector.project(camera);
      
      // Convert to screen coordinates
      const x = (tempVector.x + 1) * window.innerWidth / 2;
      const y = (-tempVector.y + 1) * window.innerHeight / 2;
      
      // Position the button
      button.style.left = `${x}px`;
      button.style.top = `${y}px`;
      
      // Show only if in front of camera
      const isFrontFacing = tempVector.z < 1;
      button.style.display = isFrontFacing ? 'block' : 'none';
    });
  }
} 