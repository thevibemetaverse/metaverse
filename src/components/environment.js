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
    }, 'Submit Portal Application'),
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
          
          // Use the consolidated success notification
          showSuccessNotification();
          
          onSubmit(formData);
        })
        .catch(error => {
          // Create enhanced success message
          const successMessage = document.createElement('div');
          successMessage.className = 'portal-success-message';
          successMessage.innerHTML = `
            <div class="success-container">
              <div class="success-icon">✓</div>
              <div class="success-text">
                <h3>Portal Submitted Successfully!</h3>
                <p>Your portal request has been received and will be reviewed soon.</p>
              </div>
            </div>
          `;
          document.body.appendChild(successMessage);
          
          // Add CSS styles for the enhanced success message
          const style = document.createElement('style');
          style.textContent = `
            .portal-success-message {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background-color: rgba(0, 128, 0, 0.9);
              color: white;
              padding: 20px;
              border-radius: 10px;
              box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
              z-index: 10000;
              text-align: center;
              animation: portal-success-appear 0.5s ease-out forwards, 
                         portal-success-glow 2s infinite alternate;
              max-width: 80%;
            }
            
            @keyframes portal-success-appear {
              0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8);
              }
              100% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
              }
            }
            
            @keyframes portal-success-glow {
              0% {
                box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
              }
              100% {
                box-shadow: 0 0 30px rgba(0, 255, 0, 0.8);
              }
            }
            
            .success-container {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 20px;
            }
            
            .success-icon {
              font-size: 48px;
              height: 80px;
              width: 80px;
              background-color: rgba(255, 255, 255, 0.2);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #00ff00;
              text-shadow: 0 0 10px #00ff00;
              animation: success-icon-pulse 1.5s infinite alternate;
            }
            
            @keyframes success-icon-pulse {
              0% {
                transform: scale(1);
                text-shadow: 0 0 10px #00ff00;
              }
              100% {
                transform: scale(1.1);
                text-shadow: 0 0 20px #00ff00;
              }
            }
            
            .success-text h3 {
              margin: 0 0 10px 0;
              font-size: 24px;
              font-weight: bold;
            }
            
            .success-text p {
              margin: 0;
              font-size: 16px;
              opacity: 0.9;
            }
          `;
          document.head.appendChild(style);
          
          // Create confetti effect
          createConfettiEffect();
          
          // Remove success message after 4 seconds
          setTimeout(() => {
            successMessage.style.animation = 'portal-success-disappear 0.5s ease-in forwards';
            
            // Add disappear animation
            const disappearStyle = document.createElement('style');
            disappearStyle.textContent = `
              @keyframes portal-success-disappear {
                0% {
                  opacity: 1;
                  transform: translate(-50%, -50%) scale(1);
                }
                100% {
                  opacity: 0;
                  transform: translate(-50%, -50%) scale(0.8);
                }
              }
            `;
            document.head.appendChild(disappearStyle);
            
            // Remove element after animation completes
            setTimeout(() => {
              successMessage.remove();
              style.remove();
              disappearStyle.remove();
            }, 500);
          }, 4000);
          
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
export let isPortalFormOpen = false;

// Make it available globally so other modules can access it
if (typeof window !== 'undefined') {
  window.isPortalFormOpen = false;
}

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
    const url = new URL(portalUrl);
    // Only add avatar_url if it doesn't already exist in the URL
    if (!url.searchParams.has('avatar_url')) {
        url.searchParams.append('avatar_url', 'https://metaverse-delta.vercel.app/assets/models/metaverse-explorer.glb');
    }
    return url.toString();
}

// Function to ensure URL has https://
function ensureHttps(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
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
    position: { x: 5, z: 15, y: 0 },  // Leftmost portal (chess)
    rotation: 0,
    imageUrl: 'assets/images/kyzo.jpeg',
    targetUrl: addAvatarToPortalUrl(`http://quack.kyzo.io//?username=${getUsernameFromUrl()}&ref=https://metaverse-delta.vercel.app&portal=true`),
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
    position: { x: 25, z: -15, y: 0 },  // Second from right (yacht)
    rotation: 0,
    imageUrl: 'assets/images/getitspinning.png',
    targetUrl: 'https://www.getitspinning.com/',
    scale: 1.0
  },
  {
    position: { x: 35, z: -15, y: 0 },  // Second from right (yacht)
    rotation: 0,
    imageUrl: 'assets/images/playable.png',
    targetUrl: 'https://playable.lol/',
    scale: 1.0
  },
  {
    position: { x: 45, z: -15, y: 0 },  // Second from right (yacht)
    rotation: 0,
    imageUrl: 'assets/images/fart-surfer.jpeg',
    targetUrl: 'https://www.fart-surfer.com/',
    scale: 1.0
  },
  {
    position: { x: 55, z: -15, y: 0 },  // Second from right (yacht)
    rotation: 0,
    imageUrl: 'assets/images/boatrace3d.jpg',
    targetUrl: 'https://boatrace3d.com/',
    scale: 1.0
  },
  {
    position: { x: 65, z: -15, y: 0 },  // Second from right (yacht)
    rotation: 0,
    imageUrl: 'assets/images/neonrequiem.png',
    targetUrl: 'https://aialchemistart.github.io/NeonRequiem/',
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
    position: { x: -25, z: -22, y: 0 },  // Roostervibes portal
    rotation: Math.PI / 2,
    imageUrl: 'assets/images/rooster.jpg',
    targetUrl: addAvatarToPortalUrl(`https://play.roostervibes.farm/?username=${getUsernameFromUrl()}&ref=https://metaverse-delta.vercel.app&portal=true`),
    scale: 1.0,
  },
  {
    position: { x: -25, z: -32, y: 0 },  // Fourth desk portal (left side)
    rotation: Math.PI / 2,  // Face towards the desk
    imageUrl: 'assets/images/jet-ski.jpg',
    targetUrl: 'https://jetski.cemilsevim.com',
    scale: 1.0,
  },
  {
    position: { x: -25, z: -42, y: 0 },  // Fifth desk portal (left side)
    rotation: Math.PI / 2,  // Face towards the desk
    imageUrl: 'assets/images/tidefall.jpeg',
    targetUrl: 'https://tidefall.io',
    scale: 1.0,
  },
  {
    position: { x: -25, z: -52, y: 0 },  // Fifth desk portal (left side)
    rotation: Math.PI / 2,  // Face towards the desk
    imageUrl: 'assets/images/auto-boss.png',
    targetUrl: 'https://auto-boss.vercel.app/',
    scale: 1.0,
  },
  ...(new URLSearchParams(window.location.search).get('portal') === 'true' ? [{
    position: { x: 0, z: -35, y: 0 },  // Portal behind the user
    rotation: Math.PI,  // Rotate 180 degrees to face the user
    imageUrl: 'assets/images/portal.jpg',
    targetUrl: `${ensureHttps(encodeURIComponent(new URLSearchParams(window.location.search).get('ref')))}?avatar_url=${encodeURIComponent(new URLSearchParams(window.location.search).get('avatar_url'))}&username=${getUsernameFromUrl()}`,
    scale: 1.0
  }] : [])
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
  exitPortalGroup.position.set(-12, 5, 15); // Position next to the fly.pieter portal
  exitPortalGroup.rotation.x = 0.35;
  exitPortalGroup.rotation.y = 0; // Face the same direction as the other portals
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
  const portalTriggerGeometry = new THREE.BoxGeometry(20, 20, 20);
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
  window.exitPortalBox = exitPortalBox; // Store for collision detection

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

// Function to increment portal counter
async function incrementPortalCounter(portalURL) {
  console.log('Attempting to increment portal counter for URL:', portalURL);
  try {
    // Determine server URL based on environment
    const isLocalDevelopment = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1';
    const serverUrl = isLocalDevelopment
      ? 'http://localhost:3000'
      : 'https://metaverse-production-821f.up.railway.app';
    
    console.log(`Using server URL: ${serverUrl}`);
    
    const response = await fetch(`${serverUrl}/portal-counter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        portalURL: portalURL
      })
    });

    if (!response.ok) {
      console.error('Failed to increment counter. Response status:', response.status);
      throw new Error('Failed to increment counter');
    }

    const data = await response.json();
    console.log('Portal counter increment successful. New count:', data.count);
    return data.count;
  } catch (error) {
    console.error('Error incrementing portal counter:', error);
    return null;
  }
}

// Function to get current portal count
async function getPortalCount(portalURL) {
  try {
    // Determine server URL based on environment
    const isLocalDevelopment = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1';
    const serverUrl = isLocalDevelopment
      ? 'http://localhost:3000'
      : 'https://metaverse-production-821f.up.railway.app';
      
    const response = await fetch(`${serverUrl}/portal-counter?portalURL=${encodeURIComponent(portalURL)}`);
    
    if (!response.ok) {
      throw new Error('Failed to get counter');
    }

    const data = await response.json();
    return data.count;
  } catch (error) {
    console.error('Error getting portal count:', error);
    return null;
  }
}

// Function to handle portal entry
async function handlePortalEntry(portalGroup) {
  if (!portalGroup || !portalGroup.children[0] || !portalGroup.children[0].userData) {
    console.error('Invalid portalGroup or missing userData');
    return;
  }

  const portalURL = portalGroup.children[0].userData.portalURL;
  if (!portalURL) {
    console.error('No portalURL found in userData');
    return;
  }

  // Increment the counter
  const newCount = await incrementPortalCounter(portalURL);
  
  if (newCount !== null) {
    // Update the counter display
    updateCounterDisplay(portalGroup, newCount);
  } else {
    console.error('Failed to update counter display - newCount is null');
  }
}

// Function to initialize portal counters
export async function initializePortalCounters() {
  console.log('PORTAL: Initializing portal counters...');
  
  // Wait for scene to be available
  let attempts = 0;
  const maxAttempts = 30; // Increase to allow more time for both scene and socket
  while (!window.scene && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }

  // Find all portal groups in the scene
  if (!window.scene) {
    console.error('PORTAL: Scene not available for portal counter initialization after', maxAttempts, 'attempts');
    return;
  }

  // Wait for socket to be available with a timeout
  attempts = 0;
  let socketAvailable = false;
  
  // Try to wait for socket connection but proceed even if not available
  while (!window.socket && attempts < 20) {
    console.log('PORTAL: Waiting for socket to be available...', attempts + 1);
    await new Promise(resolve => setTimeout(resolve, 300)); // Longer delay for socket connection
    attempts++;
  }
  
  if (!window.socket) {
    console.warn('PORTAL: Socket not available for portal counter initialization - will use fallback mode');
    // Set fallback mode - display "0" for all counters
    setFallbackCounters();
    return;
  }

  // Try to set up socket connection with a timeout
  try {
    // Set a timeout for the whole socket setup process
    const socketSetupPromise = new Promise(async (resolve) => {
      // Check socket connection status
      if (!window.socket.connected) {
        console.log('PORTAL: Socket exists but not connected yet. Waiting for connection...');
        
        // Wait for socket to connect if it exists but isn't connected
        const socketConnectPromise = new Promise((connectResolve) => {
          // Set a timeout to prevent hanging indefinitely
          const timeout = setTimeout(() => {
            console.warn('PORTAL: Socket connection timeout - proceeding anyway');
            connectResolve(false); // Resolve with false indicating timeout
          }, 5000); // Reduced timeout for faster fallback
          
          // If socket connects, resolve
          const onConnect = () => {
            clearTimeout(timeout);
            window.socket.off('connect', onConnect);
            connectResolve(true); // Connected successfully
          };
          
          // If already connected, resolve immediately
          if (window.socket.connected) {
            clearTimeout(timeout);
            connectResolve(true);
          } else {
            // Otherwise wait for connect event
            window.socket.on('connect', onConnect);
          }
        });
        
        socketAvailable = await socketConnectPromise;
      } else {
        socketAvailable = true;
      }
      
      resolve(socketAvailable);
    });
    
    // Wait for socket setup with overall timeout
    const socketSetupSuccess = await Promise.race([
      socketSetupPromise,
      new Promise(resolve => setTimeout(() => resolve(false), 8000)) // Overall timeout
    ]);
    
    if (!socketSetupSuccess) {
      console.warn('PORTAL: Socket setup timed out - using fallback mode');
      setFallbackCounters();
      return;
    }
    
    console.log('PORTAL: Socket connection wait complete, status:', window.socket.connected);
  } catch (error) {
    console.error('PORTAL: Error during socket setup:', error);
    setFallbackCounters();
    return;
  }
  
  if (!socketAvailable) {
    console.warn('PORTAL: Socket connection failed - using fallback mode');
    setFallbackCounters();
    return;
  }
  
  console.log('PORTAL: Setting up counter listeners');
  
  try {
    // Remove any existing listeners to prevent duplicates
    if (window.socket) {
      window.socket.off('portal-count-update');
      window.socket.off('portal-counts');
      
      // Listen for portal count updates
      window.socket.on('portal-count-update', ({ portalURL, count }) => {
        console.log(`PORTAL: Received count update for ${portalURL}: ${count}`);
        // Find the portal group with this URL and update its counter
        window.scene.traverse((object) => {
          if (object.userData && object.userData.isPortal && object.userData.portalURL === portalURL) {
            const portalGroup = object.parent;
            updateCounterDisplay(portalGroup, count);
          }
        });
      });

      // Listen for initial portal counts
      window.socket.on('portal-counts', (portalCounts) => {
        console.log('PORTAL: Received initial portal counts:', portalCounts);
        Object.entries(portalCounts).forEach(([portalURL, count]) => {
          window.scene.traverse((object) => {
            if (object.userData && object.userData.isPortal && object.userData.portalURL === portalURL) {
              const portalGroup = object.parent;
              updateCounterDisplay(portalGroup, count);
            }
          });
        });
      });
      
      // Request initial portal counts from server if connected
      if (window.socket.connected) {
        window.socket.emit('get-portal-counts');
        console.log('PORTAL: Requested initial portal counts from server');
      } else {
        console.log('PORTAL: Socket not connected, will request counts when connected');
        // Setup a one-time connect handler to request counts when connection is established
        window.socket.once('connect', () => {
          window.socket.emit('get-portal-counts');
          console.log('PORTAL: Requested initial portal counts after connection');
        });
      }
    }
  } catch (error) {
    console.error('PORTAL: Error setting up counter listeners:', error);
    setFallbackCounters();
  }
}

// Function to set fallback zero counters when socket is unavailable
function setFallbackCounters() {
  console.log('PORTAL: Setting fallback zero counters for all portals');
  
  // Find all portals in the scene and set their counter to zero
  if (window.scene) {
    window.scene.traverse((object) => {
      if (object.userData && object.userData.isPortal) {
        const portalGroup = object.parent;
        updateCounterDisplay(portalGroup, 0);
      }
    });
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

      // Add counter image above portal
      addCounterImage(portalGroup);

      // If this is a form portal, create a form texture
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
            
            // Show enhanced success animation
            const successAnimation = document.createElement('div');
            successAnimation.className = 'portal-success-animation';
            successAnimation.innerHTML = `
              <div class="success-container">
                <div class="success-icon">✓</div>
                <div class="success-text">
                  <h3>Portal Submitted Successfully!</h3>
                  <p>Your portal request has been received and will be reviewed soon.</p>
                </div>
              </div>
            `;
            document.body.appendChild(successAnimation);
            
            // Add styles for the success animation
            const successStyle = document.createElement('style');
            successStyle.textContent = `
              .portal-success-animation {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: rgba(0, 128, 0, 0.9);
                color: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
                z-index: 10000;
                text-align: center;
                animation: portal-success-appear 0.5s ease-out forwards,
                           portal-success-glow 2s infinite alternate;
                max-width: 80%;
              }
              
              @keyframes portal-success-appear {
                0% {
                  opacity: 0;
                  transform: translate(-50%, -50%) scale(0.8);
                }
                100% {
                  opacity: 1;
                  transform: translate(-50%, -50%) scale(1);
                }
              }
              
              @keyframes portal-success-glow {
                0% {
                  box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
                }
                100% {
                  box-shadow: 0 0 30px rgba(0, 255, 0, 0.8);
                }
              }
              
              .success-container {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 20px;
              }
              
              .success-icon {
                font-size: 48px;
                height: 80px;
                width: 80px;
                background-color: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #00ff00;
                text-shadow: 0 0 10px #00ff00;
                animation: success-icon-pulse 1.5s infinite alternate;
              }
              
              @keyframes success-icon-pulse {
                0% {
                  transform: scale(1);
                  text-shadow: 0 0 10px #00ff00;
                }
                100% {
                  transform: scale(1.1);
                  text-shadow: 0 0 20px #00ff00;
                }
              }
              
              .success-text h3 {
                margin: 0 0 10px 0;
                font-size: 24px;
                font-weight: bold;
              }
              
              .success-text p {
                margin: 0;
                font-size: 16px;
                opacity: 0.9;
              }
            `;
            document.head.appendChild(successStyle);
            
            // Create confetti effect
            createConfettiEffect();
            
            // Remove the animation after it completes with fade-out effect
            setTimeout(() => {
              successAnimation.style.animation = 'portal-success-disappear 0.5s ease-in forwards';
              
              // Add disappear animation
              const disappearStyle = document.createElement('style');
              disappearStyle.textContent = `
                @keyframes portal-success-disappear {
                  0% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                  }
                  100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                  }
                }
              `;
              document.head.appendChild(disappearStyle);
              
              // Remove elements after animation completes
              setTimeout(() => {
                successAnimation.remove();
                successStyle.remove();
                disappearStyle.remove();
              }, 500);
            }, 4000);
            
            // Update the portal config
            if (formData.url) {
              portalConfigs[index].targetUrl = formData.url;
            }
            
            trackEvent('portal_form_submitted', formData);
          });
        }, 100);
      } else {
        // Regular portal - open URL
        console.log('Portal URL clicked but not opening:', config.targetUrl);
        // window.open(config.targetUrl, '_blank');
        
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

// Function to update counter display
function updateCounterDisplay(portalGroup, count) {
  console.log('updateCounterDisplay called with count:', count);
  console.log('Portal group:', portalGroup);
  
  // Find the number mesh in the portal group
  let numberMesh = null;
  portalGroup.traverse((child) => {
    if (child.userData && child.userData.isCounterNumber) {
      console.log('Found counter number mesh:', child);
      numberMesh = child;
    }
  });

  if (!numberMesh) {
    console.error('No counter number mesh found in portal group');
    return;
  }

  console.log('Updating counter display for mesh:', numberMesh);
  
  // Create new canvas for the updated number
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 512;
  canvas.height = 512;
  
  // Fill with transparent background
  context.fillStyle = 'rgba(0, 0, 0, 0)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add the updated number
  context.fillStyle = '#01579b';
  context.font = 'bold 150px Arial';
  context.textAlign = 'right';
  context.textBaseline = 'middle';
  context.fillText(count.toString(), canvas.width - 50, canvas.height / 2);
  
  // Update the texture
  const numberTexture = new THREE.CanvasTexture(canvas);
  numberMesh.material.map = numberTexture;
  numberMesh.material.needsUpdate = true;
  
  console.log('Counter display updated successfully');
}

// Add function to create counter image above portal
function addCounterImage(portalGroup) {
  console.log('Adding counter image to portal group:', portalGroup);
  
  // Create a plane geometry for the counter image
  const counterGeometry = new THREE.PlaneGeometry(2, 2);
  
  // Create canvas for the number
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 512;
  canvas.height = 512;
  
  // Fill with transparent background
  context.fillStyle = 'rgba(0, 0, 0, 0)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add the number "0" with smaller font size
  context.fillStyle = '#01579b';
  context.font = 'bold 150px Arial';
  context.textAlign = 'right';
  context.textBaseline = 'middle';
  context.fillText('0', canvas.width - 50, canvas.height / 2);
  
  // Create number texture
  const numberTexture = new THREE.CanvasTexture(canvas);
  
  // Load the counter image texture
  const textureLoader = new THREE.TextureLoader();
  console.log('Loading counter image texture...');
  textureLoader.load('/assets/images/counter.png', (texture) => {
    console.log('Counter image texture loaded successfully');
    
    // Create a container group for the counter that will maintain standard orientation
    const counterContainer = new THREE.Group();
    
    // Create the counter mesh with the counter image
    const counterMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });
    const counterMesh = new THREE.Mesh(counterGeometry, counterMaterial);
    
    // Create the number mesh
    const numberMaterial = new THREE.MeshBasicMaterial({
      map: numberTexture,
      transparent: true,
      side: THREE.DoubleSide
    });
    const numberMesh = new THREE.Mesh(counterGeometry, numberMaterial);
    numberMesh.userData.isCounterNumber = true; // Add flag to identify this mesh
    
    // Position counter above portal in local space
    counterMesh.position.y = 9;
    numberMesh.position.y = 9;
    
    // Check portal's rotation and adjust counter position and rotation accordingly
    if (Math.abs(portalGroup.rotation.y - Math.PI / 2) < 0.01) {
      // For portals facing right (90 degrees)
      counterMesh.position.x = -0.5;
      counterMesh.rotation.y = -2 * Math.PI;
      numberMesh.position.x = -0.5;
      numberMesh.rotation.y = -2 * Math.PI;
    } else if (Math.abs(portalGroup.rotation.y - Math.PI) < 0.01) {
      // For portals facing backward (180 degrees)
      counterMesh.position.z = 0.5;
      counterMesh.rotation.y = 0;
      numberMesh.position.z = 0.5;
      numberMesh.rotation.y = 0;
    } else {
      // For portals facing forward (0 degrees)
      counterMesh.position.z = -0.5;
      counterMesh.rotation.y = Math.PI;
      numberMesh.position.z = -0.5;
      numberMesh.rotation.y = Math.PI;
    }
    
    // Add both meshes to container
    counterContainer.add(counterMesh);
    counterContainer.add(numberMesh);
    
    // Add container to portal group
    portalGroup.add(counterContainer);
    console.log('Counter container added to portal group');

    // Store portal URL in the counter container for reference
    if (portalGroup.children[0] && portalGroup.children[0].userData) {
      counterContainer.userData.portalURL = portalGroup.children[0].userData.portalURL;
      console.log('Stored portal URL in counter container:', counterContainer.userData.portalURL);
    }
  });
}

// Function to show the portal form
export function showPortalForm(onSubmit) {
  if (isPortalFormOpen) return;
  isPortalFormOpen = true;
  
  // Create portal form container
  const portalFormContainer = document.createElement('div');
  portalFormContainer.className = 'portal-form-overlay';
  document.body.appendChild(portalFormContainer);
  
  // Create a root for React rendering
  const root = ReactDOM.createRoot(portalFormContainer);
  
  // Render the PortalForm component
  root.render(
    React.createElement(PortalForm, {
      onSubmit: (formData) => {
        // Close the form
        root.unmount();
        document.body.removeChild(portalFormContainer);
        isPortalFormOpen = false;
        
        // Call the onSubmit callback with the form data
        if (typeof onSubmit === 'function') {
          onSubmit(formData);
        }
      },
      onCancel: () => {
        // Close the form
        root.unmount();
        document.body.removeChild(portalFormContainer);
        isPortalFormOpen = false;
      }
    })
  );
}

// Function to check if player is entering a portal
export function checkPortalEntry(playerAvatar) {
  if (!playerAvatar || !window.scene || isPortalFormOpen) return;

  // Detect if on mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                 (window.innerWidth <= 800 && window.innerHeight <= 900);
  
  // Get player position
  const playerPosition = new THREE.Vector3();
  playerAvatar.getWorldPosition(playerPosition);

  // Check if mobile entry button already exists
  const existingButton = document.getElementById('mobile-portal-button');
  
  // Check all portals in the scene
  window.scene.traverse((object) => {
    if (object.userData && object.userData.isPortal && object.userData.portalURL) {
      const portalGroup = object.parent;
      const portalPosition = new THREE.Vector3();
      object.getWorldPosition(portalPosition);
      
      // Check distance to portal - use a larger distance for mobile
      const entryDistance = isMobile ? 4 : 2; // Doubled distance for mobile
      const distance = playerPosition.distanceTo(portalPosition);
      
      // If player is close enough to portal, consider it an entry
      if (distance < entryDistance) {
        // Increment the counter
        handlePortalEntry(portalGroup);
        
        // For mobile devices, show a tap button to navigate to the portal
        if (isMobile && object.userData.portalURL !== '#') {
          // Check if this portal was recently opened
          if (!window.lastPortalOpenTimes) {
            window.lastPortalOpenTimes = {};
          }
          
          const portalURL = object.userData.portalURL;
          const lastOpenTime = window.lastPortalOpenTimes[portalURL] || 0;
          const now = Date.now();
          
          // Only show button if it hasn't been opened in the last 5 seconds and button doesn't exist
          if (now - lastOpenTime > 5000 && !existingButton) {
            console.log('Mobile: Creating button for portal URL:', portalURL);
            window.lastPortalOpenTimes[portalURL] = now;
            
            // Create a big, visible button for mobile users
            const portalButton = document.createElement('a');
            portalButton.id = 'mobile-portal-button';
            portalButton.href = portalURL;
            portalButton.target = '_blank';
            portalButton.rel = 'noopener noreferrer';
            portalButton.textContent = 'Enter Portal';
            portalButton.style.cssText = `
              position: fixed;
              bottom: 20%;
              left: 50%;
              transform: translateX(-50%);
              background-color: #4CAF50;
              color: white;
              padding: 20px 40px;
              font-size: 24px;
              font-weight: bold;
              text-decoration: none;
              border-radius: 10px;
              box-shadow: 0 0 20px rgba(0, 255, 0, 0.8);
              z-index: 10000;
              animation: pulse-button 1.5s infinite alternate;
              text-align: center;
              min-width: 200px;
            `;
            
            // Add pulsing animation
            const buttonStyle = document.createElement('style');
            buttonStyle.textContent = `
              @keyframes pulse-button {
                0% {
                  transform: translateX(-50%) scale(1);
                  box-shadow: 0 0 20px rgba(0, 255, 0, 0.8);
                }
                100% {
                  transform: translateX(-50%) scale(1.1);
                  box-shadow: 0 0 30px rgba(0, 255, 0, 1);
                }
              }
            `;
            document.head.appendChild(buttonStyle);
            document.body.appendChild(portalButton);
            
            // Remove the button after 15 seconds if not clicked
            setTimeout(() => {
              if (document.getElementById('mobile-portal-button')) {
                document.body.removeChild(portalButton);
                document.head.removeChild(buttonStyle);
              }
            }, 15000);
          } else {
            console.log('Mobile: Ignoring repeated portal open attempt or button already exists');
          }
        } else if (!isMobile && object.userData.portalURL !== '#') {
          // On desktop, we can optionally open the URL directly from here
          // but we'll let main.js collision detection handle it
          console.log('Desktop portal entry detected for:', object.userData.portalURL);
        }
      }
    }
  });
}

// Function to create the environment
export function createEnvironment(scene, mainCamera, loadingManager = new THREE.LoadingManager()) {
  // Store camera reference for dragging
  camera = mainCamera;
  
  // Create a group to hold all environment objects
  const environment = new THREE.Group();
  scene.add(environment);
  
  // Add ground plane
  const groundGeometry = new THREE.PlaneGeometry(200, 200);
  const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x4CAF50,
    roughness: 0.8,
    metalness: 0.2
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.userData.isGround = true; // Flag for collision detection
  environment.add(ground);
  
  // Add ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  environment.add(ambientLight);
  
  // Add directional light for shadows
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(20, 30, 10);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  environment.add(directionalLight);
  
  // Add hills in the background
  createHills(environment);
  
  // Add landmarks - Eiffel Tower and Sagrada Familia
  createEiffelTower(environment, loadingManager);
  createSagradaFamilia(environment, loadingManager);
  
  // Add London phone box
  createLondonPhoneBox(environment, loadingManager);
  
  // Create portals based on configurations
  portalConfigs.forEach((config, index) => {
    // Create portal group to hold frame and image
    const portalGroup = new THREE.Group();
    portalGroup.position.set(config.position.x, config.position.y, config.position.z);
    portalGroup.rotation.y = config.rotation;
    portalGroup.scale.set(config.scale, config.scale, config.scale);
    
    // Create invisible plane for portal detection
    const portalGeometry = new THREE.PlaneGeometry(8, 12); // Increased size
    const portalMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const portal = new THREE.Mesh(portalGeometry, portalMaterial);
    portal.userData.isPortal = true;
    portal.userData.portalURL = config.targetUrl;
    portal.userData.portalIndex = index;
    portal.userData.isFormPortal = config.isFormPortal || config.targetUrl === '#';
    portal.position.y = 2; // Lowered to be more accessible
    portalGroup.add(portal);
    
    // Load portal frame model
    loadPortalFrame(portalGroup, loadingManager);
    
    // Add portal image
    addPortalImage(portalGroup, config.imageUrl, loadingManager);
    
    // Add portal to environment
    environment.add(portalGroup);
  });
  
  // Create exit portal
  createExitPortal(scene);
  
  // Add office computer
  createOfficeComputer(environment, loadingManager);
  
  return environment;
}

// Function to create hills in the background
function createHills(environment) {
  // Create several hills with different sizes and positions
  // Using more vibrant, stylized colors similar to the Horizon Worlds image
  const hillColors = [0x8AE68A, 0x9EEE9E, 0xB0F7B0];
  
  // Create a series of large, rounded hills
  for (let i = 0; i < 40; i++) {
    // Use spheres cut in half to create smooth, rounded hills
    const radius = 50 + Math.random() * 100; // Very large radius for big fluffy hills
    
    // Create a hemisphere by scaling a sphere
    const hillGeometry = new THREE.SphereGeometry(radius, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const hillMaterial = new THREE.MeshStandardMaterial({
      color: hillColors[Math.floor(Math.random() * hillColors.length)],
      roughness: 0.6,
      metalness: 0.1,
      flatShading: false // Smooth shading for soft appearance
    });
    
    const hill = new THREE.Mesh(hillGeometry, hillMaterial);
    
    // Position hills in a circle around the scene at a distance
    const angle = (i / 40) * Math.PI * 2;
    const baseDistance = 320 + Math.random() * 80;
    // Vary distance more for some hills to create layered effect
    const distance = baseDistance - Math.random() * 40;
    
    hill.position.x = Math.cos(angle) * distance;
    hill.position.z = Math.sin(angle) * distance;
    hill.position.y = -10; // Slightly buried
    
    // Random rotation for variety
    hill.rotation.y = Math.random() * Math.PI * 2;
    
    // Scale to make hills wider than tall for that fluffy look
    const scaleX = 1.0 + Math.random() * 0.5;
    const scaleZ = 1.0 + Math.random() * 0.5;
    hill.scale.set(scaleX, 0.7, scaleZ); // Flatter on Y-axis
    
    // Add hill to the environment
    hill.receiveShadow = true;
    hill.castShadow = true;
    environment.add(hill);
    
    // Add overlapping hills to create more complex shapes and smoother transitions
    if (Math.random() > 0.3) { // 70% chance of adding an overlapping hill
      const secondRadius = 30 + Math.random() * 70;
      
      const secondHillGeometry = new THREE.SphereGeometry(secondRadius, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const secondHillMaterial = new THREE.MeshStandardMaterial({
        color: hillColors[Math.floor(Math.random() * hillColors.length)],
        roughness: 0.6,
        metalness: 0.1,
        flatShading: false
      });
      
      const secondHill = new THREE.Mesh(secondHillGeometry, secondHillMaterial);
      
      // Position the second hill partially overlapping with the first
      const offsetDistance = distance - (10 + Math.random() * 25);
      const offsetAngle = angle + (Math.random() * 0.2 - 0.1);
      
      secondHill.position.x = Math.cos(offsetAngle) * offsetDistance;
      secondHill.position.z = Math.sin(offsetAngle) * offsetDistance;
      secondHill.position.y = -5; // Slightly higher for variation
      
      // Scale similarly to first hill
      const scaleX2 = 1.0 + Math.random() * 0.7;
      const scaleZ2 = 1.0 + Math.random() * 0.7;
      secondHill.scale.set(scaleX2, 0.6, scaleZ2);
      
      secondHill.receiveShadow = true;
      secondHill.castShadow = true;
      environment.add(secondHill);
    }
  }
  
  // Add a few extra large hills in key positions for landmark effect
  for (let i = 0; i < 8; i++) {
    const landmarkRadius = 120 + Math.random() * 40;
    const landmarkGeometry = new THREE.SphereGeometry(landmarkRadius, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    const landmarkMaterial = new THREE.MeshStandardMaterial({
      color: hillColors[Math.floor(Math.random() * hillColors.length)],
      roughness: 0.6,
      metalness: 0.1,
      flatShading: false
    });
    
    const landmarkHill = new THREE.Mesh(landmarkGeometry, landmarkMaterial);
    
    // Place these at specific angles for best visual effect
    const landmarkAngle = (i / 8) * Math.PI * 2;
    const landmarkDistance = 480; // Further back
    
    landmarkHill.position.x = Math.cos(landmarkAngle) * landmarkDistance;
    landmarkHill.position.z = Math.sin(landmarkAngle) * landmarkDistance;
    landmarkHill.position.y = -30;
    
    // Scale to make them extra wide
    landmarkHill.scale.set(1.6, 0.7, 1.6);
    
    landmarkHill.receiveShadow = true;
    landmarkHill.castShadow = true;
    environment.add(landmarkHill);
  }
}

// Add new function for confetti effect
function createConfettiEffect() {
  const confettiContainer = document.createElement('div');
  confettiContainer.className = 'confetti-container';
  document.body.appendChild(confettiContainer);
  
  // Confetti styles
  const confettiStyle = document.createElement('style');
  confettiStyle.textContent = `
    .confetti-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
    }
    
    .confetti {
      position: absolute;
      width: 10px;
      height: 10px;
      background-color: #f00;
      opacity: 0;
      animation: confetti-fall 4s ease-out forwards;
    }
    
    @keyframes confetti-fall {
      0% {
        transform: translateY(-10px) rotate(0deg);
        opacity: 1;
      }
      100% {
        transform: translateY(100vh) rotate(720deg);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(confettiStyle);
  
  // Create confetti pieces
  const colors = ['#00ff00', '#00cc00', '#99ff99', '#ccffcc', '#ffffff'];
  const shapes = ['square', 'circle'];
  
  for (let i = 0; i < 80; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    
    // Random position
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.top = '0';
    
    // Random color
    const color = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.backgroundColor = color;
    
    // Random shape
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    if (shape === 'circle') {
      confetti.style.borderRadius = '50%';
    }
    
    // Random size
    const size = Math.random() * 6 + 4;
    confetti.style.width = size + 'px';
    confetti.style.height = size + 'px';
    
    // Random animation duration
    const duration = Math.random() * 2 + 2;
    confetti.style.animationDuration = duration + 's';
    
    // Add to container
    confettiContainer.appendChild(confetti);
  }
  
  // Remove confetti after animations complete
  setTimeout(() => {
    confettiContainer.remove();
    confettiStyle.remove();
  }, 5000);
}

// Add this function near the createConfettiEffect function
function showSuccessNotification() {
  // Create enhanced success message
  const successMessage = document.createElement('div');
  successMessage.className = 'portal-success-message';
  successMessage.innerHTML = `
    <div class="success-container">
      <div class="success-icon">✓</div>
      <div class="success-text">
        <h3>Portal Submitted Successfully!</h3>
        <p>Your portal request has been received and will be reviewed soon.</p>
      </div>
    </div>
  `;
  document.body.appendChild(successMessage);
  
  // Add CSS styles for the enhanced success message
  const style = document.createElement('style');
  style.textContent = `
    .portal-success-message {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: rgba(0, 128, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
      z-index: 10000;
      text-align: center;
      animation: portal-success-appear 0.5s ease-out forwards, 
                 portal-success-glow 2s infinite alternate;
      max-width: 80%;
    }
    
    @keyframes portal-success-appear {
      0% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.8);
      }
      100% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    }
    
    @keyframes portal-success-glow {
      0% {
        box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
      }
      100% {
        box-shadow: 0 0 30px rgba(0, 255, 0, 0.8);
      }
    }
    
    .success-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
    }
    
    .success-icon {
      font-size: 48px;
      height: 80px;
      width: 80px;
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #00ff00;
      text-shadow: 0 0 10px #00ff00;
      animation: success-icon-pulse 1.5s infinite alternate;
    }
    
    @keyframes success-icon-pulse {
      0% {
        transform: scale(1);
        text-shadow: 0 0 10px #00ff00;
      }
      100% {
        transform: scale(1.1);
        text-shadow: 0 0 20px #00ff00;
      }
    }
    
    .success-text h3 {
      margin: 0 0 10px 0;
      font-size: 24px;
      font-weight: bold;
    }
    
    .success-text p {
      margin: 0;
      font-size: 16px;
      opacity: 0.9;
    }
  `;
  document.head.appendChild(style);
  
  // Create confetti effect
  createConfettiEffect();
  
  // Remove success message after 4 seconds
  setTimeout(() => {
    successMessage.style.animation = 'portal-success-disappear 0.5s ease-in forwards';
    
    // Add disappear animation
    const disappearStyle = document.createElement('style');
    disappearStyle.textContent = `
      @keyframes portal-success-disappear {
        0% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
        100% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.8);
        }
      }
    `;
    document.head.appendChild(disappearStyle);
    
    // Remove element after animation completes
    setTimeout(() => {
      successMessage.remove();
      style.remove();
      disappearStyle.remove();
    }, 500);
  }, 4000);
}

// Add these new functions for the landmarks
function createEiffelTower(environment, loadingManager) {
  // Create a placeholder for the tower while it loads
  const placeholder = new THREE.Group();
  // Position the Eiffel Tower far in the distance
  placeholder.position.set(65, 0, -70); // Positioned far in the distance
  environment.add(placeholder);
  
  // Try to load the GLB/GLTF model first
  const gltfLoader = new GLTFLoader(loadingManager);
  gltfLoader.load(
    '/assets/models/eiffel_tower.glb', // or .gltf
    function(gltf) {
      // Model loaded successfully
      const model = gltf.scene;
      
      // Scale and position the model - make it appropriate for distant viewing
      model.scale.set(5, 6, 5); // Adjusted scale for distant viewing
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
            
            // Scale and position the model
            object.scale.set(5, 5, 5); // Adjust scale as needed
            
            // Add the model to the placeholder
            placeholder.add(object);
            
            console.log('Eiffel Tower OBJ model loaded without materials');
          },
          function(xhr) {
            // Loading progress
          },
          function(error) {
            // Error loading OBJ without materials, fall back to basic geometries
            console.warn('Error loading OBJ model without materials, falling back to basic geometries:', error);
            createBasicEiffelTower(placeholder);
          }
        );
      }
    );
  }
  
  // Function to create a basic Eiffel Tower with geometries as fallback
  function createBasicEiffelTower(placeholder) {
    console.log('Creating basic Eiffel Tower with geometries');
    
    // Create a simplified Eiffel Tower using basic geometries
    const towerGroup = new THREE.Group();
    
    // Base of the tower (four legs)
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
    
    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(2, 20, 2),
        legMaterial
      );
      
      const angle = (i * Math.PI / 2);
      leg.position.set(
        10 * Math.cos(angle),
        10,
        10 * Math.sin(angle)
      );
      
      leg.rotation.z = -Math.atan2(leg.position.x, 20);
      leg.rotation.x = Math.atan2(leg.position.z, 20);
      
      towerGroup.add(leg);
    }
    
    // Middle section
    const middleSection = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 8, 15, 4),
      legMaterial
    );
    middleSection.position.y = 25;
    towerGroup.add(middleSection);
    
    // Upper section
    const upperSection = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 5, 15, 4),
      legMaterial
    );
    upperSection.position.y = 40;
    towerGroup.add(upperSection);
    
    // Top spire
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 1, 10, 8),
      legMaterial
    );
    spire.position.y = 52.5;
    towerGroup.add(spire);
    
    // Add the basic tower to the placeholder
    placeholder.add(towerGroup);
    
    // Add collision detection
    placeholder.userData.isObstacle = true;
  }
  
  return placeholder;
}

