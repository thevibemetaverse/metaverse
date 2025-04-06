// Import necessary modules
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { createWater } from './waterSystem.js';
import { create2DImage } from './imageSystem.js';

// Model loaders
const loadingManager = new THREE.LoadingManager();
const gltfLoader = new GLTFLoader(loadingManager);
const objLoader = new OBJLoader(loadingManager);
const mtlLoader = new MTLLoader(loadingManager);

// Create and inject the portal form styles
function injectPortalFormStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .portal-form-container {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: rgba(16, 24, 48, 0.95);
      color: white;
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 0 30px rgba(74, 144, 226, 0.6);
      z-index: 1000;
      width: 400px;
      max-width: 90vw;
      font-family: 'system-ui', sans-serif;
    }
    
    @keyframes portal-form-appear {
      0% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.8);
      }
      100% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    }
    
    @keyframes portal-glow {
      0% { text-shadow: 0 0 10px #4a90e2, 0 0 20px #4a90e2; }
      100% { text-shadow: 0 0 15px #4a90e2, 0 0 30px #4a90e2; }
    }
    
    .portal-form-container h2 {
      text-align: center;
      margin-top: 0;
      margin-bottom: 20px;
      color: #ffffff;
      font-size: 24px;
      text-shadow: 0 0 10px #4a90e2, 0 0 20px #4a90e2;
      animation: portal-glow 2s infinite alternate;
    }
    
    .portal-form-container input,
    .portal-form-container textarea {
      width: 100%;
      padding: 10px;
      margin-bottom: 15px;
      border-radius: 5px;
      border: 1px solid rgba(74, 144, 226, 0.5);
      background-color: rgba(0, 20, 40, 0.7);
      color: white;
      font-size: 16px;
    }
    
    .portal-form-container label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
      color: #4a90e2;
    }
    
    .portal-form-container .checkbox-container {
      display: flex;
      align-items: flex-start;
      margin-bottom: 15px;
    }
    
    .portal-form-container .checkbox-container input {
      width: auto;
      margin-right: 10px;
      margin-top: 3px;
    }
    
    .portal-form-container .buttons {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
    }
    
    .portal-form-container button {
      padding: 10px 20px;
      border-radius: 5px;
      border: none;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .portal-form-container button[type="submit"] {
      background-color: #4a90e2;
      color: white;
    }
    
    .portal-form-container button[type="submit"]:hover {
      background-color: #3a80d2;
      box-shadow: 0 0 15px rgba(74, 144, 226, 0.8);
    }
    
    .portal-form-container button[type="button"] {
      background-color: rgba(255, 255, 255, 0.2);
      color: white;
    }
    
    .portal-form-container button[type="button"]:hover {
      background-color: rgba(255, 255, 255, 0.3);
    }
    
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
  document.head.appendChild(style);
  return style;
}

// Create portal application form
function createPortalForm() {
  // Inject styles if not already present
  const styleElement = injectPortalFormStyles();
  
  // Create form container
  const formContainer = document.createElement('div');
  formContainer.className = 'portal-form-container';
  formContainer.style.animation = 'portal-form-appear 0.5s ease-out forwards';
  
  // Set game state to form-open if GameStateManager is available
  if (window.gameStateManager) {
    console.log('[Portal Form] Setting game state to form-open');
    window.gameStateManager.setFormOpen();
  } else {
    // Fallback to the old method if GameStateManager is not available
    console.log('[Portal Form] GameStateManager not available, using fallback method');
    disableCharacterMovement();
  }
  
  // Add direct key handlers to the form container to catch all keyboard events
  formContainer.tabIndex = -1; // Make it focusable
  formContainer.addEventListener('keydown', function(e) {
    // If typing in a form field, allow normal behavior
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') {
      return true;
    }
    
    // Block movement keys
    const movementKeys = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'q', 'e'];
    if (movementKeys.includes(e.key.toLowerCase())) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return false;
    }
    
    // Close form on Escape
    if (e.key === 'Escape') {
      closeForm();
      e.preventDefault();
      return false;
    }
  }, true);
  
  // Create form header
  const heading = document.createElement('h2');
  heading.textContent = 'Submit Portal Application';
  heading.style.textShadow = '0 0 10px #4a90e2, 0 0 20px #4a90e2';
  heading.style.animation = 'portal-glow 2s infinite alternate';
  
  // Create form element
  const form = document.createElement('form');
  form.id = 'portal-form';
  form.action = 'https://submit-form.com/OOKKM5IU8';
  
  // URL input
  const urlLabel = document.createElement('label');
  urlLabel.textContent = 'Portal URL:';
  urlLabel.htmlFor = 'url';
  
  const urlInput = document.createElement('input');
  urlInput.type = 'url';
  urlInput.id = 'url';
  urlInput.name = 'url';
  urlInput.placeholder = 'https://example.com';
  urlInput.required = true;
  
  // Image URL input
  const imageLabel = document.createElement('label');
  imageLabel.textContent = 'Portal Image URL:';
  imageLabel.htmlFor = 'image';
  
  const imageInput = document.createElement('input');
  imageInput.type = 'url';
  imageInput.id = 'image';
  imageInput.name = 'image';
  imageInput.placeholder = 'https://example.com/image.jpg';
  imageInput.required = true;
  
  // Agreement checkbox
  const checkboxContainer = document.createElement('div');
  checkboxContainer.className = 'checkbox-container';
  
  const agreementCheckbox = document.createElement('input');
  agreementCheckbox.type = 'checkbox';
  agreementCheckbox.id = 'agreement';
  agreementCheckbox.name = 'agreement';
  agreementCheckbox.required = true;
  
  const agreementLabel = document.createElement('label');
  agreementLabel.htmlFor = 'agreement';
  agreementLabel.textContent = 'I agree to add this portal to the metaverse';
  agreementLabel.style.display = 'inline';
  agreementLabel.style.marginLeft = '5px';
  agreementLabel.style.fontWeight = 'normal';
  
  checkboxContainer.appendChild(agreementCheckbox);
  checkboxContainer.appendChild(agreementLabel);
  
  // Buttons container
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'buttons';
  
  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.textContent = 'Submit Portal';
  
  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.textContent = 'Cancel';
  
  buttonsContainer.appendChild(submitButton);
  buttonsContainer.appendChild(cancelButton);
  
  // Append elements to form
  form.appendChild(urlLabel);
  form.appendChild(urlInput);
  form.appendChild(imageLabel);
  form.appendChild(imageInput);
  form.appendChild(checkboxContainer);
  form.appendChild(buttonsContainer);
  
  // Append elements to container
  formContainer.appendChild(heading);
  formContainer.appendChild(form);
  
  // Cancel button event listener
  cancelButton.addEventListener('click', closeForm);
  
  // Form submit handler
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(form);
    
    // Submit the form data to FormSpark
    fetch('https://submit-form.com/OOKKM5IU8', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(Object.fromEntries(formData))
    })
    .then(response => {
      if (response.ok) {
        showSuccessNotification();
        closeForm();
      } else {
        throw new Error('Form submission failed');
      }
    })
    .catch(error => {
      console.error('Error submitting form:', error);
      alert('There was an error submitting your form. Please try again.');
    });
  });
  
  return formContainer;
}

