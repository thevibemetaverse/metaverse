function handleCollisions() {
  // ... existing collision detection code ...
  
  if (collidedObject?.userData?.isPortal) {
    window.location.href = collidedObject.userData.portalURL;
  }
} 