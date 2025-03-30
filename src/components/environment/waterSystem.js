import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js'; // Use Water (not Water2) for better wave animation

// Function to create water with waves
function createWater(scene) {
  console.log('Starting water creation...');
  
  // Water parameters
  const waterSize = 50;
  
  // Create water geometry
  const waterGeometry = new THREE.PlaneGeometry(waterSize, waterSize, 128, 128);

  // Create directional light for sun reflection
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
  sunLight.position.set(30, 100, 30);
  sunLight.target.position.set(0, 0, 0);
  scene.add(sunLight);
  scene.add(sunLight.target);
  
  // Create Water material with original Water (not Water2)
  const water = new Water(waterGeometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: new THREE.TextureLoader().load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/waternormals.jpg', 
      function(texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      }
    ),
    sunDirection: new THREE.Vector3(sunLight.position.x, sunLight.position.y, sunLight.position.z).normalize(),
    sunColor: 0xffffff,
    waterColor: 0x0077ff,
    distortionScale: 3.7, // Increase this value for more pronounced waves
    fog: scene.fog !== undefined
  });

  // Position and rotate water
  water.rotation.x = -Math.PI / 2;
  water.position.y = .2; // Water level
  console.log('Water positioned at y = 0');

  // Add water to scene
  scene.add(water);
  console.log('Water added to scene with wave animation capability');

  // Return water object for animation
  return water;
}

// Function to animate water with proper time update
function animateWater(water, time) {
  if (water && water.material && water.material.uniforms['time']) {
    // Update the time parameter for wave animation
    water.material.uniforms['time'].value += 1/60;
  }
}

export { createWater, animateWater };