// Show success notification
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
  
  // Create confetti effect
  createConfettiEffect();
  
  // Remove success message after 4 seconds
  setTimeout(() => {
    successMessage.style.animation = 'portal-success-disappear 0.5s ease-in forwards';
    
    // Remove element after animation completes
    setTimeout(() => {
      successMessage.remove();
    }, 500);
  }, 4000);
}

// Create confetti effect
function createConfettiEffect() {
  const confettiCount = 200;
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';
  document.body.appendChild(container);
  
  const colors = ['#4a90e2', '#43e97b', '#f9ed32', '#f2709c', '#a177ff'];
  
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    confetti.style.position = 'absolute';
    confetti.style.width = `${Math.random() * 10 + 5}px`;
    confetti.style.height = `${Math.random() * 5 + 5}px`;
    confetti.style.backgroundColor = color;
    confetti.style.borderRadius = '50%';
    confetti.style.opacity = Math.random() + 0.5;
    confetti.style.top = `-10px`;
    confetti.style.left = `${Math.random() * window.innerWidth}px`;
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
    confetti.style.zIndex = '10000';
    
    const animationDuration = Math.random() * 3 + 2;
    confetti.style.animation = `fall ${animationDuration}s linear forwards`;
    
    const keyframes = `
      @keyframes fall {
        0% { 
          transform: translate3d(0, 0, 0) rotate(0deg); 
          opacity: ${confetti.style.opacity};
        }
        100% { 
          transform: translate3d(${(Math.random() - 0.5) * 400}px, ${window.innerHeight + 10}px, 0) rotate(${Math.random() * 720}deg); 
          opacity: 0;
        }
      }
    `;
    
    const style = document.createElement('style');
    style.innerHTML = keyframes;
    document.head.appendChild(style);
    
    container.appendChild(confetti);
    
    // Remove confetti after animation
    setTimeout(() => {
      confetti.remove();
      style.remove();
      
      // Remove container when last confetti is removed
      if (i === confettiCount - 1) {
        setTimeout(() => container.remove(), animationDuration * 1000);
      }
    }, animationDuration * 1000);
  }
}

