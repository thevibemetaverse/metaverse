import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';

// Function to create water
function createWater(scene) {
    // Create water geometry
    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
    
    // Create water material
    const water = new Water(waterGeometry, {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load('/assets/textures/waternormals.jpg', function(texture) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(4, 4);
        }),
        sunDirection: new THREE.Vector3(),
        sunColor: 0xffffff,
        waterColor: 0x001e0f,
        distortionScale: 3.7,
        fog: scene.fog !== undefined
    });

    // Position and rotate water
    water.rotation.x = -Math.PI / 2;
    water.position.y = 1; // Adjust this value to set water level

    // Add water to scene
    scene.add(water);

    // Return water object for animation
    return water;
}

// Function to animate water
function animateWater(water, time) {
    if (water) {
        water.material.uniforms['time'].value += 1.0 / 60.0;
    }
}

export { createWater, animateWater }; 