function createSagradaFamilia(environment, loadingManager) {
  // Create a placeholder for the Sagrada Familia
  const placeholder = new THREE.Group();
  // Position it to be to the right of the Eiffel Tower
  placeholder.position.set(75, 0, -90); // Right of the Eiffel Tower
  environment.add(placeholder);
  
  // Try to load the GLB model first
  const gltfLoader = new GLTFLoader(loadingManager);
  gltfLoader.load(
    '/assets/models/sagrada_familia_2.glb',
    function(gltf) {
      // Model loaded successfully
      const model = gltf.scene;
      
      // Scale and position the model - making it 75% smaller than before
      model.scale.set(0.25, 0.25, 0.25); // Changed from 1 to 0.25 (25% of original size)
      model.position.set(0, 0, 0);
      
      // Rotate the model to face toward the player
      model.rotation.y = Math.PI / 6; // 30-degree rotation
      
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
      
      console.log('Sagrada Familia model loaded successfully');
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

function createLondonPhoneBox(environment, loadingManager) {
  // Create a placeholder for the phone box
  const placeholder = new THREE.Group();
  // Position the phone box at the requested location
  placeholder.position.set(15, 0, -15); // Positioning at x: 15, z: -15, y: 0
  environment.add(placeholder);
  
  // Try to load the GLB model
  const gltfLoader = new GLTFLoader(loadingManager);
  gltfLoader.load(
    '/assets/models/london_red_phone_box.glb',
    function(gltf) {
      // Model loaded successfully
      const model = gltf.scene;
      
      // Scale and position the model (adjust scale as needed)
      model.scale.set(4, 4, 4); // Start with 1:1 scale, adjust if needed
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
      
      console.log('London phone box model loaded successfully');
    },
    function(xhr) {
      // Loading progress
      console.log('London phone box: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function(error) {
      // Error loading GLTF, fall back to basic geometries
      console.warn('Error loading London phone box model, falling back to basic geometries:', error);
      createBasicPhoneBox(placeholder);
    }
  );
  
  // Function to create a basic phone box with geometries as fallback
  function createBasicPhoneBox(placeholder) {
    console.log('Creating basic London phone box with geometries');
    
    // Create a simplified phone box using basic geometries
    const phoneBoxGroup = new THREE.Group();
    
    // Main box structure
    const boxMaterial = new THREE.MeshStandardMaterial({ color: 0xDD0000 }); // British red color
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.8, 1.2),
      boxMaterial
    );
    box.position.y = 1.4; // Half height to place on ground
    phoneBoxGroup.add(box);
    
    // Top crown
    const crownMaterial = new THREE.MeshStandardMaterial({ color: 0xDD0000 });
    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.3, 1.4),
      crownMaterial
    );
    crown.position.y = 2.95; // Place on top of box
    phoneBoxGroup.add(crown);
    
    // Windows (white frames)
    const windowFrameMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
    
    // For each side of the box
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI / 2);
      const windowFrame = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 1.8, 0.05),
        windowFrameMaterial
      );
      
      windowFrame.position.set(
        0.6 * Math.sin(angle),
        1.7, // Middle of the box
        0.6 * Math.cos(angle)
      );
      
      windowFrame.rotation.y = angle;
      phoneBoxGroup.add(windowFrame);
      
      // Glass panels (blue transparent)
      const glassMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x3333FF, 
        transparent: true,
        opacity: 0.4
      });
      
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 1.7, 0.02),
        glassMaterial
      );
      
      glass.position.z = 0.02; // Slightly in front of the frame
      windowFrame.add(glass);
    }
    
    // Add the basic phone box to the placeholder
    placeholder.add(phoneBoxGroup);
    
    // Add collision detection
    placeholder.userData.isObstacle = true;
  }
  
  return placeholder;
}