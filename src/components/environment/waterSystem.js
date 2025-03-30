import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';

function createWater(scene) {
  console.log('Starting water creation...');
  
  // Water parameters
  const waterLength = 50;  // Original size for length
  const waterWidth = 85;  // Increased width
  const baseRadiusLength = waterLength / 2;
  const baseRadiusWidth = waterWidth / 2;
  
  // Create water shape with organic edges
  const waterShape = new THREE.Shape();
  const segments = 36;
  
  // Modified points generation for elliptical shape
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    
    const variation = 
      Math.sin(angle * 2) * 0.2 + 
      Math.sin(angle * 3) * 0.1 + 
      Math.sin(angle * 5) * 0.05;
    
    // Use different radii for width and length
    const radius = {
      x: baseRadiusWidth * (1 + variation),
      y: baseRadiusLength * (1 + variation)
    };
    
    points.push({
      x: Math.cos(angle) * radius.x,
      y: Math.sin(angle) * radius.y
    });
  }
  
  // Close the loop
  points.push(points[0]);
  
  // Start the shape
  waterShape.moveTo(points[0].x, points[0].y);
  
  // Create smooth curves between points
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    
    // Simple quadratic curve for smooth transitions
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    
    waterShape.quadraticCurveTo(
      current.x, current.y,
      midX, midY
    );
  }
  
  const waterGeometry = new THREE.ShapeGeometry(waterShape, 64);

  // Create directional light for sun reflection
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
  sunLight.position.set(30, 100, 30);
  sunLight.target.position.set(0, 0, 0);
  scene.add(sunLight);
  scene.add(sunLight.target);
  
  // Create Water material
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
    waterColor: 0x4d80b3,
    distortionScale: 1.2,
    fog: scene.fog !== undefined
  });

  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.2;
  water.position.x = 35;
  water.position.z = -5;
  
  scene.add(water);
  console.log('Water added to scene');
  
  return water;
}

function animateWater(water, time) {
  if (water && water.material && water.material.uniforms['time']) {
    water.material.uniforms['time'].value += 1/720;
  }
}

export { createWater, animateWater };