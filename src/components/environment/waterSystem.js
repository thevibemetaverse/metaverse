import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js'; // Use Water (not Water2) for better wave animation

// Function to create water with waves
function createWater(scene) {
  console.log('Starting water creation...');
  
  // Water parameters
  const waterSize = 10;
  
  // Create water geometry with natural, irregular shape
  const waterShape = new THREE.Shape();
  const radius = waterSize/2;
  
  // Create an irregular outline with random variations
  const segments = 48; // Increased from 24 for smoother curves
  const noiseAmount = radius * 0.15; // Reduced slightly for less dramatic variations
  
  // Start at a random point
  const startAngle = Math.random() * Math.PI * 2;
  const firstX = Math.cos(startAngle) * (radius + (Math.random() * noiseAmount - noiseAmount/2));
  const firstY = Math.sin(startAngle) * (radius + (Math.random() * noiseAmount - noiseAmount/2));
  
  waterShape.moveTo(firstX, firstY);
  
  // Generate smoother interpolation points
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const angle = startAngle + (i / segments) * Math.PI * 2;
    const radiusVariation = radius + (Math.random() * noiseAmount - noiseAmount/2);
    points.push({
      x: Math.cos(angle) * radiusVariation,
      y: Math.sin(angle) * radiusVariation
    });
  }
  
  // Close the loop by adding the first point again
  points.push(points[0]);
  
  // Create a smooth curve using splines instead of direct connections
  for (let i = 1; i < points.length; i++) {
    const current = points[i];
    const prev = points[i-1];
    
    // Use quadraticCurveTo for smoother transitions
    const controlX = (prev.x + current.x) / 2;
    const controlY = (prev.y + current.y) / 2;
    
    waterShape.quadraticCurveTo(controlX, controlY, current.x, current.y);
  }
  
  const waterGeometry = new THREE.ShapeGeometry(waterShape, 128); // Increased segments for the geometry

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
    water.material.uniforms['time'].value += 1/360;
  }
}

export { createWater, animateWater };