// Function to load GLTF models
async function loadGLTFModel(url, position = new THREE.Vector3(0, 0, 0), scale = new THREE.Vector3(1, 1, 1), rotation = new THREE.Euler(0, 0, 0)) {
  try {
    console.log(`Starting to load model: ${url}`);
    const gltf = await new Promise((resolve, reject) => {
      gltfLoader.load(
        url,
        (gltf) => {
          console.log(`Successfully loaded model: ${url}`);
          console.log('Model position:', position);
          console.log('Model scale:', scale);
          console.log('Model rotation:', rotation);
          resolve(gltf);
        },
        (xhr) => console.log(`Loading model ${url}: ${(xhr.loaded / xhr.total) * 100}% loaded`),
        (error) => {
          console.error(`Error loading model ${url}:`, error);
          reject(error);
        }
      );
    });

    const model = gltf.scene;
    model.position.copy(position);
    model.scale.copy(scale);
    model.rotation.copy(rotation);
    
    // Enable shadows
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        console.log(`Mesh ${child.name} added to model`);
      }
    });

    return model;
  } catch (error) {
    console.error('Error loading GLTF model:', error);
    return null;
  }
}

// Function to create environment elements
async function createEnvironmentElements(scene, interactionManager = null) {
  console.log('createEnvironmentElements called with interactionManager:', interactionManager ? 'provided' : 'not provided');
  // Create a group to hold all environment objects
  const environment = new THREE.Group();
  scene.add(environment);

  try {
    // Create water first (so it's at the bottom)
    console.log('Creating water...');
    const water = createWater(scene);
    console.log('Water created:', water);
    // Store water in scene for animation
    scene.water = water;

    // Load BBQ Sauce
    console.log('About to load BBQ Sauce...');
    const bbqSauce = await loadGLTFModel(
      '/assets/models/sweet_baby_rays_bbq_sauce.glb',
      new THREE.Vector3(15, 10, -40),
      new THREE.Vector3(5, 5, 5),
      new THREE.Euler(0, 0, 0)
    );
    console.log('BBQ Sauce loaded:', bbqSauce);
    if (bbqSauce) {
      environment.add(bbqSauce);
      
      // Make BBQ Sauce interactive if interactionManager is available
      if (interactionManager) {
        interactionManager.makeObjectInteractable(bbqSauce, {
          onClick: () => {
            console.log('BBQ Sauce clicked!');
            // Add any click behavior here
          },
          onHover: () => {
            console.log('Hovering over BBQ Sauce');
          },
          onHoverExit: () => {
            console.log('No longer hovering over BBQ Sauce');
          }
        });
      }
    }

    // Load Office Computer
    console.log('About to load Office Computer...');
    const officeComputer = await loadGLTFModel(
      '/assets/models/office_computer.glb',
      new THREE.Vector3(15, 0, 55),
      new THREE.Vector3(0.04, 0.04, 0.04),
      new THREE.Euler(0, 0, 0)
    );
    console.log('Office Computer loaded:', officeComputer);
    if (officeComputer) {
      environment.add(officeComputer);
      
      // Make office computer interactive if interactionManager is available
      if (interactionManager) {
        interactionManager.makeObjectInteractable(officeComputer, {
          onClick: () => {
            console.log('Office computer clicked!');
            // Show portal application form
            const portalForm = createPortalForm();
            document.body.appendChild(portalForm);
          },
          onHover: () => {
            console.log('Hovering over office computer');
          },
          onHoverExit: () => {
            console.log('No longer hovering over office computer');
          }
        });
      }
      
      // Add solsys image next to the computer
      const computerImagePosition = new THREE.Vector3(20, 7, 55); // Position to the right of computer
      const logoImage2 = create2DImage(
        '/assets/images/solsys.png',
        computerImagePosition,
        15, // Smaller size to fit near desk
        8,
        new THREE.Euler(0, -Math.PI/2, 0) // Rotate 90 degrees clockwise around Z axis
      );
      environment.add(logoImage2);

      // Add image on the other side of the desk
      const oppositeImagePosition = new THREE.Vector3(15, 7, 48); // Position to the left of computer
      const oppositeImage = create2DImage(
        '/assets/images/active-users.jpg',
        oppositeImagePosition,
        9, // Same size as other image
        4,
        new THREE.Euler(0, -Math.PI/3, 0) // Rotate 90 degrees counterclockwise around Z axis
      );
      environment.add(oppositeImage);
    }

    // Load Runway
    console.log('About to load Runway...');
    const runway = await loadGLTFModel(
      '/assets/models/runway.glb',
      new THREE.Vector3(-15, .1, 10),
      new THREE.Vector3(.02, .02, .02),
      new THREE.Euler(0, .8*Math.PI, 0) 
    );
    console.log('Runway loaded:', runway);
    if (runway) environment.add(runway);

    // Load Vibermart
    console.log('About to load Vibermart...');
    const vibermart = await loadGLTFModel(
      '/assets/models/vibermart.glb',
      new THREE.Vector3(-25, 5, 55), // Same x as runway, further back in z
      new THREE.Vector3(10, 10, 10), // You may need to adjust this scale
      new THREE.Euler(0, Math.PI/2, 0) // Same rotation as runway
    );
    console.log('Vibermart loaded:', vibermart);
    if (vibermart) environment.add(vibermart);

    // Load Eiffel Tower
    console.log('About to load Eiffel Tower...');
    const eiffelTower = await loadGLTFModel(
      '/assets/models/eiffel_tower.glb',
      new THREE.Vector3(65, 0, -70),
      new THREE.Vector3(5, 6, 5),
      new THREE.Euler(0, 0, 0)
    );
    console.log('Eiffel Tower loaded:', eiffelTower);
    if (eiffelTower) {
      environment.add(eiffelTower);
      
      // First logo remains at its current position
      const logoPosition = new THREE.Vector3(65, 30, -60);
      const logoImage = create2DImage(
        '/assets/images/affordihome.png',
        logoPosition,
        40,
        25,
        new THREE.Euler(0, 0, 0)
      );
      environment.add(logoImage);
    }

    // Load Sagrada Familia
    console.log('About to load Sagrada Familia...');
    const sagradaFamilia = await loadGLTFModel(
      '/assets/models/sagrada_familia_2.glb',
      new THREE.Vector3(75, 0, -90),
      new THREE.Vector3(0.25, 0.25, 0.25),
      new THREE.Euler(0, Math.PI / 6, 0)
    );
    console.log('Sagrada Familia loaded:', sagradaFamilia);
    if (sagradaFamilia) environment.add(sagradaFamilia);
  } catch (error) {
    console.error('Error in createEnvironmentElements:', error);
  }

  return environment;
}

// Function to close form and restore movement
function closeForm() {
  const formContainer = document.querySelector('.portal-form-container');
  if (!formContainer) return;
  
  // Set game state back to playing if GameStateManager is available
  if (window.gameStateManager) {
    console.log('[Portal Form] Setting game state back to playing');
    window.gameStateManager.setPlaying();
  } else {
    // Fallback to the old method if GameStateManager is not available
    console.log('[Portal Form] GameStateManager not available, using fallback method');
    enableCharacterMovement();
  }
  
  // Animate form close
  formContainer.style.animation = 'portal-form-disappear 0.5s ease-in forwards';
  
  // Find the style element
  const styleElement = document.getElementById('portal-form-styles');
  
  // Remove elements after animation completes
  setTimeout(() => {
    if (formContainer && formContainer.parentNode) {
      formContainer.remove();
    }
    if (styleElement && styleElement.parentNode) {
      styleElement.remove();
    }
  }, 500);
}

// Export the function to be used in main.js
export { createEnvironmentElements };