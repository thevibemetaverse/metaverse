// src/components/environment/imageSystem.js

import * as THREE from 'three';

/**
 * Creates a simple 2D image plane in the 3D environment
 * 
 * @param {string} imageUrl - Path to the image
 * @param {THREE.Vector3} position - Position in 3D space
 * @param {number} width - Width of the image plane
 * @param {number} height - Height of the image plane
 * @param {THREE.Euler} rotation - Rotation of the image plane
 * @returns {THREE.Mesh} - The created image plane
 */
function create2DImage(imageUrl, position, width = 10, height = 10, rotation = new THREE.Euler()) {
  console.log(`Creating 2D image: ${imageUrl}`);
  
  // Create texture loader
  const loader = new THREE.TextureLoader();
  
  // Create material with the texture
  const material = new THREE.MeshBasicMaterial({
    map: loader.load(imageUrl),
    transparent: true,
    side: THREE.DoubleSide
  });
  
  // Create a plane geometry
  const geometry = new THREE.PlaneGeometry(width, height);
  
  // Create the mesh with geometry and material
  const plane = new THREE.Mesh(geometry, material);
  
  // Set position and rotation
  plane.position.copy(position);
  plane.rotation.copy(rotation);
  
  console.log(`2D image created at position:`, plane.position);
  return plane;
}

/**
 * Position an image relative to an existing object
 * 
 * @param {string} imageUrl - Path to the image
 * @param {THREE.Object3D} referenceObject - Object to position relative to
 * @param {THREE.Vector3} offset - Offset from the reference object
 * @param {number} width - Width of the image
 * @param {number} height - Height of the image
 * @param {THREE.Euler} rotation - Rotation of the image
 * @returns {THREE.Mesh} - The created image
 */
function createRelativeImage(imageUrl, referenceObject, offset, width = 10, height = 10, rotation = new THREE.Euler()) {
  console.log(`Creating relative image: ${imageUrl}`);
  console.log(`Reference object position:`, referenceObject.position);
  console.log(`Offset:`, offset);
  
  // Calculate position based on reference object
  const position = new THREE.Vector3().copy(referenceObject.position).add(offset);
  
  console.log(`Calculated position:`, position);
  
  // Create and return the image
  return create2DImage(imageUrl, position, width, height, rotation);
}

/**
 * Create an image that always faces the camera (billboard)
 * 
 * @param {string} imageUrl - Path to the image
 * @param {THREE.Vector3} position - Position in 3D space
 * @param {number} width - Width of the image plane
 * @param {number} height - Height of the image plane
 * @param {THREE.Scene} scene - The scene to add the update function to
 * @returns {THREE.Mesh} - The created image plane
 */
function createBillboardImage(imageUrl, position, width = 10, height = 10, scene) {
  const image = create2DImage(imageUrl, position, width, height);
  
  // Store the camera on the image for update reference
  image.userData.isBillboard = true;
  
  // Add to the scene's update loop if available
  if (scene && scene.updateFunctions) {
    scene.updateFunctions.push((camera) => {
      // Make the image always face the camera
      if (image.userData.isBillboard) {
        image.lookAt(camera.position);
      }
    });
  }
  
  return image;
}

export { create2DImage, createRelativeImage, createBillboardImage };